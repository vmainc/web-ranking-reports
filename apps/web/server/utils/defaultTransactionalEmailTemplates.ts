import type { EmailTemplatePayload } from '~/server/api/admin/transactional-email-templates.shared'

/** Default subject + HTML body when no row exists in app_settings yet. */
export const DEFAULT_TRANSACTIONAL_TEMPLATES: Record<string, EmailTemplatePayload> = {
  agency_member_invite: {
    subject: 'You’re invited to join {AGENCY_NAME} on {APP_NAME}',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table role="presentation" width="100%"><tr><td align="center">
<table style="max-width:560px;background:#fff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">Hi {MEMBER_NAME},</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
<strong>{INVITER_NAME}</strong> added you to <strong>{AGENCY_NAME}</strong> on <strong>{APP_NAME}</strong>. You’ll have access to the same sites and tools as the team.
</p>
<p style="margin:0 0 12px;font-size:15px;color:#18181b;font-weight:600;">How to get in</p>
<ol style="margin:0 0 20px;padding-left:20px;font-size:15px;color:#3f3f46;line-height:1.65;">
<li style="margin-bottom:8px;"><strong>Choose your password.</strong> You should receive a <em>second email</em> (password reset) with a link—open it and pick a password. If you don’t see it, use the button below to request a link.</li>
<li><strong>Sign in</strong> at the login page with this email address and the password you set.</li>
</ol>
<p style="margin:0 0 8px;" align="center">
<a href="{SET_PASSWORD_URL}" style="display:inline-block;background:#7c3aed;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Set my password</a>
</p>
<p style="margin:12px 0 8px;font-size:12px;color:#71717a;text-align:center;">Or paste: {SET_PASSWORD_URL}</p>
<p style="margin:16px 0 8px;" align="center">
<a href="{LOGIN_URL}" style="display:inline-block;background:#2563eb;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Sign in</a>
</p>
<p style="margin:16px 0 0;font-size:12px;color:#71717a;word-break:break-all;">{LOGIN_URL}</p>
<p style="margin:16px 0 0;font-size:13px;color:#52525b;">On the sign-in page you can always use <strong>Forgot password</strong> if you need a new link.</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">— {APP_NAME} · {APP_URL}</p>
</td></tr></table></td></tr></table></body></html>`,
  },
  client_invite: {
    subject: 'You’re invited to {APP_NAME}',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table role="presentation" width="100%"><tr><td align="center">
<table style="max-width:560px;background:#fff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">Hi {CLIENT_NAME},</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
<strong>{AGENCY_NAME}</strong> has invited you to view reports on <strong>{APP_NAME}</strong> (read-only access).
</p>
<p style="margin:0 0 12px;font-size:15px;color:#18181b;font-weight:600;">How to get in</p>
<ol style="margin:0 0 20px;padding-left:20px;font-size:15px;color:#3f3f46;line-height:1.65;">
<li style="margin-bottom:8px;"><strong>Choose your password.</strong> Look for a <em>password reset</em> email and use the link inside. If it’s missing, use <strong>Set my password</strong> below.</li>
<li><strong>Sign in</strong> with this email and your new password.</li>
</ol>
<p style="margin:0 0 8px;" align="center">
<a href="{SET_PASSWORD_URL}" style="display:inline-block;background:#7c3aed;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Set my password</a>
</p>
<p style="margin:12px 0 8px;font-size:12px;color:#71717a;text-align:center;">Or paste: {SET_PASSWORD_URL}</p>
<p style="margin:16px 0 8px;" align="center">
<a href="{LOGIN_URL}" style="display:inline-block;background:#2563eb;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Sign in</a>
</p>
<p style="margin:16px 0 0;font-size:12px;color:#71717a;word-break:break-all;">{LOGIN_URL}</p>
<p style="margin:16px 0 0;font-size:13px;color:#52525b;">Use <strong>Forgot password</strong> on the sign-in page anytime you need a new link.</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">— {APP_NAME} · {APP_URL}</p>
</td></tr></table></td></tr></table></body></html>`,
  },
  site_access_granted: {
    subject: 'You now have access to {SITE_NAME}',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table role="presentation" width="100%"><tr><td align="center">
<table style="max-width:560px;background:#fff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">Hello,</p>
<p style="margin:0 0 16px;font-size:15px;color:#3f3f46;line-height:1.6;">
<strong>{AGENCY_NAME}</strong> has granted you access to <strong>{SITE_NAME}</strong> ({SITE_DOMAIN}) on {APP_NAME}.
</p>
<p style="margin:0 0 20px;font-size:15px;color:#3f3f46;">Open the dashboard to view reports (read-only).</p>
<p style="margin:0;" align="center">
<a href="{SITE_URL}" style="display:inline-block;background:#0d9488;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View site</a>
</p>
<p style="margin:16px 0 0;font-size:12px;color:#71717a;word-break:break-all;">{SITE_URL}</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">{APP_NAME} · {APP_URL}</p>
</td></tr></table></td></tr></table></body></html>`,
  },
  agency_new_site: {
    subject: 'New site added: {SITE_NAME}',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table role="presentation" width="100%"><tr><td align="center">
<table style="max-width:560px;background:#fff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">A new site was added to your account.</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">{SITE_NAME}</p>
<p style="margin:0 0 20px;font-size:14px;color:#52525b;">{SITE_DOMAIN}</p>
<p style="margin:0;" align="center">
<a href="{DASHBOARD_URL}" style="display:inline-block;background:#2563eb;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">Open dashboard</a>
</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">{APP_NAME} · {APP_URL}</p>
</td></tr></table></td></tr></table></body></html>`,
  },
  report_ready: {
    subject: 'Your report is ready: {REPORT_TITLE}',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table role="presentation" width="100%"><tr><td align="center">
<table style="max-width:560px;background:#fff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">Your report is ready.</p>
<p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#18181b;">{REPORT_TITLE}</p>
<p style="margin:0 0 20px;font-size:14px;color:#52525b;">Site: {SITE_NAME}</p>
<p style="margin:0;" align="center">
<a href="{REPORT_URL}" style="display:inline-block;background:#7c3aed;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View report</a>
</p>
<p style="margin:16px 0 0;font-size:12px;color:#71717a;word-break:break-all;">{REPORT_URL}</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">{APP_NAME} · {APP_URL}</p>
</td></tr></table></td></tr></table></body></html>`,
  },
  lead_form_submission: {
    subject: 'New lead: {SITE_NAME} — {FORM_NAME}',
    body: `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;">
<table role="presentation" width="100%"><tr><td align="center">
<table style="max-width:560px;background:#fff;border-radius:12px;padding:28px;">
<tr><td>
<p style="margin:0 0 16px;font-size:15px;color:#18181b;">New form submission</p>
<p style="margin:0 0 8px;font-size:14px;color:#3f3f46;"><strong>Site:</strong> {SITE_NAME} ({SITE_DOMAIN})</p>
<p style="margin:0 0 16px;font-size:14px;color:#3f3f46;"><strong>Form:</strong> {FORM_NAME}</p>
<div style="margin:0 0 20px;padding:12px;border-radius:8px;background:#f4f4f5;font-size:14px;color:#18181b;white-space:pre-wrap;">{LEAD_SUMMARY}</div>
<p style="margin:0;" align="center">
<a href="{SUBMISSIONS_URL}" style="display:inline-block;background:#ea580c;color:#fff !important;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:8px;">View in app</a>
</p>
<p style="margin:24px 0 0;font-size:12px;color:#a1a1aa;">{APP_NAME} · {APP_URL}</p>
</td></tr></table></td></tr></table></body></html>`,
  },
}
