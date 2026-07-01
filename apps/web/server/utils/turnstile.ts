// Verify Cloudflare Turnstile when TURNSTILE_SECRET_KEY is configured.
// Optional in local dev — honeypot + rate limiting still apply.

export function turnstileConfigured(secret: string | undefined): boolean {
  return typeof secret === 'string' && secret.trim().length > 0
}

export async function verifyTurnstileToken(
  token: string,
  secret: string,
  remoteIp?: string,
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = token?.trim()
  if (!trimmed) {
    return { ok: false, error: 'Please complete the security check and try again.' }
  }
  try {
    const body = new URLSearchParams({
      secret: secret.trim(),
      response: trimmed,
    })
    if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp)
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })
    const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] }
    if (data.success) return { ok: true }
    return { ok: false, error: 'Security check failed. Please refresh and try again.' }
  } catch {
    return { ok: false, error: 'Could not verify security check. Please try again in a moment.' }
  }
}
