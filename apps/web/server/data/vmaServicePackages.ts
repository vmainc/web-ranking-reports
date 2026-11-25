/**
 * Default VMA service packages and proposal template (no WooCommerce).
 * Used by POST /api/crm/service-packages/seed-vma and proposal-template defaults.
 */

export const VMA_DEFAULT_PROPOSAL_TEMPLATE = {
  intro_html: `Virtual Market Advantage proposes the following scope of work. We focus on measurement-first execution—tracking, SEO, paid media, and development connected as one system.`,
  terms_html: `Monthly plans are month-to-month unless otherwise noted. One-time project fees are scoped after discovery; this proposal reflects the agreed scope at acceptance. Payment terms follow the billing interval on each line item. Work begins after acceptance and any required initial payment.`,
  currency: 'USD',
}

export type VmaPackageSeed = {
  sku: string
  name: string
  description_html: string
  default_unit_price: number
  billing_interval: 'month' | 'one_time' | 'year'
  category: 'monthly_plan' | 'one_time_project' | 'add_on'
  sort_order: number
}

export const VMA_SERVICE_PACKAGE_SEEDS: VmaPackageSeed[] = [
  {
    sku: 'vma-foundation',
    name: 'Foundation',
    category: 'monthly_plan',
    billing_interval: 'month',
    default_unit_price: 1650,
    sort_order: 10,
    description_html: `Tracking and ad infrastructure done correctly.

• Analytics setup (GA4 + key events)
• Search Console + index coverage checks
• Tag Manager + conversion tracking
• Google Ads structure + tracking verification
• Technical SEO cleanup (speed, errors, basics)
• Monthly report + prioritized action list

Best for: businesses under $1M/year—tracking, conversions, and Ads verification before scaling spend.`,
  },
  {
    sku: 'vma-growth',
    name: 'Growth',
    category: 'monthly_plan',
    billing_interval: 'month',
    default_unit_price: 3000,
    sort_order: 20,
    description_html: `Ongoing SEO, backlinks, and Google Ads management.

• Everything in Foundation
• On-page SEO (titles, headings, internal linking)
• Off-page SEO + backlink acquisition
• Content optimization (refreshes + new pages)
• Google Ads management (build, optimize, iterate)
• Conversion improvements (forms, UX, CTAs)

Best for: $1M–$5M/year—ongoing SEO and managed Google Ads for consistent leads.`,
  },
  {
    sku: 'vma-authority',
    name: 'Authority',
    category: 'monthly_plan',
    billing_interval: 'month',
    default_unit_price: 5500,
    sort_order: 30,
    description_html: `Multi-platform ads managed together with SEO.

• Everything in Growth
• Google Ads (advanced optimization + scaling)
• Bing / Microsoft Ads management
• Facebook + Instagram Ads (Meta)
• Custom reporting dashboards
• Quarterly strategy review

Best for: $3M–$15M/year—competitive markets that need SEO and multi-platform ads as one system.`,
  },
  {
    sku: 'vma-partnership',
    name: 'Partnership',
    category: 'monthly_plan',
    billing_interval: 'month',
    default_unit_price: 10000,
    sort_order: 40,
    description_html: `Everything in Authority, plus custom development.

• Everything in Authority
• Custom development (features, integrations)
• Landing pages + CRO (build + iterate)
• Advanced dashboards on what drives revenue
• Weekly strategy cadence + priority execution
• Direct access to Doug for planning

Best for: $10M+/year—one partner for marketing, measurement, and development.`,
  },
  {
    sku: 'vma-website-basic',
    name: 'Basic website build',
    category: 'one_time_project',
    billing_interval: 'one_time',
    default_unit_price: 4500,
    sort_order: 50,
    description_html: `Conversion-focused marketing website (starting price).

• 5–10 page marketing website
• Conversion-first layout
• Core SEO structure
• GA4 + tracking setup
• Mobile optimized

Best for: businesses under $1M/year that want a strong marketing site built correctly.`,
  },
  {
    sku: 'vma-website-ecommerce',
    name: 'Basic ecommerce build',
    category: 'one_time_project',
    billing_interval: 'one_time',
    default_unit_price: 9500,
    sort_order: 60,
    description_html: `Ecommerce build (starting price).

• WooCommerce or Shopify build
• Up to 100 products
• Payment + tax integration
• Product structure + filtering
• Conversion optimization baseline

Best for: $1M–$5M/year launching or upgrading ecommerce.`,
  },
  {
    sku: 'vma-website-custom',
    name: 'Custom development project',
    category: 'one_time_project',
    billing_interval: 'one_time',
    default_unit_price: 18000,
    sort_order: 70,
    description_html: `Custom development (starting price).

• Custom functionality
• API integrations
• Advanced UX flows
• CRM / automation systems
• Scalable architecture planning

Best for: $3M+/year needing integrations, automation, or custom functionality.`,
  },
]