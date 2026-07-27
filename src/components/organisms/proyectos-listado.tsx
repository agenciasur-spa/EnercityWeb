import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Zap, Sun, ArrowRight, SolarPanel } from 'lucide-react';
import type { ProyectoDetalle } from '@/types/proyecto-detalle';

interface ProyectosListadoProps {
  proyectos: ProyectoDetalle[];
}

export function ProyectosListado({ proyectos }: ProyectosListadoProps) {
  const [filtro, setFiltro] = useState<string>('Todos');

  const segmentos = useMemo(() => {
    const unicos = Array.from(new Set(proyectos.map((p) => p.segmento).filter(Boolean)));
    return ['Todos', ...unicos];
  }, [proyectos]);

  const filtrados = useMemo(() => {
    if (filtro === 'Todos') return proyectos;
    return proyectos.filter((p) => p.segmento === filtro);
  }, [proyectos, filtro]);

  return (
    <div className="container mx-auto max-w-7xl px-6 py-12">
      {/* Filters */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-3">
        {segmentos.map((seg) => (
          <button
            key={seg}
            onClick={() => setFiltro(seg)}
            className={`rounded-full px-6 py-2.5 text-sm font-bold transition-all ${
              filtro === seg
                ? 'bg-[#F07E04] text-white shadow-[0_4px_20px_rgba(240,126,4,0.33)]'
                : 'bg-white text-[#154660] border border-[#154660]/15 hover:border-[#F07E04]/40'
            }`}
          >
            {seg}
          </button>
        ))}
      </div>

      {/* Grid */}
      <motion.div layout className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtrados.map((p) => (
            <motion.a
              key={p.id}
              href={`/proyectos/${p.slug}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-black/5 transition-transform hover:-translate-y-1"
            >
              {/* Image */}
              <div className="relative aspect-video overflow-hidden bg-muted">
                {p.imagen_portada ? (
                  <img
                    src={p.imagen_portada}
                    alt={p.nombre}
                    className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center">
                    <Sun className="size-12 text-muted-foreground/40" />
                  </div>
                )}
                {/* Segment badge */}
                {p.segmento && (
                  <span className="absolute left-4 top-4 rounded-full bg-[#F07E04] px-4 py-1 text-xs font-bold text-white shadow-sm">
                    {p.segmento}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold leading-tight text-[#154660]">{p.nombre}</h3>

                {/* Stats */}
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                  {p.potencia_kwp != null && (
                    <span className="flex items-center gap-1.5">
                      <Zap className="size-4 text-[#F07E04]" />
                      <strong className="font-semibold text-[#154660]">{p.potencia_kwp}</strong> kWp
                    </span>
                  )}
                  {p.cantidad_paneles != null && (
                    <span className="flex items-center gap-1.5">
                      <SolarPanel className="size-4 text-[#F07E04]" />
                      <strong className="font-semibold text-[#154660]">
                        {p.cantidad_paneles}
                      </strong>{' '}
                      paneles
                    </span>
                  )}
                  {p.ubicacion && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="size-4 text-[#F07E04]" />
                      {p.ubicacion}
                    </span>
                  )}
                </div>

                {/* CTA */}
                <div className="mt-auto pt-4">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#F07E04] transition-colors group-hover:text-[#F09C0A]">
                    Ver proyecto
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </div>
            </motion.a>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Empty state */}
      {filtrados.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No hay proyectos en esta categoria todavía.
          </p>
        </div>
      )}
    </div>
  );
}
