import nodemailer from 'nodemailer'
import { getAdminPb, adminAuth } from '~/server/utils/pbServer'

type PbSmtp = {
  enabled?: boolean
  host?: string
  port?: number
  username?: string
  password?: string
  tls?: boolean
  /** PLAIN or LOGIN (e.g. Microsoft); from PocketBase Mail settings. */
  authMethod?: string
  /** EHLO/HELO hostname; some providers require a real domain. */
  localName?: string
}

/** PocketBase API redacts secrets as ****** — never use that string as the real password. */
function isRedactedSmtpSecret(value: string | undefined): boolean {
  if (value == null || value === '') return true
  if (value === '******') return true
  return /^\*+$/.test(value)
}

function passwordFromEnvOnly(): string {
  /** Prefer live process.env (Docker / Compose) over runtimeConfig — build-time smtpPassword can differ and cause 535 while raw nodemailer verify passes. */
  const fromEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env.SMTP_PASSWORD || process.env.NUXT_SMTP_PASSWORD || process.env.PB_SMTP_PASSWORD || '').trim()
      : ''
  if (fromEnv) return fromEnv
  const config = useRuntimeConfig()
  return typeof config.smtpPassword === 'string' ? config.smtpPassword.trim() : ''
}

function usernameFromEnvOnly(): string {
  const fromEnv =
    typeof process !== 'undefined' && process.env
      ? (process.env.SMTP_USER || process.env.SMTP_USERNAME || process.env.NUXT_SMTP_USERNAME || '').trim()
      : ''
  if (fromEnv) return fromEnv
  const config = useRuntimeConfig()
  return typeof config.smtpUsername === 'string' ? config.smtpUsername.trim() : ''
}

function readEnv(key: string): string {
  if (typeof process === 'undefined' || !process.env) return ''
  return (process.env[key] ?? '').trim()
}

/**
 * When SMTP_HOST is set, host/port/auth come only from env (recommended on VPS to avoid PB API quirks + 535).
 * Set: SMTP_HOST, SMTP_PORT (587 or 465), SMTP_PASSWORD, SMTP_USER (or SMTP_USERNAME).
 * Optional: SMTP_SECURE=true (force TLS wrapper), SMTP_AUTH_METHOD=LOGIN|PLAIN, SMTP_EHLO=yourdomain.com
 */
function resolveSmtpRelayFromEnv():
  | null
  | {
      host: string
      port: number
      secure: boolean
      requireTLS: boolean
      user: string
      pass: string
      authMethod?: 'PLAIN' | 'LOGIN'
      name?: string
    } {
  const host = readEnv('SMTP_HOST')
  if (!host) return null
  const port = parseInt(readEnv('SMTP_PORT') || '587', 10) || 587
  const forceSecure = readEnv('SMTP_SECURE') === 'true' || readEnv('SMTP_SECURE') === '1'
  const secure = forceSecure || port === 465
  const user = usernameFromEnvOnly()
  const pass = passwordFromEnvOnly()
  if (!user || !pass) {
    throw createError({
      statusCode: 503,
      message:
        'SMTP_HOST is set on the web server. Also set SMTP_PASSWORD and SMTP_USER (or SMTP_USERNAME) to the mailbox that may send mail, then restart the web container.',
    })
  }
  const am = readEnv('SMTP_AUTH_METHOD').toUpperCase()
  const authMethod = am === 'LOGIN' ? ('LOGIN' as const) : am === 'PLAIN' ? ('PLAIN' as const) : undefined
  const name = readEnv('SMTP_EHLO') || readEnv('SMTP_LOCAL_NAME') || undefined
  const relax = readEnv('SMTP_RELAX_TLS') === '1' || readEnv('SMTP_RELAX_TLS') === 'true'
  return {
    host,
    port,
    secure,
    requireTLS: !relax && port === 587 && !secure,
    user,
    pass,
    ...(authMethod ? { authMethod } : {}),
    ...(name ? { name } : {}),
  }
}

/**
 * Prefer Docker/runtime env over PocketBase API: PB may redact or return values that confuse nodemailer.
 * @see https://pocketbase.io/docs/api-settings/
 */
function resolveSmtpPassword(smtp: PbSmtp): string {
  const envFirst = passwordFromEnvOnly()
  if (envFirst) return envFirst
  const stored = smtp.password
  if (!isRedactedSmtpSecret(stored)) return (stored ?? '').trim()
  throw createError({
    statusCode: 503,
    message:
      'SMTP password is not exposed by PocketBase’s API (it returns ******). Add SMTP_PASSWORD (or NUXT_SMTP_PASSWORD) to the web server environment with the same mailbox password as PocketBase Mail → restart the web app.',
  })
}

function resolveSmtpUsername(smtp: PbSmtp): string {
  const envFirst = usernameFromEnvOnly()
  if (envFirst) return envFirst
  return (smtp.username ?? '').trim()
}

/**
 * Send HTML email using PocketBase mailer settings (admin API).
 * Requires SMTP enabled and PB admin credentials on the server.
 */
export async function sendHtmlEmail(opts: {
  to: string
  subject: string
  html: string
  text?: string
  attachments?: Array<{ filename: string; content: Buffer; contentType?: string }>
}): Promise<void> {
  const pb = getAdminPb()
  await adminAuth(pb)
  const s = (await pb.settings.getAll()) as { smtp?: PbSmtp; meta?: { senderName?: string; senderAddress?: string } }
  const smtp = s.smtp
  const relay = resolveSmtpRelayFromEnv()

  if (!relay) {
    if (!smtp?.enabled || !smtp.host || !smtp.port) {
      throw createError({ statusCode: 503, message: 'SMTP is not enabled or incomplete in PocketBase Settings → Mailer.' })
    }
  }

  const fromName = s.meta?.senderName || 'Web Ranking Reports'
  const fromAddr = s.meta?.senderAddress || ''
  if (!fromAddr) {
    throw createError({ statusCode: 503, message: 'Set sender address in PocketBase Settings → Application.' })
  }

  const pass = relay ? relay.pass : resolveSmtpPassword(smtp!)
  const user = relay ? relay.user : resolveSmtpUsername(smtp!)
  const authMethodRaw = relay ? '' : (smtp!.authMethod ?? '').trim().toUpperCase()
  const authMethodPb = authMethodRaw === 'LOGIN' ? 'LOGIN' : authMethodRaw === 'PLAIN' ? 'PLAIN' : undefined
  const authMethod = relay?.authMethod ?? authMethodPb

  const relaxPb = readEnv('SMTP_RELAX_TLS') === '1' || readEnv('SMTP_RELAX_TLS') === 'true'
  /** Avoid hanging SMTP (Caddy/nginx then returns 502 to the browser). */
  const smtpTimeoutMs = Math.min(Math.max(parseInt(readEnv('SMTP_TIMEOUT_MS') || '20000', 10) || 20000, 5000), 120000)
  const timeouts = {
    connectionTimeout: smtpTimeoutMs,
    greetingTimeout: smtpTimeoutMs,
    socketTimeout: smtpTimeoutMs,
  }
  const transporter = relay
    ? nodemailer.createTransport({
        host: relay.host,
        port: relay.port,
        secure: relay.secure,
        requireTLS: relay.requireTLS,
        name: relay.name,
        auth: { user, pass },
        ...timeouts,
        ...(authMethod ? { authMethod } : {}),
      })
    : nodemailer.createTransport({
        host: smtp!.host,
        port: smtp!.port,
        secure: smtp!.port === 465,
        requireTLS: !relaxPb && smtp!.port === 587,
        name: (smtp!.localName ?? '').trim() || undefined,
        auth: user ? { user, pass } : undefined,
        ...timeouts,
        ...(authMethod ? { authMethod } : {}),
      })

  const attachments = opts.attachments?.length
    ? opts.attachments.map((a) => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentType ? { contentType: a.contentType } : {}),
      }))
    : undefined

  await transporter.sendMail({
    from: `"${fromName}" <${fromAddr}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
    html: opts.html,
    ...(attachments ? { attachments } : {}),
  })
}

/** True when process.env has a real mailbox user + password (PocketBase API never returns the password). */
export function transactionalSmtpEnvReady(): boolean {
  const d = smtpEnvDiagnostics()
  return d.usernameFromEnv && d.passwordFromEnv
}

/**
 * Fail before creating users when invite mail cannot possibly send (no env SMTP creds).
 * PocketBase’s settings API never returns the real mailer password.
 */
export function assertTransactionalSmtpEnvReady(): void {
  if (transactionalSmtpEnvReady()) return
  throw createError({
    statusCode: 503,
    message:
      'Invite email is not configured on this server. Add SMTP_USER and SMTP_PASSWORD to infra/.env (same mailbox as PocketBase → Settings → Mailer), then restart the web app: docker compose -f infra/docker-compose.yml up -d web. PocketBase’s API does not expose the mail password.',
  })
}

/** For admin diagnostics: whether the web process has SMTP credentials from env (transactional mail). */
export function smtpEnvDiagnostics(): {
  passwordFromEnv: boolean
  usernameFromEnv: boolean
  smtpHostOverride: boolean
} {
  const p = typeof process !== 'undefined' && process.env ? process.env : {}
  const pass = (p.SMTP_PASSWORD || p.NUXT_SMTP_PASSWORD || p.PB_SMTP_PASSWORD || '').trim()
  const user = (p.SMTP_USER || p.SMTP_USERNAME || p.NUXT_SMTP_USERNAME || '').trim()
  return {
    passwordFromEnv: pass.length > 0 && !isRedactedSmtpSecret(pass),
    usernameFromEnv: user.length > 0,
    smtpHostOverride: readEnv('SMTP_HOST').length > 0,
  }
}
