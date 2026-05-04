import { CheckCircle2, Info, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { resolveIcon } from '../../lib/icon-map';
import type { Solution } from '../../types/content';

interface SolutionsGridProps {
  solutions: Solution[];
  sectionTag?: string;
  sectionTitle?: string;
  sectionTitleAccent?: string;
}

export function SolutionsGrid({
  solutions,
  sectionTag = 'Nuestras Soluciones',
  sectionTitle = 'Cuatro soluciones, un solo objetivo:',
  sectionTitleAccent = 'tu independencia energética.',
}: SolutionsGridProps) {
  // Variantes para animar la lista de checkmarks uno por uno
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  // Empty state: show placeholder when no active solutions
  if (!solutions || solutions.length === 0) {
    return (
      <section id="soluciones" className="py-24 bg-white">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-md mx-auto p-12 rounded-[2.5rem] bg-white shadow-lg border border-gray-100">
            <Sun className="w-12 h-12 text-[#154660]/30 mx-auto mb-4" />
            <h3 className="text-2xl font-bold font-sans text-[#154660] mb-2">Próximamente</h3>
            <p className="text-gray-500">Nuestras soluciones serán publicadas aquí pronto.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="soluciones" className="py-24 bg-white overflow-hidden">
      <div className="container mx-auto px-6">
        
        {/* Header con Animación de Entrada */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <p className="text-sm font-black font-sans uppercase tracking-[0.25em] mb-4 text-[#F07E04]">
            {sectionTag}
          </p>
          <h2 className="text-4xl md:text-5xl font-semibold font-sans mb-6 text-[#154660] leading-tight">
            {sectionTitle}<br />
            <span style={{color: '#F07E04'}}>{sectionTitleAccent}</span>
          </h2>
        </motion.div>

        {/* Grid de Tarjetas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {solutions.map((item, index) => {
            const IconComponent = resolveIcon(item.icon);
            return (
              <motion.div 
                key={item.id || index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.15, // Efecto cascada entre tarjetas
                  ease: [0.21, 0.47, 0.32, 0.98] // Cubic-bezier para un slide suave
                }}
                whileHover={{ y: -10 }} // Pequeño salto al pasar el mouse
                className="bg-white p-8 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-50 flex flex-col h-full"
                style={{
                  borderWidth: '4px 1px 1px',
                  borderStyle: 'solid',
                  borderColor: `${item.color} ${item.colorbg} ${item.colorbg}`,
                }}
              >
                {/* Badge superior */}
                {item.badge && (
                  <div className="mb-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black font-sans" 
                           style={{backgroundColor: item.colorbg, color: item.color}}>
                      {item.badge}
                    </span>
                  </div>
                )}
                
                {/* Contenedor de Icono con pulso sutil */}
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{ backgroundColor: item.colorbg }}
                >
                  {IconComponent && <IconComponent className="w-7 h-7" style={{ color: item.color }} />}
                </motion.div>

                {/* Título y Tooltip */}
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xl font-bold font-sans text-[#154660]">{item.title}</h3>
                  {item.tooltip && (
                    <div className="relative group inline-flex items-center">
                      <Info className="w-4 h-4 text-gray-400 cursor-help hover:text-[#154660] transition-colors" />
                      <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex flex-col items-center invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50">
                        <div className="relative bg-[#154660] text-white text-xs p-3 rounded-lg shadow-xl max-w-[250px] sm:max-w-[300px] w-max text-center leading-relaxed">
                          {item.tooltip}
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#154660]"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <p className="text-gray-500 leading-relaxed mb-6 text-sm flex-grow">
                  {item.description}
                </p>

                {/* Lista de Features con animación escalonada */}
                {Array.isArray(item.features) && item.features.length > 0 && (
                  <motion.ul 
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    className="space-y-3"
                  >
                    {item.features.map((feature, i) => (
                      <motion.li 
                        key={i}
                        variants={itemVariants}
                        className="flex items-center gap-2.5 text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4 shrink-0" style={{color: item.color}} />
                        <span className="text-gray-600">{feature}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
