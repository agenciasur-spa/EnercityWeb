INSERT INTO public.settings (key, value, label)
VALUES (
  'email_notification_to',
  'contacto@enercity.cl',
  'Correos de notificación (separados por coma)'
)
ON CONFLICT (key) DO NOTHING;
