import { motion } from 'framer-motion';
import { resolveIcon } from '../../../lib/icon-map';
import type { EmpresasProcessContent } from '../../../types/content';

interface ProcessStepsProps {
  content: EmpresasProcessContent;
}

export function ProcessSteps({ content }: ProcessStepsProps) {
  return (
    <section className="py-24 bg-white">
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

        {/* Steps */}
        <div className="relative max-w-5xl mx-auto">
          {/* Connecting line — desktop only */}
          <div className="hidden md:block absolute top-10 left-[16.66%] right-[16.66%] h-0.5 bg-gradient-to-r from-[#F07E04]/20 via-[#F07E04]/20 to-[#F07E04]/20" />

          <div className="grid md:grid-cols-3 gap-12 md:gap-8 relative">
            {content.steps.map((step, index) => {
              const IconComponent = resolveIcon(step.icon);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="flex flex-col items-center text-center relative"
                >
                  {/* Number badge */}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-[#F07E04] flex items-center justify-center mb-6 shadow-xl shadow-[#F07E04]/30">
                    <span className="text-2xl font-black font-sans text-white">
                      {String(step.step).padStart(2, '0')}
                    </span>
                  </div>

                  {/* Icon + Title */}
                  <div className="flex items-center justify-center gap-2 mb-3">
                    {IconComponent && (
                      <IconComponent className="w-5 h-5 text-[#F07E04] shrink-0" />
                    )}
                    <h3 className="text-xl font-bold font-sans text-[#154660]">
                      {step.title}
                    </h3>
                  </div>

                  <p className="text-gray-500 leading-relaxed max-w-xs">
                    {step.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
