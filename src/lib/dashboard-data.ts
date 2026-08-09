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
    label: 'Dashboard Overview',
    description: 'Workspace summary',
    icon: LayoutDashboard,
  },
  {
    id: 'docaudit',
    label: 'DocAudit',
    description: 'Invoices & Compliance',
    icon: FileText,
  },
  {
    id: 'leasereader',
    label: 'LeaseReader',
    description: 'Real Estate Contracts',
    icon: ScrollText,
  },
  {
    id: 'reviewsync',
    label: 'ReviewSync',
    description: 'Reputation & Reviews',
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
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Balanced' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: 'Fast' },
]
