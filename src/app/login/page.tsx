import Link from 'next/link'
import { login } from '@/app/auth/actions'
import { AuthNotice, AuthShell, buttonClass, inputClass } from '@/components/auth/auth-shell'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; message?: string; next?: string }> }) {
  const params = await searchParams
  return <AuthShell title="Iniciar sesión" description="Accede de forma segura a tu espacio de trabajo.">
    <AuthNotice error={params.error} message={params.message} />
    <form action={login} className="space-y-4">
      <input type="hidden" name="next" value={params.next ?? '/dashboard'} />
      <label className="block text-sm font-medium">Correo electrónico<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
      <label className="block text-sm font-medium">Contraseña<input className={inputClass} name="password" type="password" autoComplete="current-password" required /></label>
      <div className="text-right"><Link className="text-sm text-primary hover:underline" href="/forgot-password">¿Olvidaste tu contraseña?</Link></div>
      <button className={buttonClass} type="submit">Ingresar</button>
    </form>
    <p className="mt-6 text-center text-sm text-muted-foreground">¿Aún no tienes cuenta? <Link className="text-primary hover:underline" href="/register">Crear cuenta</Link></p>
  </AuthShell>
}
