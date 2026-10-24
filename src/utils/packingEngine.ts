import {
  Meeting,
  WardrobeItem,
  UserPreferences,
  Formality,
  TripEvent,
  DestinationWeather,
  DestinationDailyWeather,
  PackingListItem,
  LuggageRecommendation,
  PackingList,
  Category,
} from '../types';

/**
 * Extracts a recognizable city name from a location string or meeting title.
 */
export function extractCityFromLocation(location: string, title?: string): { city: string; country?: string } {
  const text = `${location} ${title || ''}`.toLowerCase();

  if (text.includes('edinburgh') || text.includes('scotland')) {
    return { city: 'Edinburgh', country: 'United Kingdom' };
  }
  if (text.includes('paris') || text.includes('france')) {
    return { city: 'Paris', country: 'France' };
  }
  if (text.includes('new york') || text.includes('manhattan') || text.includes('nyc')) {
    return { city: 'New York', country: 'United States' };
  }
  if (text.includes('zurich') || text.includes('zürich') || text.includes('geneva') || text.includes('switzerland')) {
    return { city: 'Zurich', country: 'Switzerland' };
  }
  if (text.includes('milan') || text.includes('milano') || text.includes('italy') || text.includes('rome')) {
    return { city: 'Milan', country: 'Italy' };
  }
  if (text.includes('berlin') || text.includes('munich') || text.includes('frankfurt') || text.includes('germany')) {
    return { city: 'Berlin', country: 'Germany' };
  }
  if (text.includes('amsterdam') || text.includes('netherlands')) {
    return { city: 'Amsterdam', country: 'Netherlands' };
  }
  if (text.includes('dublin') || text.includes('ireland')) {
    return { city: 'Dublin', country: 'Ireland' };
  }
  if (text.includes('cotswolds') || text.includes('oxford') || text.includes('cambridge')) {
    return { city: 'Cotswolds', country: 'United Kingdom' };
  }
  if (text.includes('manchester') || text.includes('birmingham') || text.includes('leeds')) {
    return { city: 'Manchester', country: 'United Kingdom' };
  }

  // Fallback: extract primary segment from comma-separated string
  const parts = location.split(',').map((p) => p.trim());
  if (parts.length > 1) {
    const candidate = parts[parts.length - 2] || parts[0];
    return { city: candidate.replace(/\b(UK|EH\w+|EC\w+|W\w+|SW\w+)\b/g, '').trim() || 'London', country: 'United Kingdom' };
  }

  return { city: location.trim() || 'Destination', country: 'United Kingdom' };
}

/**
 * Calculates trip duration in calendar days and nights.
 */
export function calculateTripDuration(
  startDateStr: string,
  endDateStr: string
): { days: number; nights: number; formattedRange: string } {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  // Normalize to UTC calendar dates to avoid daylight saving or partial-hour skew
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());

  const msPerDay = 1000 * 60 * 60 * 24;
  const dayDifference = Math.round((endUtc - startUtc) / msPerDay);

  // If start and end are on different calendar days, total days is dayDifference + 1
  // If same calendar day but >= 20 hours duration, it's at least 1-2 days
  const rawHourDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  const days = Math.max(1, dayDifference > 0 ? dayDifference + 1 : rawHourDiff >= 20 ? 2 : 1);
  const nights = Math.max(0, days - 1);

  const startFormatted = start.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  const endFormatted = end.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });

  const formattedRange = `${startFormatted} – ${endFormatted} (${days} ${days === 1 ? 'Day' : 'Days'}, ${nights} ${nights === 1 ? 'Night' : 'Nights'})`;

  return { days, nights, formattedRange };
}

/**
 * Detects multi-day events from calendar meetings.
 * Flags events that span across multiple calendar days or >= 20 hours,
 * or meetings flagged as offsites/summits/retreats.
 */
export function detectMultiDayEvents(meetings: Meeting[]): TripEvent[] {
  const tripEvents: TripEvent[] = [];

  for (const m of meetings) {
    const start = new Date(m.startTime);
    const end = new Date(m.endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    const titleLower = (m.title || '').toLowerCase();
    const isExplicitTripKeyword =
      titleLower.includes('offsite') ||
      titleLower.includes('summit') ||
      titleLower.includes('retreat') ||
      titleLower.includes('conference') ||
      titleLower.includes('trip') ||
      titleLower.includes('tour') ||
      titleLower.includes('resort');

    const durationInfo = calculateTripDuration(m.startTime, m.endTime);
    const isMultiDay = durationInfo.days >= 2 || durationHours >= 20;

    // Detect if this is an out-of-London travel destination or multi-day event
    const { city, country } = extractCityFromLocation(m.location, m.title);
    const isOutOfTown = city.toLowerCase() !== 'london';

    if (isMultiDay || (isExplicitTripKeyword && isOutOfTown)) {
      tripEvents.push({
        id: `trip-${m.id}`,
        meetingId: m.id,
        title: m.title,
        destination: m.location,
        city,
        country,
        startDate: m.startTime,
        endDate: m.endTime,
        totalDays: Math.max(2, durationInfo.days),
        totalNights: Math.max(1, durationInfo.nights),
        formality: m.formality,
        description: m.description,
        isCalendarDetected: true,
      });
    }
  }

  return tripEvents;
}

/**
 * Returns weather forecast and travel packing advisory for destination city.
 */
export function getDestinationWeather(
  destination: string,
  daysCount: number,
  baseDate: Date = new Date()
): DestinationWeather {
  const normalized = destination.toLowerCase();

  // Climate profiles for key destinations
  if (normalized.includes('edinburgh') || normalized.includes('scotland')) {
    const forecastDays: DestinationDailyWeather[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const isRainy = i % 2 === 0;
      forecastDays.push({
        dayOffset: i,
        dateFormatted: d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
        highC: 12 - (i % 2),
        lowC: 7 + (i % 3),
        condition: isRainy ? 'rain' : 'cloudy',
        precipitationProbability: isRainy ? 70 : 40,
        summary: isRainy ? 'Brisk coastal winds with intermittent squalls' : 'Overcast and crisp Scottish air',
      });
    }

    return {
      city: 'Edinburgh',
      country: 'United Kingdom',
      temperatureHighC: 12,
      temperatureLowC: 7,
      averageTempC: 10,
      condition: 'rain',
      precipitationProbability: 65,
      windSpeedKmh: 24,
      summary: '10°C • Showery & Brisk Coastal Wind',
      forecastDays,
      packingAdvisory:
        'Scottish highland & coastal weather shifts rapidly. Pack water-resistant outerwear, a fine wool knit for modular layering, and sturdy weather-friendly leather footwear.',
    };
  }

  if (normalized.includes('paris') || normalized.includes('france')) {
    const forecastDays: DestinationDailyWeather[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      forecastDays.push({
        dayOffset: i,
        dateFormatted: d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
        highC: 18 - (i % 3),
        lowC: 11 + (i % 2),
        condition: i === 0 ? 'partly_cloudy' : 'clear',
        precipitationProbability: 20,
        summary: 'Temperate and clear autumn Parisian skies',
      });
    }

    return {
      city: 'Paris',
      country: 'France',
      temperatureHighC: 18,
      temperatureLowC: 11,
      averageTempC: 15,
      condition: 'partly_cloudy',
      precipitationProbability: 20,
      windSpeedKmh: 12,
      summary: '15°C • Mild & Partly Cloudy',
      forecastDays,
      packingAdvisory:
        'Autumn in Paris calls for polished continental elegance. Pack versatile tailored trousers, a crisp Oxford shirt, and an unstructured navy blazer or lightweight trench.',
    };
  }

  if (normalized.includes('new york') || normalized.includes('nyc') || normalized.includes('manhattan')) {
    const forecastDays: DestinationDailyWeather[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      forecastDays.push({
        dayOffset: i,
        dateFormatted: d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
        highC: 16 - (i % 2),
        lowC: 9 + (i % 2),
        condition: 'windy',
        precipitationProbability: 25,
        summary: 'Brisk avenue wind corridors with clear sunshine',
      });
    }

    return {
      city: 'New York',
      country: 'United States',
      temperatureHighC: 16,
      temperatureLowC: 9,
      averageTempC: 13,
      condition: 'windy',
      precipitationProbability: 25,
      windSpeedKmh: 22,
      summary: '13°C • Crisp & Breezy Avenue Corridors',
      forecastDays,
      packingAdvisory:
        'Manhattan itineraries require footwear with superior walking cushioning, wind-blocking tailored layers, and sharp city proportions.',
    };
  }

  if (normalized.includes('zurich') || normalized.includes('geneva') || normalized.includes('switzerland')) {
    const forecastDays: DestinationDailyWeather[] = [];
    for (let i = 0; i < daysCount; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      forecastDays.push({
        dayOffset: i,
        dateFormatted: d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
        highC: 13 - (i % 2),
        lowC: 5 + (i % 2),
        condition: 'cloudy',
        precipitationProbability: 35,
        summary: 'Crisp alpine morning chill with cool afternoons',
      });
    }

    return {
      city: 'Zurich',
      country: 'Switzerland',
      temperatureHighC: 13,
      temperatureLowC: 5,
      averageTempC: 9,
      condition: 'cloudy',
      precipitationProbability: 35,
      windSpeedKmh: 14,
      summary: '9°C • Crisp Alpine Chill & Cool Air',
      forecastDays,
      packingAdvisory:
        'Subalpine climates require warm thermal regulation: fine-gauge cashmere crewneck, tailored wool trousers, and a water-resistant overcoat.',
    };
  }

  // Default / Generic destination
  const forecastDays: DestinationDailyWeather[] = [];
  for (let i = 0; i < daysCount; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    forecastDays.push({
      dayOffset: i,
      dateFormatted: d.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' }),
      highC: 16,
      lowC: 10,
      condition: 'partly_cloudy',
      precipitationProbability: 30,
      summary: 'Mild and variable temperate weather',
    });
  }

  return {
    city: destination,
    temperatureHighC: 16,
    temperatureLowC: 10,
    averageTempC: 13,
    condition: 'partly_cloudy',
    precipitationProbability: 30,
    windSpeedKmh: 15,
    summary: '13°C • Mild & Variable',
    forecastDays,
    packingAdvisory:
      'Pack versatile capsule wardrobe layers capable of transitioning between daytime meetings and evening engagements.',
  };
}

/**
 * Calculates luggage recommendation based on trip duration.
 */
export function getLuggageRecommendation(days: number): LuggageRecommendation {
  if (days <= 2) {
    return {
      bagType: 'Leather Weekender Duffel',
      capacity: '32L – 38L (Overhead Cabin Compliant)',
      description: 'Ideal for 1-2 nights. Fits folded suiting, footwear bag, and tech accessories without checking luggage.',
      packingTip: 'Wear your heaviest outer layer (trench or overcoat) and leather boots while traveling to maximize interior space.',
    };
  }
  if (days <= 4) {
    return {
      bagType: 'Hard-Shell Wheeled Carry-On & Briefcase',
      capacity: '40L – 48L Carry-On Suitcase',
      description: 'The executive gold standard for 3-4 day offsites. Keeps garments pressed and allows rapid airport transit.',
      packingTip: 'Use compressible garment sleeves for dress shirts and tailored trousers. Place shoes in dust bags along wheel spine.',
    };
  }
  return {
    bagType: 'Medium Check-In Trunk Case',
    capacity: '65L – 75L Spinner',
    description: 'Generous capacity for extended multi-destination itineraries with formal evening wear and multiple footwear pairs.',
    packingTip: 'Pack distinct laundry pouches and separate business formal suiting on dedicated hanger compartments.',
  };
}

/**
 * Generates an intelligent packing list from the user's wardrobe based on
 * trip duration, destination weather, formality, and user style preferences.
 */
export function generatePackingList(
  trip: TripEvent,
  weather: DestinationWeather,
  wardrobe: WardrobeItem[],
  preferences: UserPreferences
): PackingList {
  const days = Math.max(1, trip.totalDays);
  const isRainLikely = weather.precipitationProbability >= preferences.rainToleranceThreshold;
  const isCold = weather.averageTempC < 13;
  const isWarm = weather.averageTempC >= 20;

  // Quotas
  const targetTops = Math.max(2, days + 1); // 1 per day + 1 spare
  const targetBottoms = Math.max(2, Math.ceil(days / 2) + 1); // e.g. 3 days -> 3 bottoms, 2 days -> 2 bottoms
  const targetOuterwear = isRainLikely || isCold ? 2 : 1;
  const targetFootwear = days >= 3 ? 2 : 1;

  // Helper to score items for travel suitability
  const scoreItemForTrip = (item: WardrobeItem): number => {
    let score = 10;

    // Formality match
    if (item.formality === trip.formality) score += 8;
    else if (
      (trip.formality === 'business_formal' && item.formality === 'formal') ||
      (trip.formality === 'business_casual' && item.formality === 'smart_casual') ||
      (trip.formality === 'smart_casual' && item.formality === 'business_casual')
    ) {
      score += 5;
    }

    // Weather tags
    if (isRainLikely && (item.weatherTags.includes('rain_friendly') || item.weatherTags.includes('all_weather'))) {
      score += 7;
    }
    if (isCold && (item.weatherTags.includes('cold') || item.warmth >= 3)) {
      score += 6;
    }
    if (isWarm && (item.weatherTags.includes('breathable') || item.warmth <= 2)) {
      score += 5;
    }

    // Material quality (natural fibers travel best)
    const mat = item.material.toLowerCase();
    if (mat.includes('merino') || mat.includes('cashmere') || mat.includes('wool') || mat.includes('cotton')) {
      score += 3;
    }

    // Favorite items
    if (item.isFavorite) score += 2;

    // Preferred colors
    if (preferences.favoriteColors.some((c) => item.color.toLowerCase().includes(c.toLowerCase()))) {
      score += 2;
    }

    return score;
  };

  // Helper to select best distinct items from a category
  const selectCategoryItems = (
    category: Category,
    targetCount: number,
    reasonGenerator: (item: WardrobeItem, index: number) => string
  ): PackingListItem[] => {
    const candidates = wardrobe.filter((i) => i.category === category);
    candidates.sort((a, b) => scoreItemForTrip(b) - scoreItemForTrip(a));

    const selected = candidates.slice(0, targetCount);

    return selected.map((item, idx) => ({
      id: `pack-${category}-${item.id}-${idx}`,
      category,
      subcategory: item.subcategory,
      wardrobeItemId: item.id,
      item,
      recommendedQuantity: 1,
      isPacked: false,
      reason: reasonGenerator(item, idx),
    }));
  };

  // 1. Tops
  const packedTops = selectCategoryItems('tops', targetTops, (item, idx) => {
    if (idx === 0) return `Primary shirt for arrival and opening sessions; ${item.material} breathes comfortably.`;
    if (idx === 1) return `Versatile ${item.name} pairs with both tailored trousers and casual chinos.`;
    if (idx === targetTops - 1) return `Fresh spare top for evening dinner or unexpected travel delays.`;
    return `Smart ${item.subcategory} tailored for day ${idx + 1} agenda.`;
  });

  // 2. Bottoms
  const packedBottoms = selectCategoryItems('bottoms', targetBottoms, (item, idx) => {
    if (idx === 0) return `Primary tailored ${item.subcategory} for core meetings and keynote presentations.`;
    return `Alternative versatile ${item.name} for evening dinner or relaxed travel day.`;
  });

  // 3. Outerwear
  const packedOuterwear = selectCategoryItems('outerwear', targetOuterwear, (item, idx) => {
    if (isRainLikely && (item.weatherTags.includes('rain_friendly') || item.weatherTags.includes('all_weather'))) {
      return `Water-resistant protection against ${weather.precipitationProbability}% forecast rain in ${weather.city}.`;
    }
    if (isCold) {
      return `Warmth layer for ${weather.averageTempC}°C temperatures; fine insulation without bulk.`;
    }
    return `Polished outer layer that elevates silhouette across both casual and formal settings.`;
  });

  // 4. Footwear
  const packedFootwear = selectCategoryItems('footwear', targetFootwear, (item, idx) => {
    if (idx === 0) return `Primary dress footwear; polished and compliant with ${trip.formality.replace('_', ' ')}.`;
    return `Comfortable secondary pair for transit, airport walks, and off-duty downtime.`;
  });

  // 5. Curated Accessories & Travel Essentials
  const essentialItems: PackingListItem[] = [];

  // Umbrella check
  if (isRainLikely) {
    const umbrellaItem = wardrobe.find((w) => w.category === 'accessories' && w.subcategory.toLowerCase().includes('umbrella'));
    if (umbrellaItem) {
      essentialItems.push({
        id: `pack-umbrella-${umbrellaItem.id}`,
        category: 'accessories',
        subcategory: umbrellaItem.subcategory,
        wardrobeItemId: umbrellaItem.id,
        item: umbrellaItem,
        recommendedQuantity: 1,
        isPacked: false,
        reason: `High precipitation probability (${weather.precipitationProbability}%) forecast in ${weather.city}.`,
        isEssential: true,
      });
    } else {
      essentialItems.push({
        id: 'pack-essential-umbrella',
        category: 'travel_essentials',
        subcategory: 'Rain Protection',
        customName: 'Compact Travel Umbrella (Telescopic)',
        recommendedQuantity: 1,
        isPacked: false,
        reason: `60%+ rain forecast; indispensable for pedestrian transit in ${weather.city}.`,
        isEssential: true,
      });
    }
  }

  // Scarf / Warm accessories if cold
  if (isCold) {
    const scarfItem = wardrobe.find((w) => w.category === 'accessories' && w.subcategory.toLowerCase().includes('scarf'));
    if (scarfItem) {
      essentialItems.push({
        id: `pack-scarf-${scarfItem.id}`,
        category: 'accessories',
        subcategory: scarfItem.subcategory,
        wardrobeItemId: scarfItem.id,
        item: scarfItem,
        recommendedQuantity: 1,
        isPacked: false,
        reason: `Thermal neck warmth for brisk ${weather.averageTempC}°C breezes.`,
      });
    }
  }

  // Undergarments & Socks (Days + 1)
  essentialItems.push({
    id: 'pack-essentials-undergarments',
    category: 'travel_essentials',
    subcategory: 'Basics',
    customName: `Underwear & Merino Wool Socks Set (${days + 1} Pairs)`,
    recommendedQuantity: days + 1,
    isPacked: false,
    reason: `Sufficient daily rotation with moisture-wicking merino cushioning for travel comfort.`,
    isEssential: true,
  });

  // Toiletries & Dopp Kit
  essentialItems.push({
    id: 'pack-essentials-dopp',
    category: 'travel_essentials',
    subcategory: 'Grooming',
    customName: 'Executive Leather Dopp Kit & Travel Toiletries (<100ml)',
    recommendedQuantity: 1,
    isPacked: false,
    reason: 'Compliant with airport security liquid guidelines; includes grooming essentials.',
    isEssential: true,
  });

  // Tech & Chargers
  essentialItems.push({
    id: 'pack-essentials-tech',
    category: 'travel_essentials',
    subcategory: 'Electronics',
    customName: 'Travel Tech Pouch (Laptop Charger, Power Bank & International Adapter)',
    recommendedQuantity: 1,
    isPacked: false,
    reason: 'Power readiness for meetings, train/flight transit, and hotel workstations.',
    isEssential: true,
  });

  // Documents
  essentialItems.push({
    id: 'pack-essentials-docs',
    category: 'travel_essentials',
    subcategory: 'Documents',
    customName: 'Travel Wallet (Passport/ID, Hotel Confirmation & Boarding Passes)',
    recommendedQuantity: 1,
    isPacked: false,
    reason: 'Secure access to identification, reservations, and corporate expense receipts.',
    isEssential: true,
  });

  const allItems = [...packedTops, ...packedBottoms, ...packedOuterwear, ...packedFootwear, ...essentialItems];

  const luggage = getLuggageRecommendation(days);

  const conciergeNotes = [
    `Curated capsule wardrobe of ${allItems.length} pieces optimized for ${days} days in ${weather.city}.`,
    `Harmonized around your preferred palette (${preferences.favoriteColors.join(', ')}) so every top pairs effortlessly with every trouser.`,
    weather.packingAdvisory,
    luggage.packingTip,
  ];

  const nowIso = new Date().toISOString();

  return {
    tripId: trip.id,
    trip,
    destinationWeather: weather,
    items: allItems,
    luggage,
    conciergeNotes,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/**
 * Calculates progress statistics for a packing checklist.
 */
export function calculatePackingProgress(items: PackingListItem[]): {
  total: number;
  packed: number;
  unpacked: number;
  percentage: number;
  isComplete: boolean;
} {
  const total = items.length;
  if (total === 0) {
    return { total: 0, packed: 0, unpacked: 0, percentage: 100, isComplete: true };
  }
  const packed = items.filter((i) => i.isPacked).length;
  const unpacked = total - packed;
  const percentage = Math.round((packed / total) * 100);
  const isComplete = packed === total;

  return { total, packed, unpacked, percentage, isComplete };
}

/**
 * Formats a packing list as a cleanly structured Markdown text string for copying or printing.
 */
export function formatPackingListAsText(list: PackingList): string {
  const { trip, destinationWeather: weather, items, luggage } = list;
  const { days, nights } = calculateTripDuration(trip.startDate, trip.endDate);

  const categoryLabels: Record<string, string> = {
    tops: 'Tops & Shirts',
    bottoms: 'Trousers & Bottoms',
    outerwear: 'Outerwear & Jackets',
    footwear: 'Footwear',
    accessories: 'Accessories',
    travel_essentials: 'Travel Essentials & Gear',
  };

  const lines: string[] = [
    `# SARTORIAL TRIP PACKING LIST`,
    `Destination: ${trip.city} (${trip.destination})`,
    `Itinerary: ${trip.title}`,
    `Duration: ${days} Days / ${nights} Nights (${new Date(trip.startDate).toLocaleDateString()} – ${new Date(trip.endDate).toLocaleDateString()})`,
    `Forecast: ${weather.summary} (Precipitation: ${weather.precipitationProbability}%)`,
    `Formality: ${trip.formality.replace('_', ' ').toUpperCase()}`,
    `Recommended Luggage: ${luggage.bagType} (${luggage.capacity})`,
    ``,
    `--- CHECKLIST ---`,
  ];

  const categories: (Category | 'travel_essentials')[] = [
    'tops',
    'bottoms',
    'outerwear',
    'footwear',
    'accessories',
    'travel_essentials',
  ];

  for (const cat of categories) {
    const catItems = items.filter((i) => i.category === cat);
    if (catItems.length === 0) continue;

    lines.push(``);
    lines.push(`## ${categoryLabels[cat] || cat}`);

    for (const item of catItems) {
      const checkbox = item.isPacked ? '[x]' : '[ ]';
      const name = item.item ? `${item.item.name} (${item.item.color}, ${item.item.material})` : item.customName;
      lines.push(`${checkbox} ${name} — ${item.reason}`);
    }
  }

  lines.push(``);
  lines.push(`--- SARTORIAL CONCIERGE NOTES ---`);
  for (const note of list.conciergeNotes) {
    lines.push(`• ${note}`);
  }

  return lines.join('\n');
}
