import type PocketBase from 'pocketbase'
import { loadTransactionalTemplate, applyEmailPlaceholders } from '~/server/utils/transactionalEmailLoad'
import type { TransactionalTemplateId } from '~/server/api/admin/transactional-email-templates.shared'
import { sendHtmlEmail } from '~/server/utils/smtpSend'

export async function sendTransactionalEmail(
  pb: PocketBase,
  templateId: TransactionalTemplateId,
  to: string,
  vars: Record<string, string>,
): Promise<void> {
  const tpl = await loadTransactionalTemplate(pb, templateId)
  const { subject, body } = applyEmailPlaceholders(tpl, vars)
  await sendHtmlEmail({ to, subject, html: body })
}
