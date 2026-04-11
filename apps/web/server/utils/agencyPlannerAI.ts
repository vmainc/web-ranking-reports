/** Claude prompt + JSON parse for Agency Planner (digital marketing strategist). */

export type AgencyPlannerInput = {
  agencyType: 'seo' | 'ppc' | 'web_design' | 'full_service'
  monthlyRevenue?: string | null
  clientCount: number
  primaryGoal: 'more_clients' | 'retention' | 'improve_results' | 'scale_operations'
  notes?: string | null
}

export type AgencyPlannerGoal = { title: string; measurable?: string }

export type AgencyPlannerExecution = {
  week1: string[]
  week2: string[]
  week3: string[]
  week4: string[]
}

export type AgencyPlannerResult = {
  goals: AgencyPlannerGoal[]
  strategy: string
  execution_plan: AgencyPlannerExecution
  quick_wins: string[]
}

export function extractJsonObject(text: string): string {
  let jsonText = text.trim()
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```[a-zA-Z]*\s*/u, '').replace(/```$/u, '').trim()
  }
  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonText = jsonText.slice(firstBrace, lastBrace + 1)
  }
  return jsonText
}

function labelAgencyType(t: AgencyPlannerInput['agencyType']): string {
  const m: Record<string, string> = {
    seo: 'SEO',
    ppc: 'PPC',
    web_design: 'Web Design',
    full_service: 'Full Service',
  }
  return m[t] ?? t
}

function labelPrimaryGoal(g: AgencyPlannerInput['primaryGoal']): string {
  const m: Record<string, string> = {
    more_clients: 'Get more clients',
    retention: 'Increase retention',
    improve_results: 'Improve client results',
    scale_operations: 'Scale operations',
  }
  return m[g] ?? g
}

export function formatAgencyDataForPrompt(input: AgencyPlannerInput): string {
  const lines = [
    `Agency type: ${labelAgencyType(input.agencyType)}`,
    `Monthly revenue: ${input.monthlyRevenue?.trim() || 'Not specified'}`,
    `Number of clients: ${input.clientCount}`,
    `Primary goal: ${labelPrimaryGoal(input.primaryGoal)}`,
  ]
  if (input.notes?.trim()) lines.push(`Notes / struggles: ${input.notes.trim()}`)
  return lines.join('\n')
}

export function buildAgencyPlannerSystemPrompt(): string {
  return [
    'You are an expert digital marketing agency strategist.',
    'Your job is to help agencies set realistic goals, create execution plans, and focus on revenue growth, client retention, delivery efficiency, and operational clarity.',
    'Be direct, useful, and practical. No fluff.',
    'The user-facing plan must stay under 700 words if written as prose; you still output structured JSON only as instructed.',
  ].join(' ')
}

export function buildAgencyPlannerUserPrompt(agencyDataBlock: string): string {
  return [
    'Given this agency context:',
    '',
    agencyDataBlock,
    '',
    'Return ONLY valid JSON (no markdown fences) with this exact shape:',
    '{',
    '  "goals": [ { "title": "string", "measurable": "string" } ],',
    '  "strategy": "single paragraph, high-level strategic direction",',
    '  "execution_plan": {',
    '    "week1": ["specific actionable step", "..."],',
    '    "week2": ["..."],',
    '    "week3": ["..."],',
    '    "week4": ["..."]',
    '  },',
    '  "quick_wins": ["fast action 1", "fast action 2", "fast action 3"]',
    '}',
    '',
    'Rules:',
    '- Exactly 3 items in `goals` and 3 in `quick_wins`.',
    '- Each week array: 2–5 concrete, actionable steps for agency growth.',
    '- Steps must be specific (not generic like "improve marketing").',
    '- Output JSON only.',
  ].join('\n')
}

export function parseAgencyPlannerJson(raw: string): AgencyPlannerResult {
  const parsed = JSON.parse(extractJsonObject(raw)) as Record<string, unknown>
  const goalsRaw = Array.isArray(parsed.goals) ? parsed.goals : []
  const goals: AgencyPlannerGoal[] = goalsRaw
    .slice(0, 5)
    .map((g) => {
      if (g && typeof g === 'object' && typeof (g as { title?: string }).title === 'string') {
        const o = g as { title: string; measurable?: string }
        return { title: o.title.trim(), measurable: typeof o.measurable === 'string' ? o.measurable.trim() : undefined }
      }
      return null
    })
    .filter((x): x is AgencyPlannerGoal => x != null && x.title.length > 0)

  const strategy = typeof parsed.strategy === 'string' ? parsed.strategy.trim() : ''

  const ep = parsed.execution_plan && typeof parsed.execution_plan === 'object' ? (parsed.execution_plan as Record<string, unknown>) : {}
  const week = (k: string): string[] => {
    const v = ep[k]
    if (!Array.isArray(v)) return []
    return v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((s) => s.trim())
  }
  const execution_plan: AgencyPlannerExecution = {
    week1: week('week1'),
    week2: week('week2'),
    week3: week('week3'),
    week4: week('week4'),
  }

  const qwRaw = Array.isArray(parsed.quick_wins) ? parsed.quick_wins : []
  const quick_wins = qwRaw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((s) => s.trim())
    .slice(0, 5)

  if (!goals.length || !strategy) {
    throw new Error('Invalid planner response: missing goals or strategy')
  }

  return { goals, strategy, execution_plan, quick_wins }
}
