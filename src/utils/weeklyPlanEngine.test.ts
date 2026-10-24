import test from 'node:test';
import assert from 'node:assert/strict';
import { toDateKey, getHighestFormality, buildWeeklyFashionPlan } from './weeklyPlanEngine';
import { Meeting, WardrobeItem, UserPreferences, WeatherCondition } from '../types';
import { SEED_WARDROBE } from '../data/seedWardrobe';

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

const mockWeather: WeatherCondition = {
  temperatureC: 13,
  feelsLikeC: 11,
  condition: 'cloudy',
  precipitationProbability: 20,
  windSpeedKmh: 15,
  summary: 'Partly Cloudy',
  icon: 'cloud-sun',
};

test('toDateKey formats Date to YYYY-MM-DD correctly', () => {
  const d = new Date(2026, 9, 24); // Oct 24 2026
  assert.equal(toDateKey(d), '2026-10-24');
});

test('getHighestFormality returns the most formal meeting tier', () => {
  const meetings: Meeting[] = [
    {
      id: '1',
      title: 'Casual Coffee',
      startTime: '2026-10-24T10:00:00Z',
      endTime: '2026-10-24T11:00:00Z',
      location: 'Covent Garden',
      formality: 'casual',
    },
    {
      id: '2',
      title: 'Board Audit',
      startTime: '2026-10-24T14:00:00Z',
      endTime: '2026-10-24T15:00:00Z',
      location: 'The Gherkin',
      formality: 'business_formal',
    },
    {
      id: '3',
      title: 'Team Sync',
      startTime: '2026-10-24T16:00:00Z',
      endTime: '2026-10-24T17:00:00Z',
      location: 'Shoreditch',
      formality: 'smart_casual',
    },
  ];

  assert.equal(getHighestFormality(meetings), 'business_formal');
});

test('buildWeeklyFashionPlan constructs 7 consecutive days with outfits and summary', () => {
  const startDate = new Date('2026-10-24T12:00:00Z');
  const meetings: Meeting[] = [
    {
      id: 'm1',
      title: 'Executive Pitch',
      startTime: '2026-10-24T14:00:00Z',
      endTime: '2026-10-24T15:00:00Z',
      location: '1 Canada Square',
      formality: 'business_formal',
    },
    {
      id: 'm2',
      title: 'Design Lunch',
      startTime: '2026-10-25T12:00:00Z',
      endTime: '2026-10-25T13:00:00Z',
      location: 'Soho',
      formality: 'smart_casual',
    },
  ];

  const plan = buildWeeklyFashionPlan(meetings, SEED_WARDROBE, mockPreferences, mockWeather, {}, startDate);
  assert.equal(plan.days.length, 7);
  assert.equal(plan.days[0].meetings.length, 1);
  assert.equal(plan.days[1].meetings.length, 1);
  assert.ok(plan.days[0].plannedOutfit, 'Day 1 should have a planned outfit');
  assert.equal(plan.summary.totalMeetings, 2);
  assert.equal(plan.summary.daysWithMeetings, 2);
});

test('buildWeeklyFashionPlan respects userSwappedOutfits override', () => {
  const startDate = new Date('2026-10-24T12:00:00Z');
  const dateKey = toDateKey(startDate);

  const plan = buildWeeklyFashionPlan(
    [],
    SEED_WARDROBE,
    mockPreferences,
    mockWeather,
    { [dateKey]: 'outfit-statement' },
    startDate
  );

  assert.equal(plan.days[0].plannedOutfit?.id, 'outfit-statement');
});
