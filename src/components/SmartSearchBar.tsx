import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Clock,
  MapPin,
  Mic,
  MicOff,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { formatBdt } from '../lib/marketplace-logic';
import {
  getInstantSearchMatches,
  highlightMatchSegments,
  QuickSearchFilterId,
  SearchScope,
} from '../lib/smart-search';
import type { Lang, Restaurant, StorefrontProduct } from '../types/marketplace';

interface SmartSearchBarProps {
  lang: Lang;
  query: string;
  onQueryChange: (next: string) => void;
  quickFilters: QuickSearchFilterId[];
  onToggleQuickFilter: (id: QuickSearchFilterId) => void;
  products: StorefrontProduct[];
  restaurants: Restaurant[];
  recentSearches: string[];
  onAddRecentSearch: (term: string) => void;
  onRemoveRecentSearch: (term: string) => void;
  onClearRecentSearches: () => void;
  onAddProductToCart: (product: StorefrontProduct) => void;
  onSelectRestaurant: (slug: string) => void;
  onSelectAreaName: (areaName: string) => void;
  onResetAll: () => void;
  totalMatchingDishes: number;
  totalMatchingRestaurants: number;
  accentColor?: string;
  compact?: boolean;
}

const TRENDING_ITEMS: Array<{ query: string; en: string; bn: string }> = [
  { query: 'Kacchi', en: 'Kacchi Biriyani', bn: 'কাচ্চি বিরিয়ানি' },
  { query: 'Kala Bhuna', en: 'Kala Bhuna', bn: 'কালা ভুনা' },
  { query: 'Burger', en: 'Smash Burger', bn: 'স্ম্যাশ বার্গার' },
  { query: 'Pizza', en: 'Wood-Fired Pizza', bn: 'উড-ফায়ার্ড পিৎজা' },
  { query: 'Ilish', en: 'Shorshe Ilish', bn: 'সরষে ইলিশ' },
  { query: 'Momos', en: 'Chicken Momos', bn: 'চিকেন মোমো' },
];

const QUICK_AREAS = ['Gulshan 2', 'Banani', 'Dhanmondi', 'Uttara', 'Motijheel'];

const QUICK_FILTER_BUTTONS: Array<{ id: QuickSearchFilterId; en: string; bn: string }> = [
  { id: 'under300', en: 'Under ৳300', bn: '৳৩০০ এর নিচে' },
  { id: 'fast20', en: '≤ 20 min', bn: '২০ মিনিটে' },
  { id: 'lowFee', en: 'Low Fee', bn: 'কম ডেলিভারি ফি' },
  { id: 'deals', en: 'Deals & Offers', bn: 'অফার ও ছাড়' },
  { id: 'topRated', en: '4.7+ Rated', bn: '৪.৭+ সেরা' },
];

const SCOPE_TABS: Array<{ id: SearchScope; en: string; bn: string }> = [
  { id: 'all', en: 'All', bn: 'সব' },
  { id: 'dishes', en: 'Dishes', bn: 'খাবার' },
  { id: 'restaurants', en: 'Restaurants', bn: 'রেস্টুরেন্ট' },
  { id: 'offers', en: 'Offers', bn: 'অফার' },
];

function Highlighted({ text, query }: { text: string; query: string }) {
  const segments = highlightMatchSegments(text, query);
  return (
    <>
      {segments.map((seg, i) =>
        seg.matched ? (
          <mark
            key={i}
            className="bg-pink-100 text-[#B80C54] font-semibold rounded-xs px-0.5"
          >
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </>
  );
}

export const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  lang,
  query,
  onQueryChange,
  quickFilters,
  onToggleQuickFilter,
  products,
  restaurants,
  recentSearches,
  onAddRecentSearch,
  onRemoveRecentSearch,
  onClearRecentSearches,
  onAddProductToCart,
  onSelectRestaurant,
  onSelectAreaName,
  onResetAll,
  totalMatchingDishes,
  totalMatchingRestaurants,
  accentColor = '#E21B70',
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState<SearchScope>('all');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isListening, setIsListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const instant = useMemo(
    () => getInstantSearchMatches(query, scope, products, restaurants, quickFilters),
    [query, scope, products, restaurants, quickFilters]
  );

  const navigableItems = useMemo(() => {
    const arr: Array<
      { kind: 'dish'; item: StorefrontProduct } | { kind: 'restaurant'; item: Restaurant }
    > = [];
    instant.dishes.forEach((d) => arr.push({ kind: 'dish', item: d }));
    instant.restaurants.forEach((r) => arr.push({ kind: 'restaurant', item: r }));
    return arr;
  }, [instant]);

  // Global `/` or `Cmd/Ctrl+K` shortcut
  useEffect(() => {
    if (compact) return;
    const onGlobalKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      } else if (!inField && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', onGlobalKeyDown);
    return () => window.removeEventListener('keydown', onGlobalKeyDown);
  }, [compact]);

  // Close popover on click outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      if (navigableItems.length > 0) {
        setActiveIndex((prev) => (prev + 1) % navigableItems.length);
      }
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (navigableItems.length > 0) {
        setActiveIndex((prev) => (prev <= 0 ? navigableItems.length - 1 : prev - 1));
      }
      return;
    }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && navigableItems[activeIndex]) {
        e.preventDefault();
        const selected = navigableItems[activeIndex];
        if (query.trim()) onAddRecentSearch(query.trim());
        if (selected.kind === 'dish') {
          onAddProductToCart(selected.item);
        } else {
          onSelectRestaurant(selected.item.slug);
          setIsOpen(false);
        }
      } else {
        if (query.trim()) onAddRecentSearch(query.trim());
        setIsOpen(false);
      }
    }
  };

  const handleVoiceSearch = () => {
    const win = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        interimResults: boolean;
        onresult: (ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: () => void;
        onend: () => void;
        start: () => void;
      };
    };
    const Rec = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Rec) {
      setVoiceNote(
        lang === 'bn'
          ? 'এই ব্রাউজারে ভয়েস সার্চ নেই — বাংলা বা ইংরেজিতে টাইপ করুন'
          : 'Voice search unavailable in this browser — type EN or বাংলা'
      );
      setTimeout(() => setVoiceNote(null), 3200);
      return;
    }
    try {
      const rec = new Rec();
      rec.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      rec.interimResults = false;
      setIsListening(true);
      setVoiceNote(null);
      rec.onresult = (ev) => {
        const text = ev.results?.[0]?.[0]?.transcript || '';
        if (text) {
          onQueryChange(text);
          onAddRecentSearch(text);
          setIsOpen(true);
        }
      };
      rec.onerror = () => setIsListening(false);
      rec.onend = () => setIsListening(false);
      rec.start();
    } catch {
      setIsListening(false);
    }
  };

  const hasActive = query.trim().length > 0 || quickFilters.length > 0;

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Main Search Input */}
      <div
        className={`flex items-center gap-2 px-3.5 ${
          compact ? 'h-10 rounded-xl' : 'h-11 rounded-xl'
        } border transition-all bg-[#F7F7F8] ${
          isOpen
            ? 'bg-white border-[#E21B70] ring-3 ring-[#E21B70]/15'
            : 'border-neutral-200 hover:border-neutral-300'
        }`}
      >
        <Search className="w-4 h-4 shrink-0" style={{ color: accentColor }} />
        <input
          id="foodora-smart-search-input"
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-label={
            lang === 'bn'
              ? 'খাবার, রেস্টুরেন্ট বা এলাকা খুঁজুন'
              : 'Search dishes, restaurants or areas'
          }
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            lang === 'bn'
              ? 'খাবার বা রেস্টুরেন্ট খুঁজুন (কাচ্চি, Kacchi, বার্গার, গুলশান)...'
              : 'Search kacchi, কাচ্চি, burger, pizza, Gulshan, Mezzan...'
          }
          className="w-full bg-transparent text-xs sm:text-sm text-[#2E3138] placeholder:text-neutral-400 focus:outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              onQueryChange('');
              setActiveIndex(-1);
              inputRef.current?.focus();
            }}
            aria-label={lang === 'bn' ? 'সার্চ মুছুন' : 'Clear search'}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          type="button"
          onClick={handleVoiceSearch}
          aria-label={lang === 'bn' ? 'ভয়েস সার্চ' : 'Voice search'}
          className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
            isListening
              ? 'bg-[#E21B70] text-white'
              : 'text-neutral-500 hover:text-[#E21B70] hover:bg-pink-50'
          }`}
        >
          {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
        </button>

        {!compact && (
          <kbd className="hidden xl:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-neutral-500 bg-white border border-neutral-200 rounded shrink-0">
            ⌘K
          </kbd>
        )}
      </div>

      {voiceNote && (
        <p className="mt-1 text-[11px] font-medium text-[#E21B70] px-1">{voiceNote}</p>
      )}

      {/* Quick Intent Filter Strip */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 py-0.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 whitespace-nowrap shrink-0">
            <Sparkles className="w-3 h-3 text-[#E21B70]" />
            {lang === 'bn' ? 'দ্রুত ফিল্টার:' : 'Quick:'}
          </span>
          {QUICK_FILTER_BUTTONS.map((btn) => {
            const active = quickFilters.includes(btn.id);
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => onToggleQuickFilter(btn.id)}
                aria-pressed={active}
                style={active ? { backgroundColor: accentColor, borderColor: accentColor } : undefined}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-white'
                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-[#E21B70] hover:text-[#E21B70]'
                }`}
              >
                {lang === 'bn' ? btn.bn : btn.en}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-neutral-500 whitespace-nowrap shrink-0 tabular-nums">
          <span>
            {lang === 'bn'
              ? `${totalMatchingDishes} খাবার · ${totalMatchingRestaurants} রেস্টুরেন্ট`
              : `${totalMatchingDishes} dishes · ${totalMatchingRestaurants} restaurants`}
          </span>
          {hasActive && (
            <button
              type="button"
              onClick={onResetAll}
              className="font-bold text-[#E21B70] hover:underline cursor-pointer"
            >
              {lang === 'bn' ? 'রিসেট' : 'Reset'}
            </button>
          )}
        </div>
      </div>

      {/* Rich Instant Popover Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full mt-2 bg-white border border-neutral-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Scope Tabs */}
          <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-[#FAFAFB] border-b border-neutral-200 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5">
              {SCOPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setScope(tab.id);
                    setActiveIndex(-1);
                  }}
                  style={scope === tab.id ? { backgroundColor: accentColor } : undefined}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    scope === tab.id
                      ? 'text-white'
                      : 'bg-white text-neutral-600 border border-neutral-200 hover:text-neutral-900'
                  }`}
                >
                  {lang === 'bn' ? tab.bn : tab.en}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-neutral-400 hidden sm:inline whitespace-nowrap">
              {lang === 'bn' ? 'বাংলা · English · Banglish' : 'Supports EN · বাংলা · Banglish'}
            </span>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-3.5 space-y-4">
            {query.trim() === '' ? (
              <>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500">
                        <Clock className="w-3.5 h-3.5" />
                        {lang === 'bn' ? 'সাম্প্রতিক সার্চ' : 'Recent Searches'}
                      </span>
                      <button
                        type="button"
                        onClick={onClearRecentSearches}
                        className="text-[11px] font-semibold text-[#E21B70] hover:underline cursor-pointer"
                      >
                        {lang === 'bn' ? 'সব মুছুন' : 'Clear all'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {recentSearches.map((item) => (
                        <div
                          key={item}
                          className="inline-flex items-center bg-neutral-100 hover:bg-neutral-200 rounded-lg border border-neutral-200 overflow-hidden"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onQueryChange(item);
                              onAddRecentSearch(item);
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-neutral-700 cursor-pointer"
                          >
                            {item}
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveRecentSearch(item)}
                            aria-label={`Remove ${item}`}
                            className="px-1.5 py-1 text-neutral-400 hover:text-neutral-700 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Trending */}
                <div>
                  <p className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-[#E21B70]" />
                    {lang === 'bn' ? 'জনপ্রিয় সার্চ' : 'Trending Now'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TRENDING_ITEMS.map((item) => (
                      <button
                        key={item.query}
                        type="button"
                        onClick={() => {
                          onQueryChange(item.query);
                          onAddRecentSearch(item.query);
                        }}
                        className="flex items-center justify-between px-3 py-2 text-left text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-pink-50 hover:text-[#E21B70] border border-neutral-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <span className="truncate">{lang === 'bn' ? item.bn : item.en}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Popular Dhaka Zones */}
                <div>
                  <p className="inline-flex items-center gap-1 text-[11px] font-bold text-neutral-500 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-[#E21B70]" />
                    {lang === 'bn' ? 'এলাকা অনুযায়ী দেখুন' : 'Popular Areas'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => {
                          onSelectAreaName(area);
                          onQueryChange(area);
                          setIsOpen(false);
                        }}
                        className="px-2.5 py-1 text-xs font-medium bg-white border border-neutral-200 hover:border-[#E21B70] hover:text-[#E21B70] rounded-lg cursor-pointer"
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : instant.totalCount === 0 ? (
              <div className="py-5 text-center space-y-2.5">
                <p className="text-sm font-bold text-[#2E3138]">
                  {lang === 'bn'
                    ? `"${query}" এর জন্য কোনো ফলাফল পাওয়া যায়নি`
                    : `No dishes or restaurants matched "${query}"`}
                </p>
                <p className="text-xs text-neutral-500">
                  {lang === 'bn'
                    ? 'কাচ্চি, বার্গার বা পিৎজা লিখে চেষ্টা করুন অথবা ফিল্টার রিসেট করুন।'
                    : 'Try searching Kacchi, Burger, Ilish, or reset active filters.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  {['Kacchi', 'Burger', 'Pizza'].map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => onQueryChange(sug)}
                      className="px-3 py-1 text-xs font-semibold bg-neutral-100 hover:bg-pink-50 hover:text-[#E21B70] rounded-lg cursor-pointer"
                    >
                      {sug}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      onResetAll();
                      setScope('all');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold bg-[#E21B70] text-white rounded-lg cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>{lang === 'bn' ? 'সব রিসেট' : 'Reset all'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {instant.dishes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-neutral-500 mb-1.5">
                      {lang === 'bn' ? 'মিলে যাওয়া খাবার' : 'Matching Dishes'}
                    </p>
                    <div className="divide-y divide-neutral-100">
                      {instant.dishes.map((dish, idx) => {
                        const active = activeIndex === idx;
                        const title = lang === 'bn' ? dish.nameBn : dish.name;
                        const restName = lang === 'bn' ? dish.restaurantNameBn : dish.restaurantName;
                        const effPrice =
                          dish.discountPrice && dish.discountPrice < dish.price
                            ? dish.discountPrice
                            : dish.price;

                        return (
                          <div
                            key={dish.id}
                            className={`flex items-center justify-between gap-3 py-2 px-2 rounded-xl transition-colors ${
                              active ? 'bg-pink-50' : 'hover:bg-neutral-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                onSelectRestaurant(dish.restaurantSlug);
                                onAddRecentSearch(query.trim());
                                setIsOpen(false);
                              }}
                              className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                            >
                              <img
                                src={dish.imageUrl}
                                alt={title}
                                referrerPolicy="no-referrer"
                                className="w-11 h-11 rounded-lg object-cover bg-neutral-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-[#2E3138] truncate">
                                  <Highlighted text={title} query={query} />
                                </p>
                                <p className="text-[11px] text-neutral-500 truncate">
                                  {restName} · {dish.deliveryTimeMin}m · {dish.restaurantArea}
                                </p>
                              </div>
                            </button>

                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-xs sm:text-sm font-bold text-[#E21B70] tabular-nums">
                                {formatBdt(effPrice, lang)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  onAddProductToCart(dish);
                                  onAddRecentSearch(query.trim());
                                }}
                                aria-label={`Add ${dish.name} to cart`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-[#E21B70] hover:bg-[#C4135E] text-white rounded-lg cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>{lang === 'bn' ? 'যোগ' : 'Add'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {instant.restaurants.length > 0 && (
                  <div>
                    <p className="text-[11px] font-bold text-neutral-500 mb-1.5">
                      {lang === 'bn' ? 'মিলে যাওয়া রেস্টুরেন্ট' : 'Matching Restaurants'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {instant.restaurants.map((rest, rIdx) => {
                        const flatIdx = instant.dishes.length + rIdx;
                        const active = activeIndex === flatIdx;
                        const restTitle = lang === 'bn' ? rest.nameBn : rest.name;
                        return (
                          <button
                            key={rest.id}
                            type="button"
                            onClick={() => {
                              onSelectRestaurant(rest.slug);
                              onAddRecentSearch(query.trim());
                              setIsOpen(false);
                            }}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border text-left transition-colors cursor-pointer ${
                              active
                                ? 'bg-pink-50 border-[#E21B70]'
                                : 'bg-white border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <img
                              src={rest.coverUrl}
                              alt={restTitle}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-[#2E3138] truncate">
                                <Highlighted text={restTitle} query={query} />
                              </p>
                              <p className="text-[11px] text-neutral-500 truncate">
                                <Star className="w-3 h-3 inline text-amber-500 fill-amber-500 mr-0.5" />
                                {rest.rating} · {rest.area} · {rest.deliveryTimeMin}m
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
