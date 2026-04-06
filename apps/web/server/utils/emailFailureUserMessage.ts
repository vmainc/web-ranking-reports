/**
 * User-facing copy when transactional email fails after the user record was created.
 */
export function emailFailureUserMessage(err: unknown, kind: 'member' | 'client' | 'report'): string {
  const raw = err instanceof Error ? err.message : String(err)
  const created =
    kind === 'member'
      ? 'The team member account was created, but the invite email could not be sent.'
      : kind === 'client'
        ? 'The client account was created, but the invite email could not be sent.'
        : 'The report link could not be emailed.'
  if (/smtp\.example\.com|ENOTFOUND|getaddrinfo/i.test(raw)) {
    return `${created} PocketBase Mailer is still using a placeholder or invalid SMTP host—open PocketBase Admin → Settings → Mailer and set a real SMTP server (e.g. your provider’s host, not smtp.example.com). They can still sign in with Forgot password on the login page.`
  }
  if (/535|Incorrect authentication|Invalid login/i.test(raw)) {
    const smtpHint =
      kind === 'report'
        ? ' On the web server, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD (20i: smtp.stackmail.com), restart the web container, and confirm PocketBase Mail → sender address is set.'
        : ' On the web server, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASSWORD (20i: smtp.stackmail.com, port 587 or 465), restart the web container, and confirm Admin → Emails shows those env flags. They can still sign in with Forgot password on the login page.'
    return `${created} SMTP login was rejected (535).${smtpHint}`
  }
  const tail =
    kind === 'report'
      ? ''
      : ' They can still sign in with Forgot password on the login page.'
  return `${created} ${raw.slice(0, 180).trim()}${tail}`
}
