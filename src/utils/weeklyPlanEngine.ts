import { Meeting, WardrobeItem, UserPreferences, WeatherCondition, WeeklyDayPlan, WeeklyFashionSummary, Formality } from '../types';
import { generateOutfitSuggestions, FORMALITY_LEVELS } from './outfitEngine';

/**
 * Format date as YYYY-MM-DD
 */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Predicts or generates realistic forecast weather for each day offset
 */
export function getForecastForDayOffset(offset: number, baseWeather: WeatherCondition): WeatherCondition {
  if (offset === 0) return baseWeather;

  // Realistic London 7-day weather variations
  const variations: { tempDelta: number; rainProb: number; cond: WeatherCondition['condition']; summary: string }[] = [
    { tempDelta: 0, rainProb: baseWeather.precipitationProbability, cond: baseWeather.condition, summary: baseWeather.summary },
    { tempDelta: 1, rainProb: 20, cond: 'partly_cloudy', summary: 'Mild & Sunny Intervals' },
    { tempDelta: -2, rainProb: 75, cond: 'rain', summary: 'Autumn Showers & Breezy' },
    { tempDelta: -3, rainProb: 15, cond: 'cloudy', summary: 'Overcast & Crisp' },
    { tempDelta: 0, rainProb: 60, cond: 'drizzle', summary: 'Light Drizzle & Fog' },
    { tempDelta: 2, rainProb: 10, cond: 'clear', summary: 'Bright & Crisp' },
    { tempDelta: -1, rainProb: 30, cond: 'partly_cloudy', summary: 'Partly Cloudy' },
  ];

  const varItem = variations[offset % variations.length];
  const temp = Math.max(7, baseWeather.temperatureC + varItem.tempDelta);

  return {
    temperatureC: temp,
    feelsLikeC: temp - 2,
    condition: varItem.cond,
    precipitationProbability: varItem.rainProb,
    windSpeedKmh: 14 + (offset * 2) % 15,
    summary: varItem.summary,
    icon: varItem.cond === 'rain' ? 'cloud-rain' : varItem.cond === 'clear' ? 'sun' : 'cloud',
  };
}

/**
 * Finds the highest formality among a list of meetings
 */
export function getHighestFormality(meetings: Meeting[]): Formality {
  if (meetings.length === 0) return 'casual';

  let highest: Formality = 'casual';
  let highestScore = 0;

  for (const m of meetings) {
    const score = FORMALITY_LEVELS[m.formality] || 1;
    if (score > highestScore) {
      highestScore = score;
      highest = m.formality;
    }
  }

  return highest;
}

/**
 * Builds a 7-day fashion calendar plan mapping meetings, weather, and recommended outfits
 */
export function buildWeeklyFashionPlan(
  meetings: Meeting[],
  wardrobe: WardrobeItem[],
  preferences: UserPreferences,
  baseWeather: WeatherCondition,
  userSwappedOutfits: Record<string, string> = {}, // map of dateKey -> outfitId
  startDate: Date = new Date()
): { days: WeeklyDayPlan[]; summary: WeeklyFashionSummary } {
  const days: WeeklyDayPlan[] = [];
  const usedGarmentIds = new Set<string>();
  let rainyDaysCount = 0;
  let formalDaysCount = 0;
  let totalMeetingsCount = 0;
  let daysWithMeetingsCount = 0;

  for (let offset = 0; offset < 7; offset++) {
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + offset);
    dayDate.setHours(12, 0, 0, 0);

    const dateKey = toDateKey(dayDate);
    const dayName = dayDate.toLocaleDateString([], { weekday: 'long' });
    const formattedDate = dayDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const isToday = offset === 0;

    // Filter meetings matching this day
    const dayMeetings = meetings.filter(m => {
      const mDate = new Date(m.startTime);
      return toDateKey(mDate) === dateKey;
    });

    totalMeetingsCount += dayMeetings.length;
    if (dayMeetings.length > 0) {
      daysWithMeetingsCount++;
    }

    // Daily weather
    const dayWeather = getForecastForDayOffset(offset, baseWeather);
    if (dayWeather.precipitationProbability >= preferences.rainToleranceThreshold) {
      rainyDaysCount++;
    }

    // Determine target formality
    const dayFormality = getHighestFormality(dayMeetings);
    if (dayFormality === 'business_formal' || dayFormality === 'formal') {
      formalDaysCount++;
    }

    // Generate outfit recommendations for this day
    const suggestions = generateOutfitSuggestions(wardrobe, dayWeather, dayFormality, preferences);

    // Selected outfit (respect user custom selection if exists, else first recommendation)
    let selectedOutfit = suggestions[0];
    const userSelectedId = userSwappedOutfits[dateKey];
    if (userSelectedId) {
      const match = suggestions.find(s => s.id === userSelectedId);
      if (match) selectedOutfit = match;
    }

    if (selectedOutfit) {
      selectedOutfit.items.forEach(item => usedGarmentIds.add(item.id));
    }

    days.push({
      date: dayDate,
      dateKey,
      dayName,
      formattedDate,
      isToday,
      meetings: dayMeetings,
      weather: dayWeather,
      plannedOutfit: selectedOutfit,
      alternativeOutfits: suggestions,
    });
  }

  const summary: WeeklyFashionSummary = {
    totalMeetings: totalMeetingsCount,
    daysWithMeetings: daysWithMeetingsCount,
    rainyDaysCount,
    formalDaysCount,
    uniqueGarmentsCount: usedGarmentIds.size,
  };

  return { days, summary };
}
