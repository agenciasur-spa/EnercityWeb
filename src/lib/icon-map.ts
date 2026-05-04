/**
 * Lucide icon string → component lookup map.
 * Used by CMS-driven components to resolve icon names from DB to React components.
 */
import {
  Users,
  Zap,
  Award,
  CheckCircle,
  Sun,
  Battery,
  Wrench,
  ShieldCheck,
  Globe,
  BarChart3,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Check,
  Building2,
  Leaf,
  type LucideIcon,
} from 'lucide-react';

export const ICON_MAP: Record<string, LucideIcon> = {
  Users,
  Zap,
  Award,
  CheckCircle,
  Sun,
  Battery,
  Wrench,
  ShieldCheck,
  Globe,
  BarChart3,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Info,
  Shield,
  Check,
  Building2,
  Leaf,
} as const;

/**
 * Resolve an icon name string to a Lucide component.
 * Returns null if the icon name is not found.
 */
export function resolveIcon(name: string): LucideIcon | null {
  return ICON_MAP[name] ?? null;
}
