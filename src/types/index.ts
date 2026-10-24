export type Category =
  | 'tops'
  | 'bottoms'
  | 'outerwear'
  | 'footwear'
  | 'accessories'
  | 'one_piece'
  | 'activewear'
  | 'equipment';

export type Formality = 'casual' | 'smart_casual' | 'business_casual' | 'business_formal' | 'formal';

export type WeatherTag = 'rain_friendly' | 'sunny' | 'cold' | 'windy' | 'breathable' | 'all_weather';

export interface WardrobeItem {
  id: string;
  name: string;
  category: Category;
  subcategory: string;
  formality: Formality;
  warmth: number; // 1 (light summer) to 5 (heavy winter)
  weatherTags: WeatherTag[];
  color: string;
  colorHex: string;
  material: string;
  imageUrl?: string;
  iconName?: string;
  isFavorite?: boolean;
}

export interface WeatherCondition {
  temperatureC: number;
  feelsLikeC: number;
  condition: 'clear' | 'partly_cloudy' | 'cloudy' | 'rain' | 'heavy_rain' | 'drizzle' | 'windy' | 'snow';
  precipitationProbability: number; // 0 - 100
  windSpeedKmh: number;
  summary: string;
  icon: string;
}

export interface Meeting {
  id: string;
  title: string;
  startTime: string; // ISO date string
  endTime: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  formality: Formality;
  description?: string;
  attendeesCount?: number;
  isVirtual?: boolean;
  activityType?: 'gym' | 'golf' | 'celebration' | 'business' | 'casual' | 'travel';
}

export interface OutfitSuggestion {
  id: string;
  title: string;
  subtitle: string;
  items: WardrobeItem[];
  score: number;
  reasoning: string;
  weatherFitScore: number;
  formalityFitScore: number;
  preferenceMatchScore: number;
}

export interface UserPreferences {
  warmthLean: 'runs_hot' | 'balanced' | 'runs_cold';
  formalityLean: -1 | 0 | 1; // -1: slightly more casual, 0: exact, 1: slightly more dressed up
  commuteComfortPriority: boolean; // favors comfortable footwear for transit/walking
  rainToleranceThreshold: number; // % precipitation probability before requiring umbrella/waterproof (default: 30)
  favoriteColors: string[];
  dislikedMaterials: string[];
  feedbackCount: number;
  weights: {
    weatherWeight: number;
    formalityWeight: number;
    comfortWeight: number;
    favoriteWeight: number;
  };
}

export interface TfLDisruption {
  lineId: string;
  lineName: string;
  statusSeverityDescription: string;
  reason?: string;
  isDisrupted: boolean;
}

export interface CommuteFareEstimate {
  amount: number;
  currency: 'GBP' | 'USD' | 'EUR';
  currencySymbol: string;
  formatted: string; // e.g. "£3.40"
  rateType: 'peak' | 'off_peak' | 'flat' | 'metered' | 'free';
  rateLabel: string; // e.g. "TfL Peak Fare" | "TfL Off-Peak Fare"
  isPeak: boolean;
  breakdown: string; // e.g. "Zones 1–2 Peak contactless fare"
  dailyCap?: string; // e.g. "Daily cap £8.50"
  savingsVsCab?: string; // e.g. "Save £24.10 vs Taxi"
}

export type TransportModeType = 'TRANSIT' | 'BUS' | 'TAXI' | 'WALK' | 'BICYCLE' | 'DRIVING';

export interface ModeCostOption {
  mode: TransportModeType;
  label: string;
  iconName: string;
  durationMinutes: number;
  distanceKm: number;
  fare: CommuteFareEstimate;
  co2Grams: number;
  isRecommended?: boolean;
}

export interface RouteStep {
  instruction: string;
  distance: string;
  duration: string;
  transitMode?: 'WALK' | 'TUBE' | 'BUS' | 'TRAIN' | 'DLR' | 'OVERGROUND';
  lineName?: string;
  departureStop?: string;
  arrivalStop?: string;
  stepFare?: string;
}

export interface CommutePlan {
  origin: string;
  destination: string;
  durationMinutes: number;
  distanceKm: number;
  departureTime: Date;
  arrivalTime: Date;
  minutesUntilDeparture: number;
  isAlertActive: boolean; // active when <= 10 mins
  tflStatusAlerts: TfLDisruption[];
  suggestedPaddingMinutes: number;
  steps: RouteStep[];
  selectedMode?: TransportModeType;
  estimatedFare?: CommuteFareEstimate;
  modeComparisons?: ModeCostOption[];
}

export interface WeeklyDayPlan {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  dayName: string; // "Monday", "Tuesday", etc.
  formattedDate: string; // "Oct 26"
  isToday: boolean;
  meetings: Meeting[];
  weather: WeatherCondition;
  plannedOutfit?: OutfitSuggestion;
  alternativeOutfits: OutfitSuggestion[];
}

export interface WeeklyFashionSummary {
  totalMeetings: number;
  daysWithMeetings: number;
  rainyDaysCount: number;
  formalDaysCount: number;
  uniqueGarmentsCount: number;
}

export interface WardrobeGap {
  id: string;
  type: 'weather_protection' | 'formality_coverage' | 'category_scarcity' | 'commute_comfort';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  suggestedCategory: Category;
  suggestedSubcategory: string;
  targetFormality?: Formality;
  meetingContext?: string;
}

export interface ShopperRecommendation {
  id: string;
  title: string;
  brand: string;
  category: Category;
  subcategory: string;
  formality: Formality;
  warmth: number; // 1-5
  weatherTags: WeatherTag[];
  color: string;
  colorHex: string;
  material: string;
  priceEstimate: string;
  retailer: string;
  reason: string;
  searchQueryUrl: string;
  sourceUrl?: string;
  sourceTitle?: string;
  targetGaps?: string[];
  meetingFit?: string;
  imageUrl?: string;
}

export interface ShopperAnalysisSummary {
  gaps: WardrobeGap[];
  overallReadinessScore: number; // 0-100
  topPriority: string;
  analysisSummary: string;
}

export interface TripEvent {
  id: string;
  meetingId?: string;
  title: string;
  destination: string;
  city: string;
  country?: string;
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  totalDays: number;
  totalNights: number;
  formality: Formality;
  description?: string;
  isCalendarDetected: boolean;
}

export interface DestinationDailyWeather {
  dayOffset: number;
  dateFormatted: string;
  highC: number;
  lowC: number;
  condition: 'clear' | 'partly_cloudy' | 'cloudy' | 'rain' | 'heavy_rain' | 'drizzle' | 'windy' | 'snow';
  precipitationProbability: number;
  summary: string;
}

export interface DestinationWeather {
  city: string;
  country?: string;
  temperatureHighC: number;
  temperatureLowC: number;
  averageTempC: number;
  condition: 'clear' | 'partly_cloudy' | 'cloudy' | 'rain' | 'heavy_rain' | 'drizzle' | 'windy' | 'snow';
  precipitationProbability: number; // 0-100
  windSpeedKmh: number;
  summary: string;
  forecastDays: DestinationDailyWeather[];
  packingAdvisory: string;
}

export interface PackingListItem {
  id: string;
  category: Category | 'travel_essentials';
  subcategory: string;
  wardrobeItemId?: string;
  customName?: string;
  item?: WardrobeItem;
  recommendedQuantity: number;
  isPacked: boolean;
  reason: string;
  isEssential?: boolean;
}

export interface LuggageRecommendation {
  bagType: string;
  capacity: string;
  description: string;
  packingTip: string;
}

export interface PackingList {
  tripId: string;
  trip: TripEvent;
  destinationWeather: DestinationWeather;
  items: PackingListItem[];
  luggage: LuggageRecommendation;
  conciergeNotes: string[];
  createdAt: string;
  updatedAt: string;
}



