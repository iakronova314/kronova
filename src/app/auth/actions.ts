'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

const field = (data: FormData, key: string) => String(data.get(key) ?? '').trim()
const resultUrl = (path: string, key: 'error' | 'message', text: string) =>
  `${path}?${new URLSearchParams({ [key]: text })}`

async function requestOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  const headerStore = await headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const protocol = headerStore.get('x-forwarded-proto') ?? (host?.startsWith('localhost') ? 'http' : 'https')
  if (!host) throw new Error('No fue posible determinar el dominio de la aplicación.')
  return `${protocol}://${host}`
}

export async function login(data: FormData) {
  const requested = field(data, 'next')
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard'
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: field(data, 'email'), password: field(data, 'password'),
  })
  if (error) redirect(resultUrl('/login', 'error', 'Correo o contraseña incorrectos.'))
  redirect(next)
}

export async function register(data: FormData) {
  const fullName = field(data, 'fullName')
  const organizationName = field(data, 'organizationName')
  const password = field(data, 'password')
  if (fullName.length < 2 || organizationName.length < 2 || password.length < 8 || password !== field(data, 'confirmPassword') || field(data, 'legalConsent') !== 'accepted') {
    redirect(resultUrl('/register', 'error', 'Revisa el nombre y usa dos contraseñas iguales de al menos 8 caracteres.'))
  }
  const supabase = await createClient()
  const { data: signup, error } = await supabase.auth.signUp({
    email: field(data, 'email'), password,
    options: {
      data: { full_name: fullName, organization_name: organizationName, legal_consent_version: '2026-08-09', legal_consent_at: new Date().toISOString() },
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=/dashboard`,
    },
  })
  if (error) redirect(resultUrl('/register', 'error', error.message))
  if (signup.session) redirect('/dashboard')
  redirect(resultUrl('/login', 'message', 'Cuenta creada. Revisa tu correo para confirmarla.'))
}

export async function requestPasswordReset(data: FormData) {
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(field(data, 'email'), {
    redirectTo: `${await requestOrigin()}/auth/callback?next=/auth/update-password`,
  })
  if (error) redirect(resultUrl('/forgot-password', 'error', error.message))
  redirect(resultUrl('/forgot-password', 'message', 'Si el correo existe, recibirás instrucciones para restablecer la contraseña.'))
}

export async function updatePassword(data: FormData) {
  const password = field(data, 'password')
  if (password.length < 8 || password !== field(data, 'confirmPassword')) {
    redirect(resultUrl('/auth/update-password', 'error', 'Las contraseñas deben coincidir y tener al menos 8 caracteres.'))
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) redirect(resultUrl('/auth/update-password', 'error', 'El enlace venció o no es válido. Solicita uno nuevo.'))
  redirect(resultUrl('/login', 'message', 'Contraseña actualizada. Ya puedes iniciar sesión.'))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
