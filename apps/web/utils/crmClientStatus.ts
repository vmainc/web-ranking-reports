/** `crm_clients.status` — customer is stored as `client`. */
export const CRM_CLIENT_STATUS_VALUES = ['lead', 'client', 'partner', 'vendor', 'archived'] as const
export type CrmClientStatus = (typeof CRM_CLIENT_STATUS_VALUES)[number]

export function isCrmClientStatus(value: string): value is CrmClientStatus {
  return (CRM_CLIENT_STATUS_VALUES as readonly string[]).includes(value)
}