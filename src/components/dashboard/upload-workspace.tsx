'use client'

import { useCallback, useRef, useState } from 'react'
import {
  UploadCloud,
  Sparkles,
  ChevronDown,
  FileText,
  Loader2,
  CheckCircle2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { aiModels } from '@/lib/dashboard-data'

interface UploadFile {
  id: string
  name: string
  progress: number
  done: boolean
}

export function UploadWorkspace() {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [model, setModel] = useState(aiModels[0])
  const [modelOpen, setModelOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return
    const incoming: UploadFile[] = Array.from(list).map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      progress: 0,
      done: false,
    }))
    setFiles((prev) => [...incoming, ...prev].slice(0, 6))

    incoming.forEach((file) => {
      timers.current[file.id] = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) => {
            if (f.id !== file.id || f.done) return f
            const next = Math.min(f.progress + Math.random() * 22 + 8, 100)
            if (next >= 100) {
              clearInterval(timers.current[file.id])
              delete timers.current[file.id]
              return { ...f, progress: 100, done: true }
            }
            return { ...f, progress: next }
          }),
        )
      }, 320)
    })
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeFile = (id: string) => {
    if (timers.current[id]) {
      clearInterval(timers.current[id])
      delete timers.current[id]
    }
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">Quick Action Workspace</h2>
          <p className="text-sm text-muted-foreground">Instant AI analysis for any document</p>
        </div>

        {/* Model selector */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setModelOpen((v) => !v)}
            aria-expanded={modelOpen}
            className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm transition-colors hover:bg-muted"
          >
            <Sparkles className="size-4 text-primary" />
            <span className="hidden font-medium text-foreground sm:inline">{model.name}</span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </button>
          {modelOpen && (
            <div className="absolute top-full right-0 z-20 mt-1.5 w-60 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl shadow-black/30">
              {aiModels.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setModel(m)
                    setModelOpen(false)
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent/10',
                    m.id === model.id && 'bg-primary/10',
                  )}
                >
                  <span className="text-sm text-popover-foreground">{m.name}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {m.tag}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UploadCloud className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Drop PDFs, Contracts or Invoices here
            </p>
            <p className="text-sm text-muted-foreground">for Instant AI Analysis</p>
          </div>
          <Button size="sm" variant="outline" className="pointer-events-none mt-1">
            Browse files
          </Button>
        </div>

        {/* Progress list */}
        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {file.done ? (
                    <CheckCircle2 className="size-4.5 text-success" />
                  ) : (
                    <FileText className="size-4.5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      {file.done ? (
                        'Analyzed'
                      ) : (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          {Math.round(file.progress)}%
                        </>
                      )}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        file.done ? 'bg-success' : 'bg-primary',
                      )}
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(file.id)}
                  aria-label={`Remove ${file.name}`}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div className="mt-auto flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            Analyzing with{' '}
            <span className="font-medium text-foreground">{model.name}</span> · {model.tag}
          </div>
        )}
      </div>
    </section>
  )
}
