import type { PocketBase } from 'pocketbase'

export interface RegisterPayload {
  email: string
  password: string
  passwordConfirm: string
  name?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export async function registerWithEmail(pb: PocketBase, payload: RegisterPayload) {
  return await pb.collection('users').create({
    email: payload.email,
    password: payload.password,
    passwordConfirm: payload.passwordConfirm,
    name: payload.name ?? payload.email.split('@')[0],
  })
}

export async function loginWithEmail(pb: PocketBase, payload: LoginPayload) {
  return await pb.collection('users').authWithPassword(payload.email, payload.password)
}

export function isAuthenticated(pb: PocketBase): boolean {
  return pb.authStore.isValid
}
