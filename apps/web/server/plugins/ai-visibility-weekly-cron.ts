import { CronJob } from 'cron'
import { runAiVisibilityWeeklyJob } from '~/server/utils/runAiVisibilityWeeklyJob'

/**
 * Weekly DataForSEO LLM Mentions (AI visibility) refresh for all sites with a domain.
 * Default: Friday 00:30 in AI_VISIBILITY_CRON_TZ (America/Chicago) — 30m after backlinks.
 * Enable with AI_VISIBILITY_WEEKLY_CRON_ENABLED=true
 *
 * Manual Refresh on the site AI Visibility page remains available.
 */
export default defineNitroPlugin(() => {
  if (process.env.AI_VISIBILITY_WEEKLY_CRON_ENABLED !== 'true') return

  const tz = process.env.AI_VISIBILITY_CRON_TZ || 'America/Chicago'
  const cronExpr = process.env.AI_VISIBILITY_CRON_EXPRESSION || '30 0 * * 5'

  try {
    const job = new CronJob(
      cronExpr,
      () => {
        void runAiVisibilityWeeklyJob('weekly')
      },
      null,
      true,
      tz,
    )
    console.info(`[ai-visibility-cron] weekly enabled (${cronExpr}, ${tz}), running: ${job.running}`)
  } catch (e) {
    console.error(
      '[ai-visibility-cron] failed to start weekly cron (invalid expression or timezone?). Set AI_VISIBILITY_WEEKLY_CRON_ENABLED=false to skip.',
      e,
    )
  }
})
