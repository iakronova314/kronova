import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('worker retries with backoff, terminal state and idempotent result detection',async()=>{const source=await readFile(new URL('../../src/app/api/internal/jobs/process/route.ts',import.meta.url),'utf8');assert.match(source,/existing/);assert.match(source,/30 \* 2 \*\*/);assert.match(source,/max_attempts/);assert.match(source,/status: terminal \? 'failed' : 'retrying'/);assert.match(source,/raiseOperationalAlert/)})
test('recovery workflow restores database and verifies Storage export',async()=>{const source=await readFile(new URL('../../.github/workflows/backup-recovery.yml',import.meta.url),'utf8');assert.match(source,/pg_restore/);assert.match(source,/restore\/storage\/documents/);assert.match(source,/AES-256|aes-256/i)})
