import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { resolveIcon } from '../../../lib/icon-map';
import type { EmpresasChecklistContent } from '../../../types/content';

interface WhatsIncludedChecklistProps {
  content: EmpresasChecklistContent;
}

export function WhatsIncludedChecklist({ content }: WhatsIncludedChecklistProps) {
  return (
    <section className="py-24 bg-[#154660]">
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
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold font-sans leading-[1.05] text-white tracking-tighter">
            {content.headline}{' '}
            <span className="text-[#F07E04]">{content.headlineAccent}</span>
          </h2>
        </motion.div>

        {/* Checklist items */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {content.items.map((item, index) => {
            const IconComponent = resolveIcon(item.icon);
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-white shadow-lg group hover:shadow-xl transition-shadow"
              >
                {/* Icon row */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[#F07E04]/10 text-[#F07E04] group-hover:scale-110 transition-transform">
                    {IconComponent && <IconComponent className="w-6 h-6" />}
                  </div>
                  <CheckCircle className="w-5 h-5 text-[#4AAF4D] ml-auto shrink-0" />
                </div>

                <h3 className="text-lg font-bold font-sans text-[#154660] mb-1">
                  {item.title}
                </h3>
                <p className="text-gray-500 text-sm">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
