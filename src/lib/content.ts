/**
 * Content fetcher functions with hardcoded fallbacks.
 * Each function queries Supabase, caches via content-cache,
 * and returns current hardcoded values if Supabase fails.
 */

import { supabase } from './supabase';
import { getCached } from './content-cache';
import type {
  StatItem,
  Project,
  Solution,
  NavLink,
  HeroContent,
  GuaranteeContent,
  ContactCtaContent,
  FooterContent,
  SectionHeader,
  ProjectsSectionContent,
} from '../types/content';

// ────────────────────────────────────────────────
// NORMALIZATION HELPERS
// ────────────────────────────────────────────────

/**
 * Normalize a JSONB value that should be an array.
 *
 * When the admin editor saves array fields (cardStats, cards, benefits, socials),
 * it may have stored them as JSON strings instead of JSONB arrays:
 *   DB has: { "cardStats": "[{\"value\":...}]" }  ← string
 *   DB should have: { "cardStats": [{"value":...}] }  ← array
 *
 * This helper handles both cases: if the value is already an array, return it;
 * if it's a string, parse it; otherwise return an empty array.
 */
function normalizeArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Validate that all string fields in CMS data are actually strings.
 * Logs detailed error if any field is an object/array/buffer.
 */
function validateStringFields(obj: Record<string, unknown>, context: string): void {
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') continue;
    if (Array.isArray(value)) {
      // Arrays are OK if they contain objects
      continue;
    }
    if (typeof value === 'object') {
      console.error(`[CMS VALIDATION ERROR] ${context}.${key} is not a string! Type: ${typeof value}, Value:`, JSON.stringify(value).substring(0, 200));
    }
  }
}

// ────────────────────────────────────────────────
// HARDCODED FALLBACKS (current production values)
// ────────────────────────────────────────────────

const FALLBACK_HERO: HeroContent = {
  badge: '8 años de ingeniería fotovoltaica',
  headline: 'Tu inversión solar',
  headlineAccent: 'garantizada.',
  subheadline:
    'Expertos en energía fotovoltaica. Diseñamos soluciones que generan ahorro real hasta que tu proyecto se pague solo.',
  ctaPrimary: 'Simular mi ahorro ahora',
  ctaSecondary: 'Ver proyectos industriales',
  cardTitle: 'Doble',
  cardSubtitle: 'Garantía Real',
  cardStats: [
    { value: '120', label: 'Meses ROI Estimado' },
    { value: '10 Años', label: 'Soporte Técnico Especializado' },
  ],
  backgroundImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80',
  backgroundVideo: undefined,
};

const FALLBACK_STATS: StatItem[] = [
  {
    id: '1',
    value: '500+',
    label: 'Proyectos Instalados',
    description: 'Hogares y empresas',
    icon: 'Users',
    sort_order: 1,
    active: true,
  },
  {
    id: '2',
    value: '15MW',
    label: 'Capacidad Generada',
    description: 'Energía limpia total',
    icon: 'Zap',
    sort_order: 2,
    active: true,
  },
  {
    id: '3',
    value: '8+',
    label: 'Años Experiencia',
    description: 'Ingeniería experta',
    icon: 'Award',
    sort_order: 3,
    active: true,
  },
  {
    id: '4',
    value: '98%',
    label: 'Clientes Satisfechos',
    description: 'Post-venta garantizada',
    icon: 'CheckCircle',
    sort_order: 4,
    active: true,
  },
];

const FALLBACK_PROJECTS: Project[] = [
  {
    id: '1',
    name: 'Planta Industrial Maipú',
    type: 'Logística',
    image_url: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80',
    saving: '45%',
    saving_label: 'Ahorro Mensual',
    alt_text: 'Instalación solar en galpón industrial Enercity Maipú',
    sort_order: 1,
    active: true,
  },
  {
    id: '2',
    name: 'Viña del Maipo',
    type: 'Agricultura',
    image_url: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80',
    saving: '$12M',
    saving_label: 'Ahorro Anual',
    alt_text: 'Paneles solares Enercity en viñedo chileno',
    sort_order: 2,
    active: true,
  },
  {
    id: '3',
    name: 'Clínica San Borja',
    type: 'Salud',
    image_url: 'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=600&q=80',
    saving: '220kWp',
    saving_label: 'Potencia Instalada',
    alt_text: 'Sistema solar Enercity en techo de edificio comercial Santiago',
    sort_order: 3,
    active: true,
  },
];

const FALLBACK_SOLUTIONS: Solution[] = [
  {
    id: 'on-grid',
    slug: 'on-grid',
    title: 'Sistemas On-Grid',
    badge: 'Más popular',
    description:
      'Energía inteligente para ciudades. Genera, consume y vende tus excedentes legalmente con Net Billing.',
    features: [
      'Conexión a red pública',
      'Inyección de excedentes',
      'Sin baterías requeridas',
      'Máxima rentabilidad',
    ],
    tooltip:
      'Sistema conectado a la red pública. Genera energía del sol durante el día, consume de la red por la noche, e inyecta excedentes con Net Billing.',
    icon: 'Sun',
    color: 'rgb(240, 126, 4)',
    colorbg: 'rgba(240, 126, 4, 0.08)',
    sort_order: 1,
    active: true,
  },
  {
    id: 'off-grid',
    slug: 'off-grid',
    title: 'Sistemas Off-Grid',
    badge: 'Independencia total',
    description:
      'La solución definitiva para parcelas o zonas sin acceso a la red eléctrica tradicional.',
    features: [
      'Autonomía energética',
      'Baterías de alta densidad',
      'Ideal para zonas rurales',
      'Cero facturas eléctricas',
    ],
    tooltip:
      'Sistema autónomo con baterías. Ideal para zonas rurales sin acceso a red eléctrica. Almacena energía para usar 24/7.',
    icon: 'Battery',
    color: 'rgb(74, 175, 77)',
    colorbg: 'rgba(74, 175, 77, 0.08)',
    sort_order: 2,
    active: true,
  },
  {
    id: 'hybrid',
    slug: 'hybrid',
    title: 'Sistemas Híbridos',
    badge: 'Lo mejor de dos mundos',
    description:
      'Mantén la conexión a la red pero con respaldo de baterías para cortes de luz.',
    features: [
      'Respaldo ante apagones',
      'Optimización de consumo',
      'Gestión inteligente',
      'Continuidad operativa',
    ],
    tooltip:
      'Combina paneles, baterías y conexión a red. Inyecta excedentes y tiene respaldo automático ante cortes de suministro.',
    icon: 'Zap',
    color: 'rgb(240, 126, 4)',
    colorbg: 'rgba(240, 126, 4, 0.08)',
    sort_order: 3,
    active: true,
  },
  {
    id: 'maintenance',
    slug: 'maintenance',
    title: 'Mantención',
    badge: 'Protege tu inversión',
    description:
      'Limpieza técnica y revisión de sistemas para asegurar el 100% de rendimiento.',
    features: [
      'Limpieza técnica',
      'Termografía de paneles',
      'Informe de rendimiento',
      'Extensión de vida útil',
    ],
    tooltip:
      'Servicio de limpieza y revisión técnica profesional para mantener tus paneles al 100% de rendimiento todo el año.',
    icon: 'Wrench',
    color: 'rgb(21, 70, 96)',
    colorbg: 'rgba(21, 70, 96, 0.08)',
    sort_order: 4,
    active: true,
  },
];

const FALLBACK_NAVBAR_LINKS: NavLink[] = [
  { id: '1', location: 'navbar', label: 'Inicio', href: '#inicio', sort_order: 1, active: true },
  { id: '2', location: 'navbar', label: 'Nosotros', href: '#nosotros', sort_order: 2, active: true },
  { id: '3', location: 'navbar', label: 'Soluciones', href: '#soluciones', sort_order: 3, active: true },
  { id: '4', location: 'navbar', label: 'Simulador', href: '#simulador-section', sort_order: 4, active: true },
];

const FALLBACK_FOOTER_LINKS: NavLink[] = [
  { id: '5', location: 'footer', label: 'Inicio', href: '/#inicio', sort_order: 1, active: true },
  { id: '6', location: 'footer', label: 'Soluciones', href: '/#soluciones', sort_order: 2, active: true },
  { id: '7', location: 'footer', label: 'Simulador', href: '/#simulador-section', sort_order: 3, active: true },
  { id: '8', location: 'footer', label: 'Proyectos', href: '/#proyectos', sort_order: 4, active: true },
];

const FALLBACK_GUARANTEES: GuaranteeContent = {
  headerTag: 'Nuestro Diferenciador',
  headerTitle: 'La Doble Garantía',
  headerTitleAccent: 'Enercity',
  headerDescription:
    'Nos involucramos de principio a fin. Si nosotros no confiamos en la instalación, no te la vendemos.',
  cards: [
    {
      title: 'Inversión Protegida',
      subtitle: 'Hasta 120 meses',
      description:
        'Cubrimos la instalación y los equipos hasta la recuperación total de tu inversión (ROI), con un máximo de 10 años.',
      tag: 'Garantía de ROI',
      icon: 'ShieldCheck',
      color: '#F07E04',
    },
    {
      title: 'Extensión Técnica',
      subtitle: 'Hasta 10 años',
      description:
        'Si recuperas tu inversión antes de los 10 años (lo habitual), extendemos la garantía de tus equipos sin costo extra.',
      tag: 'Sin costo adicional',
      icon: 'Zap',
      color: '#4AAF4D',
    },
  ],
};

const FALLBACK_CONTACT_CTA: ContactCtaContent = {
  tagline: '¿Hablamos?',
  headline: '¿Listo para transformar',
  headlineAccent: 'tu consumo energético?',
  benefits: [
    { icon: 'Globe', text: 'Consultoría técnica personalizada sin costo' },
    { icon: 'BarChart3', text: 'Análisis de rentabilidad y ROI en 48h' },
    { icon: 'Zap', text: 'Presupuesto detallado llave en mano' },
  ],
};

const FALLBACK_SOLUTIONS_HEADER: SectionHeader = {
  tag: 'Nuestras Soluciones',
  title: 'Cuatro soluciones, un solo objetivo:',
  titleAccent: 'tu independencia energética.',
};

const FALLBACK_PROJECTS_HEADER: ProjectsSectionContent = {
  tag: 'Confianza de Escala Industrial',
  title: 'Si lo hacemos para plantas,',
  titleAccent: 'imagina lo que hacemos por ti.',
  description:
    'Desde pastelerías industriales hasta clínicas, viñas y centros logísticos en todo Chile. Cada proyecto residencial que ejecutamos lleva el mismo rigor de ingeniería certificada, monitoreo proactivo y post-venta garantizada que aplicamos en soluciones B2B de gran escala.',
  features: [
    'Ingeniería de precisión para hogares e industrias',
    'Instalaciones certificadas bajo estricta normativa SEC',
    'ROI documentado y monitoreo de ahorro en tiempo real',
  ],
  ctaText: 'Ver Catálogo de Proyectos',
};

const FALLBACK_FOOTER: FooterContent = {
  description:
    'Expertos en soluciones fotovoltaicas innovadoras y respetuosas con el medio ambiente en todo Chile.',
  address: 'Av. Providencia 1208, Of. 404, Santiago, Chile',
  phone: '+56 9 1234 5678',
  email: 'contacto@enercity.cl',
  socials: [
    { icon: 'Facebook', href: '#', label: 'Facebook (próximamente)' },
    { icon: 'Linkedin', href: '#', label: 'LinkedIn (próximamente)' },
    { icon: 'Instagram', href: '#', label: 'Instagram (próximamente)' },
  ],
};

// ──────────────────────────────────────
// FETCHER FUNCTIONS
// ──────────────────────────────────────

export async function getHeroContent(): Promise<HeroContent> {
  return getCached<HeroContent>(
    'site_content:hero',
    async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('section', 'hero')
        .single();

      if (error || !data?.data) throw error || new Error('No hero data');
      const raw = data.data as Record<string, unknown>;
      validateStringFields(raw, 'hero');
      return {
        ...raw,
        cardStats: normalizeArray<{ value: string; label: string }>(raw.cardStats),
      } as HeroContent;
    },
    FALLBACK_HERO
  );
}

export async function getStats(): Promise<StatItem[]> {
  return getCached<StatItem[]>(
    'stats',
    async () => {
      const { data, error } = await supabase
        .from('stats')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) throw error || new Error('No stats data');
      return data as StatItem[];
    },
    FALLBACK_STATS
  );
}

export async function getProjects(): Promise<Project[]> {
  return getCached<Project[]>(
    'projects',
    async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) throw error || new Error('No projects data');
      return data as Project[];
    },
    FALLBACK_PROJECTS
  );
}

export async function getSolutions(): Promise<Solution[]> {
  return getCached<Solution[]>(
    'solutions',
    async () => {
      const { data, error } = await supabase
        .from('solutions')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) throw error || new Error('No solutions data');
      return data as Solution[];
    },
    FALLBACK_SOLUTIONS
  );
}

export async function getGuaranteesContent(): Promise<GuaranteeContent> {
  return getCached<GuaranteeContent>(
    'site_content:guarantees',
    async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('section', 'guarantees')
        .single();

      if (error || !data?.data) throw error || new Error('No guarantees data');
      const raw = data.data as Record<string, unknown>;
      validateStringFields(raw, 'guarantees');
      return {
        ...raw,
        cards: normalizeArray<GuaranteeContent['cards'][number]>(raw.cards),
      } as GuaranteeContent;
    },
    FALLBACK_GUARANTEES
  );
}

export async function getContactCtaContent(): Promise<ContactCtaContent> {
  return getCached<ContactCtaContent>(
    'site_content:contact_cta',
    async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('section', 'contact_cta')
        .single();

      if (error || !data?.data) throw error || new Error('No contact_cta data');
      const raw = data.data as Record<string, unknown>;
      return {
        ...raw,
        benefits: normalizeArray<ContactCtaContent['benefits'][number]>(raw.benefits),
      } as ContactCtaContent;
    },
    FALLBACK_CONTACT_CTA
  );
}

export async function getNavLinks(location: 'navbar' | 'footer'): Promise<NavLink[]> {
  return getCached<NavLink[]>(
    `nav_links:${location}`,
    async () => {
      const { data, error } = await supabase
        .from('nav_links')
        .select('*')
        .eq('location', location)
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error || !data) throw error || new Error('No nav_links data');
      return data as NavLink[];
    },
    location === 'navbar' ? FALLBACK_NAVBAR_LINKS : FALLBACK_FOOTER_LINKS
  );
}

export async function getFooterContent(): Promise<FooterContent> {
  return getCached<FooterContent>(
    'site_content:footer',
    async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('section', 'footer')
        .single();

      if (error || !data?.data) throw error || new Error('No footer data');
      const raw = data.data as Record<string, unknown>;
      return {
        ...raw,
        socials: normalizeArray<FooterContent['socials'][number]>(raw.socials),
      } as FooterContent;
    },
    FALLBACK_FOOTER
  );
}

export async function getSolutionsSectionHeader(): Promise<SectionHeader> {
  return getCached<SectionHeader>(
    'site_content:solutions_section',
    async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('section', 'solutions_section')
        .single();

      if (error || !data?.data) throw error || new Error('No solutions_section data');
      return data.data as SectionHeader;
    },
    FALLBACK_SOLUTIONS_HEADER
  );
}

export async function getProjectsSectionHeader(): Promise<ProjectsSectionContent> {
  return getCached<ProjectsSectionContent>(
    'site_content:projects_section',
    async () => {
      const { data, error } = await supabase
        .from('site_content')
        .select('data')
        .eq('section', 'projects_section')
        .single();

      if (error || !data?.data) throw error || new Error('No projects_section data');
      const raw = data.data as Record<string, unknown>;
      return {
        ...raw,
        features: normalizeArray<string>(raw.features),
      } as ProjectsSectionContent;
    },
    FALLBACK_PROJECTS_HEADER
  );
}
