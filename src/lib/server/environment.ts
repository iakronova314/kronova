const requiredProduction = ['NEXT_PUBLIC_SITE_URL','NEXT_PUBLIC_SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','CRON_SECRET','REVIEWSYNC_TOKEN_ENCRYPTION_KEY'] as const
const secretNames = ['SUPABASE_SERVICE_ROLE_KEY','CRON_SECRET','GEMINI_API_KEY','RESEND_API_KEY','GOOGLE_BUSINESS_CLIENT_SECRET','REVIEWSYNC_TOKEN_ENCRYPTION_KEY','STRIPE_SECRET_KEY','STRIPE_WEBHOOK_SECRET'] as const

export function environmentIssues(env: NodeJS.ProcessEnv = process.env) {
  const issues:string[]=[]
  if (env.APP_ENV && !['development','staging','production','test'].includes(env.APP_ENV)) issues.push('APP_ENV:invalid')
  if (env.VERCEL_ENV === 'production' && !['staging','production'].includes(env.APP_ENV ?? '')) issues.push('APP_ENV:production_deployment_requires_explicit_environment')
  if (env.VERCEL_ENV === 'production' || env.SECURITY_ENFORCE_ENV === 'true') for(const name of requiredProduction) if(!env[name]) issues.push(`${name}:missing`)
  if ((env.VERCEL_ENV === 'production' || env.SECURITY_ENFORCE_ENV === 'true') && !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) issues.push('NEXT_PUBLIC_SUPABASE_KEY:missing')
  for(const name of secretNames){const value=env[name];if(value && value.length<16)issues.push(`${name}:too_short`);if(name.startsWith('NEXT_PUBLIC_'))issues.push(`${name}:public_secret`)}
  if(env.NODE_ENV==='production' && env.NEXT_PUBLIC_SITE_URL && !env.NEXT_PUBLIC_SITE_URL.startsWith('https://'))issues.push('NEXT_PUBLIC_SITE_URL:https_required')
  if(env.NEXT_PUBLIC_SUPABASE_URL && /\/rest\/v1\/?$/.test(env.NEXT_PUBLIC_SUPABASE_URL))issues.push('NEXT_PUBLIC_SUPABASE_URL:origin_required')
  return issues
}

export function assertSecureEnvironment(){const issues=environmentIssues();if(issues.length)throw new Error(`SECURITY_CONFIGURATION_INVALID:${issues.join(',')}`)}
