import Link from 'next/link'
import { requestPasswordReset } from '@/app/auth/actions'
import { AuthNotice, AuthShell, buttonClass, inputClass } from '@/components/auth/auth-shell'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string }> }) {
  const params = await searchParams
  return <AuthShell title="Recuperar contraseña" description="Te enviaremos un enlace seguro si la cuenta existe.">
    <AuthNotice error={params.error} message={params.message} />
    <form action={requestPasswordReset} className="space-y-4">
      <label className="block text-sm font-medium">Correo electrónico<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
      <button className={buttonClass} type="submit">Enviar enlace</button>
    </form>
    <p className="mt-6 text-center text-sm"><Link className="text-primary hover:underline" href="/login">Volver al inicio de sesión</Link></p>
  </AuthShell>
}
