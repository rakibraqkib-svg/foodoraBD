import type { Lang } from '../types/marketplace';

export type MapMarkerRole = 'user' | 'vendor';

export interface MapPinPresentation {
  role: MapMarkerRole;
  label: string;
  background: string;
  borderColor: string;
  glyphColor: string;
  badgeClass: string;
  pinIconClass: string;
}

const GENERIC_USER_PLACEHOLDERS = new Set([
  'user location',
  'foodora customer',
  'delivery pin',
]);

export function resolveMapPinPresentation(opts: {
  role?: MapMarkerRole;
  label?: string;
  userName?: string;
  lang: Lang;
}): MapPinPresentation {
  const role: MapMarkerRole = opts.role === 'vendor' ? 'vendor' : 'user';
  const rawLabel = (opts.label || '').trim();
  const rawUserName = (opts.userName || '').trim();

  if (role === 'vendor') {
    return {
      role: 'vendor',
      label: rawLabel || (opts.lang === 'bn' ? 'রেস্টুরেন্ট' : 'Restaurant'),
      background: '#111827',
      borderColor: '#030712',
      glyphColor: '#FFFFFF',
      badgeClass: 'bg-[#111827] text-white border border-white/25',
      pinIconClass: 'text-[#111827] fill-[#111827]/25',
    };
  }

  const isGenericPlaceholder =
    !rawLabel || GENERIC_USER_PLACEHOLDERS.has(rawLabel.toLowerCase());

  const userLabel =
    rawUserName ||
    (!isGenericPlaceholder ? rawLabel : opts.lang === 'bn' ? 'আপনি' : 'You');

  return {
    role: 'user',
    label: userLabel,
    background: '#DC2626',
    borderColor: '#991B1B',
    glyphColor: '#FFFFFF',
    badgeClass: 'bg-[#DC2626] text-white border border-white/25',
    pinIconClass: 'text-[#DC2626] fill-[#DC2626]/25',
  };
}
