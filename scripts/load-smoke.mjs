import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'

const base=(process.env.LOAD_TEST_URL??'http://127.0.0.1:3000').replace(/\/$/,'')
const total=Math.min(Number(process.env.LOAD_TEST_REQUESTS??300),2000)
const concurrency=Math.min(Number(process.env.LOAD_TEST_CONCURRENCY??20),50)
const bypass=process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const latencies=[];let failures=0;let cursor=0
async function worker(){while(cursor<total){cursor++;const start=performance.now();try{const response=await fetch(`${base}/login`,{headers:bypass?{'x-vercel-protection-bypass':bypass}:{}});if(response.status!==200)failures++;await response.arrayBuffer()}catch{failures++}latencies.push(performance.now()-start)}}
const started=performance.now();await Promise.all(Array.from({length:concurrency},()=>worker()));const elapsed=performance.now()-started
latencies.sort((a,b)=>a-b);const percentile=(p)=>Math.round(latencies[Math.min(latencies.length-1,Math.ceil(latencies.length*p)-1)]??0)
const result={url:base,requests:total,concurrency,failures,errorRate:Number((failures/total*100).toFixed(2)),rps:Number((total/(elapsed/1000)).toFixed(2)),p50Ms:percentile(.5),p95Ms:percentile(.95),p99Ms:percentile(.99)}
console.log(JSON.stringify(result))
assert.ok(result.errorRate<=1,`Error rate ${result.errorRate}% exceeds 1%`)
assert.ok(result.p95Ms<=2000,`p95 ${result.p95Ms}ms exceeds 2000ms`)
