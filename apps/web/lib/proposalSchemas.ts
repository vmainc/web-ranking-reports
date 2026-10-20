import { z } from 'zod'

export const proposalStatusSchema = z.enum([
  'draft',
  'sent',
  'viewed',
  'accepted',
  'declined',
  'superseded',
  'expired',
])

export const proposalItemSourceSchema = z.enum(['woo', 'manual', 'package'])

export const proposalItemInputSchema = z.object({
  source: proposalItemSourceSchema.optional(),
  product: z.string().optional().nullable(),
  external_product_id: z.string().max(64).optional().nullable(),
  sku: z.string().max(128).optional().nullable(),
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional().nullable(),
  qty: z.number().min(0),
  unit_price: z.number(),
  billing_interval: z.enum(['one_time', 'month', 'year', 'custom']).optional().nullable(),
  metadata_json: z.record(z.unknown()).optional().nullable(),
})

const proposalSectionSchema = z.object({
  id: z.string().min(1).max(64),
  key: z.string().max(64),
  title: z.string().min(1).max(255),
  body: z.string().max(50000),
  hidden: z.boolean(),
  sort_order: z.number().int().min(0),
})

const proposalContentSchema = z.object({
  schema_version: z.literal(1).optional(),
  client: z
    .object({
      client_name: z.string().max(255).optional(),
      company: z.string().max(255).optional(),
      contact_name: z.string().max(255).optional(),
      email: z.string().max(255).optional(),
      phone: z.string().max(64).optional(),
      project_title: z.string().max(255).optional(),
      proposal_date: z.string().max(32).optional(),
      expiration_date: z.string().max(32).optional(),
    })
    .optional(),
  sections: z.array(proposalSectionSchema).max(40).optional(),
  pricing: z
    .object({
      discount_type: z.enum(['percent', 'amount']).nullable().optional(),
      discount_value: z.number().min(0).optional(),
      discount_applies_to: z.enum(['one_time', 'all']).optional(),
    })
    .optional(),
  brand: z
    .object({
      mission: z.string().max(10000).optional(),
      vision: z.string().max(10000).optional(),
      closing_statement: z.string().max(2000).optional(),
      gradient: z.array(z.string().max(16)).max(6).optional(),
    })
    .optional(),
  show_closing: z.boolean().optional(),
})

export const proposalCreateSchema = z.object({
  client: z.string().min(1),
  sale: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  title: z.string().min(1).max(255),
  intro_html: z.string().max(50000).optional().nullable(),
  terms_html: z.string().max(50000).optional().nullable(),
  content_json: proposalContentSchema.optional().nullable(),
  template_id: z.string().optional().nullable(),
  currency: z.string().min(1).max(8).optional(),
  valid_until: z.string().optional().nullable(),
  items: z.array(proposalItemInputSchema).optional(),
})

export const proposalPatchSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  intro_html: z.string().max(50000).optional().nullable(),
  terms_html: z.string().max(50000).optional().nullable(),
  content_json: proposalContentSchema.optional().nullable(),
  currency: z.string().min(1).max(8).optional(),
  valid_until: z.string().optional().nullable(),
  site: z.string().optional().nullable(),
  acceptance_options_json: z
    .object({
      mark_deal_won: z.boolean().optional(),
      convert_lead_to_client: z.boolean().optional(),
      promote_site_to_active: z.boolean().optional(),
      create_onboarding_tasks: z.boolean().optional(),
      log_activity: z.boolean().optional(),
      set_pipeline_stage_won: z.boolean().optional(),
    })
    .optional()
    .nullable(),
})

export const proposalItemsReplaceSchema = z.object({
  items: z.array(proposalItemInputSchema),
})

export const proposalTemplateCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional().nullable(),
  content_json: proposalContentSchema.optional().nullable(),
  is_default: z.boolean().optional(),
})

export const proposalTemplatePatchSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional().nullable(),
  content_json: proposalContentSchema.optional().nullable(),
  is_default: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
})

export const proposalBrandPatchSchema = z.object({
  mission: z.string().max(10000).optional(),
  vision: z.string().max(10000).optional(),
  closing_statement: z.string().max(2000).optional(),
  gradient: z.array(z.string().max(16)).max(6).optional(),
  default_terms: z.string().max(50000).optional(),
})
