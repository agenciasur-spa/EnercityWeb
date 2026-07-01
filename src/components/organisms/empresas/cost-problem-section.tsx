import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import type { EmpresasCostProblemContent } from '../../../types/content';

interface CostProblemSectionProps {
  content: EmpresasCostProblemContent;
}

export function CostProblemSection({ content }: CostProblemSectionProps) {
  return (
    <section className="py-24 bg-[#154660] text-white">
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
            className="text-4xl md:text-5xl font-semibold font-sans leading-[1.05] mb-12 tracking-tighter"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            {content.headline}{' '}
            <span className="text-[#F07E04]">{content.headlineAccent}</span>
          </motion.h2>

          {/* Bullet points grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {content.bulletPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
                className="flex items-start gap-4 p-6 rounded-2xl bg-white/5 border border-white/10"
              >
                <AlertCircle className="w-6 h-6 text-[#F07E04] shrink-0 mt-0.5" />
                <p className="text-white/80 leading-relaxed">{point}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
