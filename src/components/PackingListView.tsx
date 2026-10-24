import React, { useState, useMemo } from 'react';
import {
  Luggage,
  CloudRain,
  Sun,
  Wind,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Calendar,
  MapPin,
  Sparkles,
  Plane,
  Plus,
  Trash2,
  RotateCcw,
  Printer,
  ChevronDown,
  ChevronUp,
  Shirt,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  TripEvent,
  DestinationWeather,
  PackingList,
  PackingListItem,
  WardrobeItem,
  UserPreferences,
  Meeting,
  Category,
  Formality,
} from '../types';
import {
  detectMultiDayEvents,
  getDestinationWeather,
  generatePackingList,
  calculatePackingProgress,
  formatPackingListAsText,
  calculateTripDuration,
} from '../utils/packingEngine';

interface PackingListViewProps {
  meetings: Meeting[];
  wardrobe: WardrobeItem[];
  userPreferences: UserPreferences;
  onOpenShopper?: () => void;
  onOpenWardrobe?: () => void;
}

export const PackingListView: React.FC<PackingListViewProps> = ({
  meetings,
  wardrobe,
  userPreferences,
  onOpenShopper,
  onOpenWardrobe,
}) => {
  // Detect multi-day events from calendar
  const detectedTrips = useMemo(() => {
    return detectMultiDayEvents(meetings);
  }, [meetings]);

  // Selected trip state
  const [selectedTripId, setSelectedTripId] = useState<string>(() => {
    return detectedTrips[0]?.id || 'custom-edinburgh';
  });

  // Custom trips added by user
  const [customTrips, setCustomTrips] = useState<TripEvent[]>([]);
  const [isAddTripModalOpen, setIsAddTripModalOpen] = useState(false);

  // Form state for creating custom trip
  const [newTitle, setNewTitle] = useState('');
  const [newCity, setNewCity] = useState('Edinburgh');
  const [newDestination, setNewDestination] = useState('The Balmoral Hotel, Edinburgh');
  const [newStartDate, setNewStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  });
  const [newEndDate, setNewEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().split('T')[0];
  });
  const [newFormality, setNewFormality] = useState<Formality>('business_casual');

  // Combined trips list
  const allTrips = useMemo(() => {
    const combined = [...detectedTrips, ...customTrips];
    if (combined.length === 0) {
      // Default fallback sample trip
      const now = new Date();
      const start = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const end = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString();
      return [
        {
          id: 'custom-edinburgh',
          title: 'Edinburgh Strategy Offsite & Highland Board Review',
          destination: 'The Balmoral Hotel, 1 Princes St, Edinburgh EH2 2EQ',
          city: 'Edinburgh',
          country: 'United Kingdom',
          startDate: start,
          endDate: end,
          totalDays: 3,
          totalNights: 2,
          formality: 'business_casual' as Formality,
          isCalendarDetected: true,
          description: '3-day executive leadership offsite and networking dinner.',
        },
      ];
    }
    return combined;
  }, [detectedTrips, customTrips]);

  const activeTrip = useMemo(() => {
    return allTrips.find((t) => t.id === selectedTripId) || allTrips[0];
  }, [allTrips, selectedTripId]);

  // Destination weather
  const destinationWeather: DestinationWeather = useMemo(() => {
    return getDestinationWeather(activeTrip.city || activeTrip.destination, activeTrip.totalDays);
  }, [activeTrip]);

  // Active packing list state (stored per trip so packed states persist during session)
  const [packingListsState, setPackingListsState] = useState<Record<string, PackingList>>({});

  const currentPackingList = useMemo(() => {
    if (packingListsState[activeTrip.id]) {
      return packingListsState[activeTrip.id];
    }
    return generatePackingList(activeTrip, destinationWeather, wardrobe, userPreferences);
  }, [activeTrip, destinationWeather, wardrobe, userPreferences, packingListsState]);

  // UI state
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [customItemInput, setCustomItemInput] = useState('');
  const [customItemCategory, setCustomItemCategory] = useState<Category | 'travel_essentials'>('travel_essentials');
  const [swapModalItem, setSwapModalItem] = useState<PackingListItem | null>(null);

  // Toggle packed state
  const handleTogglePacked = (itemId: string) => {
    setPackingListsState((prev) => {
      const current = prev[activeTrip.id] || currentPackingList;
      const updatedItems = current.items.map((item) =>
        item.id === itemId ? { ...item, isPacked: !item.isPacked } : item
      );
      return {
        ...prev,
        [activeTrip.id]: {
          ...current,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  // Mark all packed or reset
  const handleSetAllPacked = (packed: boolean) => {
    setPackingListsState((prev) => {
      const current = prev[activeTrip.id] || currentPackingList;
      const updatedItems = current.items.map((item) => ({ ...item, isPacked: packed }));
      return {
        ...prev,
        [activeTrip.id]: {
          ...current,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  // Swap an item for an alternate wardrobe item
  const handleSwapItem = (originalItemId: string, newWardrobeItem: WardrobeItem) => {
    setPackingListsState((prev) => {
      const current = prev[activeTrip.id] || currentPackingList;
      const updatedItems = current.items.map((item) => {
        if (item.id === originalItemId) {
          return {
            ...item,
            wardrobeItemId: newWardrobeItem.id,
            item: newWardrobeItem,
            subcategory: newWardrobeItem.subcategory,
            reason: `User selected: ${newWardrobeItem.material} in ${newWardrobeItem.color}.`,
          };
        }
        return item;
      });
      return {
        ...prev,
        [activeTrip.id]: {
          ...current,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        },
      };
    });
    setSwapModalItem(null);
  };

  // Add custom packing item
  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemInput.trim()) return;

    const newItem: PackingListItem = {
      id: `custom-pack-${Date.now()}`,
      category: customItemCategory,
      subcategory: customItemCategory === 'travel_essentials' ? 'Personal Gear' : 'Custom Apparel',
      customName: customItemInput.trim(),
      recommendedQuantity: 1,
      isPacked: false,
      reason: 'User added essential item for this journey.',
      isEssential: false,
    };

    setPackingListsState((prev) => {
      const current = prev[activeTrip.id] || currentPackingList;
      return {
        ...prev,
        [activeTrip.id]: {
          ...current,
          items: [...current.items, newItem],
          updatedAt: new Date().toISOString(),
        },
      };
    });

    setCustomItemInput('');
  };

  // Remove item from packing list
  const handleRemoveItem = (itemId: string) => {
    setPackingListsState((prev) => {
      const current = prev[activeTrip.id] || currentPackingList;
      return {
        ...prev,
        [activeTrip.id]: {
          ...current,
          items: current.items.filter((i) => i.id !== itemId),
          updatedAt: new Date().toISOString(),
        },
      };
    });
  };

  // Copy to clipboard
  const handleCopyChecklist = () => {
    const text = formatPackingListAsText(currentPackingList);
    navigator.clipboard.writeText(text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  // Print checklist
  const handlePrint = () => {
    window.print();
  };

  // Handle create new trip
  const handleCreateCustomTrip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCity.trim()) return;

    const durationInfo = calculateTripDuration(
      new Date(newStartDate).toISOString(),
      new Date(newEndDate).toISOString()
    );

    const trip: TripEvent = {
      id: `trip-custom-${Date.now()}`,
      title: newTitle.trim(),
      destination: newDestination.trim() || `${newCity.trim()}, Destination`,
      city: newCity.trim(),
      startDate: new Date(newStartDate).toISOString(),
      endDate: new Date(newEndDate).toISOString(),
      totalDays: Math.max(1, durationInfo.days),
      totalNights: Math.max(0, durationInfo.nights),
      formality: newFormality,
      isCalendarDetected: false,
      description: `Custom itinerary for ${durationInfo.days} days in ${newCity.trim()}.`,
    };

    setCustomTrips((prev) => [trip, ...prev]);
    setSelectedTripId(trip.id);
    setIsAddTripModalOpen(false);
    setNewTitle('');
  };

  // Progress stats
  const progress = calculatePackingProgress(currentPackingList.items);

  // Categories config
  const categories: { key: Category | 'travel_essentials'; label: string; icon: string }[] = [
    { key: 'tops', label: 'Tops & Shirts', icon: '👔' },
    { key: 'bottoms', label: 'Trousers & Bottoms', icon: '👖' },
    { key: 'outerwear', label: 'Outerwear & Coats', icon: '🧥' },
    { key: 'footwear', label: 'Footwear', icon: '👞' },
    { key: 'accessories', label: 'Accessories', icon: '🧣' },
    { key: 'travel_essentials', label: 'Travel Essentials & Tech', icon: '🧳' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Concierge Trip Banner & Switcher */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-700/80 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Sartorial Travel Concierge</span>
              </span>

              {activeTrip.isCalendarDetected && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Calendar Synced Event</span>
                </span>
              )}

              <span className="text-xs text-slate-300 font-mono">
                {activeTrip.totalDays} Days • {activeTrip.totalNights} Nights
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-amber-100 tracking-tight">
              {activeTrip.title}
            </h1>

            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Curated capsule wardrobe selected directly from your wardrobe. Perfectly calibrated for{' '}
              <strong className="text-white font-semibold">{activeTrip.city}</strong> forecast conditions and{' '}
              <strong className="text-amber-200 font-semibold">{activeTrip.formality.replace('_', ' ')}</strong>{' '}
              itinerary engagements.
            </p>

            <div className="flex items-center space-x-4 text-xs text-slate-400 pt-1">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{activeTrip.destination}</span>
              </span>
              <span className="flex items-center space-x-1">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {new Date(activeTrip.startDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} –{' '}
                  {new Date(activeTrip.endDate).toLocaleDateString('en-GB', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </span>
            </div>
          </div>

          {/* Quick Trip Selector Dropdown & Actions */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[280px]">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-700/70 backdrop-blur-xs">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Switch Trip / Event:
              </label>
              <select
                value={selectedTripId}
                onChange={(e) => setSelectedTripId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                {allTrips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({t.city} • {t.totalDays}D)
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsAddTripModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Plan Custom Trip</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Destination Weather & Luggage Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Destination Weather Forecast Card */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                {destinationWeather.condition === 'rain' ? (
                  <CloudRain className="w-4 h-4 text-sky-600" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </div>
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-base">
                  Destination Weather: {destinationWeather.city}
                </h3>
                <p className="text-xs text-slate-500">{destinationWeather.summary}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-right">
              <div>
                <span className="text-2xl font-bold font-serif text-slate-900">
                  {destinationWeather.averageTempC}°C
                </span>
                <span className="block text-[10px] text-slate-400 font-mono">
                  {destinationWeather.temperatureLowC}°C / {destinationWeather.temperatureHighC}°C
                </span>
              </div>
              <div
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 ${
                  destinationWeather.precipitationProbability >= 40
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5" />
                <span>{destinationWeather.precipitationProbability}% Rain</span>
              </div>
            </div>
          </div>

          {/* Daily Forecast Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {destinationWeather.forecastDays.map((f) => (
              <div key={f.dayOffset} className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 text-center">
                <span className="text-[11px] font-bold text-slate-700 block">{f.dateFormatted}</span>
                <div className="my-1.5 flex items-center justify-center">
                  {f.condition === 'rain' ? (
                    <CloudRain className="w-5 h-5 text-blue-500" />
                  ) : f.condition === 'windy' ? (
                    <Wind className="w-5 h-5 text-teal-600" />
                  ) : (
                    <Sun className="w-5 h-5 text-amber-500" />
                  )}
                </div>
                <div className="text-xs font-semibold text-slate-900 font-mono">
                  {f.lowC}° – {f.highC}°C
                </div>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">{f.precipitationProbability}% rain</span>
              </div>
            ))}

          </div>

          {/* Jeeves's Bespoke Advisory Quote */}
          <div className="bg-amber-50/80 rounded-2xl p-4 border border-amber-200/70 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800">
                Jeeves Concierge Travel Advisory:
              </span>
              <p className="leading-relaxed">{destinationWeather.packingAdvisory}</p>
            </div>
          </div>
        </div>

        {/* Recommended Luggage & Packing Readiness Card */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Luggage className="w-4 h-4 text-amber-700" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-base">Luggage Advice</h3>
                <p className="text-xs text-slate-500">Duration-optimized carriage</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{currentPackingList.luggage.bagType}</span>
                <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                  {currentPackingList.luggage.capacity}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">{currentPackingList.luggage.description}</p>
            </div>

            {/* Packing tip */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[11px] text-slate-700">
              <strong className="text-slate-900 block mb-0.5">Concierge Packing Strategy:</strong>
              {currentPackingList.luggage.packingTip}
            </div>
          </div>

          {/* Packing Progress Bar & Metrics */}
          <div className="pt-3 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900">
                Pack Readiness: {progress.packed} / {progress.total} Packed
              </span>
              <span className="font-mono font-bold text-amber-700">{progress.percentage}%</span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progress.isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-600'
                }`}
                style={{ width: `${progress.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleSetAllPacked(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Mark All Packed
              </button>
              <button
                onClick={() => handleSetAllPacked(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:underline"
              >
                Reset Checklist
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Checklist Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-100/90 p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center space-x-2">
          <Shirt className="w-4 h-4 text-slate-700" />
          <h2 className="font-serif font-bold text-slate-900 text-lg">
            Recommended Wardrobe Pieces & Travel Checklist
          </h2>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">
            {currentPackingList.items.length} items
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyChecklist}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs hover:bg-slate-50 transition-colors"
            title="Copy checklist to clipboard"
          >
            {copyFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Checklist Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Checklist</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-xl flex items-center space-x-1.5 shadow-xs hover:bg-slate-50 transition-colors"
            title="Print packing list"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Print</span>
          </button>

          {onOpenShopper && (
            <button
              onClick={onOpenShopper}
              className="text-xs font-bold text-amber-900 bg-amber-100/80 hover:bg-amber-200 border border-amber-300 px-3.5 py-2 rounded-xl flex items-center space-x-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
              <span>Shop Missing Items</span>
            </button>
          )}
        </div>
      </div>

      {/* Category Breakdown & Item Cards */}
      <div className="space-y-6">
        {categories.map((cat) => {
          const itemsInCat = currentPackingList.items.filter((i) => i.category === cat.key);
          if (itemsInCat.length === 0) return null;

          const catPackedCount = itemsInCat.filter((i) => i.isPacked).length;

          return (
            <div
              key={cat.key}
              className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4 transition-all"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{cat.icon}</span>
                  <h3 className="font-serif font-bold text-slate-900 text-base">{cat.label}</h3>
                  <span className="text-xs text-slate-400">
                    ({catPackedCount}/{itemsInCat.length} packed)
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-500">
                  {cat.key === 'tops' && `${activeTrip.totalDays} Days + 1 Rotation`}
                  {cat.key === 'bottoms' && `1 pair per 2 days`}
                  {cat.key === 'outerwear' && `${destinationWeather.city} Weather Layer`}
                  {cat.key === 'footwear' && `Transit & Engagement`}
                  {cat.key === 'travel_essentials' && `Security Compliant`}
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {itemsInCat.map((packItem) => {
                  const isChecked = packItem.isPacked;
                  const wardrobeItem = packItem.item;

                  return (
                    <div
                      key={packItem.id}
                      onClick={() => handleTogglePacked(packItem.id)}
                      className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                        isChecked
                          ? 'bg-slate-50/70 border-slate-200 opacity-70'
                          : 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePacked(packItem.id);
                        }}
                        className="mt-0.5 flex-shrink-0 text-slate-400 hover:text-amber-600 focus:outline-hidden"
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 group-hover:text-amber-500" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4
                            className={`font-semibold text-sm truncate ${
                              isChecked ? 'line-through text-slate-500' : 'text-slate-900 font-serif'
                            }`}
                          >
                            {wardrobeItem ? wardrobeItem.name : packItem.customName}
                          </h4>

                          {wardrobeItem && (
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-slate-300 flex-shrink-0"
                              style={{ backgroundColor: wardrobeItem.colorHex }}
                              title={wardrobeItem.color}
                            />
                          )}
                        </div>

                        {wardrobeItem && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                            <span className="font-medium text-slate-700">{wardrobeItem.material}</span>
                            <span>•</span>
                            <span>{wardrobeItem.color}</span>
                            <span>•</span>
                            <span className="capitalize">{wardrobeItem.formality.replace('_', ' ')}</span>

                            {wardrobeItem.weatherTags.includes('rain_friendly') && (
                              <span className="px-1.5 py-0.2 rounded-sm bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                🌧️ Rain-Ready
                              </span>
                            )}
                            {wardrobeItem.warmth >= 4 && (
                              <span className="px-1.5 py-0.2 rounded-sm bg-orange-50 text-orange-700 font-semibold text-[10px]">
                                ❄️ Heavy Warmth
                              </span>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-slate-500 leading-relaxed pt-0.5">{packItem.reason}</p>

                        {/* Interactive actions for item */}
                        <div className="flex items-center space-x-3 pt-2 text-[11px]" onClick={(e) => e.stopPropagation()}>
                          {wardrobeItem && (
                            <button
                              onClick={() => setSwapModalItem(packItem)}
                              className="text-amber-700 hover:text-amber-900 font-semibold flex items-center space-x-1 hover:underline"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Swap Item</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleRemoveItem(packItem.id)}
                            className="text-slate-400 hover:text-rose-600 flex items-center space-x-1"
                            title="Remove from packing checklist"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Add Custom Item Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center space-x-2">
          <Plus className="w-4 h-4 text-amber-600" />
          <h3 className="font-serif font-bold text-slate-900 text-base">Add Personalized Packing Item</h3>
        </div>

        <form onSubmit={handleAddCustomItem} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={customItemInput}
            onChange={(e) => setCustomItemInput(e.target.value)}
            placeholder="e.g. Noise-cancelling headphones, Running trainers, Passport pouch..."
            className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
          />

          <select
            value={customItemCategory}
            onChange={(e) => setCustomItemCategory(e.target.value as Category | 'travel_essentials')}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
          >
            <option value="travel_essentials">Travel Essentials & Tech</option>
            <option value="tops">Tops & Shirts</option>
            <option value="bottoms">Trousers & Bottoms</option>
            <option value="outerwear">Outerwear & Coats</option>
            <option value="footwear">Footwear</option>
            <option value="accessories">Accessories</option>
          </select>

          <button
            type="submit"
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Item</span>
          </button>
        </form>
      </div>

      {/* Item Swap Modal */}
      {swapModalItem && swapModalItem.item && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-serif font-bold text-slate-900 text-lg">Swap Wardrobe Piece</h3>
                <p className="text-xs text-slate-500">
                  Replacing: <span className="font-semibold">{swapModalItem.item.name}</span> (
                  {swapModalItem.item.category})
                </p>
              </div>
              <button
                onClick={() => setSwapModalItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select any piece from your wardrobe to swap into this slot.
            </p>

            <div className="space-y-2">
              {wardrobe
                .filter((w) => w.category === swapModalItem.category && w.id !== swapModalItem.wardrobeItemId)
                .map((alternate) => (
                  <div
                    key={alternate.id}
                    onClick={() => handleSwapItem(swapModalItem.id, alternate)}
                    className="p-3.5 rounded-2xl border border-slate-200 hover:border-amber-500 hover:bg-amber-50/40 cursor-pointer flex items-center justify-between transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-slate-300"
                          style={{ backgroundColor: alternate.colorHex }}
                        />
                        <span className="font-serif font-bold text-slate-900 text-sm">{alternate.name}</span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center space-x-2">
                        <span>{alternate.material}</span>
                        <span>•</span>
                        <span className="capitalize">{alternate.formality.replace('_', ' ')}</span>
                        <span>•</span>
                        <span>Warmth: {alternate.warmth}/5</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl transition-all"
                    >
                      Choose
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Plan Custom Trip Modal */}
      {isAddTripModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Plane className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif font-bold text-slate-900 text-lg">Plan Custom Trip & Packing List</h3>
              </div>
              <button
                onClick={() => setIsAddTripModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomTrip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Trip / Event Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Zurich Private Banking Conference"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Destination City</label>
                  <select
                    value={newCity}
                    onChange={(e) => {
                      setNewCity(e.target.value);
                      if (!newDestination || newDestination.includes('The Balmoral')) {
                        setNewDestination(`${e.target.value} Downtown Hotel`);
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Edinburgh">Edinburgh (Scotland)</option>
                    <option value="Paris">Paris (France)</option>
                    <option value="Zurich">Zurich (Switzerland)</option>
                    <option value="New York">New York (USA)</option>
                    <option value="Milan">Milan (Italy)</option>
                    <option value="Berlin">Berlin (Germany)</option>
                    <option value="Cotswolds">Cotswolds (UK)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Predominant Formality</label>
                  <select
                    value={newFormality}
                    onChange={(e) => setNewFormality(e.target.value as Formality)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="business_casual">Business Casual</option>
                    <option value="business_formal">Business Formal</option>
                    <option value="smart_casual">Smart Casual</option>
                    <option value="formal">Black Tie / Gala Formal</option>
                    <option value="casual">Casual Weekend</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Location / Hotel</label>
                <input
                  type="text"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="e.g. Baur au Lac, Talstrasse 1, 8001 Zurich"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddTripModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-sm"
                >
                  Generate Packing List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
