import { WardrobeItem, Meeting, WeatherCondition, UserPreferences, WardrobeGap, ShopperAnalysisSummary } from '../types';

/**
 * Analyzes the user's wardrobe against upcoming calendar meetings, current/forecast weather,
 * and user preferences to discover concrete wardrobe gaps.
 */
export function analyzeWardrobeGaps(
  wardrobe: WardrobeItem[],
  meetings: Meeting[],
  weather?: WeatherCondition | null,
  preferences?: UserPreferences | null
): ShopperAnalysisSummary {
  const gaps: WardrobeGap[] = [];

  // 1. Formality coverage against upcoming meetings
  const meetingFormalities = new Set(meetings.map(m => m.formality));
  const hasFormalOrBusinessMeeting = meetingFormalities.has('business_formal') || meetingFormalities.has('formal');
  const hasSmartCasualMeeting = meetingFormalities.has('smart_casual') || meetingFormalities.has('business_casual');

  // Check formal footwear
  const formalFootwear = wardrobe.filter(
    item => item.category === 'footwear' && (item.formality === 'business_formal' || item.formality === 'formal')
  );
  if (hasFormalOrBusinessMeeting && formalFootwear.length === 0) {
    const formalMeetings = meetings.filter(m => m.formality === 'business_formal' || m.formality === 'formal');
    gaps.push({
      id: 'gap-formal-shoes',
      type: 'formality_coverage',
      title: 'Formal Dress Shoes Missing',
      description: `You have ${formalMeetings.length} executive or formal meeting(s) scheduled (${formalMeetings.map(m => m.title).slice(0, 2).join(', ')}), but no Oxford or Derby dress shoes.`,
      severity: 'high',
      suggestedCategory: 'footwear',
      suggestedSubcategory: 'oxfords',
      targetFormality: 'business_formal',
      meetingContext: formalMeetings[0]?.title,
    });
  }

  // Check formal outerwear (e.g. overcoat or tailored coat)
  const formalOuterwear = wardrobe.filter(
    item => item.category === 'outerwear' && (item.formality === 'business_formal' || item.formality === 'formal' || item.formality === 'business_casual')
  );
  if (hasFormalOrBusinessMeeting && formalOuterwear.length === 0) {
    gaps.push({
      id: 'gap-formal-outerwear',
      type: 'formality_coverage',
      title: 'Tailored Overcoat or Blazer Missing',
      description: 'Your upcoming boardroom commitments require structured outerwear like a camel wool overcoat or sharp tailored blazer.',
      severity: 'high',
      suggestedCategory: 'outerwear',
      suggestedSubcategory: 'overcoat',
      targetFormality: 'business_formal',
    });
  }

  // 2. Weather & Commute Protection
  const rainThreshold = preferences?.rainToleranceThreshold ?? 30;
  const isRainRisk = weather
    ? weather.precipitationProbability >= rainThreshold ||
      weather.condition === 'rain' ||
      weather.condition === 'heavy_rain' ||
      weather.condition === 'drizzle'
    : false;

  const rainOuterwear = wardrobe.filter(
    item => item.category === 'outerwear' && item.weatherTags.includes('rain_friendly')
  );
  if (isRainRisk && rainOuterwear.length === 0) {
    gaps.push({
      id: 'gap-rain-outerwear',
      type: 'weather_protection',
      title: 'Weatherproof Rain Trench / Mac Missing',
      description: `London forecast shows ${weather?.precipitationProbability}% rain chance. You currently lack a rain-resistant overcoat or trench to protect your tailoring.`,
      severity: 'high',
      suggestedCategory: 'outerwear',
      suggestedSubcategory: 'trench coat',
      targetFormality: 'smart_casual',
    });
  }

  const rainFootwear = wardrobe.filter(
    item => item.category === 'footwear' && item.weatherTags.includes('rain_friendly')
  );
  if (isRainRisk && rainFootwear.length === 0) {
    gaps.push({
      id: 'gap-rain-footwear',
      type: 'weather_protection',
      title: 'Waterproof Commute Boots / Shoes Missing',
      description: 'London wet pavement requires treated leather Chelsea boots or waterproof soled commute footwear.',
      severity: 'medium',
      suggestedCategory: 'footwear',
      suggestedSubcategory: 'chelsea boots',
      targetFormality: 'smart_casual',
    });
  }

  // Cold weather check (< 12°C)
  const isCold = weather ? weather.temperatureC < 12 : false;
  const warmKnitwearOrCoats = wardrobe.filter(item => item.warmth >= 4);
  if (isCold && warmKnitwearOrCoats.length < 2) {
    gaps.push({
      id: 'gap-cold-insulation',
      type: 'weather_protection',
      title: 'Heavyweight Merino / Cashmere Layer Missing',
      description: `Current temperature is ${weather?.temperatureC ?? 9}°C. A thermal fine-gauge cashmere sweater or heavy wool coat would improve warmth comfort.`,
      severity: 'medium',
      suggestedCategory: 'tops',
      suggestedSubcategory: 'cashmere crewneck',
      targetFormality: 'business_casual',
    });
  }

  // 3. Commute Comfort Check
  if (preferences?.commuteComfortPriority) {
    const comfortableFootwear = wardrobe.filter(
      item => item.category === 'footwear' && (item.weatherTags.includes('breathable') || item.subcategory.toLowerCase().includes('sneaker') || item.subcategory.toLowerCase().includes('loafer'))
    );
    if (comfortableFootwear.length === 0) {
      gaps.push({
        id: 'gap-commute-shoes',
        type: 'commute_comfort',
        title: 'Cushioned Commuter Footwear Missing',
        description: 'You prioritized transit walking comfort, but lack ergonomic minimalist leather sneakers or flexible cushioned loafers.',
        severity: 'medium',
        suggestedCategory: 'footwear',
        suggestedSubcategory: 'minimalist leather sneakers',
        targetFormality: 'smart_casual',
      });
    }
  }

  // 4. Basic Category Scarcity
  const bottomsCount = wardrobe.filter(i => i.category === 'bottoms').length;
  if (bottomsCount < 3) {
    gaps.push({
      id: 'gap-bottoms-scarcity',
      type: 'category_scarcity',
      title: 'Versatile Trousers Variety Needed',
      description: `You only have ${bottomsCount} pair(s) of trousers in your wardrobe. Adding tailored wool flannel trousers or slim dark chinos will multiply outfit combinations.`,
      severity: 'low',
      suggestedCategory: 'bottoms',
      suggestedSubcategory: 'tailored trousers',
      targetFormality: 'business_casual',
    });
  }

  // Calculate readiness score
  let score = 100;
  for (const gap of gaps) {
    if (gap.severity === 'high') score -= 18;
    else if (gap.severity === 'medium') score -= 10;
    else score -= 5;
  }
  const overallReadinessScore = Math.max(25, Math.min(100, score));

  // Determine top priority
  let topPriority = 'Your wardrobe covers all upcoming meetings comfortably.';
  if (gaps.length > 0) {
    const highSev = gaps.find(g => g.severity === 'high');
    if (highSev) {
      topPriority = highSev.title;
    } else {
      topPriority = gaps[0].title;
    }
  }

  // Generate analysis summary
  const totalMeetings = meetings.length;
  let analysisSummary = `Analyzed ${wardrobe.length} wardrobe pieces across ${totalMeetings} scheduled meeting(s).`;
  if (gaps.length === 0) {
    analysisSummary += ' Excellent coverage across all weather conditions and formality tiers.';
  } else {
    analysisSummary += ` Detected ${gaps.length} strategic gap(s) to optimize your sartorial readiness.`;
  }

  return {
    gaps,
    overallReadinessScore,
    topPriority,
    analysisSummary,
  };
}
