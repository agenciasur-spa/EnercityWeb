import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { resolveIcon } from '../../../lib/icon-map';
import type { EmpresasBenefitCardsContent } from '../../../types/content';

interface BenefitCardsProps {
  content: EmpresasBenefitCardsContent;
}

export function BenefitCards({ content }: BenefitCardsProps) {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  return (
    <section className="py-24 bg-[#F8FAFC]">
      <div className="container mx-auto px-6">
        {/* Section header */}
        <motion.div
          className="text-center max-w-2xl mx-auto mb-16"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <p className="text-sm font-black font-sans uppercase tracking-[0.25em] mb-4 text-[#F07E04]">
            {content.tagline}
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold font-sans leading-[1.05] text-[#154660] tracking-tighter">
            {content.headline}{' '}
            <span className="text-[#F07E04]">{content.headlineAccent}</span>
          </h2>
        </motion.div>

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {content.cards.map((card, index) => {
            const IconComponent = resolveIcon(card.icon);
            const isActive = activeCard === card.id;
            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.02, y: -4 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className={`rounded-3xl bg-white border-2 overflow-hidden transition-all cursor-pointer ${
                  isActive
                    ? 'shadow-2xl'
                    : 'border-gray-100 shadow-lg hover:shadow-xl'
                }`}
                style={isActive ? { borderColor: card.color } : undefined}
                onClick={() => setActiveCard(isActive ? null : card.id)}
              >
                <div className="p-8">
                  {/* Card header */}
                  <div className="flex items-start gap-5 mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${card.color}15`, color: card.color }}
                    >
                      {IconComponent && <IconComponent className="w-7 h-7" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold font-sans text-[#154660] mb-1">
                        {card.title}
                      </h3>
                      <p className="text-gray-500 text-sm">{card.summary}</p>
                    </div>
                  </div>

                  {/* Expandable detail */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="text-gray-600 leading-relaxed mt-4 pt-4 border-t border-gray-100">
                          {card.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Toggle button */}
                  <button
                    className="flex items-center gap-2 text-sm font-black font-sans uppercase tracking-wider mt-4"
                    style={{ color: card.color }}
                  >
                    {isActive ? 'Cerrar' : 'Ver detalle'}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
