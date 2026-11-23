import { CRM_TAG_PREVIOUS_CLIENT } from '~/utils/crmContactTags'

export type EmailCampaignRecipientMode = 'all' | 'site' | 'tag'

/** Pre-built campaign draft (name, subject, body, suggested audience). */
export interface EmailCampaignStarterTemplate {
  id: string
  name: string
  description: string
  campaignName: string
  subject: string
  bodyHtml: string
  recipientMode: EmailCampaignRecipientMode
  /** When recipientMode is `tag`. */
  tag?: string
}

export const EMAIL_CAMPAIGN_STARTER_TEMPLATES: EmailCampaignStarterTemplate[] = [
  {
    id: 'previous-client-checkin',
    name: 'Previous client check-in',
    description: 'Warm re-open for past customers — low pressure, reply CTA.',
    campaignName: 'Previous client check-in',
    subject: 'Quick check-in from your marketing team',
    recipientMode: 'tag',
    tag: CRM_TAG_PREVIOUS_CLIENT,
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>It&rsquo;s been a while since we worked together, and I wanted to reach out personally.</p>
<p>We&rsquo;re still helping local businesses with SEO, websites, and clear reporting&mdash;not a big pitch, just checking whether search or your site is on your radar this quarter.</p>
<p>If a short call would help, reply to this email and we&rsquo;ll find 15 minutes. If now&rsquo;s not the time, no worries at all.</p>
<p>&mdash; The team</p>`,
  },
  {
    id: 'audit-lead-followup',
    name: 'Audit lead follow-up',
    description: 'After someone runs your website audit — offer to walk through results.',
    campaignName: 'Website audit follow-up',
    subject: 'Your website audit results — want a quick walkthrough?',
    recipientMode: 'all',
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>Thanks for running a website audit with us. We put together a snapshot of how your site looks to Google and to visitors.</p>
<p>If you&rsquo;d like help prioritizing fixes or understanding what matters most for your business, reply to this email&mdash;we&rsquo;re happy to review the report with you on a short call.</p>
<p>&mdash; The team</p>`,
  },
  {
    id: 'quarterly-seo-touch',
    name: 'Quarterly SEO touch',
    description: 'Light quarterly check-in for clients and active leads.',
    campaignName: 'Quarterly SEO touch',
    subject: 'Quick Q{{quarter}} SEO check-in',
    recipientMode: 'all',
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>As we head into a new quarter, here&rsquo;s a short note from our team.</p>
<p>If you want a fresh look at rankings, site health, or what competitors are doing in search, reply and we&rsquo;ll line up a brief review. No obligation&mdash;just here if it&rsquo;s useful.</p>
<p>&mdash; The team</p>`,
  },
  {
    id: 'product-update',
    name: 'Client product update',
    description: 'Announce portal, reports, or rank tracking — narrow audience in Recipients before send.',
    campaignName: 'Client portal update',
    subject: 'New reporting tools for your site',
    recipientMode: 'all',
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>We&rsquo;ve added clearer online reporting so you can see site performance and rankings in one place.</p>
<p>If you&rsquo;d like access or a quick tour, reply to this email and we&rsquo;ll get you set up.</p>
<p>&mdash; The team</p>`,
  },
  {
    id: 'referral-ask',
    name: 'Referral ask',
    description: 'Simple referral request — send to customers you tag or trim the list in CRM first.',
    campaignName: 'Referral ask',
    subject: 'Know someone who could use help with their website?',
    recipientMode: 'all',
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>If you&rsquo;ve been happy working with us, we&rsquo;d appreciate an introduction to another business owner who might need help with their website or visibility in Google.</p>
<p>Just reply with a name and email, or have them reach out directly&mdash;we&rsquo;ll take good care of them.</p>
<p>Thank you,</p>
<p>&mdash; The team</p>`,
  },
  {
    id: 'win-back',
    name: 'Respectful win-back',
    description: 'For lapsed contacts tagged as previous clients.',
    campaignName: 'Win-back',
    subject: 'Still here if you need us',
    recipientMode: 'tag',
    tag: CRM_TAG_PREVIOUS_CLIENT,
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>We haven&rsquo;t connected in a while. If your site or marketing slipped down the priority list, that&rsquo;s normal&mdash;when it matters again, we&rsquo;re here.</p>
<p>Reply anytime if you&rsquo;d like a fresh perspective or a second opinion on your next step online.</p>
<p>&mdash; The team</p>`,
  },
]

export function getEmailCampaignStarterTemplate(id: string): EmailCampaignStarterTemplate | undefined {
  const key = id.trim().toLowerCase()
  return EMAIL_CAMPAIGN_STARTER_TEMPLATES.find((t) => t.id === key)
}

/** CRM quick links — template id + label. */
export const CRM_EMAIL_SHORTCUTS: { templateId: string; label: string }[] = [
  { templateId: 'previous-client-checkin', label: 'Email previous clients' },
  { templateId: 'audit-lead-followup', label: 'Audit follow-up' },
  { templateId: 'quarterly-seo-touch', label: 'Quarterly check-in' },
]