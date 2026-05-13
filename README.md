# Enercity — Plataforma Fotovoltaica

Sitio web y panel de administración para [Enercity](https://enercity-web.vercel.app/), empresa de ingeniería fotovoltaica en Chile.

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | [Astro 5](https://astro.build/) + React 19 |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com/) |
| UI | [shadcn/ui](https://ui.shadcn.com/) + Radix UI + Lucide Icons |
| Base de datos | [Supabase](https://supabase.com/) (PostgreSQL + REST API) |
| Email | [Resend](https://resend.com/) con PDF adjunto |
| Deploy | [Vercel](https://vercel.com/) (serverless) |
| Testing | [Vitest](https://vitest.dev/) + Testing Library |
| Antibot | [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) + honeypot + rate limiting |

## Estructura del proyecto

```
src/
├── pages/
│   ├── index.astro              # Página principal (SSR)
│   ├── admin/                   # Panel de administración
│   │   ├── content/             # Editor de CMS (secciones, stats, projects, etc.)
│   │   ├── leads.astro          # Gestión de leads
│   │   ├── contacts.astro       # Gestión de contactos
│   │   ├── settings.astro       # Configuración
│   │   └── login.astro          # Login admin
│   └── api/
│       ├── leads.ts             # API de leads (genera PDF + envía email)
│       ├── contacts.ts          # API de contactos
│       ├── calculate-quote.ts   # API de cotización
│       └── admin/               # APIs internas del admin
├── components/
│   ├── organisms/               # Componentes de sección (Hero, StatsBar, etc.)
│   ├── admin/                   # Componentes del panel admin
│   └── ui/                      # shadcn/ui primitives
├── lib/
│   ├── content.ts               # Fetchers del CMS con normalización
│   ├── content-cache.ts         # Cache de datos CMS
│   ├── simulation.ts            # Lógica de simulación solar
│   ├── email.ts                 # Envío de emails vía Resend
│   ├── pdfGenerator.ts          # Generación de PDF server-side (pdf-lib)
│   ├── rate-limit.ts            # Rate limiter en memoria
│   ├── turnstile.ts             # Verificación de Cloudflare Turnstile
│   └── services/quote.ts        # Servicio unificado de cotización
├── types/
│   ├── content.ts               # Tipos del CMS
│   ├── simulation.ts            # Tipos de simulación
│   └── admin.ts                 # Tipos del admin
└── layouts/
    └── layout.astro             # Layout principal
```

## Comandos

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Preview
npm run preview

# Tests
npm run test              # Ejecutar tests
npm run test:watch        # Watch mode
npm run test:coverage     # Con coverage

# Lint
npm run lint
npm run lint:fix

# Formato
npm run format
```

## Variables de entorno

El archivo `.env` incluye las credenciales de desarrollo local. Para producción, las variables se configuran en Vercel.

| Variable | Descripción |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | URL de Supabase |
| `PUBLIC_SUPABASE_ANON_KEY` | Anon key de Supabase |
| `SUPABASE_SERVICE_KEY` | Service role key (solo server-side) |
| `RESEND_API_KEY` | API key de Resend |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key |

## Base de datos

Tablas principales:
- **site_content** — Contenido CMS por sección (hero, guarantees, footer, etc.)
- **stats** — Estadísticas del hero (Proyectos Instalados, Capacidad, etc.)
- **projects** — Proyectos industriales
- **solutions** — Soluciones (On-Grid, Off-Grid, Híbridos, Mantención)
- **nav_links** — Links de navegación (navbar + footer)
- **settings** — Configuración del sitio (IVA, límites de simulación, etc.)
- **comunas** — Comunas con radiación solar y tarifas
- **precios_kits** — Kits de paneles solares por consumo
- **leads** — Leads del simulador
- **contacts** — Mensajes del formulario de contacto

### Backup de emergencia

```bash
# Dump de producción
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... \
  ./scripts/db-emergency-dump.sh

# Restore desde dump
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_KEY=eyJ... \
  ./scripts/db-emergency-restore.sh backups/db-dump-TIMESTAMP/
```

## Deploy

El sitio se despliega automáticamente en Vercel al hacer push a `main`.

1. El sitio principal corre en `https://enercity-web.vercel.app/`
2. El admin está en `/admin` (requiere login)
3. Los APIs están en `/api/*`

## Testing

Los tests cubren:
- **Lógica de simulación** — cálculo de precios, kits, ROI
- **Servicio de cotización** — flujo completo de cotización
- **Integridad CMS** — normalización de datos, detección de corrupción JSONB, contrato admin ↔ contenido

```bash
npm run test
```
