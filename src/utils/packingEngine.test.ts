import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTripDuration,
  detectMultiDayEvents,
  extractCityFromLocation,
  getDestinationWeather,
  getLuggageRecommendation,
  generatePackingList,
  calculatePackingProgress,
  formatPackingListAsText,
} from './packingEngine';
import { Meeting, WardrobeItem, UserPreferences, TripEvent } from '../types';
import { SEED_WARDROBE } from '../data/seedWardrobe';

const mockPreferences: UserPreferences = {
  warmthLean: 'balanced',
  formalityLean: 0,
  commuteComfortPriority: true,
  rainToleranceThreshold: 30,
  favoriteColors: ['navy', 'charcoal', 'white'],
  dislikedMaterials: ['polyester'],
  feedbackCount: 5,
  weights: {
    weatherWeight: 1.0,
    formalityWeight: 1.0,
    comfortWeight: 1.0,
    favoriteWeight: 1.0,
  },
};

test('extractCityFromLocation accurately identifies destination cities', () => {
  assert.equal(extractCityFromLocation('The Balmoral Hotel, 1 Princes St, Edinburgh EH2 2EQ').city, 'Edinburgh');
  assert.equal(extractCityFromLocation('Le Meurice, 228 Rue de Rivoli, Paris, France').city, 'Paris');
  assert.equal(extractCityFromLocation('5th Ave, Manhattan, New York, NY').city, 'New York');
  assert.equal(extractCityFromLocation('Bahnhofstrasse 45, Zurich').city, 'Zurich');
});

test('calculateTripDuration correctly calculates days and nights', () => {
  const start = '2026-11-10T09:00:00.000Z';
  const end = '2026-11-12T17:00:00.000Z'; // 3 days (Nov 10, 11, 12), 2 nights

  const duration = calculateTripDuration(start, end);
  assert.equal(duration.days, 3);
  assert.equal(duration.nights, 2);
  assert.ok(duration.formattedRange.includes('3 Days, 2 Nights'));
});

test('detectMultiDayEvents identifies multi-day meetings and offsites', () => {
  const mockMeetings: Meeting[] = [
    {
      id: 'm-single',
      title: 'London Team Sync',
      startTime: '2026-11-05T10:00:00.000Z',
      endTime: '2026-11-05T11:00:00.000Z',
      location: '1 Canada Square, Canary Wharf, London',
      formality: 'business_casual',
    },
    {
      id: 'm-edinburgh',
      title: 'Edinburgh Strategy Offsite & Highland Board Review',
      startTime: '2026-11-10T09:00:00.000Z',
      endTime: '2026-11-12T18:00:00.000Z',
      location: 'The Balmoral Hotel, 1 Princes St, Edinburgh EH2 2EQ',
      formality: 'business_casual',
    },
    {
      id: 'm-paris',
      title: 'Paris Luxury Retail Summit',
      startTime: '2026-11-18T09:00:00.000Z',
      endTime: '2026-11-19T18:00:00.000Z',
      location: 'Le Meurice, 228 Rue de Rivoli, 75001 Paris, France',
      formality: 'business_formal',
    },
  ];

  const detected = detectMultiDayEvents(mockMeetings);
  assert.equal(detected.length, 2);

  const edinburgh = detected.find((t) => t.city === 'Edinburgh');
  assert.ok(edinburgh);
  assert.equal(edinburgh.totalDays, 3);
  assert.equal(edinburgh.isCalendarDetected, true);

  const paris = detected.find((t) => t.city === 'Paris');
  assert.ok(paris);
  assert.equal(paris.totalDays, 2);
});

test('getDestinationWeather returns climate profiles and daily breakdown', () => {
  const weather = getDestinationWeather('Edinburgh', 3);
  assert.equal(weather.city, 'Edinburgh');
  assert.equal(weather.condition, 'rain');
  assert.ok(weather.precipitationProbability >= 50);
  assert.equal(weather.forecastDays.length, 3);
  assert.ok(weather.packingAdvisory.includes('Scottish'));
});

test('getLuggageRecommendation scales with trip days', () => {
  const weekend = getLuggageRecommendation(2);
  assert.ok(weekend.bagType.includes('Duffel'));

  const offsite = getLuggageRecommendation(3);
  assert.ok(offsite.bagType.includes('Carry-On'));

  const longTrip = getLuggageRecommendation(6);
  assert.ok(longTrip.bagType.includes('Check-In'));
});

test('generatePackingList pulls items from user wardrobe and includes weather gear', () => {
  const mockTrip: TripEvent = {
    id: 'test-trip-1',
    title: 'Edinburgh Strategy Offsite',
    destination: 'The Balmoral Hotel, Edinburgh',
    city: 'Edinburgh',
    startDate: '2026-11-10T09:00:00.000Z',
    endDate: '2026-11-12T18:00:00.000Z',
    totalDays: 3,
    totalNights: 2,
    formality: 'business_casual',
    isCalendarDetected: true,
  };

  const weather = getDestinationWeather('Edinburgh', 3);
  const packingList = generatePackingList(mockTrip, weather, SEED_WARDROBE, mockPreferences);

  assert.equal(packingList.tripId, 'test-trip-1');
  assert.ok(packingList.items.length >= 8);

  // Should have tops, bottoms, outerwear, footwear from user wardrobe
  const tops = packingList.items.filter((i) => i.category === 'tops');
  const bottoms = packingList.items.filter((i) => i.category === 'bottoms');
  const outerwear = packingList.items.filter((i) => i.category === 'outerwear');
  const footwear = packingList.items.filter((i) => i.category === 'footwear');

  assert.ok(tops.length >= 3, 'Expected at least 3 tops for a 3-day trip');
  assert.ok(bottoms.length >= 2, 'Expected at least 2 bottoms for a 3-day trip');
  assert.ok(outerwear.length >= 1, 'Expected at least 1 outerwear piece');
  assert.ok(footwear.length >= 1, 'Expected at least 1 footwear pair');

  // Since Edinburgh has rain probability 65% > 30% threshold, it should include rain protection (umbrella)
  const hasRainProtection = packingList.items.some(
    (i) =>
      i.subcategory.toLowerCase().includes('umbrella') ||
      i.customName?.toLowerCase().includes('umbrella') ||
      (i.item && i.item.weatherTags.includes('rain_friendly'))
  );
  assert.ok(hasRainProtection, 'Expected rain protection in Edinburgh packing list');

  // Should contain travel essentials
  const essentials = packingList.items.filter((i) => i.category === 'travel_essentials');
  assert.ok(essentials.length >= 3, 'Expected travel essentials (dopp kit, tech pouch, undergarments)');
});

test('calculatePackingProgress tracks packed vs unpacked count and percentage', () => {
  const items = [
    { id: '1', category: 'tops' as const, subcategory: 'Shirt', isPacked: true, recommendedQuantity: 1, reason: '' },
    { id: '2', category: 'bottoms' as const, subcategory: 'Trousers', isPacked: true, recommendedQuantity: 1, reason: '' },
    { id: '3', category: 'outerwear' as const, subcategory: 'Coat', isPacked: false, recommendedQuantity: 1, reason: '' },
    { id: '4', category: 'footwear' as const, subcategory: 'Loafers', isPacked: false, recommendedQuantity: 1, reason: '' },
  ];

  const progress = calculatePackingProgress(items);
  assert.equal(progress.total, 4);
  assert.equal(progress.packed, 2);
  assert.equal(progress.unpacked, 2);
  assert.equal(progress.percentage, 50);
  assert.equal(progress.isComplete, false);

  items[2].isPacked = true;
  items[3].isPacked = true;
  const completeProgress = calculatePackingProgress(items);
  assert.equal(completeProgress.percentage, 100);
  assert.equal(completeProgress.isComplete, true);
});

test('formatPackingListAsText generates clean readable markdown', () => {
  const mockTrip: TripEvent = {
    id: 'test-trip-2',
    title: 'Paris Fashion Summit',
    destination: 'Paris, France',
    city: 'Paris',
    startDate: '2026-11-20T09:00:00.000Z',
    endDate: '2026-11-21T18:00:00.000Z',
    totalDays: 2,
    totalNights: 1,
    formality: 'business_formal',
    isCalendarDetected: true,
  };

  const weather = getDestinationWeather('Paris', 2);
  const packingList = generatePackingList(mockTrip, weather, SEED_WARDROBE, mockPreferences);
  const text = formatPackingListAsText(packingList);

  assert.ok(text.includes('SARTORIAL TRIP PACKING LIST'));
  assert.ok(text.includes('Paris'));
  assert.ok(text.includes('--- CHECKLIST ---'));
  assert.ok(text.includes('[ ]'));
  assert.ok(text.includes('SARTORIAL CONCIERGE NOTES'));
});
