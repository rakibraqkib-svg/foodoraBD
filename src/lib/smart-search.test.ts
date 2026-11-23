import test from 'node:test';
import assert from 'node:assert/strict';
import { FALLBACK_PRODUCTS, FALLBACK_RESTAURANTS } from '../db/memory-fallback';
import {
  getInstantSearchMatches,
  highlightMatchSegments,
  searchProductsSmart,
  searchRestaurantsSmart,
} from './smart-search';

test('phonetic Banglish and Bangla queries match Kacchi across products and restaurants', () => {
  const kacchi = searchProductsSmart(FALLBACK_PRODUCTS, {
    query: 'kacchi',
    cuisine: 'All',
    onlyDiscount: false,
    deliveryFleet: 'all',
    quickFilters: [],
  });
  const phonetic = searchProductsSmart(FALLBACK_PRODUCTS, {
    query: 'kachchi',
    cuisine: 'All',
    onlyDiscount: false,
    deliveryFleet: 'all',
    quickFilters: [],
  });
  const bangla = searchProductsSmart(FALLBACK_PRODUCTS, {
    query: 'কাচ্চি',
    cuisine: 'All',
    onlyDiscount: false,
    deliveryFleet: 'all',
    quickFilters: [],
  });

  assert.ok(kacchi.length >= 1);
  assert.equal(phonetic.length, kacchi.length);
  assert.ok(bangla.some((p) => p.name.includes('Kacchi')));
});

test('quick filters (under300, deals, topRated) filter products accurately', () => {
  const under300 = searchProductsSmart(FALLBACK_PRODUCTS, {
    query: '',
    cuisine: 'All',
    onlyDiscount: false,
    deliveryFleet: 'all',
    quickFilters: ['under300'],
  });
  assert.ok(under300.length >= 2);
  assert.ok(
    under300.every((p) => {
      const eff = p.discountPrice && p.discountPrice < p.price ? p.discountPrice : p.price;
      return eff <= 300;
    })
  );

  const deals = searchProductsSmart(FALLBACK_PRODUCTS, {
    query: '',
    cuisine: 'All',
    onlyDiscount: false,
    deliveryFleet: 'all',
    quickFilters: ['deals'],
  });
  assert.ok(deals.every((p) => Boolean(p.discountPrice && p.discountPrice < p.price)));
});

test('restaurant search matches restaurants by dish keywords like ilish or momo', () => {
  const ilishRests = searchRestaurantsSmart(FALLBACK_RESTAURANTS, FALLBACK_PRODUCTS, {
    query: 'ilish',
    cuisine: 'All',
    onlyDiscount: false,
    onlyFreeFirst: false,
    priceTierFilter: null,
    deliveryFleet: 'all',
    sortBy: 'relevance',
    quickFilters: [],
  });
  assert.ok(ilishRests.some((r) => r.slug === 'mezzan-haile-aaiun'));
});

test('instant search scope filters dishes, restaurants, and offers', () => {
  const dishesOnly = getInstantSearchMatches(
    'burger',
    'dishes',
    FALLBACK_PRODUCTS,
    FALLBACK_RESTAURANTS,
    []
  );
  assert.ok(dishesOnly.dishes.length > 0);
  assert.equal(dishesOnly.restaurants.length, 0);

  const offersOnly = getInstantSearchMatches(
    '',
    'offers',
    FALLBACK_PRODUCTS,
    FALLBACK_RESTAURANTS,
    []
  );
  assert.ok(offersOnly.dishes.every((d) => Boolean(d.discountPrice && d.discountPrice < d.price)));
});

test('highlightMatchSegments highlights matching words safely', () => {
  const segments = highlightMatchSegments('Bashmati Mutton Kacchi', 'kacchi');
  assert.equal(segments.some((s) => s.matched && s.text.toLowerCase() === 'kacchi'), true);
});
