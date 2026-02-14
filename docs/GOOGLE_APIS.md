# Google APIs to enable (Analytics dashboard)

The analytics dashboard uses **Google Analytics 4**. For it to work, these APIs must be enabled in **Google Cloud Console** for the same project you use for OAuth.

## 1. Open your Google Cloud project

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Select the project that has your **OAuth 2.0 Client ID** (the one used for “Connect Google Analytics” in the app).

## 2. Enable these APIs

In **APIs & Services → Library**, search for and **Enable**:

| API name | Used for |
|----------|----------|
| **Google Analytics Data API** | Dashboard metrics: KPI summary, sessions trend, top pages, channels, countries, events, ecommerce. |
| **Google Analytics Admin API** | Listing GA4 accounts and properties when the user selects a property. |

Direct links (replace `YOUR_PROJECT_ID` with your project ID if needed):

- [Google Analytics Data API](https://console.cloud.google.com/apis/library/analyticsdata.googleapis.com)
- [Google Analytics Admin API](https://console.cloud.google.com/apis/library/analyticsadmin.googleapis.com)

## 3. OAuth scopes (already in the app)

The app requests:

- `https://www.googleapis.com/auth/analytics.readonly` — read GA4 data  
- `https://www.googleapis.com/auth/webmasters.readonly` — Search Console (if you add that later)

No change needed unless you add more Google products.

## 4. If you see 403 or “Could not list GA properties”

- Enable **Google Analytics Admin API** (see above).
- If the dashboard widgets return errors, enable **Google Analytics Data API**.
- Ensure the Google account you use to “Connect Google Analytics” has access to at least one GA4 property.

## 5. Quick checklist

- [ ] Same GCP project as your OAuth client
- [ ] **Google Analytics Data API** — Enabled
- [ ] **Google Analytics Admin API** — Enabled
- [ ] User has connected a site to Google Analytics in the app and selected a GA4 property
