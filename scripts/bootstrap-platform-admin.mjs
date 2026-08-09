import nextEnv from '@next/env'
import { createClient } from '@supabase/supabase-js'

const { loadEnvConfig } = nextEnv
loadEnvConfig(process.cwd())

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('Faltan las variables de Supabase.')

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 2 })
if (error) throw error
if (data.users.length !== 1) throw new Error('Bootstrap cancelado: se requiere exactamente un usuario en el proyecto.')

const user = data.users[0]
const { error: insertError } = await supabase.from('platform_admins').upsert({ user_id: user.id, role: 'owner' })
if (insertError) throw insertError
console.log(`Administrador de plataforma configurado: ${user.email ?? user.id}`)
