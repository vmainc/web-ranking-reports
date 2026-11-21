import { describe, expect, it, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { logCrmEmailSent } from './logCrmEmailSent'

describe('logCrmEmailSent', () => {
  it('creates contact point when client id is valid', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'cp1' })
    const update = vi.fn().mockResolvedValue({})
    const getOne = vi.fn().mockResolvedValue({ user: 'owner1' })

    const pb = {
      collection: (name: string) => {
        if (name === 'crm_clients') {
          return { getOne, update, getList: vi.fn() }
        }
        if (name === 'crm_contact_points') {
          return { create }
        }
        return {}
      },
    } as unknown as PocketBase

    await logCrmEmailSent(pb, {
      crmOwnerId: 'owner1',
      clientId: 'client1',
      recipientEmail: 'a@b.co',
      subject: 'Hello',
      context: 'Spring campaign',
    })

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        client: 'client1',
        kind: 'email',
        summary: 'Email sent — Spring campaign: Hello',
      }),
    )
    expect(update).toHaveBeenCalledWith('client1', expect.objectContaining({ last_activity_at: expect.any(String) }))
  })
})