export function getSupabaseConfig() {
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!rawUrl || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y la clave pública de Supabase.')
  }

  return {
    url: rawUrl.replace(/\/(rest\/v1)?\/?$/, ''),
    key,
  }
}
