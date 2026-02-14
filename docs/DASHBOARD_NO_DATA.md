# Dashboard shows no data or zeros

## Where each widget gets its data

| Widget | API endpoint | Same as Analytics page? |
|--------|--------------|--------------------------|
| **Performance summary** (Users, Sessions, Page views) | `GET /api/google/analytics/report` | Yes – same as the Report table |
| **Sessions trend** (chart) | `GET /api/google/analytics/report` | Yes – same date/sessions data |
| **Top pages** | `GET /api/ga4/top-pages` | No – GA4 Data API, dimension `pagePath` |
| **Traffic channels** | `GET /api/ga4/channels` | No – GA4 Data API, dimension `sessionDefaultChannelGroup` |
| **Countries** | `GET /api/ga4/countries` | No – GA4 Data API, dimension `country` |
| **Landing pages** | `GET /api/ga4/landing-pages` | No – GA4 Data API, dimension `landingPage` |
| **Events** | `GET /api/ga4/events` | No – GA4 Data API, dimension `eventName` |
| **Ecommerce** | `GET /api/ga4/ecommerce` | No – GA4 Data API, ecommerce metrics |

All of these use the **same** GA4 property (the one you selected on the Analytics page) and the same auth. If Performance summary and Sessions trend show data but the rest don’t, the `/api/ga4/*` routes are either returning empty rows (no data for that dimension in GA4) or failing – check the Network tab for each request and any red error message in the widget.

---

If the analytics dashboard loads but widgets show **zeros**, **"No page data"**, or **red error messages**, work through this checklist.

## 1. Check what the API is returning

1. Open the dashboard page for your site.
2. Open **Chrome DevTools** → **Network** tab.
3. Filter by **Fetch/XHR**.
4. Reload the page (or change the date range).
5. Find requests to **`/api/ga4/...`** (e.g. `summary`, `timeseries`, `top-pages`).

**If the request is red (failed):**

- Click it and open **Response** (or **Preview**). The body usually contains a `message`:
  - **401 Unauthorized** → You’re not logged in or the session expired. Log in again.
  - **400 "Select a GA4 property first."** → You haven’t chosen a GA4 property for this site. Go to step 2.
  - **400 "Google Analytics not connected for this site."** → Connect Google Analytics for this site (step 2).
  - **502 "GA4 runReport failed: 403"** → Google is rejecting the request (permissions or APIs). See step 3 and 4.
  - **502 "GA4 runReport failed: 404"** → Wrong property ID or property was deleted. Re-select the property (step 2).

**If the request is 200 (success) but values are zero:**

- The GA4 property is connected and the API is working, but there is **no data** for the selected date range in that property. Try:
  - A longer range (e.g. Last 28 days or Last 90 days).
  - Confirming in [Google Analytics](https://analytics.google.com/) that the property has data for those dates.
  - Making sure you selected the correct GA4 property (step 2).

## 2. Connect Google Analytics and select a GA4 property

1. Go to **Dashboard** → click your site → **Analytics** (or **Integrations** and connect Google).
2. Click **Connect Google Analytics** and complete the Google sign-in.
3. Click **Load properties**, then choose your **GA4 property** from the dropdown.
4. Click **Use this property**.
5. Return to the **Analytics dashboard** for this site and reload.

The app only shows data for **GA4** properties (numeric property ID). Universal Analytics (UA-…) is not supported.

## 3. Enable the right Google APIs

In [Google Cloud Console](https://console.cloud.google.com/) (same project as your OAuth client):

- **APIs & Services** → **Library** → enable:
  - **Google Analytics Data API**
  - **Google Analytics Admin API**

See [docs/GOOGLE_APIS.md](./GOOGLE_APIS.md) for details.

## 4. OAuth scopes

The app requests `https://www.googleapis.com/auth/analytics.readonly`. If you changed OAuth scopes or use a different client, ensure this scope is included and that the user has re-authorized (disconnect and connect again in the app if needed).

## 5. Quick checklist

- [ ] Logged in to the app.
- [ ] For this site: Google Analytics connected and **a GA4 property selected** (Analytics page → “Use this property”).
- [ ] In GCP: **Google Analytics Data API** and **Google Analytics Admin API** enabled.
- [ ] In Network tab: `/api/ga4/summary` (or similar) returns **200** and the response body has non-zero values if you expect data.
- [ ] In GA4: the chosen property actually has data for the selected date range.

If you see a **specific error message** in a widget (red text), that message is from the server and is the next thing to fix (e.g. “Select a GA4 property first” → complete step 2).
