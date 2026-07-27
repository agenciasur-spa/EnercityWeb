import {
  Zap, Sun, Bolt, Activity, Building2, Calendar,
  MapPin, User, Grid2x2, Battery, SolarPanel
} from 'lucide-react';

export interface SpecItem {
  icon: string;
  label: string;
  value: string;
}

const iconMap: Record<string, typeof Zap> = {
  Zap,
  Sun,
  Bolt,
  Activity,
  Building: Building2,
  Calendar,
  MapPin,
  User,
  Panel: SolarPanel,
  Battery,
  SolarPanel,
};

interface ProjectSpecsProps {
  specs: SpecItem[];
  marcaPanel?: string | null;
  marcaInversor?: string | null;
}

export function ProjectSpecs({ specs, marcaPanel, marcaInversor }: ProjectSpecsProps) {
  // Add brand cards at the end if they exist
  const allSpecs = [...specs];
  if (marcaPanel) allSpecs.push({ icon: 'Panel', label: 'Marca panel', value: marcaPanel });
  if (marcaInversor) allSpecs.push({ icon: 'Battery', label: 'Marca inversor', value: marcaInversor });

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
      {allSpecs.map((spec, idx) => {
        const Icon = iconMap[spec.icon] ?? Zap;
        return (
          <div
            key={idx}
            className="group flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-[#F07E04]/20"
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#F07E04]/10 text-[#F07E04] transition-colors group-hover:bg-[#F07E04] group-hover:text-white">
              <Icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {spec.label}
              </p>
              <p className="truncate text-base font-bold text-[#154660]">
                {spec.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
