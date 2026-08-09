import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

async function run(request: Request) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: expired } = await admin.from('documents').select('id,tenant_id,bucket_name,storage_path').lte('retention_until', now).is('deleted_at', null).limit(100)
  let expiredDeleted = 0
  for (const document of expired ?? []) {
    const { data: setting } = await admin.from('tenant_privacy_settings').select('legal_hold').eq('tenant_id', document.tenant_id).maybeSingle()
    if (setting?.legal_hold) continue
    const { error } = await admin.storage.from(document.bucket_name).remove([document.storage_path])
    if (!error) {
      const { error: databaseError } = await admin.from('documents').delete().eq('id', document.id)
      if (!databaseError) expiredDeleted++
    }
  }
  const { data: requests } = await admin.from('privacy_requests').select('id,tenant_id').eq('kind', 'tenant_deletion').eq('status', 'pending').lte('execute_after', now).not('tenant_id', 'is', null).limit(10)
  let tenantsDeleted = 0
  for (const item of requests ?? []) {
    const tenantId = String(item.tenant_id)
    const [{ data: setting }, { data: subscription }] = await Promise.all([
      admin.from('tenant_privacy_settings').select('legal_hold').eq('tenant_id', tenantId).maybeSingle(),
      admin.from('subscriptions').select('id').eq('tenant_id', tenantId).in('status', ['active', 'trialing', 'past_due']).limit(1).maybeSingle(),
    ])
    if (setting?.legal_hold || subscription) {
      await admin.from('privacy_requests').update({ status: 'blocked', reason_code: setting?.legal_hold ? 'LEGAL_HOLD' : 'ACTIVE_SUBSCRIPTION' }).eq('id', item.id)
      continue
    }
    await admin.from('privacy_requests').update({ status: 'processing' }).eq('id', item.id)
    const { data: documents } = await admin.from('documents').select('bucket_name,storage_path').eq('tenant_id', tenantId).is('deleted_at', null)
    for (const document of documents ?? []) await admin.storage.from(document.bucket_name).remove([document.storage_path])
    const { error } = await admin.from('tenants').delete().eq('id', tenantId)
    if (error) await admin.from('privacy_requests').update({ status: 'failed', reason_code: 'DATABASE_DELETE_FAILED' }).eq('id', item.id)
    else {
      await admin.from('privacy_requests').update({ status: 'completed', completed_at: now }).eq('id', item.id)
      tenantsDeleted++
    }
  }
  return NextResponse.json({ expiredDocumentsDeleted: expiredDeleted, tenantsDeleted })
}

export const GET = run
export const POST = run
