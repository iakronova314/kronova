'use client'

import { useState } from 'react'
import {
  ChevronsUpDown,
  Check,
  Settings,
  KeyRound,
  CreditCard,
  Moon,
  Sun,
  Hexagon,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { navModules, tenants, type ModuleId, type Tenant } from '@/lib/dashboard-data'

interface AppSidebarProps {
  collapsed: boolean
  onToggleCollapse: () => void
  activeModule: ModuleId
  onModuleChange: (id: ModuleId) => void
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export function AppSidebar({
  collapsed,
  onToggleCollapse,
  activeModule,
  onModuleChange,
  theme,
  onToggleTheme,
}: AppSidebarProps) {
  const [tenant, setTenant] = useState<Tenant>(tenants[0])
  const [tenantOpen, setTenantOpen] = useState(false)

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[76px]' : 'w-64',
      )}
    >
      {/* Brand + tenant switcher */}
      <div className="flex flex-col gap-3 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Hexagon className="size-5" strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <span className="truncate text-base font-semibold tracking-tight text-sidebar-foreground">
                KRONOVA
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4.5" />
            ) : (
              <PanelLeftClose className="size-4.5" />
            )}
          </button>
        </div>

        {!collapsed && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setTenantOpen((v) => !v)}
              aria-expanded={tenantOpen}
              className="flex w-full items-center gap-2 rounded-lg border border-border bg-sidebar-accent/50 px-2.5 py-2 text-left transition-colors hover:bg-sidebar-accent"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-xs font-semibold text-primary">
                {tenant.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {tenant.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{tenant.plan}</p>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>

            {tenantOpen && (
              <div className="absolute top-full left-0 z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl shadow-black/30">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      setTenant(t)
                      setTenantOpen(false)
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/10"
                  >
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-[10px] font-semibold text-primary">
                      {t.initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-popover-foreground">{t.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.plan}</p>
                    </div>
                    {t.id === tenant.id && (
                      <Check className="size-4 shrink-0 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Core navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        {!collapsed && (
          <p className="px-2 pb-2 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
            Modules
          </p>
        )}
        <ul className="flex flex-col gap-1">
          {navModules.map((mod) => {
            const active = mod.id === activeModule
            const Icon = mod.icon
            return (
              <li key={mod.id}>
                <button
                  type="button"
                  onClick={() => onModuleChange(mod.id)}
                  title={collapsed ? mod.label : undefined}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                    collapsed && 'justify-center',
                    active
                      ? 'bg-primary/15 text-sidebar-foreground'
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground',
                  )}
                >
                  <Icon
                    className={cn(
                      'size-5 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground group-hover:text-sidebar-foreground',
                    )}
                  />
                  {!collapsed && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{mod.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {mod.description}
                      </span>
                    </span>
                  )}
                  {!collapsed && active && (
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border p-3">
        <ul className="flex flex-col gap-1">
          <SidebarSecondary icon={Settings} label="Settings" collapsed={collapsed} />
          <SidebarSecondary icon={KeyRound} label="API Keys" collapsed={collapsed} />
          <SidebarSecondary icon={CreditCard} label="Billing" collapsed={collapsed} />
          <li>
            <button
              type="button"
              onClick={onToggleTheme}
              title={collapsed ? 'Toggle theme' : undefined}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
                collapsed && 'justify-center',
              )}
            >
              {theme === 'dark' ? (
                <Sun className="size-5 shrink-0" />
              ) : (
                <Moon className="size-5 shrink-0" />
              )}
              {!collapsed && (
                <span className="flex-1 text-sm font-medium">
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </span>
              )}
            </button>
          </li>
        </ul>

        <div
          className={cn(
            'mt-3 flex items-center gap-2.5 rounded-lg border border-border bg-sidebar-accent/40 p-2',
            collapsed && 'justify-center',
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">
            AR
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">
                Alexander R.
              </p>
              <p className="truncate text-xs text-muted-foreground">Admin</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function SidebarSecondary({
  icon: Icon,
  label,
  collapsed,
}: {
  icon: typeof Settings
  label: string
  collapsed: boolean
}) {
  return (
    <li>
      <button
        type="button"
        title={collapsed ? label : undefined}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground',
          collapsed && 'justify-center',
        )}
      >
        <Icon className="size-5 shrink-0" />
        {!collapsed && <span className="flex-1 text-sm font-medium">{label}</span>}
      </button>
    </li>
  )
}
