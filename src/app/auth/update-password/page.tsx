import { redirect } from 'next/navigation'
import { updatePassword } from '@/app/auth/actions'
import { AuthNotice, AuthShell, buttonClass, inputClass } from '@/components/auth/auth-shell'
import { createClient } from '@/lib/supabase/server'

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getClaims()
  if (error || !data?.claims?.sub) redirect('/forgot-password?error=Solicita+un+nuevo+enlace+de+recuperación.')
  const params = await searchParams
  return <AuthShell title="Nueva contraseña" description="Elige una contraseña de al menos 8 caracteres.">
    <AuthNotice error={params.error} />
    <form action={updatePassword} className="space-y-4">
      <label className="block text-sm font-medium">Nueva contraseña<input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className="block text-sm font-medium">Confirmar contraseña<input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <button className={buttonClass} type="submit">Actualizar contraseña</button>
    </form>
  </AuthShell>
}
