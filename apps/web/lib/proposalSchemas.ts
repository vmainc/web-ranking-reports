import { z } from 'zod'

export const proposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'superseded',
  'expired',
])

export const proposalItemSourceSchema = z.enum(['woo', 'manual', 'package'])

export const proposalItemInputSchema = z.object({
  source: proposalItemSourceSchema.optional(),
  product: z.string().optional().nullable(),
  external_product_id: z.string().max(64).optional().nullable(),
  sku: z.string().max(128).optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  qty: z.number().min(0),
  unit_price: z.number(),
  billing_interval: z.enum(['one_time', 'month', 'year', 'custom']).optional().nullable(),
  metadata_json: z.record(z.unknown()).optional().nullable(),
})

export const proposalCreateSchema = z.object({
  client: z.string().min(1),
  sale: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  title: z.string().min(1).max(255),
  intro_html: z.string().max(50000).optional().nullable(),
  terms_html: z.string().max(50000).optional().nullable(),
  currency: z.string().min(1).max(8).optional(),
  valid_until: z.string().optional().nullable(),
  items: z.array(proposalItemInputSchema).optional(),
})

export const proposalPatchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  intro_html: z.string().max(50000).optional().nullable(),
  terms_html: z.string().max(50000).optional().nullable(),
  currency: z.string().min(1).max(8).optional(),
  valid_until: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  acceptance_options_json: z
    .object({
      mark_deal_won: z.boolean().optional(),
      convert_lead_to_client: z.boolean().optional(),
      promote_site_to_active: z.boolean().optional(),
      create_onboarding_tasks: z.boolean().optional(),
      log_activity: z.boolean().optional(),
      set_pipeline_stage_won: z.boolean().optional(),
    })
    .optional()
    .nullable(),
})

export const proposalItemsReplaceSchema = z.object({
  items: z.array(proposalItemInputSchema),
})
