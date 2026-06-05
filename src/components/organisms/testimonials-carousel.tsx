import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import type { Testimonial } from '../../types/content';

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
  sectionTag?: string;
  sectionTitle?: string;
  sectionTitleAccent?: string;
}

export function TestimonialsCarousel({
  testimonials,
  sectionTag = 'Lo que dicen nuestros clientes',
  sectionTitle = 'Resultados que',
  sectionTitleAccent = 'hablan por sí solos.',
}: TestimonialsCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const isDragging = useRef(false);

  // Don't render if no testimonials
  if (!testimonials || testimonials.length === 0) return null;

  const goNext = () => setActiveIndex((prev) => (prev + 1) % testimonials.length);
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const diff = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;
    if (Math.abs(diff) >= minSwipeDistance) {
      if (diff > 0) goNext();
      else goPrev();
    }
  };

  const current = testimonials[activeIndex];

  return (
    <section className="py-24 bg-[#154660] overflow-hidden">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-black uppercase tracking-[0.25em] mb-4 text-[#F07E04]">
            {sectionTag}
          </p>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] text-white tracking-tighter">
            {sectionTitle}{' '}
            <span className="text-[#F07E04]">{sectionTitleAccent}</span>
          </h2>
        </div>

        {/* Carousel */}
        <div
          className="max-w-4xl mx-auto relative touch-pan-y select-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Navigation Arrows */}
          {testimonials.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 md:-translate-x-16 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center hover:bg-[#F07E04] hover:border-[#F07E04] transition-all z-10 shadow-xl"
                aria-label="Testimonio anterior"
              >
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 md:translate-x-16 w-12 h-12 rounded-full bg-white/10 backdrop-blur-lg border border-white/20 flex items-center justify-center hover:bg-[#F07E04] hover:border-[#F07E04] transition-all z-10 shadow-xl"
                aria-label="Siguiente testimonio"
              >
                <ChevronRight className="w-6 h-6 text-white" />
              </button>
            </>
          )}

          {/* Testimonial Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="text-center px-8 md:px-16"
            >
              {/* Quote Icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#F07E04]/20 flex items-center justify-center mx-auto mb-8">
                <Quote className="w-8 h-8 text-[#F07E04]" />
              </div>

              {/* Testimonial Text */}
              <p className="text-xl md:text-2xl lg:text-3xl text-white/90 font-medium leading-relaxed mb-10 italic">
                &ldquo;{current.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center justify-center gap-4">
                {current.image_url ? (
                  <img
                    src={current.image_url}
                    alt={current.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#F07E04]"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#F07E04] flex items-center justify-center text-white font-bold text-lg">
                    {current.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <p className="text-white font-bold text-lg">{current.name}</p>
                  <p className="text-[#F07E04] text-sm font-semibold uppercase tracking-wider">
                    {current.title}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot Indicators */}
          {testimonials.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-12">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`transition-all duration-500 h-2.5 rounded-full ${
                    i === activeIndex ? 'w-12 bg-[#F07E04]' : 'w-2.5 bg-white/20'
                  }`}
                  aria-label={`Ir al testimonio ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
