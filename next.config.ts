import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const isDev = process.env.NODE_ENV === 'development'
    let supabaseOrigin = ''
    try { supabaseOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : '' } catch { /* validated at server startup */ }
    const csp = [
      "default-src 'self'", `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
      "style-src 'self' 'unsafe-inline'", "img-src 'self' blob: data:", "font-src 'self' data:",
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co${supabaseOrigin ? ` ${supabaseOrigin} ${supabaseOrigin.replace(/^http/,'ws')}` : ''}`, "object-src 'none'", "base-uri 'self'",
      "form-action 'self'", "frame-ancestors 'none'", "frame-src https://js.stripe.com https://hooks.stripe.com",
      "worker-src 'self' blob:", "manifest-src 'self'", ...(isDev ? [] : ['upgrade-insecure-requests']),
    ].join('; ')
    return [{ source: '/:path*', headers: [
      { key: 'Content-Security-Policy', value: csp },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), browsing-topics=()' },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
      ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
    ] }]
  },
}

export default nextConfig
