'use client'

import { Bell, Search, Menu } from 'lucide-react'
import { navModules, type ModuleId } from '@/lib/dashboard-data'

interface TopBarProps {
  activeModule: ModuleId
  onOpenSearch: () => void
  onOpenMobileNav: () => void
  notificationCount: number
  userInitials: string
}

export function TopBar({ activeModule, onOpenSearch, onOpenMobileNav, notificationCount, userInitials }: TopBarProps) {
  const current = navModules.find((m) => m.id === activeModule) ?? navModules[0]

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      {/* Active module indicator */}
      <div className="hidden items-center gap-2.5 sm:flex">
        <current.icon className="size-4.5 text-primary" />
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">{current.label}</span>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {current.description}
          </span>
        </div>
      </div>

      {/* Global search */}
      <div className="flex flex-1 justify-center px-2">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex h-9 w-full max-w-md items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Search className="size-4 shrink-0" />
          <span className="flex-1 text-left">Buscar documentos, cláusulas y reseñas…</span>
          <kbd className="hidden items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right actions */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="Notificaciones"
          className="relative flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Bell className="size-5" />
          {notificationCount > 0 && <span className="absolute top-2 right-2 flex size-2 items-center justify-center">
            <span className="absolute inline-flex size-2 animate-ping rounded-full bg-accent opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-accent" />
          </span>}
        </button>

        <button
          type="button"
          aria-label="Perfil"
          className="flex size-9 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent transition-transform hover:scale-105"
        >
          {userInitials}
        </button>
      </div>
    </header>
  )
}
