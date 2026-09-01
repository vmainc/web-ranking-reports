import { describe, expect, it } from 'vitest'
import { createModule, defaultSettingsForType } from '~/utils/reportBuilderFactory'
import { moduleTypeLabel } from '~/utils/reportBuilderCatalog'
import { hydrateReportBuilder } from '~/utils/reportBuilderPayload'
import { REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'
import type { Report } from '~/types'

describe('ai_visibility report module', () => {
  it('creates an AI visibility module with refresh defaults', () => {
    const mod = createModule('ai_visibility', 0)
    expect(mod.type).toBe('ai_visibility')
    expect(mod.title).toBe('AI visibility')
    if (mod.type !== 'ai_visibility') throw new Error('expected ai_visibility')
    expect(mod.settings.autoRefresh).toBe(true)
    expect(mod.settings.maxAgeDays).toBe(30)
    expect(mod.settings.maxKeywords).toBe(5)
    expect(moduleTypeLabel('ai_visibility')).toBe('AI visibility')
    expect(defaultSettingsForType('ai_visibility')).toMatchObject({ maxKeywords: 5 })
  })

  it('revives maxKeywords from saved payload and clamps it', () => {
    const report: Report = {
      id: 'report01xxxxxxxx',
      site: 'site1',
      type: 'custom',
      period_start: '2026-08-01',
      period_end: '2026-08-28',
      created: '',
      updated: '',
      payload_json: {
        [REPORT_BUILDER_PAYLOAD_KEY]: {
          title: 'Test',
          pages: [
            {
              id: 'p1',
              title: 'Page 1',
              order: 0,
              modules: [
                {
                  id: 'm1',
                  type: 'ai_visibility',
                  title: 'AI',
                  order: 0,
                  settings: { autoRefresh: true, maxAgeDays: 14, maxKeywords: 99 },
                },
              ],
            },
          ],
        },
      },
    }
    const model = hydrateReportBuilder(report)
    const mod = model.pages[0]?.modules[0]
    expect(mod?.type).toBe('ai_visibility')
    if (mod?.type !== 'ai_visibility') throw new Error('expected ai_visibility')
    expect(mod.settings.maxKeywords).toBe(5)
    expect(mod.settings.maxAgeDays).toBe(14)
  })
})
