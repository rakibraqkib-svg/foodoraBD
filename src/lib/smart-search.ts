import type { Restaurant, StorefrontProduct } from '../types/marketplace';

export type SearchScope = 'all' | 'dishes' | 'restaurants' | 'offers';

export type QuickSearchFilterId =
  | 'under300'
  | 'fast20'
  | 'lowFee'
  | 'deals'
  | 'topRated';

const PHONETIC_ALIASES: Record<string, string[]> = {
  kacchi: ['kachchi', 'kachi', 'কাচ্চি', 'বিরিয়ানি', 'বিরিয়ানি'],
  kachchi: ['kacchi', 'কাচ্চি'],
  biriyani: ['biryani', 'briyani', 'বিরিয়ানি', 'বিরিয়ানি', 'kacchi', 'polao'],
  biryani: ['biriyani', 'বিরিয়ানি', 'বিরিয়ানি', 'kacchi'],
  'কাচ্চি': ['kacchi', 'kachchi', 'biriyani'],
  'বিরিয়ানি': ['biriyani', 'biryani', 'kacchi'],
  'বিরিয়ানি': ['biriyani', 'biryani', 'kacchi'],
  bhuna: ['vuna', 'bhona', 'ভুনা', 'kala bhuna'],
  'ভুনা': ['bhuna', 'kala bhuna'],
  'কালা': ['kala bhuna'],
  'কালা ভুনা': ['kala bhuna', 'beef', 'mezzan'],
  ilish: ['hilsa', 'hilsha', 'ইলিশ', 'সরষে'],
  hilsa: ['ilish', 'ইলিশ'],
  'ইলিশ': ['ilish', 'hilsa', 'shorshe'],
  burger: ['burgers', 'বার্গার', 'smash'],
  'বার্গার': ['burger'],
  pizza: ['pizzas', 'পিৎজা', 'পিজ্জা', 'পিজা'],
  'পিজ্জা': ['pizza', 'পিৎজা'],
  'পিৎজা': ['pizza'],
  kabab: ['kebab', 'কাবাব', 'tikka', 'seekh'],
  kebab: ['kabab', 'কাবাব'],
  'কাবাব': ['kabab', 'kebab'],
  momo: ['momos', 'dumpling', 'dumplings', 'মোমো'],
  momos: ['momo', 'dumplings', 'মোমো'],
  'মোমো': ['momo', 'momos', 'dumplings'],
  coffee: ['cafe', 'cold brew', 'latte', 'macchiato', 'কফি'],
  'কফি': ['coffee', 'cold brew', 'macchiato'],
  gulshan: ['গুলশান'],
  'গুলশান': ['gulshan'],
  banani: ['বনানী'],
  'বনানী': ['banani'],
  dhanmondi: ['ধানমন্ডি'],
  'ধানমন্ডি': ['dhanmondi'],
  naga: ['নাগা', 'spicy', 'ঝাল'],
  'নাগা': ['naga'],
};

export function normalizeSearchQuery(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function expandSearchTokens(query: string): string[] {
  const norm = normalizeSearchQuery(query);
  if (!norm) return [];
  const words = norm.split(' ');
  const tokens = new Set<string>([norm, ...words]);

  for (const w of words) {
    const aliases = PHONETIC_ALIASES[w];
    if (aliases) {
      aliases.forEach((a) => tokens.add(a.toLowerCase()));
    }
  }
  const whole = PHONETIC_ALIASES[norm];
  if (whole) {
    whole.forEach((a) => tokens.add(a.toLowerCase()));
  }

  return Array.from(tokens);
}

export function scoreMatchFields(fields: string[], query: string): number {
  const norm = normalizeSearchQuery(query);
  if (!norm) return 1;

  const joined = fields.join(' ').toLowerCase();
  const expanded = expandSearchTokens(norm);
  let score = 0;

  if (fields[0]?.toLowerCase().startsWith(norm)) score += 100;
  if (fields[0]?.toLowerCase().includes(norm)) score += 60;
  if (fields[1]?.toLowerCase().includes(norm)) score += 55;

  const rawWords = norm.split(' ');
  const allMatch = rawWords.every((w) => {
    const wAliases = PHONETIC_ALIASES[w] ?? [];
    return joined.includes(w) || wAliases.some((a) => joined.includes(a.toLowerCase()));
  });

  if (allMatch) {
    score += 40;
  } else {
    for (const t of expanded) {
      if (joined.includes(t)) {
        score += 18;
      }
    }
  }

  return score;
}

export function productMatchesQuickFilters(
  product: StorefrontProduct,
  quickFilters: QuickSearchFilterId[]
): boolean {
  const effectivePrice =
    product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice
      : product.price;

  for (const qf of quickFilters) {
    if (qf === 'under300' && effectivePrice > 300) return false;
    if (qf === 'fast20' && product.deliveryTimeMin > 20) return false;
    if (qf === 'lowFee' && product.deliveryFee > 50) return false;
    if (
      qf === 'deals' &&
      !(product.discountPrice && product.discountPrice < product.price)
    ) {
      return false;
    }
    if (qf === 'topRated' && Number(product.rating) < 4.7) return false;
  }
  return true;
}

export function restaurantMatchesQuickFilters(
  restaurant: Restaurant,
  quickFilters: QuickSearchFilterId[],
  products: StorefrontProduct[]
): boolean {
  for (const qf of quickFilters) {
    if (qf === 'fast20' && restaurant.deliveryTimeMin > 20) return false;
    if (qf === 'lowFee' && restaurant.deliveryFee > 50) return false;
    if (qf === 'deals' && restaurant.discountPct <= 0) return false;
    if (qf === 'topRated' && Number(restaurant.rating) < 4.7) return false;
    if (qf === 'under300') {
      const hasBudget = products.some((p) => {
        const eff = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
        return p.restaurantId === restaurant.id && eff <= 300;
      });
      if (!hasBudget) return false;
    }
  }
  return true;
}

export function searchProductsSmart(
  products: StorefrontProduct[],
  opts: {
    query: string;
    cuisine: string;
    onlyDiscount: boolean;
    deliveryFleet: 'all' | 'platform' | 'third_party';
    quickFilters: QuickSearchFilterId[];
    areaFilter?: string;
  }
): StorefrontProduct[] {
  const norm = normalizeSearchQuery(opts.query);
  const cuisineNorm = opts.cuisine.trim().toLowerCase();

  const scored = products
    .map((item) => {
      if (!item.isVisibleOnStorefront || !item.isAvailable) return null;
      if (cuisineNorm && cuisineNorm !== 'all') {
        const hay = `${item.category} ${item.restaurantCuisine} ${item.name}`.toLowerCase();
        if (!hay.includes(cuisineNorm)) return null;
      }
      if (opts.onlyDiscount && !(item.discountPrice && item.discountPrice < item.price)) {
        return null;
      }
      if (opts.deliveryFleet !== 'all' && item.deliveryMode !== opts.deliveryFleet) {
        return null;
      }
      if (
        opts.areaFilter &&
        opts.areaFilter !== 'all' &&
        !item.restaurantArea.toLowerCase().includes(opts.areaFilter.toLowerCase())
      ) {
        return null;
      }
      if (!productMatchesQuickFilters(item, opts.quickFilters)) return null;

      const score = norm
        ? scoreMatchFields(
            [
              item.name,
              item.nameBn,
              item.restaurantName,
              item.restaurantNameBn,
              item.category,
              item.restaurantCuisine,
              item.restaurantArea,
              item.description || '',
            ],
            norm
          )
        : 1;

      if (norm && score === 0) return null;
      return { item, score };
    })
    .filter((entry): entry is { item: StorefrontProduct; score: number } => entry !== null);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.item.inStock !== b.item.inStock) return a.item.inStock ? -1 : 1;
    if (a.item.isPopular !== b.item.isPopular) return a.item.isPopular ? -1 : 1;
    return b.item.id - a.item.id;
  });

  return scored.map((s) => s.item);
}

export function searchRestaurantsSmart(
  restaurants: Restaurant[],
  products: StorefrontProduct[],
  opts: {
    query: string;
    cuisine: string;
    onlyDiscount: boolean;
    onlyFreeFirst: boolean;
    priceTierFilter: string | null;
    deliveryFleet: 'all' | 'platform' | 'third_party';
    sortBy: 'relevance' | 'rating' | 'fastest' | 'lowFee';
    quickFilters: QuickSearchFilterId[];
    areaFilter?: string;
  }
): Restaurant[] {
  const norm = normalizeSearchQuery(opts.query);

  const scored = restaurants
    .map((r) => {
      if (opts.cuisine !== 'All' && !r.cuisine.toLowerCase().includes(opts.cuisine.toLowerCase())) {
        return null;
      }
      if (opts.onlyDiscount && r.discountPct <= 0) return null;
      if (opts.onlyFreeFirst && r.deliveryFee > 50) return null;
      if (opts.priceTierFilter && r.priceTier !== opts.priceTierFilter) return null;
      if (opts.deliveryFleet !== 'all' && r.deliveryMode !== opts.deliveryFleet) return null;
      if (
        opts.areaFilter &&
        opts.areaFilter !== 'all' &&
        !r.area.toLowerCase().includes(opts.areaFilter.toLowerCase())
      ) {
        return null;
      }
      if (!restaurantMatchesQuickFilters(r, opts.quickFilters, products)) return null;

      const dishNames = products
        .filter((p) => p.restaurantId === r.id)
        .flatMap((p) => [p.name, p.nameBn, p.category]);

      const score = norm
        ? scoreMatchFields(
            [r.name, r.nameBn, r.cuisine, r.area, r.description, ...dishNames],
            norm
          )
        : 1;

      if (norm && score === 0) return null;
      return { r, score };
    })
    .filter((entry): entry is { r: Restaurant; score: number } => entry !== null);

  scored.sort((a, b) => {
    if (opts.sortBy === 'rating') return Number(b.r.rating) - Number(a.r.rating);
    if (opts.sortBy === 'fastest') return a.r.deliveryTimeMin - b.r.deliveryTimeMin;
    if (opts.sortBy === 'lowFee') return a.r.deliveryFee - b.r.deliveryFee;
    if (b.score !== a.score) return b.score - a.score;
    if (a.r.isSponsored !== b.r.isSponsored) return a.r.isSponsored ? -1 : 1;
    return Number(b.r.rating) - Number(a.r.rating);
  });

  return scored.map((s) => s.r);
}

export function getInstantSearchMatches(
  query: string,
  scope: SearchScope,
  products: StorefrontProduct[],
  restaurants: Restaurant[],
  quickFilters: QuickSearchFilterId[]
) {
  const matchedProducts =
    scope === 'restaurants'
      ? []
      : searchProductsSmart(products, {
          query,
          cuisine: 'All',
          onlyDiscount: scope === 'offers',
          deliveryFleet: 'all',
          quickFilters,
        });

  const matchedRestaurants =
    scope === 'dishes'
      ? []
      : searchRestaurantsSmart(restaurants, products, {
          query,
          cuisine: 'All',
          onlyDiscount: scope === 'offers',
          onlyFreeFirst: false,
          priceTierFilter: null,
          deliveryFleet: 'all',
          sortBy: 'relevance',
          quickFilters,
        });

  return {
    dishes: matchedProducts.slice(0, 6),
    restaurants: matchedRestaurants.slice(0, 4),
    totalCount: matchedProducts.length + matchedRestaurants.length,
  };
}

export interface HighlightSegment {
  text: string;
  matched: boolean;
}

export function highlightMatchSegments(text: string, query: string): HighlightSegment[] {
  const norm = normalizeSearchQuery(query);
  if (!norm) return [{ text, matched: false }];
  const words = norm
    .split(' ')
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return [{ text, matched: false }];

  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  return text
    .split(regex)
    .filter((p) => p.length > 0)
    .map((part) => ({
      text: part,
      matched: words.some((w) => new RegExp(`^${w}$`, 'i').test(part)),
    }));
}
