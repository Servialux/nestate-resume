import source from './resume.json' with { type: 'json' };

export interface PortfolioImage {
  src: string;
  alt: string;
  photographer?: string;
  source?: string;
  original?: string;
  license?: string;
  illustration?: boolean;
}

export interface Resume {
  basics?: {
    name?: string; label?: string; summary?: string; email?: string; phone?: string; additionalPhones?: string[]; birthDate?: string;
    location?: { address?: string; postalCode?: string; city?: string; countryCode?: string };
    profiles?: { network?: string; url?: string; username?: string }[];
  };
  work?: {
    name?: string; position?: string; startDate?: string; endDate?: string; summary?: string; highlights?: string[]; keywords?: string[]; secondaryKeywords?: string[];
    missions?: { name: string; label?: string; summary?: string; highlights?: string[]; keywords?: string[] }[];
  }[];
  education?: { institution?: string; area?: string; studyType?: string; startDate?: string; endDate?: string }[];
  skills?: { name?: string; summary?: string; keywords?: string[]; secondaryKeywords?: string[] }[];
  projects?: { name?: string; description?: string; startDate?: string; endDate?: string; type?: string; keywords?: string[]; highlights?: string[]; url?: string }[];
  languages?: { language?: string; fluency?: string }[];
  interests?: { name: string; keywords?: string[] }[];
  meta?: {
    demo?: boolean; demoNotice?: string; version?: string;
    experienceYears?: number;
    experienceSince?: number;
    educationSummary?: string;
    images?: { portrait?: PortfolioImage; projects?: Record<string, PortfolioImage> };
  };
}

export const resume: Resume = source;
export const isDemo = resume.meta?.demo === true;
export const year = (date?: string) => date?.match(/^\d{4}/)?.[0] ?? '';
export const period = (start?: string, end?: string) => {
  if (!start && !end) return '';
  return [year(start), end ? year(end) : 'Aujourd’hui'].filter(Boolean).join(' — ');
};
export function safeUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

export function imageUrl(value?: string): string | undefined {
  if (value?.startsWith('/images/') && !value.includes('..')) return value;
  return safeUrl(value);
}

export function locationLabel(location?: NonNullable<Resume['basics']>['location']): string {
  const country = location?.countryCode
    ? new Intl.DisplayNames(['fr'], { type: 'region' }).of(location.countryCode)
    : undefined;
  return [location?.city, country].filter(Boolean).join(', ');
}
