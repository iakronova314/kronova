import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { environmentIssues } from '../../src/lib/server/environment.ts'

test('production environment rejects missing or weak secrets',()=>{const issues=environmentIssues({VERCEL_ENV:'production',NODE_ENV:'production',NEXT_PUBLIC_SITE_URL:'http://example.test',CRON_SECRET:'short'});assert.ok(issues.includes('SUPABASE_SERVICE_ROLE_KEY:missing'));assert.ok(issues.includes('CRON_SECRET:too_short'));assert.ok(issues.includes('NEXT_PUBLIC_SITE_URL:https_required'))})
test('security headers include CSP anti-framing and transport controls',async()=>{const source=await readFile(new URL('../../next.config.ts',import.meta.url),'utf8');for(const expected of ['Content-Security-Policy',"frame-ancestors 'none'",'Strict-Transport-Security','X-Content-Type-Options','Permissions-Policy'])assert.match(source,new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))})
test('proxy rejects cross-site API mutations',async()=>{const source=await readFile(new URL('../../src/proxy.ts',import.meta.url),'utf8');assert.match(source,/sec-fetch-site/);assert.match(source,/Origen no permitido/);assert.match(source,/status: 403/)})
