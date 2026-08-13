-- ============================================
-- EnercityWeb — Admin-editable PDF/web texts
-- ============================================

-- Installation guarantee text rendered in the generated PDF.
INSERT INTO public.settings (key, value, label) VALUES
('garantia_instalacion', 'Garantía de instalación: la instalación y los equipos quedan garantizados por Enercity hasta la recuperación de tu inversión (máx. 10 años). Equipos con garantía de fábrica de 12 a 25 años.', 'Texto de Garantía de Instalación (PDF)'),
('formas_pago', '["Transferencia bancaria","Tarjeta de crédito / débito","Crédito verde / financiamiento"]', 'Formas de Pago (JSON array)')
ON CONFLICT (key) DO NOTHING;
