/**
 * Default dashboard layout and widget IDs. Shared for server defaults and client.
 */

export const DEFAULT_LAYOUT = {
  version: 1,
  widgets: [
    { id: 'kpi_summary', enabled: true, order: 10, settings: { showComparisons: true } },
    { id: 'sessions_trend', enabled: true, order: 20, settings: { granularity: 'day' } },
    { id: 'top_pages', enabled: true, order: 30, settings: { limit: 10 } },
    { id: 'traffic_channels', enabled: true, order: 40, settings: { mode: 'defaultChannelGroup' } },
    { id: 'landing_pages', enabled: true, order: 50, settings: { limit: 10 } },
    { id: 'countries', enabled: true, order: 60, settings: { limit: 10 } },
    { id: 'retention', enabled: true, order: 65, settings: {} },
    { id: 'events', enabled: true, order: 70, settings: { limit: 10 } },
    { id: 'ecommerce', enabled: true, order: 80, settings: { enabled: true } },
  ],
  dateRange: { preset: 'last_28_days' as const },
  compareTo: { enabled: true, preset: 'previous_period' as const },
} as const

export type WidgetId =
  | 'kpi_summary'
  | 'sessions_trend'
  | 'top_pages'
  | 'traffic_channels'
  | 'landing_pages'
  | 'countries'
  | 'retention'
  | 'events'
  | 'ecommerce'

export const WIDGET_LABELS: Record<WidgetId, string> = {
  kpi_summary: 'KPI Summary',
  sessions_trend: 'Sessions Trend',
  top_pages: 'Top Pages',
  traffic_channels: 'Traffic Channels',
  landing_pages: 'Landing Pages',
  countries: 'Top Countries',
  retention: 'Retention overview',
  events: 'Top Events',
  ecommerce: 'Ecommerce',
}
