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

export function Dashboard() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [activeModule, setActiveModule] = useState<ModuleId>('overview')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

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
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  const changeModule = (id: ModuleId) => {
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
            />
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
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
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeModule === 'overview' ? (
            <div className="mx-auto flex max-w-7xl flex-col gap-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Welcome back, Alexander
                </h1>
                <p className="text-sm text-muted-foreground">
                  Here&apos;s what your AI workspace has been up to today.
                </p>
              </div>

              <KpiCards />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2">
                  <UploadWorkspace />
                </div>
                <div className="lg:col-span-1">
                  <ActivityFeed />
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-7xl">
              <ModuleView moduleId={activeModule} />
            </div>
          )}
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onModuleChange={changeModule}
      />
    </div>
  )
}
