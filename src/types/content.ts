// Content model types for CMS Contenidos

export interface StatItem {
  id: string;
  value: string;
  label: string;
  description: string | null;
  icon: string;
  sort_order: number;
  active: boolean;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  image_url: string | null;
  saving: string;
  saving_label: string;
  alt_text: string | null;
  sort_order: number;
  active: boolean;
}

export interface Solution {
  id: string;
  slug: string;
  title: string;
  badge: string;
  description: string | null;
  features: string[];
  tooltip: string | null;
  icon: string;
  color: string;
  colorbg: string;
  sort_order: number;
  active: boolean;
}

export interface NavLink {
  id: string;
  location: 'navbar' | 'footer';
  label: string;
  href: string;
  sort_order: number;
  active: boolean;
}

export interface HeroContent {
  badge: string;
  headline: string;
  headlineAccent: string;
  subheadline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  cardTitle: string;
  cardSubtitle: string;
  cardStats: { value: string; label: string }[];
}

export interface GuaranteeCard {
  title: string;
  subtitle: string;
  description: string;
  tag: string;
  icon: string;
  color: string;
}

export interface GuaranteeContent {
  headerTag: string;
  headerTitle: string;
  headerTitleAccent: string;
  headerDescription: string;
  cards: GuaranteeCard[];
}

export interface ContactCtaContent {
  tagline: string;
  headline: string;
  headlineAccent: string;
  benefits: { icon: string; text: string }[];
}

export interface FooterContent {
  description: string;
  address: string;
  phone: string;
  email: string;
  socials: { icon: string; href: string; label: string }[];
}

// Section header for editable titles in site_content
export interface SectionHeader {
  tag: string;
  title: string;
  titleAccent: string;
}

// Extended section content for projects (includes description, features, CTA)
export interface ProjectsSectionContent extends SectionHeader {
  description: string;
  features: string[];
  ctaText: string;
}

// Blog collection frontmatter schema type
export interface BlogFrontmatter {
  title: string;
  description: string;
  pubDate: Date;
  image?: string;
  tags: string[];
  draft: boolean;
}
