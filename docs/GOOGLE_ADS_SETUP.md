# Google Ads – API and OAuth checklist

To show Google Ads data (accounts, campaign summary) the app needs the **Google Ads API** enabled, a **developer token**, and an OAuth token that includes the **adwords** scope.

---

## 1. Google Cloud – enable Google Ads API

Use the **same project** that has your OAuth client (the one in Admin → Integrations → Google OAuth).

1. Open [Google Cloud Console](https://console.cloud.google.com/) and select that project.
2. Go to **APIs & Services** → **Library**.
3. Search for **Google Ads API**.
4. Open it and click **Enable**.

Without this, calls to `googleads.googleapis.com` can fail even if the developer token and OAuth are correct.

---

## 2. OAuth consent – adwords scope

The app requests this scope when users “Connect Google”:  
`https://www.googleapis.com/auth/adwords`

- If your OAuth consent screen already includes this scope (or “See your Google Ads data”), you’re fine.
- If you added the Google Ads API or this scope **after** users first connected, their stored token may not include it. They need to **disconnect** and **reconnect** Google on the site’s Integrations page so Google asks for the new scope and the app stores a new refresh token.

---

## 3. Google Ads – developer token

1. In [Google Ads](https://ads.google.com), open **API Center**:  
   [https://ads.google.com/aw/apicenter](https://ads.google.com/aw/apicenter)
2. Apply for / copy your **developer token** (22-character string).
3. In the app: **Admin → Integrations** → **Google Ads** section → paste **Developer token** → **Save**.

Until this is set, “Load accounts” and campaign data will return 503 / 502.

---

## 4. Reconnect Google (to get adwords scope)

If the site was connected before the Google Ads API or adwords scope was set:

1. Go to the **site** → **Integrations**.
2. **Disconnect** Google.
3. **Connect** Google again and, on the consent screen, approve access to **Google Ads** (or “See your Google Ads data”).
4. Then open **Google Ads** for that site, click **Load accounts**, choose an account, and refresh the summary.

---

## Quick checklist

| Step | Where | What |
|------|--------|------|
| 1 | Google Cloud → APIs & Services → Library | Enable **Google Ads API** |
| 2 | Google Cloud → OAuth consent screen | Ensure **adwords** (or “Google Ads”) scope is listed |
| 3 | Google Ads → API Center | Get **developer token** |
| 4 | App → Admin → Integrations | Save **developer token** in Google Ads section |
| 5 | App → Site → Integrations | **Disconnect** then **Connect** Google to refresh scopes |

If you still get 502 on summary, check the app’s error message (or server logs) for the exact Google API error (e.g. permission denied, test account, invalid token).
