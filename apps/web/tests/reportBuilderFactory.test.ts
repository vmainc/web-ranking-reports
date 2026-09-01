import { describe, expect, it } from 'vitest'
import { createModule, defaultSettingsForType } from '~/utils/reportBuilderFactory'
import { moduleTypeLabel } from '~/utils/reportBuilderCatalog'
import { hydrateReportBuilder } from '~/utils/reportBuilderPayload'
import { REPORT_BUILDER_PAYLOAD_KEY } from '~/types/reportBuilder'
import type { Report } from '~/types'

describe('facebook_posts report module', () => {
  it('creates a posts module with a capped maxPosts default', () => {
    const mod = createModule('facebook_posts', 0)
    expect(mod.type).toBe('facebook_posts')
    expect(mod.title).toBe('Facebook posts')
    if (mod.type !== 'facebook_posts') throw new Error('expected facebook_posts')
    expect(mod.settings.maxPosts).toBe(8)
    expect(moduleTypeLabel('facebook_posts')).toBe('Facebook posts')
    expect(defaultSettingsForType('facebook_posts')).toMatchObject({ maxPosts: 8 })
  })

  it('revives maxPosts from saved payload and clamps it', () => {
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
              modules: [{ id: 'm1', type: 'facebook_posts', title: 'Posts', order: 0, settings: { maxPosts: 99 } }],
            },
          ],
        },
      },
    }
    const revived = hydrateReportBuilder(report)
    const mod = revived.pages[0]?.modules[0]
    expect(mod?.type).toBe('facebook_posts')
    if (mod?.type === 'facebook_posts') expect(mod.settings.maxPosts).toBe(25)
  })

  it('falls back to 8 posts when saved maxPosts is invalid', () => {
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
              modules: [{ id: 'm1', type: 'facebook_posts', title: 'Posts', order: 0, settings: { maxPosts: 0 } }],
            },
          ],
        },
      },
    }
    const revived = hydrateReportBuilder(report)
    const mod = revived.pages[0]?.modules[0]
    if (mod?.type === 'facebook_posts') expect(mod.settings.maxPosts).toBe(8)
  })
})
