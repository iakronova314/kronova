'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/server/platform-admin'

const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim()

export async function createExpense(data: FormData) {
  const { admin, userId, role } = await requirePlatformAdmin()
  if (!['owner', 'finance'].includes(role)) redirect('/admin?error=No+tienes+permiso+para+registrar+gastos.')
  const amountValue = Number(text(data, 'amount').replace(',', '.'))
  const currency = text(data, 'currency').toUpperCase()
  const category = text(data, 'category')
  const allowed = ['ai','infrastructure','marketing','legal','accounting','payroll','software','taxes','other']
  if (!Number.isFinite(amountValue) || amountValue <= 0 || !/^[A-Z]{3}$/.test(currency) || !allowed.includes(category) || !text(data, 'vendor')) {
    redirect('/admin?error=Revisa+los+datos+del+gasto.')
  }
  const { error } = await admin.from('platform_expenses').insert({
    occurred_on: text(data, 'occurredOn'), category, vendor: text(data, 'vendor'),
    description: text(data, 'description') || null, currency,
    amount: Math.round(amountValue * 100), recurring: text(data, 'recurring') === 'on', created_by: userId,
  })
  if (error) redirect('/admin?error=No+fue+posible+guardar+el+gasto.')
  revalidatePath('/admin')
  redirect('/admin?message=Gasto+registrado.')
}
