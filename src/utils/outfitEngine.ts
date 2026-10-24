import { WardrobeItem, WeatherCondition, Formality, UserPreferences, OutfitSuggestion, Meeting } from '../types';

export const FORMALITY_LEVELS: Record<Formality, number> = {
  casual: 1,
  smart_casual: 2,
  business_casual: 3,
  business_formal: 4,
  formal: 5,
};

/**
 * Calculates ideal item warmth rating (1-5) based on temperature and user tendency
 */
export function getTargetWarmth(tempC: number, warmthLean: UserPreferences['warmthLean'] = 'balanced'): number {
  let target = 3;
  if (tempC < 5) target = 5;
  else if (tempC < 12) target = 4;
  else if (tempC < 19) target = 3;
  else if (tempC < 25) target = 2;
  else target = 1;

  if (warmthLean === 'runs_hot') {
    target = Math.max(1, target - 1);
  } else if (warmthLean === 'runs_cold') {
    target = Math.min(5, target + 1);
  }
  return target;
}

/**
 * Scores an individual wardrobe item based on weather and target formality
 */
export function scoreItem(
  item: WardrobeItem,
  weather: WeatherCondition,
  targetFormality: Formality,
  preferences: UserPreferences
): number {
  let score = 50;

  // Formality scoring
  const targetLevel = FORMALITY_LEVELS[targetFormality] + preferences.formalityLean;
  const itemLevel = FORMALITY_LEVELS[item.formality];
  const formalityDiff = Math.abs(targetLevel - itemLevel);
  if (formalityDiff === 0) score += 30;
  else if (formalityDiff === 1) score += 15;
  else score -= formalityDiff * 15;

  // Weather warmth scoring
  const targetWarmth = getTargetWarmth(weather.temperatureC, preferences.warmthLean);
  const warmthDiff = Math.abs(item.warmth - targetWarmth);
  score += Math.max(0, 20 - warmthDiff * 8);

  // Rain friendliness
  const isRaining = weather.precipitationProbability >= preferences.rainToleranceThreshold;
  if (isRaining) {
    if (item.weatherTags.includes('rain_friendly')) {
      score += 25;
    }
  }

  // Commute comfort (prioritize comfortable sneakers / flat boots / commute-friendly shoes)
  if (preferences.commuteComfortPriority && item.category === 'footwear') {
    const isComfortable = item.subcategory.toLowerCase().includes('sneaker') ||
      item.subcategory.toLowerCase().includes('flat') ||
      item.subcategory.toLowerCase().includes('boot') ||
      item.subcategory.toLowerCase().includes('loaf');
    if (isComfortable) score += 20;
  }

  // Favorite color & material
  if (preferences.favoriteColors.includes(item.color.toLowerCase())) {
    score += 15;
  }
  if (preferences.dislikedMaterials.some(m => item.material.toLowerCase().includes(m.toLowerCase()))) {
    score -= 30;
  }

  if (item.isFavorite) {
    score += 10;
  }

  return score;
}

/**
 * Generates 3 recommended outfits for a meeting, event, and weather
 */
export function generateOutfitSuggestions(
  wardrobe: WardrobeItem[],
  weather: WeatherCondition,
  meetingFormality: Formality,
  preferences: UserPreferences,
  meetingContext?: Meeting | string
): OutfitSuggestion[] {
  if (!wardrobe || wardrobe.length === 0) return [];

  const contextStr = typeof meetingContext === 'string'
    ? meetingContext.toLowerCase()
    : `${meetingContext?.title || ''} ${meetingContext?.description || ''} ${meetingContext?.location || ''} ${meetingContext?.activityType || ''}`.toLowerCase();

  const isGymEvent =
    (typeof meetingContext === 'object' && meetingContext?.activityType === 'gym') ||
    contextStr.includes('gym') ||
    contextStr.includes('workout') ||
    contextStr.includes('strength') ||
    contextStr.includes('conditioning') ||
    contextStr.includes('fitness') ||
    contextStr.includes('third space') ||
    contextStr.includes('equinox');

  const isGolfEvent =
    (typeof meetingContext === 'object' && meetingContext?.activityType === 'golf') ||
    contextStr.includes('golf') ||
    contextStr.includes('18-hole') ||
    contextStr.includes('wisley') ||
    contextStr.includes('clubhouse') ||
    contextStr.includes('fairway');

  const isCelebrationEvent =
    (typeof meetingContext === 'object' && meetingContext?.activityType === 'celebration') ||
    contextStr.includes('birthday') ||
    contextStr.includes('annabel') ||
    contextStr.includes('gala') ||
    contextStr.includes('40th');

  // --- 1. SPECIAL EVENT: GYM SESSION ---
  if (isGymEvent) {
    const trainingTee = wardrobe.find(i => i.id === 'w-act-1') || wardrobe.find(i => i.category === 'activewear' && i.subcategory.includes('Top')) || wardrobe.find(i => i.category === 'tops' && i.formality === 'casual');
    const trainingShorts = wardrobe.find(i => i.id === 'w-act-2') || wardrobe.find(i => i.category === 'activewear' && i.subcategory.includes('Shorts')) || wardrobe.find(i => i.category === 'bottoms' && i.formality === 'casual');
    const gymJoggers = wardrobe.find(i => i.id === 'w-act-4') || wardrobe.find(i => i.category === 'bottoms');
    const trainingSneakers = wardrobe.find(i => i.id === 'w-act-3') || wardrobe.find(i => i.subcategory.toLowerCase().includes('sneaker'));
    const gymDuffel = wardrobe.find(i => i.id === 'w-eq-1') || wardrobe.find(i => i.category === 'equipment');
    const smartBottle = wardrobe.find(i => i.id === 'w-eq-4') || wardrobe.find(i => i.category === 'equipment' && i.id !== 'w-eq-1');
    const bomber = wardrobe.find(i => i.id === 'w-out-4') || wardrobe.find(i => i.category === 'outerwear' && i.formality === 'casual');

    const gymLook1: WardrobeItem[] = [];
    if (trainingTee) gymLook1.push(trainingTee);
    if (trainingShorts) gymLook1.push(trainingShorts);
    if (trainingSneakers) gymLook1.push(trainingSneakers);
    if (gymDuffel) gymLook1.push(gymDuffel);
    if (smartBottle) gymLook1.push(smartBottle);

    const gymLook2: WardrobeItem[] = [];
    if (trainingTee) gymLook2.push(trainingTee);
    if (gymJoggers) gymLook2.push(gymJoggers);
    if (trainingSneakers) gymLook2.push(trainingSneakers);
    if (smartBottle) gymLook2.push(smartBottle);

    const gymLook3: WardrobeItem[] = [];
    if (bomber) gymLook3.push(bomber);
    if (trainingTee) gymLook3.push(trainingTee);
    if (gymJoggers) gymLook3.push(gymJoggers);
    if (trainingSneakers) gymLook3.push(trainingSneakers);
    if (gymDuffel) gymLook3.push(gymDuffel);

    return [
      {
        id: 'outfit-gym-pro',
        title: 'Elite Performance & Conditioning',
        subtitle: 'Moisture-wicking activewear and functional training gear',
        items: gymLook1,
        score: 98,
        weatherFitScore: 98,
        formalityFitScore: 100,
        preferenceMatchScore: 96,
        reasoning: 'Engineered specifically for your functional strength workout with four-way stretch shorts, silver antimicrobial tee, and ballistic nylon gym duffel.',
      },
      {
        id: 'outfit-gym-warmup',
        title: 'Tapered Mobility & Warm-Up',
        subtitle: 'Thermal comfort joggers and quick-drying athletic essentials',
        items: gymLook2,
        score: 93,
        weatherFitScore: 94,
        formalityFitScore: 95,
        preferenceMatchScore: 92,
        reasoning: 'Ideal for warmup drills, mobility stretching, and temperature control in the gym.',
      },
      {
        id: 'outfit-gym-transit',
        title: 'Athletic Commute & Recovery Layer',
        subtitle: 'Windproof shell and structured duffel for effortless transit',
        items: gymLook3,
        score: 90,
        weatherFitScore: 92,
        formalityFitScore: 90,
        preferenceMatchScore: 91,
        reasoning: 'Provides wind-resistant coverage traveling between home and Third Space Mayfair, with ample space for grooming essentials.',
      },
    ];
  }

  // --- 2. SPECIAL EVENT: GOLF WITH CLIENTS ---
  if (isGolfEvent) {
    const golfPolo = wardrobe.find(i => i.id === 'w-golf-1') || wardrobe.find(i => i.name.toLowerCase().includes('polo'));
    const golfChinos = wardrobe.find(i => i.id === 'w-golf-2') || wardrobe.find(i => i.name.toLowerCase().includes('chino'));
    const golfShoes = wardrobe.find(i => i.id === 'w-golf-4') || wardrobe.find(i => i.category === 'footwear');
    const golfQuarterZip = wardrobe.find(i => i.id === 'w-golf-3') || wardrobe.find(i => i.category === 'outerwear');
    const golfGlove = wardrobe.find(i => i.id === 'w-eq-2') || wardrobe.find(i => i.category === 'equipment');
    const golfBag = wardrobe.find(i => i.id === 'w-eq-3') || wardrobe.find(i => i.category === 'equipment');
    const umbrella = wardrobe.find(i => i.id === 'w-acc-1') || wardrobe.find(i => i.name.toLowerCase().includes('umbrella'));
    const blazer = wardrobe.find(i => i.id === 'w-out-2');
    const loafers = wardrobe.find(i => i.id === 'w-foot-4');

    const golfLook1: WardrobeItem[] = [];
    if (golfPolo) golfLook1.push(golfPolo);
    if (golfChinos) golfLook1.push(golfChinos);
    if (golfShoes) golfLook1.push(golfShoes);
    if (golfQuarterZip) golfLook1.push(golfQuarterZip);
    if (golfGlove) golfLook1.push(golfGlove);
    if (golfBag) golfLook1.push(golfBag);

    const golfLook2: WardrobeItem[] = [];
    if (golfPolo) golfLook2.push(golfPolo);
    if (golfChinos) golfLook2.push(golfChinos);
    if (golfShoes) golfLook2.push(golfShoes);
    if (umbrella) golfLook2.push(umbrella);
    if (golfGlove) golfLook2.push(golfGlove);

    const golfLook3: WardrobeItem[] = [];
    if (blazer) golfLook3.push(blazer);
    if (golfPolo) golfLook3.push(golfPolo);
    if (golfChinos) golfLook3.push(golfChinos);
    if (loafers) golfLook3.push(loafers);

    return [
      {
        id: 'outfit-golf-championship',
        title: 'The Championship Round & Clubhouse',
        subtitle: 'Tour-ready technical fabrics conforming to club dress standards',
        items: golfLook1,
        score: 97,
        weatherFitScore: 96,
        formalityFitScore: 98,
        preferenceMatchScore: 95,
        reasoning: 'Curated for 18 holes at The Wisley. Features water-repellent stretch golf chinos, spikeless traction leather shoes, and tour cabretta equipment.',
      },
      {
        id: 'outfit-golf-fairway',
        title: 'Breezy Fairway Performance',
        subtitle: 'Breathable pique knit with rainproof course umbrella',
        items: golfLook2,
        score: 92,
        weatherFitScore: 94,
        formalityFitScore: 95,
        preferenceMatchScore: 90,
        reasoning: 'Clean, athletic aesthetic with windproof umbrella and tour glove for variable weather.',
      },
      {
        id: 'outfit-golf-clubhouse',
        title: 'Clubhouse Luncheon & Terrace',
        subtitle: 'Transition look pairing tailored hopsack blazer with golf trousers',
        items: golfLook3,
        score: 91,
        weatherFitScore: 90,
        formalityFitScore: 96,
        preferenceMatchScore: 92,
        reasoning: 'Effortless transition from the 18th green to the private members dining terrace with clients.',
      },
    ];
  }

  // --- 3. SPECIAL EVENT: 40TH BIRTHDAY PARTY IN HIGH-END VENUE ---
  if (isCelebrationEvent) {
    const velvetJacket = wardrobe.find(i => i.id === 'w-party-1') || wardrobe.find(i => i.name.toLowerCase().includes('blazer'));
    const tuxedoShirt = wardrobe.find(i => i.id === 'w-party-2') || wardrobe.find(i => i.name.toLowerCase().includes('shirt'));
    const tuxedoTrousers = wardrobe.find(i => i.id === 'w-party-3') || wardrobe.find(i => i.name.toLowerCase().includes('trouser'));
    const velvetSlippers = wardrobe.find(i => i.id === 'w-party-4') || wardrobe.find(i => i.id === 'w-foot-2');
    const silkSet = wardrobe.find(i => i.id === 'w-party-5') || wardrobe.find(i => i.category === 'accessories');
    const navySuit = wardrobe.find(i => i.id === 'w-one-1');
    const oxfords = wardrobe.find(i => i.id === 'w-foot-2');
    const rollneck = wardrobe.find(i => i.id === 'w-top-5');

    const partyLook1: WardrobeItem[] = [];
    if (velvetJacket) partyLook1.push(velvetJacket);
    if (tuxedoShirt) partyLook1.push(tuxedoShirt);
    if (tuxedoTrousers) partyLook1.push(tuxedoTrousers);
    if (velvetSlippers) partyLook1.push(velvetSlippers);
    if (silkSet) partyLook1.push(silkSet);

    const partyLook2: WardrobeItem[] = [];
    if (velvetJacket) partyLook2.push(velvetJacket);
    if (rollneck) partyLook2.push(rollneck);
    if (tuxedoTrousers) partyLook2.push(tuxedoTrousers);
    if (oxfords) partyLook2.push(oxfords);
    if (silkSet) partyLook2.push(silkSet);

    const partyLook3: WardrobeItem[] = [];
    if (navySuit) partyLook3.push(navySuit);
    if (tuxedoShirt) partyLook3.push(tuxedoShirt);
    if (velvetSlippers) partyLook3.push(velvetSlippers);
    if (silkSet) partyLook3.push(silkSet);

    return [
      {
        id: 'outfit-party-velvet',
        title: "Annabel's Black-Tie & Velvet Evening Gala",
        subtitle: "Tactile Italian velvet dinner jacket with silk evening slippers",
        items: partyLook1,
        score: 99,
        weatherFitScore: 97,
        formalityFitScore: 100,
        preferenceMatchScore: 98,
        reasoning: "A definitive evening statement for Julian's 40th celebration in Mayfair. Combines midnight blue cotton velvet with classic grosgrain silk accents and Albert slippers.",
      },
      {
        id: 'outfit-party-modern',
        title: 'Sleek Mayfair Cocktail Sophistication',
        subtitle: 'Pure cashmere rollneck under evening velvet with oxfords',
        items: partyLook2,
        score: 94,
        weatherFitScore: 95,
        formalityFitScore: 95,
        preferenceMatchScore: 94,
        reasoning: 'Modern European black-tie interpretation offering warmth, texture, and refined elegance.',
      },
      {
        id: 'outfit-party-tailored',
        title: 'Midnight Wool Savile Row Silhouette',
        subtitle: 'Super 120s two-piece suit with Marcella evening studs',
        items: partyLook3,
        score: 92,
        weatherFitScore: 94,
        formalityFitScore: 96,
        preferenceMatchScore: 91,
        reasoning: 'Classic British sartorial excellence with luxurious evening footwear.',
      },
    ];
  }

  // --- 4. STANDARD MEETINGS ---
  const tops = wardrobe.filter(i => i.category === 'tops' || i.category === 'activewear');
  const bottoms = wardrobe.filter(i => i.category === 'bottoms' || i.category === 'activewear');
  const footwear = wardrobe.filter(i => i.category === 'footwear');
  const outerwear = wardrobe.filter(i => i.category === 'outerwear');
  const accessories = wardrobe.filter(i => i.category === 'accessories' || i.category === 'equipment');
  const onePieces = wardrobe.filter(i => i.category === 'one_piece');

  const needsOuterwear = weather.temperatureC < 18 || weather.precipitationProbability >= preferences.rainToleranceThreshold;
  const needsUmbrella = weather.precipitationProbability >= preferences.rainToleranceThreshold;

  // Rank individual items
  const rank = (items: WardrobeItem[]) =>
    [...items].sort((a, b) => scoreItem(b, weather, meetingFormality, preferences) - scoreItem(a, weather, meetingFormality, preferences));

  const rankedTops = rank(tops);
  const rankedBottoms = rank(bottoms);
  const rankedFootwear = rank(footwear);
  const rankedOuterwear = rank(outerwear);
  const rankedAccessories = rank(accessories);
  const rankedOnePieces = rank(onePieces);

  const suggestions: OutfitSuggestion[] = [];

  // Suggestion 1: The Polished Pick (Highest match score)
  const pick1Items: WardrobeItem[] = [];
  if (rankedTops[0]) pick1Items.push(rankedTops[0]);
  if (rankedBottoms[0]) pick1Items.push(rankedBottoms[0]);
  if (rankedFootwear[0]) pick1Items.push(rankedFootwear[0]);
  if (needsOuterwear && rankedOuterwear[0]) pick1Items.push(rankedOuterwear[0]);

  if (needsUmbrella) {
    const umbrella = accessories.find(a => a.name.toLowerCase().includes('umbrella') || a.subcategory.toLowerCase().includes('umbrella'));
    if (umbrella && !pick1Items.includes(umbrella)) pick1Items.push(umbrella);
  } else if (rankedAccessories[0]) {
    pick1Items.push(rankedAccessories[0]);
  }

  if (pick1Items.length > 0) {
    suggestions.push({
      id: 'outfit-polished',
      title: 'The Polished Pick',
      subtitle: `Balanced for ${meetingFormality.replace('_', ' ')} & ${Math.round(weather.temperatureC)}°C`,
      items: pick1Items,
      score: 95,
      weatherFitScore: 98,
      formalityFitScore: 96,
      preferenceMatchScore: 92,
      reasoning: `Tailored precisely for your ${meetingFormality.replace('_', ' ')} setting. ${needsOuterwear ? 'Includes weather-appropriate layering for the commute.' : 'Lightweight and crisp.'}${needsUmbrella ? ' Umbrella included due to rain forecast.' : ''}`,
    });
  }

  // Suggestion 2: Modern & Comfort-First (Or one-piece if available)
  const pick2Items: WardrobeItem[] = [];
  if (rankedOnePieces.length > 0 && Math.random() > 0.4) {
    pick2Items.push(rankedOnePieces[0]);
  } else {
    // Pick second best or alternative top/bottom with comfortable vibe
    const altTop = rankedTops.length > 1 ? rankedTops[1] : rankedTops[0];
    const altBottom = rankedBottoms.length > 1 ? rankedBottoms[1] : rankedBottoms[0];
    if (altTop) pick2Items.push(altTop);
    if (altBottom) pick2Items.push(altBottom);
  }

  // Prefer comfortable footwear
  const comfortShoe = rankedFootwear.find(f =>
    f.subcategory.toLowerCase().includes('sneaker') ||
    f.subcategory.toLowerCase().includes('loaf') ||
    f.subcategory.toLowerCase().includes('flat')
  ) || (rankedFootwear.length > 1 ? rankedFootwear[1] : rankedFootwear[0]);

  if (comfortShoe && !pick2Items.includes(comfortShoe)) pick2Items.push(comfortShoe);

  // Outerwear variation
  const altOuter = rankedOuterwear.length > 1 ? rankedOuterwear[1] : rankedOuterwear[0];
  if (needsOuterwear && altOuter && !pick2Items.includes(altOuter)) pick2Items.push(altOuter);

  if (needsUmbrella) {
    const umbrella = accessories.find(a => a.name.toLowerCase().includes('umbrella'));
    if (umbrella && !pick2Items.includes(umbrella)) pick2Items.push(umbrella);
  }

  if (pick2Items.length > 0) {
    suggestions.push({
      id: 'outfit-comfort',
      title: 'Modern & Commute-Adaptive',
      subtitle: 'Effortless layers with high mobility for transit',
      items: pick2Items,
      score: 90,
      weatherFitScore: 92,
      formalityFitScore: 88,
      preferenceMatchScore: 94,
      reasoning: `Optimized for active travel with comfortable footwear and versatile layering that transitions seamlessly from tube/train into the meeting room.`,
    });
  }

  // Suggestion 3: Elevated Statement (Bolder contrast or favorite items)
  const pick3Items: WardrobeItem[] = [];
  const favoriteItems = wardrobe.filter(i => i.isFavorite);
  const favTop = favoriteItems.find(i => i.category === 'tops') || (rankedTops.length > 2 ? rankedTops[2] : rankedTops[0]);
  const favBottom = favoriteItems.find(i => i.category === 'bottoms') || (rankedBottoms.length > 2 ? rankedBottoms[2] : rankedBottoms[0]);

  if (favTop) pick3Items.push(favTop);
  if (favBottom && !pick3Items.includes(favBottom)) pick3Items.push(favBottom);

  const smartShoe = rankedFootwear.find(f =>
    f.formality === 'business_formal' || f.formality === 'formal' || f.subcategory.includes('oxford') || f.subcategory.includes('heel')
  ) || rankedFootwear[0];
  if (smartShoe && !pick3Items.includes(smartShoe)) pick3Items.push(smartShoe);

  const statementOuter = rankedOuterwear.find(o => o.warmth >= 3) || rankedOuterwear[0];
  if (needsOuterwear && statementOuter && !pick3Items.includes(statementOuter)) pick3Items.push(statementOuter);

  const acc = accessories.find(a => a.category === 'accessories' && !a.name.toLowerCase().includes('umbrella')) || rankedAccessories[0];
  if (acc && !pick3Items.includes(acc)) pick3Items.push(acc);
  if (needsUmbrella) {
    const umbrella = accessories.find(a => a.name.toLowerCase().includes('umbrella'));
    if (umbrella && !pick3Items.includes(umbrella)) pick3Items.push(umbrella);
  }

  if (pick3Items.length > 0) {
    suggestions.push({
      id: 'outfit-statement',
      title: 'Sharp & Elevated',
      subtitle: 'Standout silhouette with premium materials',
      items: pick3Items,
      score: 88,
      weatherFitScore: 89,
      formalityFitScore: 95,
      preferenceMatchScore: 90,
      reasoning: `A refined ensemble engineered to project authority and style while remaining thermally calibrated for today's forecast.`,
    });
  }

  return suggestions;
}

/**
 * Updates user preferences based on user training actions
 */
export function trainPreferences(
  current: UserPreferences,
  feedback: {
    type: 'thumbs_up' | 'too_formal' | 'too_casual' | 'too_cold' | 'too_warm' | 'love_comfort' | 'prefer_formal';
    itemColor?: string;
  }
): UserPreferences {
  const updated = {
    ...current,
    feedbackCount: current.feedbackCount + 1,
    weights: { ...current.weights },
  };

  switch (feedback.type) {
    case 'thumbs_up':
      updated.weights.favoriteWeight = Math.min(2.0, updated.weights.favoriteWeight + 0.1);
      if (feedback.itemColor && !updated.favoriteColors.includes(feedback.itemColor.toLowerCase())) {
        updated.favoriteColors = [...updated.favoriteColors, feedback.itemColor.toLowerCase()];
      }
      break;
    case 'too_formal':
      updated.formalityLean = -1;
      updated.weights.formalityWeight = Math.max(0.5, updated.weights.formalityWeight - 0.1);
      break;
    case 'too_casual':
      updated.formalityLean = 1;
      updated.weights.formalityWeight = Math.min(2.0, updated.weights.formalityWeight + 0.1);
      break;
    case 'too_cold':
      updated.warmthLean = 'runs_cold';
      updated.weights.weatherWeight = Math.min(2.0, updated.weights.weatherWeight + 0.15);
      break;
    case 'too_warm':
      updated.warmthLean = 'runs_hot';
      updated.weights.weatherWeight = Math.min(2.0, updated.weights.weatherWeight + 0.15);
      break;
    case 'love_comfort':
      updated.commuteComfortPriority = true;
      updated.weights.comfortWeight = Math.min(2.0, updated.weights.comfortWeight + 0.2);
      break;
    case 'prefer_formal':
      updated.commuteComfortPriority = false;
      updated.formalityLean = 1;
      break;
  }

  return updated;
}
