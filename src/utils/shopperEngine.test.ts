import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeWardrobeGaps } from './shopperEngine';
import { WardrobeItem, Meeting, WeatherCondition, UserPreferences } from '../types';

const mockPreferences: UserPreferences = {
  warmthLean: 'balanced',
  formalityLean: 0,
  commuteComfortPriority: true,
  rainToleranceThreshold: 30,
  favoriteColors: ['navy', 'charcoal'],
  dislikedMaterials: ['polyester'],
  feedbackCount: 3,
  weights: {
    weatherWeight: 1.0,
    formalityWeight: 1.0,
    comfortWeight: 1.0,
    favoriteWeight: 1.0,
  },
};

const baseWardrobe: WardrobeItem[] = [
  {
    id: 'top-1',
    name: 'Oxford Cotton Shirt',
    category: 'tops',
    subcategory: 'shirt',
    formality: 'business_casual',
    warmth: 2,
    weatherTags: ['all_weather'],
    color: 'White',
    colorHex: '#ffffff',
    material: 'Cotton',
  },
  {
    id: 'bottom-1',
    name: 'Wool Flannel Trousers',
    category: 'bottoms',
    subcategory: 'trousers',
    formality: 'business_casual',
    warmth: 3,
    weatherTags: ['all_weather'],
    color: 'Charcoal',
    colorHex: '#333333',
    material: 'Wool',
  },
  {
    id: 'bottom-2',
    name: 'Chinos',
    category: 'bottoms',
    subcategory: 'chinos',
    formality: 'smart_casual',
    warmth: 2,
    weatherTags: ['all_weather'],
    color: 'Navy',
    colorHex: '#000080',
    material: 'Cotton',
  },
  {
    id: 'bottom-3',
    name: 'Dark Wash Denim',
    category: 'bottoms',
    subcategory: 'jeans',
    formality: 'casual',
    warmth: 3,
    weatherTags: ['all_weather'],
    color: 'Indigo',
    colorHex: '#1a2b4c',
    material: 'Denim',
  },
  {
    id: 'shoe-1',
    name: 'Oxford Brogues',
    category: 'footwear',
    subcategory: 'oxfords',
    formality: 'business_formal',
    warmth: 2,
    weatherTags: ['all_weather'],
    color: 'Dark Brown',
    colorHex: '#4a2c11',
    material: 'Calfskin Leather',
  },
  {
    id: 'coat-1',
    name: 'Wool Cashmere Overcoat',
    category: 'outerwear',
    subcategory: 'overcoat',
    formality: 'business_formal',
    warmth: 5,
    weatherTags: ['cold'],
    color: 'Camel',
    colorHex: '#c19a6b',
    material: 'Wool & Cashmere',
  },
];

const formalMeeting: Meeting = {
  id: 'm-1',
  title: 'Board of Directors AGM',
  startTime: '2026-10-26T10:00:00Z',
  endTime: '2026-10-26T12:00:00Z',
  location: 'Canary Wharf, London',
  formality: 'business_formal',
};

const casualMeeting: Meeting = {
  id: 'm-2',
  title: 'Team Coffee',
  startTime: '2026-10-26T14:00:00Z',
  endTime: '2026-10-26T15:00:00Z',
  location: 'Soho, London',
  formality: 'casual',
};

const rainyWeather: WeatherCondition = {
  temperatureC: 11,
  feelsLikeC: 9,
  condition: 'rain',
  precipitationProbability: 80,
  windSpeedKmh: 20,
  summary: 'Persistent rain and chilly breeze',
  icon: 'cloud-rain',
};

test('analyzeWardrobeGaps detects missing rain outerwear when rain is forecast', () => {
  const result = analyzeWardrobeGaps(baseWardrobe, [formalMeeting], rainyWeather, mockPreferences);
  const rainGap = result.gaps.find(g => g.id === 'gap-rain-outerwear');
  assert.ok(rainGap, 'Should find missing rain outerwear gap');
  assert.strictEqual(rainGap?.severity, 'high');
  assert.strictEqual(rainGap?.suggestedCategory, 'outerwear');
});

test('analyzeWardrobeGaps detects formal footwear gap if user has formal meeting but no formal shoes', () => {
  // Wardrobe without formal shoes
  const wardrobeWithoutFormalShoes = baseWardrobe.filter(i => i.category !== 'footwear');
  const result = analyzeWardrobeGaps(wardrobeWithoutFormalShoes, [formalMeeting], null, mockPreferences);
  const shoeGap = result.gaps.find(g => g.id === 'gap-formal-shoes');
  assert.ok(shoeGap, 'Should find missing formal shoes gap');
  assert.strictEqual(shoeGap?.severity, 'high');
});

test('analyzeWardrobeGaps detects bottoms scarcity when fewer than 3 bottoms exist', () => {
  const scarceWardrobe = baseWardrobe.filter(i => i.id !== 'bottom-2' && i.id !== 'bottom-3');
  const result = analyzeWardrobeGaps(scarceWardrobe, [casualMeeting], null, mockPreferences);
  const bottomsGap = result.gaps.find(g => g.id === 'gap-bottoms-scarcity');
  assert.ok(bottomsGap, 'Should detect bottoms scarcity');
  assert.strictEqual(bottomsGap?.severity, 'low');
});

test('analyzeWardrobeGaps calculates readiness score and priorities properly', () => {
  const result = analyzeWardrobeGaps(baseWardrobe, [formalMeeting], rainyWeather, mockPreferences);
  assert.ok(result.overallReadinessScore >= 25 && result.overallReadinessScore <= 100);
  assert.ok(result.topPriority.length > 0);
  assert.ok(result.analysisSummary.includes('Analyzed'));
});
