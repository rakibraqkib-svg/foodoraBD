import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveMapPinPresentation } from './map-markers';

test('vendor role renders restaurant name above black pin', () => {
  const pin = resolveMapPinPresentation({
    role: 'vendor',
    label: "Sultan's Dine — Gulshan 2",
    lang: 'en',
  });
  assert.equal(pin.role, 'vendor');
  assert.equal(pin.label, "Sultan's Dine — Gulshan 2");
  assert.equal(pin.background, '#111827');
});

test('user role defaults to "You" above red pin when no user name is present', () => {
  const pinEn = resolveMapPinPresentation({ role: 'user', lang: 'en' });
  assert.equal(pinEn.role, 'user');
  assert.equal(pinEn.label, 'You');
  assert.equal(pinEn.background, '#DC2626');

  const maskedPin = resolveMapPinPresentation({
    role: 'user',
    label: 'Foodora Customer',
    lang: 'en',
  });
  assert.equal(maskedPin.label, 'You');

  const pinBn = resolveMapPinPresentation({ role: 'user', lang: 'bn' });
  assert.equal(pinBn.label, 'আপনি');
});

test('user role prioritizes userName or custom label above red pin', () => {
  const named = resolveMapPinPresentation({
    role: 'user',
    userName: 'Rahim Uddin',
    label: 'Gulshan 2',
    lang: 'en',
  });
  assert.equal(named.label, 'Rahim Uddin');
  assert.equal(named.background, '#DC2626');

  const viaLabel = resolveMapPinPresentation({
    role: 'user',
    label: 'Tariq Hasan',
    lang: 'en',
  });
  assert.equal(viaLabel.label, 'Tariq Hasan');
});
