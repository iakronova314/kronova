import assert from 'node:assert/strict'

const base=(process.env.DEPLOYMENT_URL??process.env.TEST_BASE_URL??'').replace(/\/$/,'')
if(!base)throw new Error('DEPLOYMENT_URL is required')
const headers=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{}
async function get(path){const response=await fetch(`${base}${path}`,{headers,redirect:'manual'});return response}
for(const path of ['/','/login','/privacy','/terms']){const response=await get(path);assert.equal(response.status,200,`${path} returned ${response.status}`);assert.match(response.headers.get('content-security-policy')??'',/frame-ancestors 'none'/);assert.equal(response.headers.get('x-content-type-options'),'nosniff')}
const protectedResponse=await get('/api/dashboard/overview?tenantId=00000000-0000-4000-8000-000000000001')
assert.equal(protectedResponse.status,401)
assert.doesNotMatch(await protectedResponse.text(),/SUPABASE_SERVICE|STRIPE_SECRET|stack/i)
console.log(JSON.stringify({ok:true,deployment:base,checkedAt:new Date().toISOString()}))
