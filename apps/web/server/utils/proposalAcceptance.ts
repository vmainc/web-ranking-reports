import type PocketBase from 'pocketbase'
import { assertPlanLimit } from '~/server/utils/planGuard'
import { isProspectSite } from '~/server/utils/siteBilling'
import { extractPocketBaseRelationId } from '~/server/utils/workspace'
import {
  DEFAULT_ACCEPTANCE_OPTIONS,
  logProposalActivity,
  ONBOARDING_TASK_TEMPLATES,
} from '~/server/utils/proposals'
import type { Proposal, ProposalAcceptanceOptions } from '~/types'

export type AcceptanceEffectsResult = {
  mark_deal_won: boolean | 'skipped' | 'failed'
  set_pipeline_stage_won: boolean | 'skipped' | 'failed'
  convert_lead_to_client: boolean | 'skipped' | 'failed'
  promote_site_to_active: boolean | 'skipped' | 'failed'
  create_onboarding_tasks: boolean | 'skipped' | 'failed' | number
  log_activity: boolean | 'skipped' | 'failed'
  errors: string[]
}

export function mergeAcceptanceOptions(
  stored?: ProposalAcceptanceOptions | null,
  override?: ProposalAcceptanceOptions | null,
): Required<ProposalAcceptanceOptions> {
  return {
    ...DEFAULT_ACCEPTANCE_OPTIONS,
    ...(stored || {}),
    ...(override || {}),
  }
}

export async function promoteProspectSiteForOwner(
  pb: PocketBase,
  ownerId: string,
  siteId: string,
  opts?: { proposalId?: string; clientId?: string },
) {
  const site = await pb.collection('sites').getOne(siteId)
  if (extractPocketBaseRelationId((site as { user?: unknown }).user) !== ownerId) {
    throw createError({ statusCode: 403, message: 'Site not found' })
  }
  if (!isProspectSite(site as Record<string, unknown>)) {
    return { site, already_active: true as const }
  }

  await assertPlanLimit(pb, ownerId, 'sites', 1)

  const trialEnds = new Date()
  trialEnds.setUTCDate(trialEnds.getUTCDate() + 14)
  trialEnds.setUTCHours(23, 59, 59, 999)

  const updates: Record<string, unknown> = {
    lifecycle: 'active',
    billing_status: 'trial',
    trial_ends_at: trialEnds.toISOString(),
    promoted_at: new Date().toISOString(),
  }
  if (opts?.proposalId) updates.promoted_from_proposal = opts.proposalId

  const updated = await pb.collection('sites').update(siteId, updates)

  if (opts?.clientId) {
    const client = await pb.collection('crm_clients').getOne(opts.clientId).catch(() => null)
    if (client) {
      const linked = extractPocketBaseRelationId((client as { site?: unknown }).site)
      if (!linked) {
        await pb.collection('crm_clients').update(client.id, { site: siteId })
      }
    }
  }

  return { site: updated, already_active: false as const }
}

/**
 * Mark proposal accepted and run configured CRM side-effects.
 * Idempotent: if already accepted, returns already=true without re-running effects.
 */
export async function runProposalAcceptance(
  pb: PocketBase,
  proposal: Proposal,
  opts: {
    acceptedByName: string
    acceptedByEmail?: string | null
    optionsOverride?: ProposalAcceptanceOptions | null
    /** When true, skip valid_until check (agency override). */
    skipExpiryCheck?: boolean
  },
): Promise<{
  ok: true
  already: boolean
  proposal: Proposal
  effects: AcceptanceEffectsResult
}> {
  if (proposal.status === 'accepted') {
    return {
      ok: true,
      already: true,
      proposal,
      effects: {
        mark_deal_won: 'skipped',
        set_pipeline_stage_won: 'skipped',
        convert_lead_to_client: 'skipped',
        promote_site_to_active: 'skipped',
        create_onboarding_tasks: 'skipped',
        log_activity: 'skipped',
        errors: [],
      },
    }
  }

  if (!['sent', 'viewed', 'draft'].includes(proposal.status)) {
    throw createError({ statusCode: 400, message: 'Proposal cannot be accepted in its current status' })
  }

  if (!opts.skipExpiryCheck && proposal.valid_until) {
    const until = new Date(proposal.valid_until).getTime()
    if (Number.isFinite(until) && until < Date.now()) {
      throw createError({ statusCode: 410, message: 'This proposal has expired' })
    }
  }

  const ownerId = extractPocketBaseRelationId(proposal.user)
  const clientId = extractPocketBaseRelationId(proposal.client)
  const saleId = extractPocketBaseRelationId(proposal.sale)
  const siteId = extractPocketBaseRelationId(proposal.site)
  if (!ownerId || !clientId) {
    throw createError({ statusCode: 400, message: 'Proposal is missing owner or client' })
  }

  const options = mergeAcceptanceOptions(proposal.acceptance_options_json, opts.optionsOverride)
  const effects: AcceptanceEffectsResult = {
    mark_deal_won: 'skipped',
    set_pipeline_stage_won: 'skipped',
    convert_lead_to_client: 'skipped',
    promote_site_to_active: 'skipped',
    create_onboarding_tasks: 'skipped',
    log_activity: 'skipped',
    errors: [],
  }

  const acceptedAt = new Date().toISOString()
  let updated = (await pb.collection('proposals').update(proposal.id, {
    status: 'accepted',
    accepted_at: acceptedAt,
    accepted_by_name: opts.acceptedByName,
    accepted_by_email: opts.acceptedByEmail || null,
  })) as Proposal

  // Mark deal won
  if (options.mark_deal_won && saleId) {
    try {
      const sale = await pb.collection('crm_sales').getOne(saleId)
      const saleUpdates: Record<string, unknown> = {
        status: 'won',
        closed_at: acceptedAt,
      }
      const amount = (sale as { amount?: number | null }).amount
      const total = proposal.total
      if ((amount == null || amount === 0) && total != null) {
        saleUpdates.amount = Number(total)
      }
      await pb.collection('crm_sales').update(saleId, saleUpdates)
      effects.mark_deal_won = true
    } catch (e) {
      effects.mark_deal_won = 'failed'
      effects.errors.push(e instanceof Error ? e.message : 'Failed to mark deal won')
    }
  }

  // Pipeline + convert
  try {
    const clientUpdates: Record<string, unknown> = {}
    if (options.set_pipeline_stage_won) {
      clientUpdates.pipeline_stage = 'won'
    }
    if (options.convert_lead_to_client) {
      clientUpdates.status = 'client'
    }
    if (Object.keys(clientUpdates).length) {
      clientUpdates.last_activity_at = acceptedAt
      await pb.collection('crm_clients').update(clientId, clientUpdates)
      if (options.set_pipeline_stage_won) effects.set_pipeline_stage_won = true
      if (options.convert_lead_to_client) effects.convert_lead_to_client = true
    }
  } catch (e) {
    if (options.set_pipeline_stage_won) effects.set_pipeline_stage_won = 'failed'
    if (options.convert_lead_to_client) effects.convert_lead_to_client = 'failed'
    effects.errors.push(e instanceof Error ? e.message : 'Failed to update CRM contact')
  }

  // Promote prospect site
  if (options.promote_site_to_active && siteId) {
    try {
      const result = await promoteProspectSiteForOwner(pb, ownerId, siteId, {
        proposalId: proposal.id,
        clientId,
      })
      effects.promote_site_to_active = result.already_active ? 'skipped' : true
    } catch (e) {
      effects.promote_site_to_active = 'failed'
      const msg =
        (e as { data?: { message?: string }; message?: string })?.data?.message ||
        (e instanceof Error ? e.message : 'Failed to promote site')
      effects.errors.push(msg)
    }
  } else if (options.promote_site_to_active && !siteId) {
    effects.promote_site_to_active = 'skipped'
  }

  // Onboarding tasks
  if (options.create_onboarding_tasks) {
    try {
      let created = 0
      for (const tmpl of ONBOARDING_TASK_TEMPLATES) {
        const due = new Date()
        due.setUTCDate(due.getUTCDate() + tmpl.days)
        due.setUTCHours(12, 0, 0, 0)
        await pb.collection('crm_tasks').create({
          user: ownerId,
          client: clientId,
          title: tmpl.title,
          due_at: due.toISOString(),
          priority: tmpl.priority,
          status: 'open',
          notes: `Created from accepted proposal: ${proposal.title}`,
        })
        created += 1
      }
      effects.create_onboarding_tasks = created
    } catch (e) {
      effects.create_onboarding_tasks = 'failed'
      effects.errors.push(e instanceof Error ? e.message : 'Failed to create onboarding tasks')
    }
  }

  // Activity log (always preferred when option on; include effects summary)
  if (options.log_activity) {
    try {
      const effectBits: string[] = []
      if (effects.mark_deal_won === true) effectBits.push('deal won')
      if (effects.set_pipeline_stage_won === true) effectBits.push('pipeline won')
      if (effects.convert_lead_to_client === true) effectBits.push('lead→client')
      if (effects.promote_site_to_active === true) effectBits.push('site promoted')
      if (typeof effects.create_onboarding_tasks === 'number') {
        effectBits.push(`${effects.create_onboarding_tasks} onboarding tasks`)
      }
      const summary = [
        `Proposal accepted by ${opts.acceptedByName}${opts.acceptedByEmail ? ` <${opts.acceptedByEmail}>` : ''}: ${proposal.title}`,
        effectBits.length ? `Effects: ${effectBits.join(', ')}` : null,
        effects.errors.length ? `Warnings: ${effects.errors.join('; ')}` : null,
      ]
        .filter(Boolean)
        .join(' — ')
      await logProposalActivity(pb, ownerId, clientId, 'proposal_accepted', summary)
      effects.log_activity = true
    } catch (e) {
      effects.log_activity = 'failed'
      effects.errors.push(e instanceof Error ? e.message : 'Failed to log activity')
    }
  }

  await pb
    .collection('proposals')
    .update(proposal.id, {
      acceptance_options_json: {
        ...options,
        _last_run_at: acceptedAt,
        _last_effects: effects,
      },
    })
    .catch(() => null)

  updated = (await pb.collection('proposals').getOne(proposal.id, { expand: 'client,sale,site' })) as Proposal

  return { ok: true, already: false, proposal: updated, effects }
}
