import React from 'react';
import { ArrowRight, Zap } from 'lucide-react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import type { HeroContent } from '../../types/content';

interface HeroProps {
  content: HeroContent;
}

export function Hero({ content }: HeroProps) {
  const { backgroundImage, backgroundVideo } = content;

  // Variables para el efecto Parallax del mouse
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Mapeamos el movimiento del mouse a un ligero desplazamiento de la imagen
  const bgX = useTransform(mouseX, [-500, 500], [10, -10]);
  const bgY = useTransform(mouseY, [-500, 500], [10, -10]);

  function handleMouseMove(event: React.MouseEvent) {
    const { clientX, clientY } = event;
    const { innerWidth, innerHeight } = window;
    mouseX.set(clientX - innerWidth / 2);
    mouseY.set(clientY - innerHeight / 2);
  }

  const scrollToSimulator = () => {
    const element = document.getElementById('simulador-section');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section 
      id="inicio" 
      onMouseMove={handleMouseMove}
      className="relative h-screen min-h-[700px] w-full flex items-center overflow-hidden bg-[#0A1929]"
    >
      
      {/* ── BACKGROUND CON PARALLAX ────────────────────────────────────── */}
      <motion.div 
        style={{ x: bgX, y: bgY, scale: 1.1 }}
        className="absolute inset-0 w-full h-full z-0"
      >
        {backgroundVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            poster={backgroundImage || undefined}
            className="w-full h-full object-cover"
            aria-hidden="true"
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        ) : (
          <img
            src={backgroundImage || 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&q=80'}
            alt="Granja solar Enercity"
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
            loading="eager"
            fetchPriority="high"
            decoding="async"
          />
        )}
        {/* Overlay ultra-oscuro para asegurar que el texto blanco se vea sí o sí */}
        <div className="absolute inset-0 bg-[#0A1929]/70 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#0A1929] via-transparent to-black/40" />
      </motion.div>

      {/* ── CONTENIDO PRINCIPAL (Z-10 para estar sobre el fondo) ────────── */}
      <div className="container mx-auto px-6 relative z-10 pt-28 md:pt-36">
        <div className="max-w-4xl">
          
          {/* Badge de confianza */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full mb-8 bg-white/10 backdrop-blur-md border border-white/20 shadow-xl"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-[#4AAF4D] animate-pulse" />
            <span className="text-xs md:text-sm font-black font-sans tracking-[0.2em] uppercase text-white">
              {content.badge}
            </span>
          </motion.div>

          {/* Headline con sombra de texto para legibilidad extrema */}
          <motion.h1 
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-5xl md:text-7xl lg:text-8xl  font-semibold text-white leading-[1.05] mb-8  drop-shadow-2xl"
          >
            {content.headline} <br />
            <span className="text-[#F07E04]">{content.headlineAccent}</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-lg md:text-2xl text-white/90 mb-12 leading-relaxed max-w-2xl font-medium drop-shadow-md"
          >
            {content.subheadline}
          </motion.p>

          {/* Botones de Acción */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-5"
          >
            <motion.button 
              onClick={scrollToSimulator} 
              whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              className="group flex items-center justify-center gap-3 px-10 py-5 rounded-2xl font-black font-sans text-lg text-white bg-[#4AAF4D] hover:bg-[#3d8f3f] transition-colors shadow-2xl shadow-[#4AAF4D]/40"
            >
              {content.ctaPrimary}
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </motion.button>
            <motion.a 
              href="#proyectos"
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center px-10 py-5 rounded-2xl font-black font-sans text-lg text-white bg-white/5 border border-white/20 backdrop-blur-md hover:bg-white/20 transition-colors shadow-xl"
            >
              {content.ctaSecondary}
            </motion.a>
          </motion.div>
        </div>

        {/* ── TARJETA FLOTANTE (Desktop Only) ───────────────────────────── */}
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="absolute right-6 top-1/2 -translate-y-1/2 hidden lg:block p-8 rounded-[2.5rem] bg-[#0A1929]/80 backdrop-blur-2xl border border-white/10 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.5)] w-80"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-[#4AAF4D] flex items-center justify-center shadow-lg shadow-[#4AAF4D]/20">
              <Zap className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <div className="text-xl font-black font-sans text-white">{content.cardTitle}</div>
              <div className="text-[#4AAF4D] text-xs font-black font-sans uppercase tracking-widest">{content.cardSubtitle}</div>
            </div>
          </div>
          
          <div className="space-y-4">
            {Array.isArray(content.cardStats) && content.cardStats.map((stat, idx) => (
              <div key={idx} className="bg-white/5 rounded-2xl p-5 border border-white/5 group hover:bg-white/10 transition-colors">
                <div className="text-4xl font-black font-sans text-white">{stat.value}</div>
                <div className="text-white/40 text-[10px] uppercase tracking-tighter font-bold">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── INDICADOR DE SCROLL MEJORADO ────────────────────────────────── */}
      <motion.div 
        animate={{ y: [0, 12, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 z-20"
      >
        <span className="text-white/40 text-[9px] font-black font-sans tracking-[0.4em] uppercase">Desliza</span>
        <div className="w-[3px] h-14 bg-gradient-to-b from-[#F09C0A] via-[#F09C0A]/40 to-transparent rounded-full" />
      </motion.div>
    </section>
  );
}



