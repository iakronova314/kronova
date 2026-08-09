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
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { aiModels } from '@/lib/dashboard-data'
import { createClient } from '@/lib/supabase/browser'

interface UploadFile {
  id: string
  name: string
  progress: number
  done: boolean
  stage: string
  result?: AnalysisResult
  error?: string
}

interface AnalysisResult {
  resumen: string
  puntos_clave: string[]
  riesgos: string[]
}

const MAX_FILES = 6
const MAX_FILE_SIZE = 10 * 1024 * 1024

export function UploadWorkspace({ tenantId, module = 'docaudit', title = 'Análisis rápido' }: { tenantId: string; module?: 'docaudit' | 'leasereader'; title?: string }) {
  const [dragging, setDragging] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const [model, setModel] = useState(aiModels[0])
  const [modelOpen, setModelOpen] = useState(false)
  const [processingConsent, setProcessingConsent] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Función para enviar el contenido del archivo a la API de Gemini
  const analyzeFileContent = useCallback(async (fileId: string, file: File) => {
    try {
      const mimeType = file.type || ({ pdf: 'application/pdf', xml: 'application/xml', txt: 'text/plain', md: 'text/markdown', json: 'application/json', csv: 'text/csv' }[file.name.toLowerCase().split('.').pop() ?? ''] ?? 'application/octet-stream')
      const uploadResponse = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kronova-Tenant-Id': tenantId },
        body: JSON.stringify({ fileName: file.name, mimeType, sizeBytes: file.size, module, processingConsent }),
      })
      const upload = await uploadResponse.json() as { documentId?: string; path?: string; token?: string; error?: string }
      if (!uploadResponse.ok || !upload.documentId || !upload.path || !upload.token) throw new Error(upload.error ?? 'No fue posible preparar la carga.')
      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, progress: 35, stage: 'Subiendo a Storage' } : item))
      const { error: storageError } = await createClient().storage.from('documents').uploadToSignedUrl(upload.path, upload.token, file, { contentType: mimeType })
      if (storageError) throw new Error('No fue posible almacenar el archivo.')
      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, progress: 65, stage: 'Validando integridad' } : item))
      const completeResponse = await fetch(`/api/documents/${upload.documentId}/complete`, { method: 'POST' })
      const completed = await completeResponse.json() as { error?: string; jobId?: string }
      if (!completeResponse.ok) throw new Error(completed.error ?? 'No fue posible validar el archivo almacenado.')
      if (!completed.jobId) throw new Error('No se recibió el identificador del trabajo.')
      window.dispatchEvent(new Event('kronova:usage-updated'))
      setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, progress: 72, stage: 'En cola' } : item))
      for (let attempt = 0; attempt < 150; attempt++) {
        const response = await fetch(`/api/jobs/${completed.jobId}`)
        const job = await response.json() as { status?: string; progress?: number; error_code?: string; data?: AnalysisResult; error?: string }
        if (!response.ok) throw new Error(job.error ?? 'No fue posible consultar el trabajo.')
        setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, progress: 72 + Math.round((job.progress ?? 0) * 0.27), stage: job.status === 'queued' ? 'En cola' : job.status === 'retrying' ? 'Reintentando' : 'Procesando' } : item))
        if (job.status === 'completed' && job.data) {
          setFiles((prev) => prev.map((item) => item.id === fileId ? { ...item, progress: 100, done: true, stage: 'Completado', result: job.data } : item))
          return
        }
        if (job.status === 'failed') throw new Error(job.error_code === 'OCR_REQUIRED' ? 'Documento almacenado: requiere OCR antes del análisis.' : 'El procesamiento falló después de agotar los reintentos.')
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      throw new Error('El procesamiento continúa en segundo plano. Consulta el documento más tarde.')
    } catch (error) {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, progress: 100, done: true, stage: 'Error', error: error instanceof Error ? error.message : 'Error durante la carga segura.' }
            : f,
        ),
      )
    }
  }, [module, processingConsent, tenantId])

  const addFiles = useCallback((list: FileList | null) => {
    if (!list || list.length === 0) return
    const availableSlots = Math.max(0, MAX_FILES - files.length)
    const incomingFiles = Array.from(list).slice(0, availableSlots)
    if (incomingFiles.length === 0) return

    const newUploadFiles: UploadFile[] = incomingFiles.map((f, i) => ({
      id: `${Date.now()}-${i}-${f.name}`,
      name: f.name,
      progress: 15,
      done: false,
      stage: 'Preparando carga',
    }))

    setFiles((prev) => [...newUploadFiles, ...prev])

    incomingFiles.forEach((file, index) => {
      const targetFileObj = newUploadFiles[index]
      if (file.size > MAX_FILE_SIZE) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === targetFileObj.id
              ? { ...f, progress: 100, done: true, stage: 'Error', error: 'El archivo supera el límite de 10 MB.' }
              : f,
          ),
        )
        return
      }

      void analyzeFileContent(targetFileObj.id, file)
    })
  }, [analyzeFileContent, files.length])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border p-5">
        <div>
          <h2 className="text-base font-semibold text-card-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">Análisis inmediato con IA para tus documentos</p>
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
        <label className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5" checked={processingConsent} onChange={(event)=>setProcessingConsent(event.target.checked)}/><span>Confirmo que mi organización está autorizada para tratar y cargar este documento, incluidos datos de terceros, y autorizo su procesamiento conforme a la Política de privacidad.</span></label>
        {/* Dropzone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => processingConsent && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (processingConsent && (e.key === 'Enter' || e.key === ' ')) inputRef.current?.click()
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer',
            dragging
              ? 'border-primary bg-primary/10'
              : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.xml,.txt,.md,.json,.csv,application/pdf,application/xml,text/xml,text/plain,text/markdown,application/json,text/csv"
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UploadCloud className="size-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              Sube PDF, XML, TXT, MD, JSON o CSV
            </p>
            <p className="text-sm text-muted-foreground">para análisis inmediato con IA</p>
          </div>
          <Button size="sm" variant="outline" className="pointer-events-none mt-1">
            Seleccionar archivos
          </Button>
        </div>

        {/* Progress list */}
        {files.length > 0 && (
          <div className="flex flex-col gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    {file.done ? (
                      file.error ? (
                        <AlertCircle className="size-4.5 text-destructive" />
                      ) : (
                        <CheckCircle2 className="size-4.5 text-emerald-500" />
                      )
                    ) : (
                      <FileText className="size-4.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        {file.done ? (
                          file.error ? (
                            <span className="text-destructive font-medium">Error</span>
                          ) : (
                            <span className="text-emerald-500 font-medium">Analizado</span>
                          )
                        ) : (
                          <>
                            <Loader2 className="size-3 animate-spin text-primary" />
                            {file.stage}
                          </>
                        )}
                      </span>
                    </div>
                    {!file.done && (
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500 animate-pulse"
                          style={{ width: `${file.progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(file.id)}
                    aria-label={`Quitar ${file.name}`}
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {/* Muestra del resultado analizado */}
                {file.result && (
                  <div className="mt-2 rounded-md bg-card p-3 text-xs font-mono border border-border text-card-foreground overflow-x-auto">
                    <p className="font-sans font-semibold text-emerald-500 mb-1 flex items-center gap-1">
                      <Sparkles className="size-3" /> Resultado del análisis con Gemini:
                    </p>
                    <pre className="text-[11px] leading-relaxed">
                      {JSON.stringify(file.result, null, 2)}
                    </pre>
                  </div>
                )}

                {file.error && (
                  <p className="text-xs text-destructive mt-1 font-medium">{file.error}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {files.length === 0 && (
          <div className="mt-auto flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            Se analizará con{' '}
            <span className="font-medium text-foreground">{model.name}</span> · {model.tag}
          </div>
        )}
      </div>
    </section>
  )
}
