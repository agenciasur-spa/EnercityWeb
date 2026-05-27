import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Mail,
  Settings,
  LogOut,
  BarChart3,
  Building2,
  Sun,
  Link,
  FileText,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'General',
    items: [
      { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/admin/leads', label: 'Leads', icon: Users },
      { href: '/admin/contacts', label: 'Contactos', icon: Mail },
    ],
  },
  {
    label: 'Contenido',
    items: [
      { href: '/admin/content/stats', label: 'Estadísticas', icon: BarChart3 },
      { href: '/admin/content/sections', label: 'Secciones', icon: FileText },
      { href: '/admin/content/projects', label: 'Proyectos', icon: Building2 },
      { href: '/admin/content/solutions', label: 'Soluciones', icon: Sun },
      { href: '/admin/content/faq', label: 'FAQ', icon: HelpCircle },
      { href: '/admin/content/nav', label: 'Navegación', icon: Link },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin/settings', label: 'Configuración', icon: Settings },
    ],
  },
];

const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);

interface SidebarContentProps {
  currentPath: string;
  onNavigate?: () => void;
}

function SidebarContent({ currentPath, onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col bg-[#154660] text-white">
      <div className="flex h-16 items-center gap-2 px-4">
        <span className="text-xl font-bold tracking-tight">Enercity</span>
        <span className="text-sm font-medium text-white/60">Admin</span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/admin'
                    ? currentPath === '/admin'
                    : currentPath.startsWith(item.href);

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-[#F07E04] text-white'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </a>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 p-2">
        <form action="/api/admin/logout" method="POST">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" />
            Salir
          </button>
        </form>
      </div>
    </div>
  );
}

export { SidebarContent, NAV_ITEMS };