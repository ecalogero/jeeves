import test from 'node:test';
import assert from 'node:assert/strict';
import { getTargetWarmth, scoreItem, generateOutfitSuggestions, trainPreferences } from './outfitEngine';
import { WardrobeItem, WeatherCondition, UserPreferences } from '../types';

const mockPreferences: UserPreferences = {
  warmthLean: 'balanced',
  formalityLean: 0,
  commuteComfortPriority: false,
  rainToleranceThreshold: 30,
  favoriteColors: ['navy', 'charcoal'],
  dislikedMaterials: ['polyester'],
  feedbackCount: 0,
  weights: {
    weatherWeight: 1.0,
    formalityWeight: 1.0,
    comfortWeight: 1.0,
    favoriteWeight: 1.0,
  },
};

const sampleWardrobe: WardrobeItem[] = [
  {
    id: 'top-1',
    name: 'Oxford Cotton Shirt',
    category: 'tops',
    subcategory: 'shirt',
    formality: 'business_casual',
    warmth: 3,
    weatherTags: ['all_weather', 'breathable'],
    color: 'White',
    colorHex: '#ffffff',
    material: '100% Cotton',
  },
  {
    id: 'top-2',
    name: 'Merino Wool Crewneck',
    category: 'tops',
    subcategory: 'sweater',
    formality: 'smart_casual',
    warmth: 4,
    weatherTags: ['cold'],
    color: 'Navy',
    colorHex: '#000080',
    material: 'Merino Wool',
  },
  {
    id: 'bottom-1',
    name: 'Tailored Wool Trousers',
    category: 'bottoms',
    subcategory: 'trousers',
    formality: 'business_casual',
    warmth: 3,
    weatherTags: ['all_weather'],
    color: 'Charcoal',
    colorHex: '#36454F',
    material: 'Wool Blend',
  },
  {
    id: 'shoe-1',
    name: 'Leather Oxford Shoes',
    category: 'footwear',
    subcategory: 'oxford',
    formality: 'business_formal',
    warmth: 3,
    weatherTags: ['all_weather'],
    color: 'Dark Brown',
    colorHex: '#654321',
    material: 'Full-Grain Leather',
  },
  {
    id: 'shoe-2',
    name: 'Clean Leather Commuter Sneakers',
    category: 'footwear',
    subcategory: 'sneaker',
    formality: 'smart_casual',
    warmth: 2,
    weatherTags: ['all_weather'],
    color: 'White',
    colorHex: '#ffffff',
    material: 'Leather',
  },
  {
    id: 'coat-1',
    name: 'Waterproof Mac Trench Coat',
    category: 'outerwear',
    subcategory: 'trench',
    formality: 'business_casual',
    warmth: 3,
    weatherTags: ['rain_friendly'],
    color: 'Beige',
    colorHex: '#f5f5dc',
    material: 'Cotton Gabardine',
  },
  {
    id: 'acc-1',
    name: 'Windproof Compact Umbrella',
    category: 'accessories',
    subcategory: 'umbrella',
    formality: 'smart_casual',
    warmth: 1,
    weatherTags: ['rain_friendly'],
    color: 'Black',
    colorHex: '#000000',
    material: 'Waterproof Canopy',
  },
];

test('getTargetWarmth scales properly with temperature and warmth lean', () => {
  assert.equal(getTargetWarmth(4, 'balanced'), 5); // very cold -> 5
  assert.equal(getTargetWarmth(10, 'balanced'), 4); // cold -> 4
  assert.equal(getTargetWarmth(16, 'balanced'), 3); // mild -> 3
  assert.equal(getTargetWarmth(22, 'balanced'), 2); // warm -> 2
  assert.equal(getTargetWarmth(28, 'balanced'), 1); // hot -> 1

  // user runs cold -> warmth target +1
  assert.equal(getTargetWarmth(16, 'runs_cold'), 4);
  // user runs hot -> warmth target -1
  assert.equal(getTargetWarmth(16, 'runs_hot'), 2);
});

test('scoreItem boosts rain-friendly garments when raining', () => {
  const rainyWeather: WeatherCondition = {
    temperatureC: 13,
    feelsLikeC: 11,
    condition: 'rain',
    precipitationProbability: 80,
    windSpeedKmh: 20,
    summary: 'Rain expected',
    icon: 'rain',
  };

  const trench = sampleWardrobe.find(i => i.id === 'coat-1')!;
  const scoreInRain = scoreItem(trench, rainyWeather, 'business_casual', mockPreferences);

  const dryWeather: WeatherCondition = {
    ...rainyWeather,
    precipitationProbability: 10,
    condition: 'clear',
  };
  const scoreInDry = scoreItem(trench, dryWeather, 'business_casual', mockPreferences);

  assert.ok(scoreInRain > scoreInDry, 'Rain-friendly item should score higher in rain');
});

test('generateOutfitSuggestions includes umbrella when rain probability >= threshold', () => {
  const rainyWeather: WeatherCondition = {
    temperatureC: 14,
    feelsLikeC: 13,
    condition: 'rain',
    precipitationProbability: 75,
    windSpeedKmh: 15,
    summary: 'Scattered showers',
    icon: 'rain',
  };

  const suggestions = generateOutfitSuggestions(sampleWardrobe, rainyWeather, 'business_casual', mockPreferences);
  assert.ok(suggestions.length > 0, 'Should generate suggestions');

  const primarySuggestion = suggestions[0];
  const hasUmbrella = primarySuggestion.items.some(i => i.subcategory.includes('umbrella') || i.name.toLowerCase().includes('umbrella'));
  assert.ok(hasUmbrella, 'Primary outfit suggestion should include an umbrella during rain');
});

test('trainPreferences updates user style and warmth preferences', () => {
  let prefs = { ...mockPreferences };
  assert.equal(prefs.warmthLean, 'balanced');

  prefs = trainPreferences(prefs, { type: 'too_cold' });
  assert.equal(prefs.warmthLean, 'runs_cold');

  prefs = trainPreferences(prefs, { type: 'too_formal' });
  assert.equal(prefs.formalityLean, -1);

  prefs = trainPreferences(prefs, { type: 'love_comfort' });
  assert.equal(prefs.commuteComfortPriority, true);
  assert.equal(prefs.feedbackCount, 3);
});
