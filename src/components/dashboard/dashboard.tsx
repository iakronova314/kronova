'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppSidebar } from './app-sidebar'
import { TopBar } from './top-bar'
import { KpiCards } from './kpi-cards'
import { UploadWorkspace } from './upload-workspace'
import { ActivityFeed } from './activity-feed'
import { ModuleView } from './module-view'
import { CommandPalette } from './command-palette'
import type { ModuleId } from '@/lib/dashboard-data'
import type { Organization } from '@/lib/dashboard-data'
import { MemberInvitations } from './member-invitations'
import { DocumentHistory } from './document-history'
import { UsageMeter } from './usage-meter'
import { BillingPanel } from './billing-panel'
import { UtilityView } from './utility-view'
import type { DashboardKpis } from './kpi-cards'
import type { ActivityRow } from './activity-feed'

type UtilityViewId = 'settings' | 'apiKeys' | 'billing' | null
type OverviewData = { kpis: DashboardKpis; activity: ActivityRow[]; notificationCount: number }

export function Dashboard({ user, organizations, activeOrganization, notice }: { user: { name: string; email: string }; organizations: Organization[]; activeOrganization: Organization; notice?: { error?: string; message?: string } }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeModule, setActiveModule] = useState<ModuleId>('overview')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    typeof window !== 'undefined' && window.localStorage.getItem('kronova-theme') === 'light' ? 'light' : 'dark',
  )
  const [utilityView, setUtilityView] = useState<UtilityViewId>(null)
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [entitlements, setEntitlements] = useState<{ status: string; allowedModules: ModuleId[]; planName?: string; trialEndsAt?: string | null }>({ status: 'loading', allowedModules: [] })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem('kronova-theme', theme)
  }, [theme])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/billing/entitlements?tenantId=${encodeURIComponent(activeOrganization.id)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'No fue posible verificar el plan.')
        setEntitlements(result)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setEntitlements({ status: 'error', allowedModules: [] })
      })
    return () => controller.abort()
  }, [activeOrganization.id])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/dashboard/overview?tenantId=${encodeURIComponent(activeOrganization.id)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error ?? 'No fue posible cargar el resumen.')
        setOverview(result)
      })
      .catch((error) => {
        if (error instanceof Error && error.name !== 'AbortError') setOverview(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setOverviewLoading(false)
      })
    return () => controller.abort()
  }, [activeOrganization.id])

  // Cmd+K to open command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleTheme = () => {
    setTheme((prev) => prev === 'dark' ? 'light' : 'dark')
  }

  const changeModule = (id: ModuleId) => {
    setUtilityView(null)
    setActiveModule(id)
    setMobileNavOpen(false)
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((v) => !v)}
          activeModule={activeModule}
          onModuleChange={changeModule}
          theme={theme}
          onToggleTheme={toggleTheme}
          organizations={organizations}
          activeOrganization={activeOrganization}
          user={user}
          allowedModules={entitlements.allowedModules}
          onUtilityOpen={(view) => { setUtilityView(view); setMobileNavOpen(false) }}
        />
      </div>

      {/* Mobile sidebar */}
      <div
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/60 transition-opacity',
            mobileNavOpen ? 'opacity-100' : 'opacity-0',
          )}
          onClick={() => setMobileNavOpen(false)}
        />
        <div
          className={cn(
            'absolute inset-y-0 left-0 transition-transform duration-300',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="relative h-full">
            <AppSidebar
              collapsed={false}
              onToggleCollapse={() => setMobileNavOpen(false)}
              activeModule={activeModule}
              onModuleChange={changeModule}
              theme={theme}
              onToggleTheme={toggleTheme}
              organizations={organizations}
              activeOrganization={activeOrganization}
              user={user}
              allowedModules={entitlements.allowedModules}
              onUtilityOpen={(view) => { setUtilityView(view); setMobileNavOpen(false) }}
            />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Cerrar navegación"
              className="absolute top-3.5 -right-11 flex size-9 items-center justify-center rounded-lg bg-card text-muted-foreground"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          activeModule={activeModule}
          onOpenSearch={() => setPaletteOpen(true)}
          onOpenMobileNav={() => setMobileNavOpen(true)}
          notificationCount={overview?.notificationCount ?? 0}
          userInitials={user.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || 'U'}
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {utilityView ? (
            <div className="mx-auto max-w-7xl">
              <UtilityView view={utilityView} organization={activeOrganization} />
            </div>
          ) : activeModule === 'overview' ? (
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Bienvenido, {user.name}
                </h1>
                <p className="text-sm text-muted-foreground">
                  Actividad de {activeOrganization.name}.
                </p>
              </div>

              {(notice?.error || notice?.message) && <p role={notice.error ? 'alert' : 'status'} className={`rounded-lg border px-3 py-2 text-sm ${notice.error ? 'border-destructive/40 bg-destructive/10 text-red-300' : 'border-primary/30 bg-primary/10 text-primary'}`}>{notice.error ?? notice.message}</p>}

              <MemberInvitations organization={activeOrganization} />

              <KpiCards data={overview?.kpis} loading={overviewLoading} />

              <UsageMeter tenantId={activeOrganization.id} />

              <BillingPanel tenantId={activeOrganization.id} role={activeOrganization.role} />

              <DocumentHistory tenantId={activeOrganization.id} />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <UploadWorkspace tenantId={activeOrganization.id} />
                </div>
                <div className="lg:col-span-1">
                  <ActivityFeed items={overview?.activity ?? []} loading={overviewLoading} />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl">
              <ModuleView moduleId={activeModule} tenantId={activeOrganization.id} role={activeOrganization.role} entitlements={entitlements} />
            </div>
          )}
        </main>
      </div>

      <CommandPalette
        key={paletteOpen ? 'open' : 'closed'}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onModuleChange={changeModule}
        tenantId={activeOrganization.id}
      />
    </div>
  )
}
