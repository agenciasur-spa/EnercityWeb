import { useState, useEffect } from 'react';
import { Menu, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import logoEnercity from '/src/assets/logoEnercity.png'; 
import type { NavLink } from '../../types/content';

interface NavbarProps {
  links?: NavLink[];
}

export function Navbar({ links = [] }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    // Contenedor centrado con ancho automático
    <div className="fixed w-full z-50 flex justify-center px-6 transition-all duration-500 pointer-events-none">
      <motion.nav
        initial={false}
        animate={{
          width: scrolled ? 'auto' : '100%',
          maxWidth: scrolled ? 'fit-content' : '1280px',
          marginTop: scrolled ? '1.5rem' : '0rem',
        }}
        className={`
          pointer-events-auto flex items-center transition-all duration-500 
          ${scrolled 
            ? 'bg-[#154660]/90 backdrop-blur-xl rounded-full py-2.5 px-6 shadow-[0_8px_40px_rgba(21,70,96,0.45)]' 
            : 'bg-transparent py-6 px-4 border-transparent'}
        `}
      >
        <div className="flex justify-between items-center gap-8 w-full">
          
          {/* LOGO */}
          <div className="flex items-center gap-2.5 shrink-0 cursor-pointer">
            <img 
              src={logoEnercity.src} 
              alt="Enercity Logo" 
              className={`h-auto object-contain relative z-10 transition-all duration-500 ${scrolled ? 'w-[100px] md:w-[120px]' : 'w-[200px] md:w-[232px]'}`}
              width={232}
              height={112}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
          </div>

          {/* DESKTOP LINKS */}
          <div className="hidden md:flex items-center gap-8">
            {links.map((link) => (
              <motion.a 
                key={link.id || link.href}
                href={link.href} 
                whileHover={{ y: -1, transition: { duration: 0.15 } }}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-[#F07E04] after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </motion.a>
            ))}
            
            {/* FAQ Link */}
            <motion.button 
              onClick={() => {
                (window as any).toggleFAQModal?.();
              }}
              whileHover={{ y: -1, transition: { duration: 0.15 } }}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors relative after:absolute after:bottom-0 after:left-0 after:w-0 after:h-[1.5px] after:bg-[#F07E04] after:transition-all after:duration-300 hover:after:w-full"
            >
              FAQ
            </motion.button>
            
            {/* BOTÓN SIMULAR ESTILO ENERCITY */}
            <motion.button 
              onClick={() => document.getElementById('simulador-section')?.scrollIntoView({ behavior: 'smooth' })}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="bg-[#F07E04] hover:bg-[#F09C0A] text-white px-6 py-2 rounded-full font-bold text-sm transition-colors shadow-[0_4px_20px_rgba(240,126,4,0.33)] flex items-center gap-2 group"
            >
              Simular Ahorro
              <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </motion.button>
          </div>

          {/* MOBILE TOGGLE */}
          <button 
            className="md:hidden text-white p-1"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* MOBILE MENU DROPDOWN */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute top-[calc(100%+12px)] left-0 right-0 bg-[#154660] border border-white/10 p-6 rounded-[2rem] shadow-2xl md:hidden mx-6"
            >
              <div className="flex flex-col gap-4">
                {links.map((link) => (
                  <a 
                    key={link.id || link.href}
                    href={link.href} 
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-bold text-white/80 hover:text-[#F07E04] py-2 border-b border-white/5"
                  >
                    {link.label}
                  </a>
                ))}
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    (window as any).toggleFAQModal?.();
                  }}
                  className="text-lg font-bold text-white/80 hover:text-[#F07E04] py-2 border-b border-white/5 text-left"
                >
                  FAQ
                </button>
                <button 
                  onClick={() => {
                    setIsMenuOpen(false);
                    document.getElementById('simulador-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="w-full bg-[#F07E04] text-white py-4 rounded-2xl font-black text-center shadow-lg mt-2"
                >
                  SIMULAR MI AHORRO AHORA
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
