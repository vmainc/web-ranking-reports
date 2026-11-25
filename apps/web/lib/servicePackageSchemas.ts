import { z } from 'zod'

export const servicePackageBillingSchema = z.enum(['one_time', 'month', 'year'])
export const servicePackageCategorySchema = z.enum(['monthly_plan', 'one_time_project', 'add_on'])

export const servicePackageInputSchema = z.object({
  sku: z.string().min(1).max(64),
  name: z.string().min(1).max(255),
  description_html: z.string().max(20000).optional().nullable(),
  default_unit_price: z.number(),
  billing_interval: servicePackageBillingSchema,
  category: servicePackageCategorySchema.optional().nullable(),
  sort_order: z.number().int().optional(),
  active: z.boolean().optional(),
  stripe_product_id: z.string().max(128).optional().nullable(),
  stripe_price_id: z.string().max(128).optional().nullable(),
})

export const servicePackagePatchSchema = servicePackageInputSchema.partial().omit({ sku: true }).extend({
  sku: z.string().min(1).max(64).optional(),
})

export const proposalTemplatePatchSchema = z.object({
  intro_html: z.string().max(50000).optional().nullable(),
  terms_html: z.string().max(50000).optional().nullable(),
  currency: z.string().min(1).max(8).optional(),
})