import React, { useState, useMemo, useRef } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Turnstile } from '@marsidev/react-turnstile';
import { resolveIcon } from '../../../lib/icon-map';
import type { EmpresasContactContent } from '../../../types/content';

interface EmpresasContactFormProps {
  content: EmpresasContactContent;
}

const REGIONES = [
  'Región Metropolitana de Santiago',
  'Arica y Parinacota',
  'Tarapacá',
  'Antofagasta',
  'Atacama',
  'Coquimbo',
  'Valparaíso',
  'Libertador General Bernardo O\'Higgins',
  'Maule',
  'Ñuble',
  'Biobío',
  'La Araucanía',
  'Los Ríos',
  'Los Lagos',
  'Aysén',
  'Magallanes',
];

const COSTOS = ['$0 a $200 mil', '$200 a $800 mil', '$800mil a $1.5MM', '$1.5MM o más'];

const METODOS = ['WhatsApp', 'Correo', 'Teléfono'];

const BENEFITS = [
  { icon: 'TrendingDown', text: 'Reduce hasta un 80% de tu factura eléctrica' },
  { icon: 'ShieldCheck', text: 'Garantía de instalación y soporte especializado' },
  { icon: 'Zap', text: 'Independencia energética para tu operación' },
  { icon: 'FileCheck', text: 'Estudio técnico personalizado sin costo' },
];

export function EmpresasContactForm({ content }: EmpresasContactFormProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    telefono: '',
    empresa: '',
    rut: '',
    costoElectrico: '',
    region: '',
    metodoContacto: '',
    mensaje: '',
    website: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaError, setCaptchaError] = useState(false);

  const pageLoadTime = useRef(Date.now());

  const siteKey = import.meta.env.PUBLIC_TURNSTILE_SITE_KEY || '';

  // ────────────────────────────────────────────────
  // Client-side validation
  // ────────────────────────────────────────────────

  const validateField = (name: string, value: string) => {
    let error = '';

    switch (name) {
      case 'nombre':
        if (value.length < 3) error = 'Nombre demasiado corto';
        else if (value.length > 255) error = 'Máximo 255 caracteres';
        break;
      case 'email':
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Email inválido';
        break;
      case 'telefono':
        if (value && value.length < 8) error = 'Teléfono demasiado corto';
        else if (value.length > 50) error = 'Máximo 50 caracteres';
        break;
      case 'empresa':
        if (value.length < 2) error = 'Nombre demasiado corto';
        break;
      case 'rut':
        if (!value) error = 'RUT requerido';
        else if (!validarRUTClient(value)) error = 'RUT inválido';
        break;
      case 'costoElectrico':
      case 'region':
      case 'metodoContacto':
        if (value === '') error = 'Selecciona una opción';
        break;
      case 'mensaje':
        if (value.length > 2000) error = 'Máximo 2000 caracteres';
        break;
    }

    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const isFormValid = useMemo(() => {
    return (
      formData.nombre.length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      (formData.telefono === '' || formData.telefono.length >= 8) &&
      formData.empresa.length >= 2 &&
      validarRUTClient(formData.rut) &&
      formData.costoElectrico !== '' &&
      formData.region !== '' &&
      formData.metodoContacto !== '' &&
      formData.mensaje.length <= 2000 &&
      Object.values(errors).every((err) => err === '') &&
      (!siteKey || !!captchaToken)
    );
  }, [formData, errors, captchaToken, siteKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    const timeTaken = Date.now() - pageLoadTime.current;
    if (timeTaken < 3000) return;

    setLoading(true);
    setServerError('');
    try {
      const res = await fetch('/api/empresas-contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, captchaToken, timeTaken }),
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || 'Error al enviar el formulario');
        return;
      }

      setSubmitted(true);
    } catch {
      setServerError('Error de conexión. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────
  // Success state
  // ────────────────────────────────────────────────

  if (submitted) {
    return (
      <section
        id="contacto"
        className="py-24"
        style={{ background: 'linear-gradient(135deg, #154660 0%, #0D2D3E 100%)' }}
      >
        <div className="container mx-auto px-6 flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 rounded-[3rem] bg-white/5 backdrop-blur-sm text-center max-w-xl shadow-2xl border border-white/10"
          >
            <div className="w-20 h-20 bg-[#4AAF4D] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-semibold font-sans text-white mb-4">
              ¡Solicitud Recibida!
            </h2>
            <p className="text-white/70 mb-8 text-lg">
              Un asesor empresarial de Enercity se pondrá en contacto contigo en las próximas 24
              horas hábiles para analizar tu proyecto solar.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  nombre: '',
                  email: '',
                  telefono: '',
                  empresa: '',
                  rut: '',
                  costoElectrico: '',
                  region: '',
                  metodoContacto: '',
                  mensaje: '',
                  website: '',
                });
              }}
              className="text-[#F07E04] font-black font-sans uppercase tracking-widest text-sm hover:underline"
            >
              Enviar otra solicitud
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  // ────────────────────────────────────────────────
  // Form state
  // ────────────────────────────────────────────────

  const inputBaseClass = (field: string) =>
    `w-full px-5 py-4 rounded-2xl bg-white/5 border transition-all text-white placeholder:text-white/20 focus:outline-none ${
      errors[field]
        ? 'border-red-500/50 bg-red-500/5'
        : 'border-white/10 focus:border-[#F07E04]'
    }`;

  const selectBaseClass = (field: string) =>
    `w-full px-5 py-4 rounded-2xl bg-white/5 border transition-all text-white/50 focus:outline-none appearance-none cursor-pointer ${
      errors[field] ? 'border-red-500/50' : 'border-white/10 focus:border-[#F07E04]'
    }`;

  return (
    <section
      id="contacto"
      className="py-24"
      style={{ background: 'linear-gradient(135deg, #154660 0%, #0D2D3E 100%)' }}
    >
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* LEFT COLUMN — content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm font-black font-sans uppercase tracking-[0.3em] mb-4 text-[#F07E04]">
              {content.tagline}
            </p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold font-sans leading-[1.1] mb-8 text-white tracking-tighter">
              {content.headline} <br />
              <span className="text-[#F07E04]">{content.headlineAccent}</span>
            </h2>
            <p className="text-lg text-white/70 mb-10 leading-relaxed max-w-lg">
              {content.description}
            </p>
            <div className="space-y-5">
              {BENEFITS.map((benefit, idx) => {
                const BenefitIcon = resolveIcon(benefit.icon);
                return (
                  <motion.div
                    key={idx}
                    className="flex items-center gap-5 group"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#F07E0410] text-[#F07E04]">
                      {BenefitIcon && <BenefitIcon className="w-6 h-6" />}
                    </div>
                    <span className="text-lg font-bold text-white/90">{benefit.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* RIGHT COLUMN — form card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden bg-white/5 backdrop-blur-sm border border-white/10"
          >
            <h4 className="text-white text-2xl font-bold font-sans mb-6">
              Solicita tu estudio empresarial
            </h4>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div className="relative">
                <input
                  name="nombre"
                  type="text"
                  placeholder="Nombre completo"
                  aria-label="Tu nombre completo"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={inputBaseClass('nombre')}
                />
                {errors.nombre && (
                  <span className="absolute right-4 top-4 text-red-500 text-[10px] uppercase font-black font-sans">
                    {errors.nombre}
                  </span>
                )}
              </div>

              {/* Email + Teléfono */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    name="email"
                    type="email"
                    placeholder="Correo electrónico"
                    aria-label="Correo electrónico"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputBaseClass('email')}
                  />
                  {errors.email && (
                    <span className="absolute right-4 top-4 text-red-500 text-[10px] uppercase font-black font-sans">
                      {errors.email}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    name="telefono"
                    type="tel"
                    placeholder="Teléfono (+569...)"
                    aria-label="Número de teléfono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className={inputBaseClass('telefono')}
                  />
                  {errors.telefono && (
                    <span className="absolute right-4 top-4 text-red-500 text-[10px] uppercase font-black font-sans">
                      {errors.telefono}
                    </span>
                  )}
                </div>
              </div>

              {/* Empresa + RUT */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    name="empresa"
                    type="text"
                    placeholder="Nombre de empresa"
                    aria-label="Nombre de la empresa"
                    value={formData.empresa}
                    onChange={handleChange}
                    className={inputBaseClass('empresa')}
                  />
                  {errors.empresa && (
                    <span className="absolute right-4 top-4 text-red-500 text-[10px] uppercase font-black font-sans">
                      {errors.empresa}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    name="rut"
                    type="text"
                    placeholder="RUT (12.345.678-5)"
                    aria-label="RUT de la empresa"
                    value={formData.rut}
                    onChange={handleChange}
                    className={inputBaseClass('rut')}
                  />
                  {errors.rut && (
                    <span className="absolute right-4 top-4 text-red-500 text-[10px] uppercase font-black font-sans">
                      {errors.rut}
                    </span>
                  )}
                </div>
              </div>

              {/* Costo eléctrico + Método de contacto */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="relative">
                  <select
                    name="costoElectrico"
                    aria-label="Rango de costo eléctrico mensual"
                    value={formData.costoElectrico}
                    onChange={handleChange}
                    className={selectBaseClass('costoElectrico')}
                  >
                    <option value="" disabled>
                      Costo eléctrico mensual
                    </option>
                    {COSTOS.map((c) => (
                      <option key={c} value={c} className="bg-[#154660]">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <select
                    name="metodoContacto"
                    aria-label="Método de contacto preferido"
                    value={formData.metodoContacto}
                    onChange={handleChange}
                    className={selectBaseClass('metodoContacto')}
                  >
                    <option value="" disabled>
                      Método de contacto
                    </option>
                    {METODOS.map((m) => (
                      <option key={m} value={m} className="bg-[#154660]">
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Región */}
              <div className="relative">
                <select
                  name="region"
                  aria-label="Región"
                  value={formData.region}
                  onChange={handleChange}
                  className={selectBaseClass('region')}
                >
                  <option value="" disabled>
                    Selecciona tu región
                  </option>
                  {REGIONES.map((r) => (
                    <option key={r} value={r} className="bg-[#154660]">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mensaje */}
              <div className="relative">
                <textarea
                  name="mensaje"
                  placeholder="Cuéntanos sobre tu empresa o proyecto (opcional)"
                  aria-label="Mensaje opcional sobre tu empresa o proyecto"
                  value={formData.mensaje}
                  onChange={handleChange}
                  rows={3}
                  maxLength={2000}
                  className={`${inputBaseClass('mensaje')} resize-none`}
                />
              </div>

              {/* Honeypot */}
              <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
                <input
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={formData.website}
                  onChange={handleChange}
                />
              </div>

              {/* Turnstile */}
              {siteKey && (
                <div className="flex justify-center my-4">
                  <Turnstile
                    siteKey={siteKey}
                    onSuccess={(token) => {
                      setCaptchaToken(token);
                      setCaptchaError(false);
                    }}
                    onError={() => {
                      setCaptchaError(true);
                      setCaptchaToken(null);
                    }}
                    onExpire={() => {
                      setCaptchaError(true);
                      setCaptchaToken(null);
                    }}
                  />
                </div>
              )}

              {captchaError && (
                <p className="text-red-400 text-[10px] font-black font-sans uppercase tracking-widest text-center">
                  Verifica el captcha para continuar
                </p>
              )}

              {/* Server error */}
              {serverError && (
                <p className="text-red-400 text-sm font-bold font-sans text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4" /> {serverError}
                </p>
              )}

              {/* Submit button */}
              <motion.button
                type="submit"
                disabled={loading || !isFormValid}
                whileHover={
                  isFormValid ? { scale: 1.02, transition: { duration: 0.2 } } : undefined
                }
                whileTap={isFormValid ? { scale: 0.98 } : undefined}
                className={`w-full py-5 rounded-2xl text-white font-black font-sans text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${
                  !isFormValid
                    ? 'opacity-50 cursor-not-allowed grayscale'
                    : 'hover:scale-[1.02] active:scale-[0.98]'
                }`}
                style={{ background: '#F07E04' }}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" /> Solicitar Estudio
                  </>
                )}
              </motion.button>
            </form>

            {!isFormValid && formData.nombre.length > 0 && (
              <p className="mt-4 text-center text-red-400 text-[10px] font-black font-sans uppercase tracking-widest flex items-center justify-center gap-2">
                <AlertCircle className="w-3 h-3" /> Por favor, completa los campos correctamente
              </p>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────
// Client-side RUT validation (mirrors server-side)
// ────────────────────────────────────────────────

function validarRUTClient(rut: string): boolean {
  const clean = rut.replace(/[.\s]/g, '').toUpperCase();
  const match = clean.match(/^(\d{1,8})-?([\dK])$/);
  if (!match) return false;
  const num = parseInt(match[1], 10);
  if (num === 0) return false;

  let sum = 0;
  let mult = 2;
  const digits = match[1].split('').reverse();
  for (const d of digits) {
    sum += parseInt(d) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const expectedDv = 11 - (sum % 11);
  const computedDv =
    expectedDv === 11 ? '0' : expectedDv === 10 ? 'K' : String(expectedDv);
  return match[2] === computedDv;
}
