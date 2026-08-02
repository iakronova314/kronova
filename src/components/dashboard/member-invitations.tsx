import { UserPlus } from 'lucide-react'
import { inviteMember } from '@/app/dashboard/organization-actions'
import type { Organization } from '@/lib/dashboard-data'

export function MemberInvitations({ organization }: { organization: Organization }) {
  if (!['owner', 'admin'].includes(organization.role)) return null
  return <section className="rounded-xl border border-border bg-card p-4">
    <div className="mb-4 flex items-center gap-2"><UserPlus className="size-5 text-primary" /><div><h2 className="font-medium">Invitar miembro</h2><p className="text-xs text-muted-foreground">La invitación caduca en 7 días.</p></div></div>
    <form action={inviteMember} className="grid gap-3 sm:grid-cols-[1fr_150px_auto]">
      <input type="hidden" name="tenantId" value={organization.id} />
      <input name="email" type="email" required placeholder="persona@empresa.com" className="rounded-lg border border-input bg-background px-3 py-2 text-sm" />
      <select name="role" className="rounded-lg border border-input bg-background px-3 py-2 text-sm">
        {organization.role === 'owner' && <option value="admin">Administrador</option>}
        <option value="analyst">Analista</option><option value="viewer">Lector</option>
      </select>
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Invitar</button>
    </form>
  </section>
}
