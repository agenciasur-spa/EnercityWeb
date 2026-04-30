-- ============================================
-- Detail Views: Status History + Notes tables
-- ============================================

-- 1. Create lead_status_history table
CREATE TABLE public.lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notas TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_status_history_lead_id ON public.lead_status_history(lead_id, created_at DESC);

ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read lead_status_history" ON public.lead_status_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert lead_status_history" ON public.lead_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- 2. Create contact_status_history table
CREATE TABLE public.contact_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  notas TEXT,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_status_history_contact_id ON public.contact_status_history(contact_id, created_at DESC);

ALTER TABLE public.contact_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read contact_status_history" ON public.contact_status_history
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert contact_status_history" ON public.contact_status_history
  FOR INSERT TO authenticated WITH CHECK (true);

-- 3. Create lead_notes table
CREATE TABLE public.lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lead_notes_lead_id ON public.lead_notes(lead_id, created_at DESC);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read lead_notes" ON public.lead_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert lead_notes" ON public.lead_notes
  FOR INSERT TO authenticated WITH CHECK (true);

-- 4. Create contact_notes table
CREATE TABLE public.contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_contact_notes_contact_id ON public.contact_notes(contact_id, created_at DESC);

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read contact_notes" ON public.contact_notes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert contact_notes" ON public.contact_notes
  FOR INSERT TO authenticated WITH CHECK (true);

-- 5. RPC: update_lead_status_with_history
CREATE OR REPLACE FUNCTION public.update_lead_status_with_history(
  p_lead_id UUID,
  p_to_status TEXT,
  p_changed_by UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_status TEXT;
BEGIN
  SELECT estado INTO v_from_status FROM public.leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found';
  END IF;

  UPDATE public.leads SET estado = p_to_status WHERE id = p_lead_id;

  INSERT INTO public.lead_status_history (lead_id, from_status, to_status, notas, changed_by)
  VALUES (p_lead_id, v_from_status, p_to_status, p_notas, p_changed_by);

  RETURN json_build_object('success', true);
END;
$$;

-- 6. RPC: update_contact_status_with_history
CREATE OR REPLACE FUNCTION public.update_contact_status_with_history(
  p_contact_id UUID,
  p_to_status TEXT,
  p_changed_by UUID,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_from_status TEXT;
BEGIN
  SELECT estado INTO v_from_status FROM public.contacts WHERE id = p_contact_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contact not found';
  END IF;

  UPDATE public.contacts SET estado = p_to_status WHERE id = p_contact_id;

  INSERT INTO public.contact_status_history (contact_id, from_status, to_status, notas, changed_by)
  VALUES (p_contact_id, v_from_status, p_to_status, p_notas, p_changed_by);

  RETURN json_build_object('success', true);
END;
$$;

-- 7. Backfill: existing leads -> lead_status_history
INSERT INTO public.lead_status_history (lead_id, from_status, to_status, notas, changed_by)
SELECT id, NULL, estado, 'Registro inicial (backfill)', NULL
FROM public.leads
WHERE id NOT IN (SELECT lead_id FROM public.lead_status_history);

-- 8. Backfill: existing contacts -> contact_status_history
INSERT INTO public.contact_status_history (contact_id, from_status, to_status, notas, changed_by)
SELECT id, NULL, estado, 'Registro inicial (backfill)', NULL
FROM public.contacts
WHERE id NOT IN (SELECT contact_id FROM public.contact_status_history);

-- 9. Migrate existing notas text to lead_notes
INSERT INTO public.lead_notes (lead_id, content, created_by)
SELECT id, notas, NULL
FROM public.leads
WHERE notas IS NOT NULL AND notas != '';

-- 10. Migrate existing notas text to contact_notes
INSERT INTO public.contact_notes (contact_id, content, created_by)
SELECT id, notas, NULL
FROM public.contacts
WHERE notas IS NOT NULL AND notas != '';

-- NOTE: notas columns are NOT dropped yet. That happens in Phase 5
-- after all code references to notas are removed.