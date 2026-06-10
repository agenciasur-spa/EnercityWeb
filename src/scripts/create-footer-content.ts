import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createFooterContent() {
  const footerData = {
    description: "Expertos en energía solar fotovoltaica con 8 años de experiencia y más de 150 instalaciones realizadas en Chile. Soluciones residenciales e industriales certificadas por SEC.",
    address: "Av. Pedro de Valdivia 273, oficina 1611, Providencia, Chile",
    phone: "+56 9 2902 8578",
    email: "Contacto@Enercity.cl",
    socials: [
      {"icon": "Facebook", "href": "#", "label": "Facebook (próximamente)"},
      {"icon": "Linkedin", "href": "#", "label": "LinkedIn (próximamente)"},
      {"icon": "Instagram", "href": "#", "label": "Instagram (próximamente)"}
    ]
  };

  const { data, error } = await supabase
    .from('site_content')
    .upsert([
      {
        section: 'footer',
        data: footerData,
        updated_at: new Date().toISOString()
      }
    ], { onConflict: 'section' })
    .select();

  if (error) {
    console.error('Error creating footer content:', error);
  } else {
    console.log('Footer content created successfully:', data);
  }
}

createFooterContent();