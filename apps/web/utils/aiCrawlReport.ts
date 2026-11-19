/** How we present AI crawl / llms.txt checks on public and workspace audits. */

export type AiBotAccess = { name: string; allowed: boolean | null }

/** Shown on client-facing reports (not the full internal bot list). */
export const REPORT_AI_BOTS = [
  'GPTBot',
  'ClaudeBot',
  'Google-Extended',
  'PerplexityBot',
  'Bytespider',
] as const

export function hasAiDiscoveryFile(llmsTxt: boolean, llmTxt: boolean): boolean {
  return llmsTxt || llmTxt
}

export function aiDiscoverySummary(llmsTxt: boolean, llmTxt: boolean): { ok: boolean; title: string; detail: string } {
  if (llmsTxt && llmTxt) {
    return {
      ok: true,
      title: 'AI site guide present',
      detail: 'Found llms.txt (and optional llm.txt). Helps assistants summarize your business.',
    }
  }
  if (llmsTxt) {
    return {
      ok: true,
      title: 'AI site guide present',
      detail: 'Found llms.txt at your domain root — the usual standard for ChatGPT and similar tools.',
    }
  }
  if (llmTxt) {
    return {
      ok: true,
      title: 'AI site guide present',
      detail: 'Found llm.txt (less common name). Consider also publishing llms.txt for broader tool support.',
    }
  }
  return {
    ok: false,
    title: 'No AI site guide',
    detail: 'llms.txt was not found. Optional, but useful for AI search and assistants to learn what you offer.',
  }
}

export function botAccessLabel(allowed: boolean | null): string {
  if (allowed === true) return 'Allowed'
  if (allowed === false) return 'Blocked'
  return 'No specific rule'
}

export function botAccessHint(allowed: boolean | null): string {
  if (allowed === true) return 'robots.txt permits this crawler'
  if (allowed === false) return 'robots.txt disallows this crawler'
  return 'Not named in robots.txt — typically allowed unless the whole site is blocked'
}

export function reportBotRows(bots: AiBotAccess[] | undefined): AiBotAccess[] {
  const map = new Map((bots || []).map((b) => [b.name, b]))
  return REPORT_AI_BOTS.map((name) => map.get(name) || { name, allowed: null })
}