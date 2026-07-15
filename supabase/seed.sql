-- Comunas (26 rows from production)
INSERT INTO public.comunas (id, nombre, activa, region, created_at, radiacion_ghi, tarifa_est) OVERRIDING SYSTEM VALUE VALUES
(1, 'Santiago', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(2, 'Providencia', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(3, 'Las Condes', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(4, 'Vitacura', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(5, 'La Florida', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(6, 'Maipú', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(7, 'Peñalolén', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(8, 'San Bernardo', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(9, 'Puente Alto', true, 'Metropolitana', '2026-02-23 20:01:55.023183+00', 5.50, 175.00),
(10, 'Valparaíso', true, 'Valparaíso', '2026-02-23 20:01:55.023183+00', 5.40, 178.00),
(11, 'Viña del Mar', true, 'Valparaíso', '2026-02-23 20:01:55.023183+00', 5.40, 178.00),
(12, 'Concepción', true, 'Biobío', '2026-02-23 20:01:55.023183+00', 4.30, 182.00),
(13, 'Talcahuano', true, 'Biobío', '2026-02-23 20:01:55.023183+00', 4.30, 175.00),
(14, 'La Serena', true, 'Coquimbo', '2026-02-23 20:01:55.023183+00', 6.20, 180.00),
(15, 'Coquimbo', true, 'Coquimbo', '2026-02-23 20:01:55.023183+00', 6.20, 175.00),
(16, 'Arica', true, 'Arica y Parinacota', '2026-02-26 18:57:22.201897+00', 7.50, 185.00),
(17, 'Iquique', true, 'Tarapacá', '2026-02-26 18:57:22.201897+00', 7.30, 185.00),
(18, 'Antofagasta', true, 'Antofagasta', '2026-02-26 18:57:22.201897+00', 7.40, 185.00),
(19, 'Copiapó', true, 'Atacama', '2026-02-26 18:57:22.201897+00', 7.10, 180.00),
(27, 'Rancagua', true, 'O''Higgins', '2026-02-26 18:57:22.201897+00', 5.30, 175.00),
(28, 'Talca', true, 'Maule', '2026-02-26 18:57:22.201897+00', 4.80, 178.00),
(30, 'Temuco', true, 'Araucanía', '2026-02-26 18:57:22.201897+00', 3.80, 190.00),
(31, 'Valdivia', true, 'Los Ríos', '2026-02-26 18:57:22.201897+00', 3.40, 190.00),
(32, 'Puerto Montt', true, 'Los Lagos', '2026-02-26 18:57:22.201897+00', 3.20, 195.00),
(33, 'Coyhaique', true, 'Aysén', '2026-02-26 18:57:22.201897+00', 2.80, 210.00),
(34, 'Punta Arenas', true, 'Magallanes', '2026-02-26 18:57:22.201897+00', 2.50, 205.00);

SELECT setval('public.comunas_id_seq', 35, false);

-- Precios Kits: seeded by migration 20260714120000_simulator_q4_foundation.sql

-- Settings (obsolete keys removed by migration: costo_medidor_reja, factor_teja)
INSERT INTO public.settings (key, value, label, updated_at) VALUES
('contact_email', 'contacto@enercity.cl', 'Email de contacto principal', '2026-07-01 19:49:07.689279+00'),
('email_from_address', 'presupuestos@enercity.cl', 'Email remitente presupuestos', '2026-02-26 18:40:12.151706+00'),
('email_from_name', 'Enercity', 'Nombre remitente', '2026-02-26 18:40:12.151706+00'),
('email_telefono', '+56912345678', 'Teléfono contacto', '2026-02-26 18:40:12.151706+00'),
('iva', '1.19', 'Factor IVA 19%', '2026-02-26 18:40:12.151706+00'),
('limite_inferior', '50000', 'Monto mínimo simulación', '2026-02-26 18:40:12.151706+00'),
('limite_superior', '230000', 'Monto máximo simulación', '2026-02-26 18:40:12.151706+00'),
('performance_ratio', '0.80', 'Ratio de rendimiento sistema solar', '2026-02-26 19:15:48.617233+00')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, label = EXCLUDED.label, updated_at = EXCLUDED.updated_at;