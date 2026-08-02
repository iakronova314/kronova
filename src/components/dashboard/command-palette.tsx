'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, CornerDownLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navModules, type ModuleId } from '@/lib/dashboard-data'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  onModuleChange: (id: ModuleId) => void
}

const quickActions = [
  { id: 'upload', label: 'Upload a new document' },
  { id: 'invite', label: 'Invite a team member' },
  { id: 'keys', label: 'Manage API keys' },
  { id: 'billing', label: 'View billing & usage' },
]

export function CommandPalette({ open, onClose, onModuleChange }: CommandPaletteProps) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const filteredModules = useMemo(
    () => navModules.filter((m) => m.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  )
  const filteredActions = useMemo(
    () => quickActions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Close command palette"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover shadow-2xl shadow-black/50">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-4.5 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="h-12 flex-1 bg-transparent text-sm text-popover-foreground outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ESC
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {filteredModules.length > 0 && (
            <Group label="Modules">
              {filteredModules.map((m) => {
                const Icon = m.icon
                return (
                  <CommandRow
                    key={m.id}
                    onClick={() => {
                      onModuleChange(m.id)
                      onClose()
                    }}
                  >
                    <Icon className="size-4 text-primary" />
                    <span className="flex-1">{m.label}</span>
                    <span className="text-xs text-muted-foreground">{m.description}</span>
                  </CommandRow>
                )
              })}
            </Group>
          )}

          {filteredActions.length > 0 && (
            <Group label="Actions">
              {filteredActions.map((a) => (
                <CommandRow key={a.id} onClick={onClose}>
                  <CornerDownLeft className="size-4 text-accent" />
                  <span className="flex-1">{a.label}</span>
                </CommandRow>
              ))}
            </Group>
          )}

          {filteredModules.length === 0 && filteredActions.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No results for “{query}”
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

function CommandRow({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-popover-foreground transition-colors hover:bg-accent/10',
      )}
    >
      {children}
    </button>
  )
}
