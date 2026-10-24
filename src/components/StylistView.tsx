import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  MapPin,
  CloudRain,
  Sun,
  Wind,
  Check,
  Navigation,
  ThumbsUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Plus,
  ShieldAlert,
  SlidersHorizontal,
  CalendarRange,
  Eye,
  Camera,
  ShoppingBag,
  Luggage,
  Plane,
} from 'lucide-react';
import { Meeting, WeatherCondition, OutfitSuggestion, WardrobeItem, UserPreferences } from '../types';
import { WeeklyCalendarView } from './WeeklyCalendarView';
import { OutfitPreviewModal } from './OutfitPreviewModal';
import { PackingListView } from './PackingListView';
import { buildWeeklyFashionPlan } from '../utils/weeklyPlanEngine';
import { detectMultiDayEvents } from '../utils/packingEngine';

interface StylistViewProps {
  meetings: Meeting[];
  selectedMeeting: Meeting;
  onSelectMeeting: (m: Meeting) => void;
  weather: WeatherCondition | null;
  outfits: OutfitSuggestion[];
  wardrobe: WardrobeItem[];
  onTrainPreference: (feedback: {
    type: 'thumbs_up' | 'too_formal' | 'too_casual' | 'too_cold' | 'too_warm' | 'love_comfort' | 'prefer_formal';
    itemColor?: string;
  }) => void;
  onOpenCommute: () => void;
  onOpenShopper?: () => void;
  onAddNewMeeting: (m: Meeting) => void;
  userPreferences: UserPreferences;
  isCalendarSynced?: boolean;
  onSyncCalendar?: () => void;
}

export const StylistView: React.FC<StylistViewProps> = ({
  meetings,
  selectedMeeting,
  onSelectMeeting,
  weather,
  outfits,
  wardrobe,
  onTrainPreference,
  onOpenCommute,
  onOpenShopper,
  onAddNewMeeting,
  userPreferences,
  isCalendarSynced,
  onSyncCalendar,
}) => {
  // Toggle between Weekly Calendar, Day Focus, and Trip Packing Concierge
  const [viewMode, setViewMode] = useState<'calendar' | 'focus' | 'packing'>('calendar');

  // Detect upcoming multi-day events
  const detectedMultiDayTrips = useMemo(() => {
    return detectMultiDayEvents(meetings);
  }, [meetings]);

  const [selectedOutfitId, setSelectedOutfitId] = useState<string>(outfits[0]?.id || 'outfit-polished');
  const [trainedFeedbackMessage, setTrainedFeedbackMessage] = useState<string | null>(null);
  const [isAddMeetingModalOpen, setIsAddMeetingModalOpen] = useState(false);
  const [userSwappedOutfits, setUserSwappedOutfits] = useState<Record<string, string>>({});
  const [previewModalOutfit, setPreviewModalOutfit] = useState<OutfitSuggestion | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleOpenPreview = (outfit: OutfitSuggestion) => {
    setPreviewModalOutfit(outfit);
    setIsPreviewModalOpen(true);
  };

  // New Meeting form
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newFormality, setNewFormality] = useState<Meeting['formality']>('business_casual');

  const fallbackWeather: WeatherCondition = weather || {
    temperatureC: 14,
    feelsLikeC: 13,
    condition: 'rain',
    precipitationProbability: 60,
    windSpeedKmh: 16,
    summary: 'Overcast & Drizzle',
    icon: 'cloud-rain',
  };

  // Build the 7-day fashion plan
  const { days: weeklyDays, summary: weeklySummary } = buildWeeklyFashionPlan(
    meetings,
    wardrobe,
    userPreferences,
    fallbackWeather,
    userSwappedOutfits
  );

  const handleSwapOutfitForDay = (dateKey: string, outfitId: string) => {
    setUserSwappedOutfits(prev => ({
      ...prev,
      [dateKey]: outfitId,
    }));
  };

  const handleFeedback = (
    type: 'thumbs_up' | 'too_formal' | 'too_casual' | 'too_cold' | 'too_warm' | 'love_comfort' | 'prefer_formal',
    label: string,
    itemColor?: string
  ) => {
    onTrainPreference({ type, itemColor });
    setTrainedFeedbackMessage(`Stylist trained: "${label}". Outfits recalibrated!`);
    setTimeout(() => setTrainedFeedbackMessage(null), 3000);
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newLocation.trim()) return;

    const startDate = newTime ? new Date(newTime) : new Date(Date.now() + 2 * 60 * 60 * 1000);
    const m: Meeting = {
      id: `custom-meet-${Date.now()}`,
      title: newTitle,
      location: newLocation,
      startTime: startDate.toISOString(),
      endTime: new Date(startDate.getTime() + 60 * 60 * 1000).toISOString(),
      formality: newFormality,
    };
    onAddNewMeeting(m);
    onSelectMeeting(m);
    setIsAddMeetingModalOpen(false);
    setNewTitle('');
    setNewLocation('');
  };

  const meetingDate = new Date(selectedMeeting.startTime);
  const timeFormatted = meetingDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateFormatted = meetingDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner: Training Feedback Toast */}
      {trainedFeedbackMessage && (
        <div className="bg-amber-900 text-amber-100 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top border border-amber-700">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>{trainedFeedbackMessage}</span>
          </div>
          <span className="text-[10px] text-amber-400 font-mono">Iteration #{userPreferences.feedbackCount}</span>
        </div>
      )}

      {/* View Switcher: Weekly Fashion Calendar vs Day Focus vs Trip Packing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarRange className="w-4 h-4 text-amber-600" />
            <span>Weekly Fashion Calendar</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
              7 Days
            </span>
          </button>

          <button
            onClick={() => setViewMode('focus')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'focus'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4 text-amber-600" />
            <span>Daily Meeting Focus</span>
          </button>

          <button
            onClick={() => setViewMode('packing')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              viewMode === 'packing'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Luggage className="w-4 h-4 text-amber-600" />
            <span>Trip Packing List</span>
            {detectedMultiDayTrips.length > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {detectedMultiDayTrips.length} {detectedMultiDayTrips.length === 1 ? 'Trip' : 'Trips'}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          {onSyncCalendar && (
            <button
              onClick={onSyncCalendar}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl flex items-center space-x-1.5 hover:bg-slate-50 shadow-xs transition-colors"
              title="Refresh calendar events"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
              <span>Sync Calendar</span>
            </button>
          )}

          {onOpenShopper && (
            <button
              onClick={onOpenShopper}
              className="text-xs font-semibold text-amber-900 bg-amber-50 hover:bg-amber-100/90 border border-amber-200/80 px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors"
              title="Consult AI Personal Shopper for wardrobe gaps"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
              <span>Personal Shopper</span>
            </button>
          )}

          <button
            onClick={() => setIsAddMeetingModalOpen(true)}
            className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Meeting</span>
          </button>
        </div>
      </div>

      {/* Upcoming Multi-Day Trip Notification Banner */}
      {detectedMultiDayTrips.length > 0 && viewMode !== 'packing' && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 border border-emerald-600/40 rounded-3xl p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
              <Luggage className="w-5 h-5 text-amber-300" />
            </div>
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 flex items-center space-x-1">
                  <Plane className="w-3 h-3" />
                  <span>Upcoming Multi-Day Trip Detected</span>
                </span>
                <span className="text-xs text-slate-300 font-mono">
                  {detectedMultiDayTrips[0].city} • {detectedMultiDayTrips[0].totalDays} Days ({detectedMultiDayTrips[0].totalNights} Nights)
                </span>
              </div>
              <p className="text-base font-serif font-bold text-amber-100">
                {detectedMultiDayTrips[0].title}
              </p>
              <p className="text-xs text-slate-300 line-clamp-1">
                Jeeves has analyzed {detectedMultiDayTrips[0].city} forecast conditions and prepared a tailored wardrobe packing checklist.
              </p>
            </div>
          </div>

          <button
            onClick={() => setViewMode('packing')}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 flex-shrink-0 self-start sm:self-auto"
          >
            <span>Open Packing Concierge</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}


      {/* VIEW MODE 1: VISUAL CALENDAR VIEW */}
      {viewMode === 'calendar' && (
        <WeeklyCalendarView
          days={weeklyDays}
          summary={weeklySummary}
          onSelectMeeting={onSelectMeeting}
          onSwitchToDayView={() => setViewMode('focus')}
          onSwapOutfitForDay={handleSwapOutfitForDay}
          onOpenPreview={handleOpenPreview}
        />
      )}

      {/* VIEW MODE 2: DAY FOCUS VIEW */}
      {viewMode === 'focus' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Meeting Picker Carousel */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-4 h-4 text-slate-700" />
                <h2 className="font-serif font-bold text-slate-900 text-lg">Scheduled Meetings</h2>
              </div>

              <button
                onClick={() => setViewMode('calendar')}
                className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1"
              >
                <span>&larr; Return to Weekly Calendar</span>
              </button>
            </div>

            {/* Carousel pills */}
            <div className="flex items-center space-x-3 overflow-x-auto pb-2 scrollbar-none">
              {meetings.map((m) => {
                const isSelected = m.id === selectedMeeting.id;
                const mTime = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const mDay = new Date(m.startTime).toLocaleDateString([], { weekday: 'short', month: 'numeric', day: 'numeric' });
                return (
                  <button
                    key={m.id}
                    onClick={() => onSelectMeeting(m)}
                    className={`flex-shrink-0 text-left p-3.5 rounded-2xl border transition-all min-w-[260px] max-w-[320px] ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-800 shadow-md ring-2 ring-amber-500/30'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className={`font-mono font-bold ${isSelected ? 'text-amber-400' : 'text-slate-500'}`}>
                        {mDay} &bull; {mTime}
                      </span>
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-slate-800 text-amber-300 border border-slate-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {m.formality.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-sm truncate">{m.title}</h3>
                    <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                      {m.location}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Meeting Context & Weather Card */}
          <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
              {/* Meeting Details */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                    {dateFormatted} &bull; {timeFormatted}
                  </span>
                  <span className="text-[11px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-semibold border border-slate-700">
                    {selectedMeeting.formality.replace('_', ' ')} Dress Code
                  </span>
                </div>

                <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-white">
                  {selectedMeeting.title}
                </h1>

                <div className="flex items-start space-x-2 text-slate-300 text-sm">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="font-medium">{selectedMeeting.location}</span>
                </div>

                {selectedMeeting.description && (
                  <p className="text-xs text-slate-400 line-clamp-2 max-w-2xl leading-relaxed">
                    {selectedMeeting.description}
                  </p>
                )}

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={onOpenCommute}
                    className="inline-flex items-center space-x-2 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <span>Check Google Maps Route &amp; Live TfL Status</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Live Weather Forecast */}
              <div className="bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-slate-300 border-b border-white/10 pb-3 mb-3">
                  <span className="font-bold uppercase tracking-wider text-amber-400">Meeting Weather</span>
                  <span className="text-slate-400 text-[11px]">Local Forecast</span>
                </div>

                {weather ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-3xl md:text-4xl font-serif font-bold text-white">
                          {weather.temperatureC}&deg;C
                        </span>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Feels like {weather.feelsLikeC}&deg;C &bull; {weather.summary}
                        </p>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        {weather.precipitationProbability >= 40 ? (
                          <CloudRain className="w-7 h-7" />
                        ) : (
                          <Sun className="w-7 h-7" />
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-xs">
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                        <span>Rain: {weather.precipitationProbability}%</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Wind className="w-3.5 h-3.5 text-teal-400" />
                        <span>Wind: {weather.windSpeedKmh} km/h</span>
                      </div>
                    </div>

                    {weather.precipitationProbability >= userPreferences.rainToleranceThreshold && (
                      <div className="bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] p-2 rounded-xl flex items-center space-x-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                        <span>Rain forecast above {userPreferences.rainToleranceThreshold}%: Stylist added waterproof outerwear &amp; umbrella.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center text-xs text-slate-400">Loading live weather forecast...</div>
                )}
              </div>
            </div>
          </section>

          {/* Suggested Outfits Section */}
          <section className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-2xl font-bold text-slate-900 tracking-tight">
                  Recommended Outfits For This Event
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Personalized from your catalog based on meeting formality, weather at destination, and trained preferences.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs text-slate-500">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600" />
                <span>Trained Lean: {userPreferences.warmthLean.replace('_', ' ')} &bull; {userPreferences.commuteComfortPriority ? 'Comfort shoes prioritized' : 'Standard'}</span>
              </div>
            </div>

            {outfits.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
                <p className="text-slate-600 text-sm">Please catalog items in your wardrobe to generate tailored outfits.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {outfits.map((outfit) => {
                  const isSelected = outfit.id === selectedOutfitId;
                  return (
                    <div
                      key={outfit.id}
                      className={`bg-white rounded-3xl border transition-all flex flex-col justify-between overflow-hidden ${
                        isSelected
                          ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-xl'
                          : 'border-slate-200/90 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="p-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/70 to-transparent">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-900 text-white font-mono">
                              {outfit.score}% Match
                            </span>
                            <h3 className="font-serif font-bold text-lg text-slate-900 mt-2">{outfit.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{outfit.subtitle}</p>
                          </div>

                          <button
                            onClick={() => setSelectedOutfitId(outfit.id)}
                            className={`p-2 rounded-xl border transition-all ${
                              isSelected
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700'
                            }`}
                            title={isSelected ? 'Selected for today' : 'Select this outfit'}
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Reasoning Pill */}
                        <div className="mt-3 bg-amber-50/80 border border-amber-200/60 rounded-xl p-2.5 text-[11px] text-amber-900 leading-relaxed">
                          <span className="font-bold">Stylist Rationale:</span> {outfit.reasoning}
                        </div>
                      </div>

                      {/* Items in Outfit */}
                      <div className="p-6 space-y-3 flex-1">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                          Ensemble Pieces ({outfit.items.length})
                        </h4>

                        <div className="grid grid-cols-2 gap-2.5">
                          {outfit.items.map((item) => (
                            <div
                              key={item.id}
                              className="border border-slate-200/70 rounded-xl p-2 bg-slate-50/60 flex items-center space-x-2.5 hover:bg-slate-50 transition-colors"
                            >
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                                {item.imageUrl ? (
                                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xs">👔</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] uppercase font-bold text-slate-600 truncate">{item.category}</p>
                                <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{item.name}</p>
                                <div className="flex items-center space-x-1 mt-0.5">
                                  <span
                                    className="w-2 h-2 rounded-full border border-slate-300"
                                    style={{ backgroundColor: item.colorHex }}
                                  />
                                  <span className="text-[10px] text-slate-500 truncate">{item.color}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Interactive Stylist Training Feedback Buttons */}
                      <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2.5">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                          <span>Train Stylist On This Look:</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 text-[10px] font-medium">
                          <button
                            onClick={() => handleFeedback('thumbs_up', 'Loved Look', outfit.items[0]?.color)}
                            className="py-1.5 px-2 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 rounded-lg flex items-center justify-center space-x-1 transition-colors"
                          >
                            <ThumbsUp className="w-3 h-3 text-emerald-600" />
                            <span>Love it</span>
                          </button>

                          <button
                            onClick={() => handleFeedback('too_formal', 'Prefers More Casual')}
                            className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-center transition-colors"
                          >
                            Too formal
                          </button>

                          <button
                            onClick={() => handleFeedback('too_casual', 'Prefers Sharper Formal')}
                            className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-center transition-colors"
                          >
                            Too casual
                          </button>

                          <button
                            onClick={() => handleFeedback('too_cold', 'Runs Cold - Thicker Layers')}
                            className="py-1.5 px-2 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-lg text-center transition-colors"
                          >
                            Too chilly
                          </button>

                          <button
                            onClick={() => handleFeedback('too_warm', 'Runs Warm - Lighten Up')}
                            className="py-1.5 px-2 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border border-slate-200 rounded-lg text-center transition-colors"
                          >
                            Too warm
                          </button>

                          <button
                            onClick={() => handleFeedback('love_comfort', 'Prioritize Commuter Comfort')}
                            className="py-1.5 px-2 bg-white hover:bg-purple-50 text-slate-700 hover:text-purple-700 border border-slate-200 rounded-lg text-center transition-colors"
                          >
                            Want sneakers
                          </button>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {/* Preview on You (Nano Banana Camera Try-On) */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(outfit)}
                            className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-all shadow-xs bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white flex items-center justify-center space-x-2 active:scale-[0.98] cursor-pointer"
                            title="Take a photo with your camera and let Nano Banana generate a photorealistic preview of you wearing this outfit"
                          >
                            <Camera className="w-3.5 h-3.5 text-amber-200" />
                            <span>Preview on You (Nano Banana)</span>
                          </button>

                          {/* Wear this button */}
                          <button
                            type="button"
                            onClick={() => setSelectedOutfitId(outfit.id)}
                            className={`w-full py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
                              isSelected
                                ? 'bg-slate-900 text-amber-400'
                                : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200'
                            }`}
                          >
                            {isSelected ? '✓ Wearing This Ensemble' : 'Select This Outfit'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* VIEW MODE 3: TRIP PACKING LIST CONCIERGE */}
      {viewMode === 'packing' && (
        <PackingListView
          meetings={meetings}
          wardrobe={wardrobe}
          userPreferences={userPreferences}
          onOpenShopper={onOpenShopper}
        />
      )}


      {/* Add Custom Meeting Modal */}
      {isAddMeetingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-serif font-bold text-slate-900 text-base">Add New Meeting</h3>
              <button onClick={() => setIsAddMeetingModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateMeeting} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Meeting Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Investor Pitch & Dinner"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Location / Destination *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. The Ned, 27 Poultry, London EC2R 8AJ"
                  value={newLocation}
                  onChange={e => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={newTime}
                    onChange={e => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Formality
                  </label>
                  <select
                    value={newFormality}
                    onChange={e => setNewFormality(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium"
                  >
                    <option value="casual">Casual</option>
                    <option value="smart_casual">Smart Casual</option>
                    <option value="business_casual">Business Casual</option>
                    <option value="business_formal">Business Formal</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddMeetingModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-sm"
                >
                  Add Meeting
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Nano Banana Photorealistic Virtual Try-On Modal */}
      <OutfitPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        outfit={previewModalOutfit}
        meeting={selectedMeeting}
      />
    </div>
  );
};
