import { expect, test } from '@playwright/test'

test('registro, pago, carga y análisis', async ({ page }) => {
  const unique = Date.now()
  await page.goto('/register')
  await page.getByLabel('Nombre completo').fill('Prueba Automática')
  await page.getByLabel('Nombre de la empresa').fill(`Empresa E2E ${unique}`)
  await page.getByLabel(/Correo/).fill(`e2e-${unique}@example.test`)
  await page.getByLabel('Contraseña', { exact: true }).fill('Test-password-29!')
  await page.getByLabel(/Confirmar/).fill('Test-password-29!')
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Crear cuenta' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 })

  await page.route('**/api/billing/checkout', async (route) => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({url:`${page.url().split('/dashboard')[0]}/dashboard?message=Pago+de+prueba+confirmado`}) }))
  await page.getByRole('button', { name: 'Contratar' }).first().click()
  await expect(page).toHaveURL(/message=Pago/)

  const documentId = '00000000-0000-4000-8000-000000000029'
  const jobId = '00000000-0000-4000-8000-000000000030'
  await page.route('**/api/documents/upload-url', async (route) => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({documentId,path:`e2e/${documentId}.xml`,token:'signed-test-token'}) }))
  await page.route('**/storage/v1/object/upload/sign/**', async (route) => route.fulfill({ status:200, contentType:'application/json', body:'{}' }))
  await page.route(`**/api/documents/${documentId}/complete`, async (route) => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({jobId}) }))
  await page.route(`**/api/jobs/${jobId}`, async (route) => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({status:'completed',progress:100,data:{resumen:'Factura validada',puntos_clave:['Total conciliado'],riesgos:[]}}) }))
  await page.getByRole('checkbox').check()
  await page.locator('input[type=file]').setInputFiles({ name:'factura-e2e.xml', mimeType:'application/xml', buffer:Buffer.from('<Invoice/>') })
  await expect(page.getByText('Completado')).toBeVisible({ timeout:15_000 })
  await expect(page.getByText('Factura validada')).toBeVisible()
})
