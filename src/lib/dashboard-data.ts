import type { LucideIcon } from 'lucide-react'
import {
  FileText,
  ScrollText,
  MessagesSquare,
  LayoutDashboard,
} from 'lucide-react'

export type ModuleId = 'overview' | 'docaudit' | 'leasereader' | 'reviewsync'

export interface NavModule {
  id: ModuleId
  label: string
  description: string
  icon: LucideIcon
}

export const navModules: NavModule[] = [
  {
    id: 'overview',
    label: 'Resumen general',
    description: 'Actividad del espacio',
    icon: LayoutDashboard,
  },
  {
    id: 'docaudit',
    label: 'DocAudit',
    description: 'Facturas y cumplimiento',
    icon: FileText,
  },
  {
    id: 'leasereader',
    label: 'LeaseReader',
    description: 'Contratos inmobiliarios',
    icon: ScrollText,
  },
  {
    id: 'reviewsync',
    label: 'ReviewSync',
    description: 'Reputación y reseñas',
    icon: MessagesSquare,
  },
]

export interface Organization {
  id: string
  name: string
  plan: string
  initials: string
  role: 'owner' | 'admin' | 'analyst' | 'viewer'
}

export const aiModels = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Equilibrado' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: 'Rápido' },
]

const planNames: Record<string, string> = {
  'Free trial': 'Prueba gratuita',
  Starter: 'Inicial',
  Growth: 'Crecimiento',
  Enterprise: 'Empresarial',
}

export function translatePlanName(name: string) {
  return planNames[name] ?? name
}
