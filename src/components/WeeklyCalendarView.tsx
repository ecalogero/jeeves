import React, { useState } from 'react';
import {
  Calendar,
  CloudRain,
  Sun,
  Cloud,
  MapPin,
  Clock,
  Sparkles,
  ArrowRight,
  Check,
  RotateCcw,
  Layers,
  ShieldCheck,
  ChevronRight,
  Share2,
  Copy,
  Camera,
} from 'lucide-react';
import { WeeklyDayPlan, WeeklyFashionSummary, OutfitSuggestion, Meeting } from '../types';

interface WeeklyCalendarViewProps {
  days: WeeklyDayPlan[];
  summary: WeeklyFashionSummary;
  onSelectMeeting: (m: Meeting) => void;
  onSwitchToDayView: () => void;
  onSwapOutfitForDay: (dateKey: string, outfitId: string) => void;
  onOpenPreview?: (outfit: OutfitSuggestion) => void;
}

export const WeeklyCalendarView: React.FC<WeeklyCalendarViewProps> = ({
  days,
  summary,
  onSelectMeeting,
  onSwitchToDayView,
  onSwapOutfitForDay,
  onOpenPreview,
}) => {
  const [selectedDayKey, setSelectedDayKey] = useState<string>(days[0]?.dateKey || '');
  const [copiedLookbook, setCopiedLookbook] = useState(false);

  const selectedDay = days.find(d => d.dateKey === selectedDayKey) || days[0];

  const handleCopyLookbook = () => {
    let text = `📅 WEEKLY FASHION PLAN & LOOKBOOK\n`;
    text += `Overview: ${summary.totalMeetings} meetings across ${summary.daysWithMeetings} active days.\n\n`;

    days.forEach(d => {
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `${d.dayName}, ${d.formattedDate} ${d.isToday ? '★ TODAY' : ''}\n`;
      text += `Weather: ${d.weather.temperatureC}°C, ${d.weather.summary} (Rain: ${d.weather.precipitationProbability}%)\n`;

      if (d.meetings.length > 0) {
        text += `Meetings (${d.meetings.length}):\n`;
        d.meetings.forEach(m => {
          const mTime = new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          text += `  • [${mTime}] ${m.title} (${m.formality.replace('_', ' ')})\n`;
          text += `    Location: ${m.location}\n`;
        });
      } else {
        text += `No scheduled meetings (Casual rest day)\n`;
      }

      if (d.plannedOutfit) {
        text += `Planned Outfit: ${d.plannedOutfit.title}\n`;
        text += `Garments: ${d.plannedOutfit.items.map(i => `${i.name} (${i.color})`).join(', ')}\n`;
      }
      text += `\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedLookbook(true);
    setTimeout(() => setCopiedLookbook(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Weekly Lookbook Summary Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                7-Day Fashion Lookbook
              </span>
              <span className="text-xs text-slate-300">
                {days[0]?.formattedDate} &ndash; {days[days.length - 1]?.formattedDate}
              </span>
            </div>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-white mt-1">
              Weekly Meeting &amp; Outfit Calendar
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Every day calibrated for meetings, destination forecast, and wardrobe rotation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopyLookbook}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors flex items-center space-x-1.5"
            >
              {copiedLookbook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLookbook ? 'Copied Lookbook' : 'Copy Week Itinerary'}</span>
            </button>
          </div>
        </div>

        {/* Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-xs">
          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Meetings Scheduled</span>
            <p className="text-xl font-bold font-serif text-white mt-0.5">{summary.totalMeetings} Meetings</p>
            <p className="text-[10px] text-slate-400">{summary.daysWithMeetings} active days</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Formal Attire Days</span>
            <p className="text-xl font-bold font-serif text-amber-400 mt-0.5">{summary.formalDaysCount} Days</p>
            <p className="text-[10px] text-slate-400">Suits &amp; tailored blazers</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Rain Forecast Days</span>
            <p className="text-xl font-bold font-serif text-blue-400 mt-0.5">{summary.rainyDaysCount} Days</p>
            <p className="text-[10px] text-slate-400">Umbrellas &amp; macs scheduled</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Pieces Rotated</span>
            <p className="text-xl font-bold font-serif text-emerald-400 mt-0.5">{summary.uniqueGarmentsCount} Items</p>
            <p className="text-[10px] text-slate-400">Balanced wardrobe rotation</p>
          </div>
        </div>
      </div>

      {/* 7-Day Visual Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
        {days.map((day) => {
          const isSelected = day.dateKey === selectedDayKey;
          const hasMeetings = day.meetings.length > 0;
          const outfit = day.plannedOutfit;

          return (
            <div
              key={day.dateKey}
              onClick={() => setSelectedDayKey(day.dateKey)}
              className={`rounded-2xl border transition-all cursor-pointer flex flex-col justify-between overflow-hidden bg-white ${
                isSelected
                  ? 'border-amber-600 ring-2 ring-amber-500/20 shadow-md'
                  : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Day Header */}
              <div className={`p-3.5 border-b transition-colors ${
                day.isToday ? 'bg-amber-50/70 border-amber-200' : 'bg-slate-50/80 border-slate-100'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-900 block">
                      {day.dayName.slice(0, 3)}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      {day.formattedDate}
                    </span>
                  </div>

                  {day.isToday && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      Today
                    </span>
                  )}
                </div>

                {/* Day Weather Pill */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
                  <div className="flex items-center space-x-1">
                    {day.weather.precipitationProbability >= 40 ? (
                      <CloudRain className="w-3.5 h-3.5 text-blue-500" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    <span className="font-semibold text-slate-800">{day.weather.temperatureC}&deg;C</span>
                  </div>
                  <span className={`text-[10px] font-medium ${day.weather.precipitationProbability >= 40 ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                    {day.weather.precipitationProbability}% rain
                  </span>
                </div>
              </div>

              {/* Day Content: Meetings & Planned Outfit */}
              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                {/* Meetings in Day */}
                <div>
                  <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Meetings ({day.meetings.length})
                  </span>

                  {hasMeetings ? (
                    <div className="space-y-1.5">
                      {day.meetings.slice(0, 2).map(m => (
                        <div
                          key={m.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectMeeting(m);
                            onSwitchToDayView();
                          }}
                          className="p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-[10px] transition-colors"
                          title="Click to view in detail stylist view"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold font-mono text-slate-700">
                              {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[8px] uppercase px-1 py-0.2 rounded bg-slate-200/80 font-bold text-slate-700">
                              {m.formality.slice(0, 4)}
                            </span>
                          </div>
                          <p className="font-semibold text-slate-800 truncate mt-0.5">{m.title}</p>
                        </div>
                      ))}
                      {day.meetings.length > 2 && (
                        <p className="text-[9px] text-slate-400 text-center font-medium">
                          +{day.meetings.length - 2} more meeting
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="py-2 text-center text-[10px] text-slate-400 italic">
                      Casual / Rest Day
                    </div>
                  )}
                </div>

                {/* Outfit Preview Card */}
                {outfit ? (
                  <div className="border-t border-slate-100 pt-2.5">
                    <div className="flex items-center justify-between text-[10px] mb-1.5">
                      <span className="font-bold text-slate-900 truncate max-w-[100px]">
                        {outfit.title}
                      </span>
                      <span className="font-mono text-[9px] text-amber-700 font-bold bg-amber-50 px-1 rounded">
                        {outfit.score}%
                      </span>
                    </div>

                    {/* Outfit thumbnail collage (stack of 3-4 pieces) */}
                    <div className="grid grid-cols-3 gap-1">
                      {outfit.items.slice(0, 3).map((item, idx) => (
                        <div
                          key={idx}
                          className="aspect-square rounded-md overflow-hidden bg-slate-100 border border-slate-200/80 relative"
                          title={`${item.name} (${item.color})`}
                        >
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[9px]">👔</div>
                          )}
                          <div
                            className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 rounded-full border border-white"
                            style={{ backgroundColor: item.colorHex }}
                          />
                        </div>
                      ))}
                    </div>

                    <p className="text-[9px] text-slate-500 truncate mt-1.5">
                      {outfit.items.map(i => i.subcategory).join(' • ')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-2 text-[10px] text-slate-400">
                    No items in wardrobe
                  </div>
                )}
              </div>

              {/* Day Card Footer */}
              <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between text-[10px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (day.meetings.length > 0) {
                      onSelectMeeting(day.meetings[0]);
                    }
                    onSwitchToDayView();
                  }}
                  className="font-bold text-amber-700 hover:text-amber-900 flex items-center space-x-1"
                >
                  <span>Focus Day</span>
                  <ChevronRight className="w-3 h-3" />
                </button>

                {outfit && day.alternativeOutfits.length > 1 && (
                  <select
                    value={outfit.id}
                    onClick={e => e.stopPropagation()}
                    onChange={(e) => onSwapOutfitForDay(day.dateKey, e.target.value)}
                    className="text-[9px] bg-white border border-slate-200 rounded px-1 py-0.5 text-slate-700 max-w-[70px] truncate"
                    title="Swap outfit recommendation for this day"
                  >
                    {day.alternativeOutfits.map(alt => (
                      <option key={alt.id} value={alt.id}>{alt.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Day Expanded Detail Panel */}
      {selectedDay && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-serif font-bold text-lg">
                {selectedDay.date.getDate()}
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900">
                  {selectedDay.dayName}, {selectedDay.formattedDate}
                  {selectedDay.isToday && <span className="ml-2 text-xs text-amber-600 font-sans font-semibold">(Today)</span>}
                </h3>
                <p className="text-xs text-slate-500">
                  Forecast: {selectedDay.weather.temperatureC}&deg;C &bull; {selectedDay.weather.summary} &bull; {selectedDay.weather.precipitationProbability}% chance of rain
                </p>
              </div>
            </div>

            {selectedDay.meetings.length > 0 && (
              <button
                onClick={() => {
                  onSelectMeeting(selectedDay.meetings[0]);
                  onSwitchToDayView();
                }}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <span>Open in Daily Stylist</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
            {/* Left: Day's Meetings */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-600" />
                <span>Scheduled Agenda ({selectedDay.meetings.length})</span>
              </h4>

              {selectedDay.meetings.length > 0 ? (
                <div className="space-y-2.5">
                  {selectedDay.meetings.map(m => (
                    <div
                      key={m.id}
                      onClick={() => {
                        onSelectMeeting(m);
                        onSwitchToDayView();
                      }}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold font-mono text-slate-900">
                          {new Date(m.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                          {m.formality.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="font-bold text-slate-900 text-sm">{m.title}</p>
                      <p className="text-slate-500 text-[11px] flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{m.location}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 text-slate-500 text-xs text-center border border-dashed border-slate-200">
                  No meetings on calendar. Enjoy a comfortable casual day!
                </div>
              )}
            </div>

            {/* Middle & Right: Planned Ensemble */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Planned Look: {selectedDay.plannedOutfit?.title}</span>
                </h4>

                {/* Swap Look Selector */}
                {selectedDay.alternativeOutfits.length > 1 && (
                  <div className="flex items-center space-x-2 text-xs">
                    <span className="text-slate-500 text-[11px]">Swap Look:</span>
                    <select
                      value={selectedDay.plannedOutfit?.id}
                      onChange={(e) => onSwapOutfitForDay(selectedDay.dateKey, e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs font-medium text-slate-800"
                    >
                      {selectedDay.alternativeOutfits.map(alt => (
                        <option key={alt.id} value={alt.id}>
                          {alt.title} ({alt.score}%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedDay.plannedOutfit && (
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <p className="text-slate-600 text-[11px] italic">
                      &ldquo;{selectedDay.plannedOutfit.reasoning}&rdquo;
                    </p>
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full shrink-0">
                      {selectedDay.plannedOutfit.score}% Match
                    </span>
                  </div>

                  {/* Garment Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {selectedDay.plannedOutfit.items.map((item) => (
                      <div
                        key={item.id}
                        className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-xs flex flex-col justify-between"
                      >
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 mb-2">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm">👔</div>
                          )}
                        </div>

                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">{item.category}</span>
                          <p className="text-xs font-bold text-slate-900 truncate leading-tight">{item.name}</p>
                          <div className="flex items-center space-x-1.5 mt-1">
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

                  {onOpenPreview && selectedDay.plannedOutfit && (
                    <div className="pt-2 flex items-center justify-between border-t border-slate-200/80">
                      <p className="text-[11px] text-slate-500">
                        Virtual try-on powered by Nano Banana camera synthesis.
                      </p>
                      <button
                        type="button"
                        onClick={() => onOpenPreview(selectedDay.plannedOutfit!)}
                        className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-amber-200" />
                        <span>Preview on You (Nano Banana)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
