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

export interface Kpi {
  id: string
  label: string
  value: string
  delta: string
  trend: 'up' | 'down' | 'neutral'
  hint: string
  accent: 'primary' | 'accent' | 'success' | 'warning'
  icon: LucideIcon
}

export type ActivityStatus = 'safe' | 'review' | 'risk'

export interface ActivityItem {
  id: string
  title: string
  module: string
  detail: string
  status: ActivityStatus
  score: string
  time: string
}

export const activityFeed: ActivityItem[] = [
  {
    id: 'a1',
    title: 'INV-20418 · Vendor Payment',
    module: 'DocAudit',
    detail: 'Tax fields validated, totals reconciled',
    status: 'safe',
    score: '99%',
    time: '2m ago',
  },
  {
    id: 'a2',
    title: 'Lease · 400 Market St, Floor 12',
    module: 'LeaseReader',
    detail: 'Auto-renewal clause flagged for review',
    status: 'review',
    score: '72%',
    time: '6m ago',
  },
  {
    id: 'a3',
    title: 'Contract · Warehouse Unit B7',
    module: 'LeaseReader',
    detail: 'Uncapped indemnity liability detected',
    status: 'risk',
    score: '38%',
    time: '11m ago',
  },
  {
    id: 'a4',
    title: 'Review · Google — 5★',
    module: 'ReviewSync',
    detail: 'Positive sentiment, auto-reply sent',
    status: 'safe',
    score: '96%',
    time: '18m ago',
  },
  {
    id: 'a5',
    title: 'INV-20411 · Freight Invoice',
    module: 'DocAudit',
    detail: 'Duplicate PO reference — needs review',
    status: 'review',
    score: '64%',
    time: '24m ago',
  },
  {
    id: 'a6',
    title: 'Review · Yelp — 2★',
    module: 'ReviewSync',
    detail: 'Negative sentiment escalated to team',
    status: 'risk',
    score: '29%',
    time: '31m ago',
  },
  {
    id: 'a7',
    title: 'INV-20407 · SaaS Subscription',
    module: 'DocAudit',
    detail: 'Compliant with tax policy v4',
    status: 'safe',
    score: '98%',
    time: '44m ago',
  },
]

export const aiModels = [
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', tag: 'Balanced' },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', tag: 'Fast' },
]
