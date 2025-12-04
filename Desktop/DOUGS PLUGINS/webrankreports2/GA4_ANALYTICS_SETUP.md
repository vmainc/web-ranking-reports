# GA4 Analytics Setup - Complete

## Overview

A comprehensive Google Analytics 4 reporting system has been built for the WebRankingReports project. Users can now view detailed analytics data per site with overview metrics, time-series data, and drilldowns into pages, geography, and technology.

## What Was Built

### PART 1: GA4 Report Edge Function ✅

**File:** `supabase/functions/ga4-report/index.ts`

**Features:**
- Token refresh handling (automatically refreshes expired GA4 tokens)
- Support for 4 report types:
  - `overview` - Time-series data with users, sessions, page views
  - `pages` - Page performance metrics
  - `geo` - Geographic breakdown (country, city)
  - `tech` - Technology breakdown (device, OS, browser)
- Normalized JSON response format
- Comprehensive error handling
- Date range support (defaults to last 28 days)

**API:**
- **Endpoint:** `POST /functions/v1/ga4-report`
- **Body:**
  ```json
  {
    "site_id": "uuid",
    "report_type": "overview" | "pages" | "geo" | "tech",
    "date_range": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }
  ```

### PART 2: useAnalytics Composable ✅

**File:** `composables/useAnalytics.ts`

**Features:**
- Reactive state for all report types
- Loading and error state management
- Convenience methods:
  - `fetchOverview(dateRange?)`
  - `fetchPages(dateRange?)`
  - `fetchGeo(dateRange?)`
  - `fetchTech(dateRange?)`
- TypeScript interfaces for type safety

### PART 3: Analytics Page ✅

**File:** `pages/sites/[id]/analytics.vue`

**Features:**
- **Overview Cards:**
  - Total Users
  - New Users
  - Sessions
  - Page Views
- **Time-Series View:**
  - Table showing daily metrics
  - Sorted by date
  - Ready for chart library integration
- **Date Range Selector:**
  - Last 7 days
  - Last 28 days (default)
  - Last 90 days
- **Tabbed Drilldowns:**
  - **Pages Tab:** Page path, users, sessions, page views, engaged sessions
  - **Geography Tab:** Country, city, users, sessions, page views
  - **Technology Tab:** Device category, OS, browser, users, sessions, page views
- **GA4 Connection Status:**
  - Shows connection status
  - Links to integrations page if not connected
- **Loading States:**
  - Skeleton loaders for overview cards
  - Loading indicators for tables
- **Empty States:**
  - Friendly messages when no data available

### PART 4: Future Extensions ✅

Added comprehensive comments for future enhancements:
- Events / Conversions reporting
- Landing pages analysis
- Source/Medium breakdown
- Demographics (age, gender)
- Additional visualizations
- Sub-pages for detailed analysis
- Filters and comparisons

## Setup Instructions

### 1. Deploy Edge Function

```bash
supabase functions deploy ga4-report --project-ref dwiqmfauxwbfcqlaplfy
```

### 2. Verify GA4 Connection

Ensure the site has GA4 connected:
- Go to `/sites/[id]/settings/integrations`
- Click "Connect Google" (unified OAuth)
- Verify `ga4_property_id` is set in `site_integrations`

### 3. Test the Analytics Page

1. Navigate to `/sites/[id]/analytics`
2. Verify overview cards load
3. Check time-series table
4. Test each drilldown tab (Pages, Geography, Technology)
5. Test date range selector

## File Structure

```
supabase/functions/ga4-report/
  └── index.ts                    # GA4 reporting Edge Function

composables/
  └── useAnalytics.ts             # Analytics composable

pages/sites/[id]/
  └── analytics.vue               # Analytics page
```

## API Response Format

The Edge Function returns normalized data:

```typescript
{
  reportType: "overview",
  startDate: "2024-01-01",
  endDate: "2024-01-31",
  rows: [
    {
      dimensionValues: {
        date: "20240101",
        // ... other dimensions
      },
      metricValues: {
        totalUsers: 1234,
        sessions: 5678,
        // ... other metrics
      }
    }
  ]
}
```

## Error Handling

- **400:** Invalid site_id, report_type, or GA4 not connected
- **404:** Site integration not found
- **500:** Internal server error (token refresh failure, API errors, etc.)

All errors include user-friendly messages.

## Next Steps

1. **Deploy the Edge Function** (see above)
2. **Test with a connected site** that has GA4 data
3. **Consider adding chart library** for better visualizations
4. **Extend with additional report types** as needed (see comments)

## Notes

- The time-series view currently uses a table format, but the data structure is ready for chart library integration
- All report types are lazy-loaded (only fetched when tab is selected)
- Date range changes automatically reload all data
- Token refresh happens automatically when tokens are expired

