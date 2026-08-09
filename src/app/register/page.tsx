import Link from 'next/link'
import { register } from '@/app/auth/actions'
import { AuthNotice, AuthShell, buttonClass, inputClass } from '@/components/auth/auth-shell'

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <AuthShell title="Crear cuenta" description="Empieza con un espacio protegido para tu empresa.">
    <AuthNotice error={params.error} />
    <form action={register} className="space-y-4">
      <label className="block text-sm font-medium">Nombre completo<input className={inputClass} name="fullName" autoComplete="name" minLength={2} required /></label>
      <label className="block text-sm font-medium">Nombre de la empresa<input className={inputClass} name="organizationName" autoComplete="organization" minLength={2} required /></label>
      <label className="block text-sm font-medium">Correo electrónico<input className={inputClass} name="email" type="email" autoComplete="email" required /></label>
      <label className="block text-sm font-medium">Contraseña<input className={inputClass} name="password" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className="block text-sm font-medium">Confirmar contraseña<input className={inputClass} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>
      <label className="flex items-start gap-2 text-sm text-muted-foreground"><input className="mt-1" type="checkbox" name="legalConsent" value="accepted" required /><span>He leído y acepto los <Link className="text-primary underline" href="/terms" target="_blank">Términos</Link> y la <Link className="text-primary underline" href="/privacy" target="_blank">Política de privacidad</Link>. Declaro estar autorizado para crear la cuenta empresarial.</span></label>
      <button className={buttonClass} type="submit">Crear cuenta</button>
    </form>
    <p className="mt-6 text-center text-sm text-muted-foreground">¿Ya tienes cuenta? <Link className="text-primary hover:underline" href="/login">Iniciar sesión</Link></p>
  </AuthShell>
}
