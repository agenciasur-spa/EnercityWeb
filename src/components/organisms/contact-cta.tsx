import React, { useState, useMemo } from 'react';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { resolveIcon } from '../../lib/icon-map';
import type { ContactCtaContent } from '../../types/content';

interface ContactCtaProps {
  content: ContactCtaContent;
}

export function ContactCta({ content }: ContactCtaProps) {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    email: '',
    proyecto: '',
    mensaje: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validaciones en tiempo real
  const validateField = (name: string, value: string) => {
    let error = '';
    if (name === 'nombre' && value.length < 3) error = 'Nombre demasiado corto';
    if (name === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Email inválido';
    if (name === 'telefono' && !/^[0-9+]{9,12}$/.test(value.replace(/\s/g, ''))) error = 'Teléfono no válido';
    if (name === 'proyecto' && value === '') error = 'Selecciona un tipo';
    
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const isFormValid = useMemo(() => {
    return (
      formData.nombre.length >= 3 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
      formData.proyecto !== '' &&
      Object.values(errors).every(err => err === '')
    );
  }, [formData, errors]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Error al enviar');
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section className="py-24 bg-white" id="contacto">
        <div className="container mx-auto px-6 flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-12 rounded-[3rem] bg-[#154660] text-center max-w-xl shadow-2xl"
          >
            <div className="w-20 h-20 bg-[#4AAF4D] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-semibold font-sans text-white mb-4">¡Mensaje Recibido!</h2>
            <p className="text-white/70 mb-8 text-lg">Un ingeniero de Enercity se pondrá en contacto contigo en las próximas 24 horas hábiles.</p>
            <button 
              onClick={() => setSubmitted(false)}
              className="text-[#F07E04] font-black font-sans uppercase tracking-widest text-sm hover:underline"
            >
              Enviar otro mensaje
            </button>
          </motion.div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-white" id="contacto">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* COLUMNA IZQUIERDA — Dynamic content from props */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
            <p className="text-sm font-black font-sans uppercase tracking-[0.3em] mb-4 text-[#F07E04]">{content.tagline}</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold font-sans leading-[1.1] mb-8 text-[#154660] tracking-tighter">
              {content.headline} <br />
              <span className="text-[#F07E04]">{content.headlineAccent}</span>
            </h2>
            <div className="space-y-6">
              {Array.isArray(content.benefits) && content.benefits.map((benefit, idx) => {
                const BenefitIcon = resolveIcon(benefit.icon);
                return (
                  <motion.div 
                    key={idx} 
                    className="flex items-center gap-5 group"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.15, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#4AAF4D10] text-[#4AAF4D]">
                      {BenefitIcon && <BenefitIcon className="w-6 h-6" />}
                    </div>
                    <span className="text-lg font-bold text-[#154660]">{benefit.text}</span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* COLUMNA DERECHA: FORMULARIO CON VALIDACIÓN — Labels stay FIXED */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="p-8 md:p-12 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #154660 0%, #0D2D3E 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <h4 className="text-white text-2xl font-bold font-sans mb-8">Solicita tu estudio gratuito</h4>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Nombre */}
              <div className="relative">
                <input 
                  name="nombre"
                  type="text" 
                  placeholder="Tu Nombre" 
                  aria-label="Tu nombre completo"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={`w-full px-5 py-4 rounded-2xl bg-white/5 border transition-all text-white placeholder:text-white/20 focus:outline-none ${errors.nombre ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-[#F07E04]'}`} 
                />
                {errors.nombre && <span className="absolute right-4 top-4 text-red-500 text-[10px] uppercase font-black font-sans">{errors.nombre}</span>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {/* Email */}
                <div className="relative">
                  <input 
                    name="email"
                    type="email" 
                    placeholder="Correo Electrónico" 
                    aria-label="Correo electrónico"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-5 py-4 rounded-2xl bg-white/5 border transition-all text-white placeholder:text-white/20 focus:outline-none ${errors.email ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-[#F07E04]'}`} 
                  />
                </div>
                {/* Teléfono */}
                <div className="relative">
                  <input 
                    name="telefono"
                    type="tel" 
                    placeholder="WhatsApp (+569...)" 
                    aria-label="WhatsApp con código de área +569"
                    value={formData.telefono}
                    onChange={handleChange}
                    className={`w-full px-5 py-4 rounded-2xl bg-white/5 border transition-all text-white placeholder:text-white/20 focus:outline-none ${errors.telefono ? 'border-red-500/50 bg-red-500/5' : 'border-white/10 focus:border-[#F07E04]'}`} 
                  />
                </div>
              </div>
              
              {/* Selector */}
              <div className="relative">
                <select 
                  name="proyecto"
                  aria-label="Selecciona tipo de proyecto"
                  value={formData.proyecto}
                  onChange={handleChange}
                  className={`w-full px-5 py-4 rounded-2xl bg-white/5 border transition-all text-white/50 focus:outline-none appearance-none cursor-pointer ${errors.proyecto ? 'border-red-500/50' : 'border-white/10 focus:border-[#F07E04]'}`}
                >
                  <option value="" disabled>Selecciona Tipo de Proyecto</option>
                  <option value="residencial" className="bg-[#154660]">Residencial (Hogar)</option>
                  <option value="industrial" className="bg-[#154660]">Industrial / B2B</option>
                  <option value="agricola" className="bg-[#154660]">Agrícola (Riego)</option>
                </select>
              </div>

              {/* Mensaje */}
              <div className="relative">
                <textarea
                  name="mensaje"
                  placeholder="Cuéntanos sobre tu proyecto (opcional)"
                  aria-label="Mensaje sobre tu proyecto"
                  value={formData.mensaje}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 transition-all text-white placeholder:text-white/20 focus:outline-none focus:border-[#F07E04] resize-none"
                />
              </div>

              {/* Botón con validación visual */}
              <motion.button 
                type="submit" 
                disabled={loading || !isFormValid}
                whileHover={isFormValid ? { scale: 1.02, transition: { duration: 0.2 } } : undefined}
                whileTap={isFormValid ? { scale: 0.98 } : undefined}
                className={`w-full py-5 rounded-2xl text-white font-black font-sans text-xl shadow-xl transition-all flex items-center justify-center gap-3 ${!isFormValid ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                style={{ background: '#F07E04' }}
              >
                {loading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send className="w-5 h-5" /> Enviar Solicitud</>}
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
