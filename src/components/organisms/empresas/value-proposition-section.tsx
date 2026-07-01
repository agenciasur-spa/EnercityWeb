import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { resolveIcon } from '../../../lib/icon-map';
import type { EmpresasValuePropositionContent } from '../../../types/content';

interface ValuePropositionSectionProps {
  content: EmpresasValuePropositionContent;
}

export function ValuePropositionSection({ content }: ValuePropositionSectionProps) {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          {/* Section header */}
          <motion.p
            className="text-sm font-black font-sans uppercase tracking-[0.25em] mb-4 text-[#F07E04]"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {content.tagline}
          </motion.p>

          <motion.h2
            className="text-4xl md:text-5xl lg:text-6xl font-semibold font-sans leading-[1.05] mb-8 text-[#154660] tracking-tighter"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {content.headline}{' '}
            <span className="text-[#F07E04]">{content.headlineAccent}</span>
          </motion.h2>

          <motion.p
            className="text-lg text-gray-500 leading-relaxed mb-10 max-w-3xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {content.description}
          </motion.p>

          {/* Value points */}
          <div className="space-y-5 mb-10">
            {content.points.map((point, index) => {
              const IconComponent = resolveIcon(point.icon);
              return (
                <motion.div
                  key={index}
                  className="flex items-center gap-5 group"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#4AAF4D10] text-[#4AAF4D] group-hover:bg-[#4AAF4D] group-hover:text-white transition-all duration-300 border border-[#4AAF4D15]">
                    {IconComponent && <IconComponent className="w-6 h-6" />}
                  </div>
                  <span className="text-lg font-bold text-[#154660]">{point.text}</span>
                </motion.div>
              );
            })}
          </div>

          {/* CTA button */}
          <motion.a
            href={content.ctaHref}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl font-black font-sans text-lg text-white bg-[#F07E04] hover:bg-[#d96d00] transition-colors shadow-xl shadow-[#F07E04]/30"
          >
            {content.ctaText}
            <ArrowRight className="w-5 h-5" />
          </motion.a>

          {/* Highlighted statement */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="mt-10 p-6 rounded-2xl bg-[#154660]/5 border-l-4 border-[#F07E04]"
          >
            <p className="text-xl font-semibold text-[#154660] italic">
              &ldquo;Tu empresa produce su propia energía, baja costos y gana independencia.&rdquo;
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
