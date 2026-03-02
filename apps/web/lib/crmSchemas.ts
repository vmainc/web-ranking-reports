import { z } from 'zod'

export const crmClientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
  status: z.enum(['lead', 'client', 'archived']),
  notes: z.string().max(10000).optional(),
  pipeline_stage: z.enum(['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']).optional(),
  source: z.string().max(255).optional(),
  next_step: z.string().max(2000).optional(),
  tags_json: z.array(z.string()).optional(),
})

export const crmContactPointSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  kind: z.enum(['call', 'email', 'meeting', 'note']),
  happened_at: z.string().datetime(),
  summary: z.string().max(5000).optional(),
})

export const crmSaleSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  title: z.string().min(1, 'Title is required').max(255),
  amount: z.number().optional().nullable(),
  status: z.enum(['open', 'won', 'lost']),
  probability: z.number().min(0).max(100).optional().nullable(),
  expected_close_at: z.string().optional().nullable(),
  notes: z.string().max(5000).optional(),
})

export const crmTaskSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  title: z.string().min(1, 'Title is required').max(255),
  due_at: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'med', 'high']),
  status: z.enum(['open', 'done']).optional(),
  notes: z.string().max(5000).optional(),
})

export type CrmClientForm = z.infer<typeof crmClientSchema>
export type CrmContactPointForm = z.infer<typeof crmContactPointSchema>
export type CrmSaleForm = z.infer<typeof crmSaleSchema>
export type CrmTaskForm = z.infer<typeof crmTaskSchema>
