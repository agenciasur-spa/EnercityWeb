-- =============================================
-- Empresas Landing Page: Initial content seed
-- Inserts all 8 empresas sections into site_content
-- =============================================

INSERT INTO public.site_content (section, data) VALUES

('empresas_hero', '{
  "badge": "Energía Solar Empresarial",
  "headline": "Reduce tus costos",
  "headlineAccent": "eléctricos",
  "subheadline": "Instalamos, operamos y monitoreamos tu sistema fotovoltaico con garantía de instalación y soporte técnico especializado.",
  "ctaPrimary": "Evalúa tu proyecto",
  "ctaSecondary": "Energía para tu hogar"
}'::jsonb),

('empresas_cost_problem', '{
  "tagline": "Costos Eléctricos",
  "headline": "Los costos eléctricos están",
  "headlineAccent": "golpeando tus márgenes",
  "bulletPoints": [
    "Tarifas eléctricas en alza que suben de forma sostenida.",
    "Costos por kWh que disminuyen utilidades, especialmente en industrias, bodegas y PYMEs.",
    "Alta dependencia de distribuidoras y exposición a volatilidad tarifaria.",
    "Presión por cumplir estándares ESG y reducir huella de carbono en cadenas de suministro."
  ]
}'::jsonb),

('empresas_value_prop', '{
  "tagline": "Enercity",
  "headline": "Enercity para",
  "headlineAccent": "empresas y pymes",
  "description": "Soluciones fotovoltaicas industriales con ingeniería de alto estándar. Somos especialistas en proyectos industriales y comerciales. Con más de 8 años en el rubro, diseñamos e instalamos sistemas fotovoltaicos llave en mano.",
  "points": [
    {"icon": "Briefcase", "text": "Ingeniería y diseño técnico para tu negocio."},
    {"icon": "ShieldCheck", "text": "Instalación certificada y gestión completa SEC."},
    {"icon": "Zap", "text": "Equipos Huawei con garantía hasta 10 años y paneles 25."},
    {"icon": "Clock", "text": "Monitoreo 24/7 y servicio postventa real."},
    {"icon": "TrendingDown", "text": "Diferentes opciones de financiamiento / crédito verde."}
  ],
  "ctaText": "Evaluar mi proyecto",
  "ctaHref": "#contacto"
}'::jsonb),

('empresas_benefit_cards', '{
  "tagline": "Beneficios",
  "headline": "¿Qué logras con una planta",
  "headlineAccent": "solar industrial?",
  "cards": [
    {"id": "1", "title": "Reducción inmediata de costos", "summary": "Impacto directo en OPEX desde el inicio.", "detail": "Disminuye tu boleta eléctrica desde el primer mes con energía generada por tu propia planta.", "icon": "TrendingDown", "color": "#F07E04"},
    {"id": "2", "title": "Estabilidad ante alzas tarifarias", "summary": "Menos volatilidad, más control financiero.", "detail": "Fijas parte de tu costo eléctrico por más de 25 años, reduciendo exposición a volatilidad.", "icon": "BarChart3", "color": "#154660"},
    {"id": "3", "title": "Cumplimiento ESG", "summary": "Mejor percepción y acceso a oportunidades.", "detail": "Mejora tu imagen corporativa, cumple normativas y reduce la huella de carbono.", "icon": "Leaf", "color": "#4AAF4D"},
    {"id": "4", "title": "Operación continua y segura", "summary": "Monitoreo y soporte para continuidad operacional.", "detail": "Monitoreo en tiempo real, mantenimiento programado y soporte técnico especializado.", "icon": "ShieldCheck", "color": "#F07E04"}
  ]
}'::jsonb),

('empresas_process', '{
  "tagline": "Proceso",
  "headline": "Un proceso claro, rápido y",
  "headlineAccent": "diseñado para empresas",
  "steps": [
    {"step": 1, "title": "Reunión técnica y diagnóstico energético", "description": "Revisamos tu consumo, boletas eléctricas, superficie disponible y factibilidad.", "icon": "ClipboardList"},
    {"step": 2, "title": "Diseño, instalación y certificación", "description": "Diseñamos e instalamos tu planta con equipos certificados, en paralelo con la tramitación SEC.", "icon": "Wrench"},
    {"step": 3, "title": "Generación diaria y monitoreo 24/7", "description": "Acceso a plataforma de monitoreo, reportes y soporte permanente.", "icon": "Activity"}
  ]
}'::jsonb),

('empresas_whats_included', '{
  "tagline": "Incluido",
  "headline": "¿Qué incluye tu proyecto",
  "headlineAccent": "fotovoltaico?",
  "items": [
    {"title": "Paneles solares industriales", "description": "Tier-1, garantía 25 años", "icon": "Sun"},
    {"title": "Inversor Huawei", "description": "Con monitoreo integrado", "icon": "Cpu"},
    {"title": "Cableado y protecciones industriales", "description": "Materiales certificados", "icon": "Cable"},
    {"title": "Conexión y tramitación con distribuidora", "description": "Gestión completa", "icon": "Plug"},
    {"title": "Certificación SEC", "description": "Cumplimiento normativo", "icon": "FileCheck"},
    {"title": "Monitoreo 24/7 desde app y plataforma web", "description": "Control total", "icon": "MonitorSmartphone"}
  ]
}'::jsonb),

('empresas_faq', '[
  {"pregunta": "¿Instalan sistemas On Grid u Off Grid?", "respuesta": "Trabajamos principalmente con sistemas On Grid industriales, que permiten inyectar excedentes a la red. Para zonas sin conexión o con cortes frecuentes, evaluamos sistemas híbridos con respaldo de baterías."},
  {"pregunta": "¿Cuánto dura la garantía?", "respuesta": "Paneles solares hasta 25 años, inversores hasta 10 años según el fabricante. Adicionalmente entregamos garantía de instalación y soporte técnico postventa."},
  {"pregunta": "¿Qué marca de inversores utilizan?", "respuesta": "Huawei, Fronius, Sungrow, y otras marcas líderes del mercado con soporte técnico local y repuestos disponibles en Chile."},
  {"pregunta": "¿Qué pasa si se corta la luz?", "respuesta": "La planta se apaga por seguridad. En sistemas On Grid no hay generación sin red. Si necesitas respaldo ante cortes, evaluamos un sistema híbrido con baterías."},
  {"pregunta": "¿Qué incluye la cotización?", "respuesta": "Estudio de consumo, diseño preliminar, simulación de ahorro, propuesta técnica y económica detallada sin costo."},
  {"pregunta": "¿Puedo mantener mi medidor actual?", "respuesta": "Sólo si ya posees medidor inteligente. De lo contrario, gestionamos el cambio de medidor ante tu distribuidora como parte del proyecto."}
]'::jsonb),

('empresas_contact', '{
  "tagline": "Contacto",
  "headline": "Reduce tus costos eléctricos y",
  "headlineAccent": "asegura tu operación",
  "description": "Con energía solar tu empresa produce su propia electricidad, baja costos y gana independencia."
}'::jsonb)

ON CONFLICT (section) DO NOTHING;
