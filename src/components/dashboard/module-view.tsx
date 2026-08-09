'use client'

import type { ModuleId } from '@/lib/dashboard-data'
import { DocAuditWorkspace } from './docaudit-workspace'
import { LeaseReaderWorkspace } from './leasereader-workspace'
import { ReviewSyncWorkspace } from './reviewsync-workspace'

type Entitlements = { status: string; allowedModules: ModuleId[]; planName?: string; trialEndsAt?: string | null }

export function ModuleView({ moduleId, tenantId, role, entitlements }: { moduleId: Exclude<ModuleId, 'overview'>; tenantId: string; role: string; entitlements: Entitlements }) {
  if (!entitlements.allowedModules.includes(moduleId)) return <div className="rounded-xl border border-amber-500/30 bg-card p-8"><h2 className="text-xl font-semibold">Módulo no disponible</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">{entitlements.status === 'expired' || entitlements.status === 'canceled' ? 'La suscripción venció o fue cancelada. Renueva el plan para recuperar el acceso.' : 'Este módulo no está incluido en el plan actual.'}</p></div>
  if (moduleId === 'docaudit') return <DocAuditWorkspace tenantId={tenantId} role={role} />
  if (moduleId === 'leasereader') return <LeaseReaderWorkspace tenantId={tenantId} />
  return <ReviewSyncWorkspace tenantId={tenantId} role={role} />
}
