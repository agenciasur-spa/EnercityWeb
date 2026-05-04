-- =============================================
-- CMS Content: Tables for dynamic site content
-- =============================================

-- 1. site_content — Generic keyed JSONB for hero, guarantees, contact_cta, footer
CREATE TABLE public.site_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT UNIQUE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read site_content" ON public.site_content
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage site_content" ON public.site_content
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER site_content_updated_at
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_site_content_section ON public.site_content(section);

-- 2. stats — Counter stats
CREATE TABLE public.stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read stats" ON public.stats
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage stats" ON public.stats
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER stats_updated_at
  BEFORE UPDATE ON public.stats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_stats_active_order ON public.stats(active, sort_order);

-- 3. projects — Portfolio showcase
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  image_url TEXT,
  saving TEXT NOT NULL,
  saving_label TEXT NOT NULL DEFAULT 'Ahorro Mensual',
  alt_text TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read projects" ON public.projects
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage projects" ON public.projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_projects_active_order ON public.projects(active, sort_order);

-- 4. solutions — Solar solution cards
CREATE TABLE public.solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  badge TEXT NOT NULL,
  description TEXT,
  features JSONB NOT NULL DEFAULT '[]',
  tooltip TEXT,
  icon TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'rgb(240, 126, 4)',
  colorbg TEXT NOT NULL DEFAULT 'rgba(240, 126, 4, 0.08)',
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read solutions" ON public.solutions
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage solutions" ON public.solutions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER solutions_updated_at
  BEFORE UPDATE ON public.solutions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_solutions_active_order ON public.solutions(active, sort_order);

-- 5. nav_links — Navbar + footer links
CREATE TABLE public.nav_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL CHECK (location IN ('navbar', 'footer')),
  label TEXT NOT NULL,
  href TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.nav_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read nav_links" ON public.nav_links
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Authenticated manage nav_links" ON public.nav_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER nav_links_updated_at
  BEFORE UPDATE ON public.nav_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_nav_links_location_order ON public.nav_links(location, active, sort_order);

-- =============================================
-- SEED DATA: Current hardcoded values → DB rows
-- =============================================

-- Hero section content
INSERT INTO public.site_content (section, data) VALUES ('hero', '{
  "badge": "8 años de ingeniería fotovoltaica",
  "headline": "Tu inversión solar",
  "headlineAccent": "garantizada.",
  "subheadline": "Expertos en energía fotovoltaica. Diseñamos soluciones que generan ahorro real hasta que tu proyecto se pague solo.",
  "ctaPrimary": "Simular mi ahorro ahora",
  "ctaSecondary": "Ver proyectos industriales",
  "cardTitle": "Doble",
  "cardSubtitle": "Garantía Real",
  "cardStats": [
    { "value": "120", "label": "Meses ROI Estimado" },
    { "value": "10 Años", "label": "Soporte Técnico Especializado" }
  ]
}'::jsonb);

-- Guarantees section content
INSERT INTO public.site_content (section, data) VALUES ('guarantees', '{
  "headerTag": "Nuestro Diferenciador",
  "headerTitle": "La Doble Garantía",
  "headerTitleAccent": "Enercity",
  "headerDescription": "Nos involucramos de principio a fin. Si nosotros no confiamos en la instalación, no te la vendemos.",
  "cards": [
    {
      "title": "Inversión Protegida",
      "subtitle": "Hasta 120 meses",
      "description": "Cubrimos la instalación y los equipos hasta la recuperación total de tu inversión (ROI), con un máximo de 10 años.",
      "tag": "Garantía de ROI",
      "icon": "ShieldCheck",
      "color": "#F07E04"
    },
    {
      "title": "Extensión Técnica",
      "subtitle": "Hasta 10 años",
      "description": "Si recuperas tu inversión antes de los 10 años (lo habitual), extendemos la garantía de tus equipos sin costo extra.",
      "tag": "Sin costo adicional",
      "icon": "Zap",
      "color": "#4AAF4D"
    }
  ]
}'::jsonb);

-- Contact CTA section content
INSERT INTO public.site_content (section, data) VALUES ('contact_cta', '{
  "tagline": "¿Hablamos?",
  "headline": "¿Listo para transformar",
  "headlineAccent": "tu consumo energético?",
  "benefits": [
    { "icon": "Globe", "text": "Consultoría técnica personalizada sin costo" },
    { "icon": "BarChart3", "text": "Análisis de rentabilidad y ROI en 48h" },
    { "icon": "Zap", "text": "Presupuesto detallado llave en mano" }
  ]
}'::jsonb);

-- Solutions section header
INSERT INTO public.site_content (section, data) VALUES ('solutions_section', '{
  "tag": "Nuestras Soluciones",
  "title": "Cuatro soluciones, un solo objetivo:",
  "titleAccent": "tu independencia energética."
}'::jsonb);

-- Projects section header + extra content
INSERT INTO public.site_content (section, data) VALUES ('projects_section', '{
  "tag": "Confianza de Escala Industrial",
  "title": "Si lo hacemos para plantas,",
  "titleAccent": "imagina lo que hacemos por ti.",
  "description": "Desde pastelerías industriales hasta clínicas, viñas y centros logísticos en todo Chile. Cada proyecto residencial que ejecutamos lleva el mismo rigor de ingeniería certificada, monitoreo proactivo y post-venta garantizada que aplicamos en soluciones B2B de gran escala.",
  "features": [
    "Ingeniería de precisión para hogares e industrias",
    "Instalaciones certificadas bajo estricta normativa SEC",
    "ROI documentado y monitoreo de ahorro en tiempo real"
  ],
  "ctaText": "Ver Catálogo de Proyectos"
}'::jsonb);

-- Footer section content
INSERT INTO public.site_content (section, data) VALUES ('footer', '{
  "description": "Expertos en soluciones fotovoltaicas innovadoras y respetuosas con el medio ambiente en todo Chile.",
  "address": "Av. Providencia 1208, Of. 404, Santiago, Chile",
  "phone": "+56 9 1234 5678",
  "email": "contacto@enercity.cl",
  "socials": [
    { "icon": "Facebook", "href": "#", "label": "Facebook (próximamente)" },
    { "icon": "Linkedin", "href": "#", "label": "LinkedIn (próximamente)" },
    { "icon": "Instagram", "href": "#", "label": "Instagram (próximamente)" }
  ]
}'::jsonb);

-- Stats
INSERT INTO public.stats (value, label, description, icon, sort_order) VALUES
  ('500+', 'Proyectos Instalados', 'Hogares y empresas', 'Users', 1),
  ('15MW', 'Capacidad Generada', 'Energía limpia total', 'Zap', 2),
  ('8+', 'Años Experiencia', 'Ingeniería experta', 'Award', 3),
  ('98%', 'Clientes Satisfechos', 'Post-venta garantizada', 'CheckCircle', 4);

-- Projects
INSERT INTO public.projects (name, type, image_url, saving, saving_label, alt_text, sort_order) VALUES
  ('Planta Industrial Maipú', 'Logística', 'https://picsum.photos/id/101/600/400', '45%', 'Ahorro Mensual', 'Instalación solar en galpón industrial Enercity Maipú', 1),
  ('Viña del Maipo', 'Agricultura', 'https://picsum.photos/id/75/600/400', '$12M', 'Ahorro Anual', 'Paneles solares Enercity en viñedo chileno', 2),
  ('Clínica San Borja', 'Salud', 'https://picsum.photos/id/192/600/400', '220kWp', 'Potencia Instalada', 'Sistema solar Enercity en techo de edificio comercial Santiago', 3);

-- Solutions
INSERT INTO public.solutions (slug, title, badge, description, features, tooltip, icon, color, colorbg, sort_order) VALUES
  ('on-grid', 'Sistemas On-Grid', 'Más popular',
   'Energía inteligente para ciudades. Genera, consume y vende tus excedentes legalmente con Net Billing.',
   '["Conexión a red pública", "Inyección de excedentes", "Sin baterías requeridas", "Máxima rentabilidad"]'::jsonb,
   'Sistema conectado a la red pública. Genera energía del sol durante el día, consume de la red por la noche, e inyecta excedentes con Net Billing.',
   'Sun', 'rgb(240, 126, 4)', 'rgba(240, 126, 4, 0.08)', 1),

  ('off-grid', 'Sistemas Off-Grid', 'Independencia total',
   'La solución definitiva para parcelas o zonas sin acceso a la red eléctrica tradicional.',
   '["Autonomía energética", "Baterías de alta densidad", "Ideal para zonas rurales", "Cero facturas eléctricas"]'::jsonb,
   'Sistema autónomo con baterías. Ideal para zonas rurales sin acceso a red eléctrica. Almacena energía para usar 24/7.',
   'Battery', 'rgb(74, 175, 77)', 'rgba(74, 175, 77, 0.08)', 2),

  ('hybrid', 'Sistemas Híbridos', 'Lo mejor de dos mundos',
   'Mantén la conexión a la red pero con respaldo de baterías para cortes de luz.',
   '["Respaldo ante apagones", "Optimización de consumo", "Gestión inteligente", "Continuidad operativa"]'::jsonb,
   'Combina paneles, baterías y conexión a red. Inyecta excedentes y tiene respaldo automático ante cortes de suministro.',
   'Zap', 'rgb(240, 126, 4)', 'rgba(240, 126, 4, 0.08)', 3),

  ('maintenance', 'Mantención', 'Protege tu inversión',
   'Limpieza técnica y revisión de sistemas para asegurar el 100% de rendimiento.',
   '["Limpieza técnica", "Termografía de paneles", "Informe de rendimiento", "Extensión de vida útil"]'::jsonb,
   'Servicio de limpieza y revisión técnica profesional para mantener tus paneles al 100% de rendimiento todo el año.',
   'Wrench', 'rgb(21, 70, 96)', 'rgba(21, 70, 96, 0.08)', 4);

-- Navbar links
INSERT INTO public.nav_links (location, label, href, sort_order) VALUES
  ('navbar', 'Inicio', '#inicio', 1),
  ('navbar', 'Nosotros', '#nosotros', 2),
  ('navbar', 'Soluciones', '#soluciones', 3),
  ('navbar', 'Simulador', '#simulador-section', 4);

-- Footer links
INSERT INTO public.nav_links (location, label, href, sort_order) VALUES
  ('footer', 'Inicio', '/#inicio', 1),
  ('footer', 'Soluciones', '/#soluciones', 2),
  ('footer', 'Simulador', '/#simulador-section', 3),
  ('footer', 'Proyectos', '/#proyectos', 4);

-- Contact email: add to existing settings table
INSERT INTO public.settings (key, value, label) VALUES
  ('contact_email', 'contacto@enercity.cl', 'Email de contacto principal')
ON CONFLICT (key) DO NOTHING;
