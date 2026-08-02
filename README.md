# KRONOVA

KRONOVA es una plataforma SaaS B2B en construcción para análisis asistido de documentos. El primer producto será **DocAudit Colombia**, orientado a revisar facturas electrónicas y generar reportes estructurados y explicables.

El repositorio contiene actualmente:

- Landing y dashboard de producto.
- Vista previa funcional de análisis de archivos de texto con Gemini.
- Salida JSON estructurada con resumen, puntos clave y riesgos.
- Alcance aprobado para el MVP de Colombia.
- Esqueleto de webhook Stripe con validación de firma, todavía sin lógica de suscripciones.

## Estado del producto

El proyecto es una vista previa, no un servicio de producción. Todavía no incluye autenticación, aislamiento multiempresa, almacenamiento documental, procesamiento PDF/XML, reglas DIAN completas, cobros activos ni límites por suscripción.

Los módulos planeados son:

1. DocAudit — primer módulo y foco del MVP.
2. LeaseReader — segunda fase.
3. ReviewSync — tercera fase.

Consulta [el alcance funcional de Colombia](docs/MVP-SCOPE-COLOMBIA.md) para conocer formatos, límites, retención y criterios de aceptación. La distribución de responsabilidades, flujos, endpoints y estrategia de pagos está definida en [la arquitectura técnica](docs/ARCHITECTURE.md). Los temas comerciales, legales y técnicos aún abiertos se controlan en el [registro de decisiones pendientes](docs/PENDING-DECISIONS.md).

## Requisitos

- Node.js 20 o superior.
- npm.
- Una API key de Google Gemini para probar el análisis actual.
- Credenciales Supabase y Stripe solamente cuando se desarrollen esas integraciones.

## Configuración local

1. Instala dependencias:

   ```bash
   npm install
   ```

2. Copia `.env.example` como `.env.local` y completa solo las variables necesarias.

3. Inicia el entorno de desarrollo:

   ```bash
   npm run dev
   ```

4. Abre `http://localhost:3000`.

## Variables de entorno

| Variable | Uso | Exposición |
|---|---|---|
| `GEMINI_API_KEY` | Análisis de documentos en el servidor | Privada |
| `NEXT_PUBLIC_SUPABASE_URL` | URL pública del proyecto Supabase | Pública |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima protegida mediante RLS | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Operaciones privilegiadas de servidor | Secreta |
| `STRIPE_SECRET_KEY` | API de Stripe en el servidor | Secreta |
| `STRIPE_WEBHOOK_SECRET` | Verificación de webhooks Stripe | Secreta |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js en el navegador | Pública |

Nunca expongas variables privadas con el prefijo `NEXT_PUBLIC_` ni confirmes `.env.local` en Git.

## Comandos

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run check
```

`npm run check` ejecuta TypeScript, ESLint y el build de producción en orden.

## Estructura principal

```text
docs/                         Alcance y decisiones del producto
src/app/                      Rutas, páginas y endpoints Next.js
src/app/api/ai/analyze/       Vista previa de análisis con Gemini
src/components/               Landing, dashboard y componentes UI
src/lib/                      Tipos y datos temporales de la interfaz
```

## Seguridad y cumplimiento

La salida de IA es asistencia automatizada y no reemplaza validación de la DIAN, asesoría contable o concepto legal. No cargues documentos sensibles en un despliegue público hasta implementar autenticación, almacenamiento privado, RLS, cuotas, retención y auditoría.

## Criterio de calidad

Antes de integrar cambios, deben pasar:

```bash
npm run check
```
