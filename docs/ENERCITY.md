# EnercityWeb — Technical Documentation

> Chilean solar energy company website. Handles B2C quotes, B2B enterprise contacts, general inquiries, a blog, and a full admin CMS — all SSR on Vercel with Supabase as the data layer.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Architecture](#architecture)
4. [Public Pages](#public-pages)
5. [Admin Panel](#admin-panel)
6. [API Reference](#api-reference)
7. [Public Forms](#public-forms)
8. [Database](#database)
9. [Migrations](#migrations)
10. [Environment Variables](#environment-variables)
11. [Key Files](#key-files)
12. [Patterns & Gotchas](#patterns--gotchas)
13. [Deploy](#deploy)

---

## Overview

**EnercityWeb** is the public-facing website for Enercity SpA, a Chilean solar photovoltaic installer. The site serves three primary audiences:

- **Homeowners (B2C):** an interactive solar savings simulator that produces a personalized quote with a downloadable PDF.
- **Businesses (B2B):** a dedicated landing page (`/empresas`) with an enterprise contact form.
- **General inquiries:** a contact form accessible site-wide.

Every form submission is stored in Supabase, triggers an email notification via Resend, and forwards the lead non-blockingly to the Onya CRM via webhook. The site is fully server-side rendered (no static export) and deployed as Vercel serverless functions.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Astro 5 (`output: server`) |
| Adapter | `@astrojs/vercel/serverless` |
| UI components | React 18 + Radix UI + shadcn/ui |
| Styling | Tailwind CSS v4 (Vite plugin) |
| Animations | Framer Motion |
| Database | Supabase (PostgreSQL + RLS) |
| Admin auth | Supabase Auth (`authenticated` role) |
| Email | Resend (primary) + Nodemailer (fallback) |
| Captcha | Cloudflare Turnstile (`@marsidev/react-turnstile`) |
| PDF generation | pdf-lib (server-side) |
| CMS | Supabase as headless CMS (admin-editable) |
| CRM integration | Onya webhook (`src/lib/crm.ts`) |
| Icons | Lucide React |
| Validation | Zod |
| Testing | Vitest + Testing Library + happy-dom |
| Linting | ESLint + Prettier |

---

## Architecture

### Request flow

```
Browser
  │
  ▼
Vercel Edge (firewall + routing)
  │
  ▼
Astro SSR function (Vercel serverless)
  │
  ├─ Public page? → reads CMS content from Supabase (cached in-memory)
  │                 renders HTML server-side
  │
  └─ API route? → validates (rate limit → honeypot → Turnstile → Zod)
                  writes to Supabase
                  ├─ sends email via Resend (non-blocking)
                  └─ sends lead to Onya CRM (non-blocking)
```

### Key design decisions

- **Full SSR, no static pages.** Every route is a serverless function. This allows personalized content, admin-gated pages, and server-side PDF generation without a separate backend.
- **Supabase as the single data source.** Both the CMS content (read by the SSR layer) and the lead/contact data (written by form submissions) live in the same Postgres instance. RLS policies separate public writes from authenticated reads.
- **Non-blocking side effects.** Emails and CRM calls are `await`-ed inside a `try/catch` that never lets a failure propagate to the HTTP response. Form submissions succeed even if Resend or Onya are down.
- **In-memory content cache.** CMS content (sections, stats, FAQ, etc.) is cached in the server process to avoid a Supabase round-trip on every page load. The cache is invalidated by admin CRUD operations.

---

## Public Pages

| Route | Description |
|---|---|
| `/` | Home page. Includes the solar savings simulator (`savings-calculator.tsx`), hero, stats bar, solutions grid, FAQ, and contact CTA. |
| `/empresas` | B2B landing page. Cost problem section, value proposition, process steps, what's included, testimonials, FAQ, and enterprise contact form. |
| `/proyectos` | Portfolio gallery of completed solar installations. |
| `/proyectos/[slug]` | Individual project detail page. |
| `/blog` | Blog listing with category filter and search. |
| `/blog/[slug]` | Individual blog post. Content rendered from Supabase via `marked`. |
| `/blog/categoria/[slug]` | Blog posts filtered by category. |
| `404.astro` | Custom 404 error page. |
| `/rss.xml` | RSS feed for blog posts. |
| `/sitemap-posts.xml` | Sitemap fragment for blog posts (merged with Astro's generated sitemap). |

---

## Admin Panel

All `/admin` routes require a valid Supabase Auth session with the `authenticated` role. Unauthenticated requests are redirected to `/admin/login`.

### Core pages

| Route | Description |
|---|---|
| `/admin` | Dashboard with lead/contact metrics. |
| `/admin/login` | Email + password login via Supabase Auth. |
| `/admin/leads` | Paginated list of B2C quote submissions. |
| `/admin/leads/[id]` | Full lead detail: quote breakdown, status history, notes. |
| `/admin/contacts` | List of general contact form submissions. |
| `/admin/contacts/[id]` | Contact detail with timeline and notes. |
| `/admin/empresas-contacts` | List of B2B enterprise contact form submissions. |
| `/admin/settings` | Site-wide settings (company info, email templates, etc.). |
| `/admin/open-graph` | Open Graph / SEO metadata editor. |

### Content management (`/admin/content/`)

| Route | Manages |
|---|---|
| `sections` | Hero and home page sections |
| `stats` | Animated stat counters (projects, MW, etc.) |
| `solutions` | Solutions grid cards |
| `projects` | Featured projects shown on home |
| `proyectos` | Full portfolio (slug, images, specs) |
| `faq` | Home page FAQ accordion |
| `empresas-faq` | `/empresas` FAQ accordion |
| `empresas-sections` | `/empresas` editable sections |
| `nav` | Navigation links |
| `precios` | Solar kit price table (used by simulator) |
| `variables` | Simulator variables: roof types and meter locations |
| `comunas` | Chilean municipalities with region and dispatch zone |
| `equipment` | Equipment catalog (panels, inverters, etc.) |
| `bateria` | Battery storage configuration |
| `dispatch-costs` | Dispatch costs by region |
| `blog-posts` | Blog post CRUD (title, slug, content, category, image) |
| `blog-categories` | Blog category management |

---

## API Reference

### Public APIs

| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/api/leads` | None | B2C quote submission. Validates, saves lead, generates PDF, sends emails, sends to CRM. |
| `POST` | `/api/contacts` | None | General contact form. Saves contact, sends emails, sends to CRM. |
| `POST` | `/api/empresas-contacts` | None | B2B enterprise contact form. Saves contact, sends emails, sends to CRM. |
| `POST` | `/api/calculate-quote` | None | Calculates solar system quote server-side given usage and location inputs. |
| `GET` | `/api/variables` | None | Returns simulator variables (roof types, meter locations) from Supabase. |
| `GET` | `/api/slider-limits` | None | Returns min/max monthly bill values for the simulator slider. |
| `GET` | `/api/public/equipment` | None | Returns the public equipment catalog. |
| `GET` | `/api/public/battery` | None | Returns battery storage configuration. |
| `GET` | `/api/generate-pdf` | None | Generates a PDF cotización and returns it as a binary response. |
| `GET` | `/api/cron/keep-alive` | Cron token | Keeps the serverless function warm. |

### Admin APIs (all require `authenticated` session)

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Authenticates admin user via Supabase Auth. |
| `POST` | `/api/admin/logout` | Destroys the admin session. |
| `GET/POST/PUT/DELETE` | `/api/admin/content/[type]` | Generic CRUD for CMS content types. |
| `POST` | `/api/admin/content/upload-image` | Uploads an image to Supabase Storage. |
| `GET/POST/PUT/DELETE` | `/api/admin/precios` | Kit price table management. |
| `GET/POST/PUT/DELETE` | `/api/admin/variables` | Simulator variables management. |
| `GET/POST/PUT/DELETE` | `/api/admin/comunas` | Municipality management. |
| `GET/POST/PUT/DELETE` | `/api/admin/equipment` | Equipment catalog management. |
| `GET/POST/PUT/DELETE` | `/api/admin/battery` | Battery configuration management. |
| `GET/POST/PUT/DELETE` | `/api/admin/dispatch-costs` | Dispatch costs management. |
| `GET/POST/PUT/DELETE` | `/api/admin/proyectos` | Portfolio project management. |
| `GET/POST/PUT/DELETE` | `/api/admin/blog-posts` | Blog post management. |
| `GET/POST/PUT/DELETE` | `/api/admin/blog-categories` | Blog category management. |
| `POST` | `/api/admin/update-status` | Updates lead or contact status. |
| `GET` | `/api/admin/export-leads` | Exports leads as CSV. |
| `GET` | `/api/admin/export-contacts` | Exports contacts as CSV. |
| `POST` | `/api/admin/update-settings` | Updates site settings. |
| `POST` | `/api/admin/open-graph` | Updates Open Graph metadata. |

---

## Public Forms

All three public forms share the same security and integration pipeline:

### Anti-bot pipeline (in order)

1. **Rate limiting** — Per-IP in-memory rate limiter (`src/lib/rate-limit.ts`). Returns `429` when exceeded.
2. **Honeypot field** — Hidden `website` input. If filled, the request is rejected with `400`.
3. **Time honeypot** — If `timeTaken < 3000ms`, the request is rejected with `400`. Bots fill forms instantly.
4. **Cloudflare Turnstile** — Server-side token verification (`src/lib/turnstile.ts`). If `TURNSTILE_SECRET_KEY` is not configured, verification is skipped (useful for local development).
5. **Zod validation** — Schema validation of all fields. Returns `400` with the first error message on failure.
6. **Gibberish detection** — Applied to free-text fields. Rejects strings where >65% of characters are consonants.

### Post-validation flow

```
Valid request
  │
  ├─ INSERT into Supabase (anon role, INSERT-only)
  │
  ├─ try: send email via Resend (non-blocking)
  │
  └─ try: POST to Onya CRM webhook (non-blocking)
```

### Form → CRM field mapping

#### `/api/leads` (B2C)

| CRM field | Source |
|---|---|
| `nombre` | `nombre` |
| `correo` | `email` |
| `telefono` | `"+56" + telefono` (telefono arrives as 9 digits) |
| `region` | `region \|\| comunaRegion` |
| `mensaje` | Quote number, municipality, monthly bill, monthly savings, system price |
| `embudo` | `"B2C"` (fixed) |

#### `/api/empresas-contacts` (B2B)

| CRM field | Source |
|---|---|
| `nombre` | `nombre` |
| `correo` | `email` |
| `telefono` | `telefono` |
| `empresa` | `empresa` |
| `metodo_de_contacto` | `metodoContacto` |
| `region` | `region` |
| `mensaje` | `RUT: {rut}\nCosto eléctrico: {costoElectrico}\n{mensaje}` |
| `embudo` | `"B2B"` (fixed) |

#### `/api/contacts` (general)

| CRM field | Source |
|---|---|
| `nombre` | `nombre` |
| `correo` | `email` |
| `telefono` | `telefono` |
| `mensaje` | `Proyecto: {proyecto}\n{mensaje}` |
| `embudo` | `"B2B"` if `proyecto === "industrial"`, otherwise `"B2C"` |

### CRM helper

`src/lib/crm.ts` — exports `sendToCrm(payload: CrmLeadPayload): Promise<void>`.

- Reads `CRM_WEBHOOK_URL` from server environment.
- If the variable is absent, logs a warning and returns without throwing.
- POSTs JSON to the webhook. Throws if the response is not `201`.
- Always called inside a `try/catch` — failure never reaches the HTTP response.

---

## Database

All tables live in the `public` schema of a Supabase (PostgreSQL) project. Row Level Security is enabled on every table.

### RLS role summary

| Role | Can do |
|---|---|
| `anon` | INSERT on form tables; SELECT on public CMS tables |
| `authenticated` | Full access (admin panel) |
| `service_role` | Bypasses RLS (used by `supabaseAdmin` client) |

### Main tables

| Table | Purpose |
|---|---|
| `leads` | B2C quote submissions from the solar simulator |
| `contacts` | General contact form submissions |
| `enterprise_contacts` | B2B enterprise contact form submissions (`/empresas`) |
| `precios_kits` | Solar kit pricing used by the simulator |
| `comunas` | Chilean municipalities with region, dispatch zone, and coordinates |
| `site_content` | Generic key-value CMS content (hero text, CTA copy, etc.) |
| `stats` | Animated counters shown on the home page |
| `projects` | Featured project cards shown on the home page |
| `solutions` | Solutions grid cards |
| `nav_links` | Navigation menu items |
| `proyectos` | Full portfolio of completed installations (slug, images, specs) |
| `faq` | FAQ items for the home page |
| `equipment` | Equipment catalog (panels, inverters, accessories) |
| `battery` | Battery storage options and pricing |
| `dispatch_costs` | Shipping costs by region |
| `blog_posts` | Blog articles (title, slug, body, image, category, published_at) |
| `blog_categories` | Blog categories (name, slug) |
| `open_graph_data` | Global Open Graph / SEO metadata |
| `testimonials` | Customer testimonials |

### Supabase clients

| File | Key used | Bypasses RLS |
|---|---|---|
| `src/lib/supabase.ts` | `PUBLIC_SUPABASE_ANON_KEY` | No — RLS enforced |
| `src/lib/supabase-admin.ts` | `SUPABASE_SERVICE_ROLE_KEY` | Yes |

Use the `anon` client for all public-facing operations (reads and writes from forms). Use the `service_role` client only in admin API routes where elevated privileges are required (e.g. generating sequential quote numbers across all leads).

---

## Migrations

Migrations live in `supabase/migrations/` and are applied in chronological order.

| File | Description |
|---|---|
| `20250223_initial_schema.sql` | Initial schema: `leads`, `precios_kits`, `comunas`, core RLS policies |
| `20250428_create_contacts.sql` | `contacts` table for general contact form |
| `20250429_admin_panel.sql` | Admin panel setup: auth helpers, admin-only policies |
| `20250430_fix_rls_policies.sql` | RLS policy corrections after initial deploy |
| `20250501_fix_rls_anon_select.sql` | Fix `anon` SELECT permissions |
| `20250504_cms_content.sql` | CMS tables: `site_content`, `stats`, `projects`, `solutions`, `nav_links` |
| `20250505_cms_storage_bucket.sql` | Supabase Storage bucket for uploaded images |
| `20250506_fix_admin_role.sql` | Admin role policy corrections |
| `20250507_hero_background_fields.sql` | Background image fields for hero section |
| `20250807_dispatch_cost_equipment.sql` | `dispatch_costs` and `equipment` tables |
| `20260429_detail_views.sql` | Database views for lead and contact detail pages |
| `20260605_create_testimonials.sql` | `testimonials` table |
| `20260701_create_enterprise_contacts.sql` | `enterprise_contacts` table with RLS for B2B form |
| `20260702_empresas_content_seed.sql` | Seed content for `/empresas` CMS sections |
| `20260714120000_simulator_q4_foundation.sql` | Simulator Q4 foundation: new pricing fields and equipment relations |
| `20260715120000_create_open_graph_data.sql` | `open_graph_data` table for SEO management |
| `20260715160000_grant_insert_leads_anon.sql` | `GRANT INSERT ON leads TO anon` (table-level privilege) |
| `20260723000000_enable_unaccent.sql` | Enable `unaccent` extension for accent-insensitive search in blog |
| `20260724120000_create_proyectos.sql` | `proyectos` table for the full portfolio |
| `20260810_grant_equipment_permissions.sql` | Public read permissions for equipment catalog |
| `20260812_hybrid_battery_storage.sql` | Hybrid battery + storage configuration |
| `20260812120001_lead_battery_fields.sql` | Battery fields added to `leads` table |
| `20260812120002_public_simulator_grants.sql` | Public GRANTs for all simulator-related tables |
| `20260812120003_service_role_grants.sql` | Service role GRANTs for admin operations |
| `20260812120004_settings_garantia_pagos.sql` | Warranty and payment method fields in settings |
| `20260813_equipment_desc_garantia_lead_fields.sql` | Description and warranty fields in equipment and leads |
| `20260814090000_equipment_bateria_tipo.sql` | Battery type field in equipment catalog |
| `20260814093000_region_dispatch_costs.sql` | Regional dispatch cost structure |
| `20260814100000_leads_comuna_id_nullable.sql` | Make `comuna_id` nullable in leads (region-only quotes) |
| `20260814150000_fix_duplicate_active_battery.sql` | Constraint to prevent duplicate active battery configs |
| `20260820120000_cms_content_public_grants.sql` | `GRANT SELECT` on CMS tables to `anon` and `authenticated` (captures a previously manual grant) |
| `20260911000000_create_blog.sql` | `blog_posts` and `blog_categories` tables with RLS |
| `20261005120000_enterprise_contacts_anon_grant.sql` | `GRANT INSERT ON enterprise_contacts TO anon` (was missing from original migration) |

---

## Environment Variables

### Public (available in both client-side and server-side code)

Variables prefixed with `PUBLIC_` are included in the browser bundle.

| Variable | Description |
|---|---|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (safe to expose) |
| `PUBLIC_SITE_URL` | Canonical site URL (e.g. `https://enercity.cl`) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key for the frontend widget |

### Server-only (never exposed to the browser)

| Variable | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key — bypasses RLS. Used only in admin routes. |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key for server-side token verification. If absent, verification is skipped. |
| `RESEND_API_KEY` | Resend API key for transactional email. |
| `CRM_WEBHOOK_URL` | Full Onya CRM webhook URL including the auth token in the path. **Treat as a password — never commit or expose client-side.** |
| `ADMIN_EMAIL` | Destination email address for internal lead/contact notifications. |

> Vercel auto-injects `VERCEL_URL` and `VERCEL_PROJECT_PRODUCTION_URL`. `astro.config.mjs` uses these as a fallback for `PUBLIC_SITE_URL` when the variable is not explicitly set.

---

## Key Files

```
src/lib/supabase.ts              Supabase client (anon key) — used by public API routes and pages
src/lib/supabase-admin.ts        Supabase client (service role) — used by admin API routes only
src/lib/auth.ts                  Admin authentication helpers (session check, redirect)
src/lib/email.ts                 Email sending functions (lead emails, contact emails, enterprise emails)
src/lib/crm.ts                   sendToCrm() — non-blocking Onya CRM webhook integration
src/lib/rate-limit.ts            In-memory per-IP rate limiter
src/lib/turnstile.ts             Cloudflare Turnstile server-side token verification
src/lib/content.ts               CMS content fetching functions (reads from Supabase)
src/lib/content-cache.ts         In-memory cache for CMS content; invalidated by admin writes
src/lib/services/pricing.ts      Solar system pricing calculation logic
src/lib/pdfGenerator_new.ts      Server-side PDF generation for cotizaciones (pdf-lib)
src/types/simulation.ts          TypeScript types for the simulator (LeadInput, PDFData, etc.)

src/pages/index.astro            Home page
src/pages/empresas.astro         B2B landing page
src/pages/blog/index.astro       Blog listing
src/pages/blog/[slug].astro      Blog post (uses marked + sanitize-html)

src/pages/api/leads.ts           B2C quote submission endpoint
src/pages/api/empresas-contacts.ts  B2B enterprise contact endpoint
src/pages/api/contacts.ts        General contact endpoint

src/components/organisms/savings-calculator.tsx  Interactive solar simulator (React, client-side)
src/components/organisms/empresas/empresas-contact-form.tsx  B2B contact form (React)

astro.config.mjs                 Astro configuration (SSR, Vercel adapter, Tailwind)
supabase/migrations/             Ordered SQL migration files
```

---

## Patterns & Gotchas

### 1. RLS requires both a policy AND a GRANT

Supabase RLS policies control row visibility, but the underlying PostgreSQL table privilege must also be granted. Without `GRANT INSERT ON table TO anon`, even a permissive `WITH CHECK (true)` policy will return error code `42501`.

```sql
-- Both are required for anon inserts:
CREATE POLICY "Allow anon insert" ON public.my_table
  FOR INSERT TO anon WITH CHECK (true);

GRANT INSERT ON public.my_table TO anon;
```

### 2. Never chain `.select().single()` after INSERT for anon writes

`.insert().select().single()` generates `INSERT ... RETURNING *`. The `RETURNING` clause is subject to SELECT policies. If `anon` has no SELECT policy (as is intentional for lead/contact tables — they are write-only for public users), this returns a `42501` error even though the row was inserted successfully.

```typescript
// ❌ Breaks with 42501 when anon has no SELECT policy
const { data, error } = await supabase.from('leads').insert({...}).select().single();

// ✅ Correct pattern
const { error } = await supabase.from('leads').insert({...});
```

### 3. Turnstile is automatically bypassed in development

`src/lib/turnstile.ts` returns `true` immediately if `TURNSTILE_SECRET_KEY` is not set. This means forms work in local development without a valid Turnstile token. Do not forget to set the secret in production.

### 4. CRM and email failures never block the user response

Both `sendToCrm()` and the email helpers are called inside `try/catch` blocks. A failure logs a `console.error` and continues — the form always returns `200` to the user as long as the Supabase insert succeeded.

### 5. Full SSR — no static generation

`astro.config.mjs` sets `output: 'server'`. Every route is a serverless function on Vercel. There are no pre-rendered static pages. This means:
- Cold start latency applies to all routes (mitigated by the keep-alive cron).
- CMS content is fetched at request time and cached in-process.
- The admin panel has no public surface — it only renders after auth validation.

### 6. htmlparser2 pinned to CJS build

The blog post renderer uses `marked` + `sanitize-html`. A transitive dependency (`htmlparser2`) ships an ESM-only build in newer versions that breaks Vercel's Node.js bundler. `package.json` overrides it to a version that includes the CJS build:

```json
"overrides": {
  "htmlparser2": "9.1.0"
}
```

### 7. In-memory cache invalidation

`src/lib/content-cache.ts` caches CMS data per content type in the serverless function's process memory. Admin write operations call `clearContentCache(type)` to invalidate the relevant cache key. Because Vercel can run multiple function instances simultaneously, a cache invalidation in one instance does not propagate to others — cache staleness of a few seconds is expected and acceptable for this use case.

---

## Deploy

The project deploys automatically to Vercel on every push to `main`.

### Build command

```bash
astro build
```

### Required environment variables on Vercel

Set all variables listed in the [Environment Variables](#environment-variables) section under **Settings → Environment Variables** for the Production environment.

`CRM_WEBHOOK_URL` in particular must be set as a plain environment variable (not marked as a Vercel secret) — without the `PUBLIC_` prefix so it remains server-side only.

### Database migrations

Migrations are not applied automatically on deploy. Apply them manually via the Supabase dashboard SQL Editor or the Supabase CLI:

```bash
supabase db push
```

Run this after adding a new migration file to `supabase/migrations/`.

### Cron job

`/api/cron/keep-alive` should be configured as a Vercel Cron Job (or an external scheduler) to fire every few minutes. This prevents cold starts on the first real user request after a period of inactivity.
