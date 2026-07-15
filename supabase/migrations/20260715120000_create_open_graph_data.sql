-- Create open_graph_data table for managing SEO metadata per page
CREATE TABLE IF NOT EXISTS open_graph_data (
  id SERIAL PRIMARY KEY,
  route TEXT NOT NULL UNIQUE,
  title TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default OG data
INSERT INTO open_graph_data (route, title, description, image_url) VALUES
  ('/', 'Tu inversión solar garantizada. | Enercity', 'Expertos en energía fotovoltaica. Diseñamos soluciones que generan ahorro real hasta que tu proyecto se pague solo.', 'https://paneles-solares.cl/og-image.png'),
  ('/empresas', 'Soluciones Solares para Empresas | Enercity', 'Reduce costos energéticos y mejora tu imagen corporativa con energía solar. Cotización personalizada para tu empresa.', 'https://paneles-solares.cl/og-image-empresas.png')
ON CONFLICT (route) DO NOTHING;

-- Enable RLS
ALTER TABLE open_graph_data ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to open_graph_data" ON open_graph_data;
DROP POLICY IF EXISTS "Allow authenticated write access to open_graph_data" ON open_graph_data;

-- Create policies
CREATE POLICY "Allow public read access to open_graph_data"
  ON open_graph_data
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow authenticated write access to open_graph_data"
  ON open_graph_data
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON open_graph_data TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON open_graph_data TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE open_graph_data_id_seq TO authenticated;
