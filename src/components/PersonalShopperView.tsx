import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Search,
  ExternalLink,
  PlusCircle,
  Check,
  AlertTriangle,
  ShieldCheck,
  Tag,
  TrendingUp,
  RefreshCw,
  Compass,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  Globe,
  Info
} from 'lucide-react';
import {
  WardrobeItem,
  Meeting,
  WeatherCondition,
  UserPreferences,
  ShopperRecommendation,
  WardrobeGap,
  Category
} from '../types';
import { analyzeWardrobeGaps } from '../utils/shopperEngine';

interface PersonalShopperViewProps {
  wardrobe: WardrobeItem[];
  meetings: Meeting[];
  weather: WeatherCondition | null;
  preferences: UserPreferences;
  onAddToWardrobe: (item: WardrobeItem) => void;
  onOpenWardrobeTab?: () => void;
}

export const PersonalShopperView: React.FC<PersonalShopperViewProps> = ({
  wardrobe,
  meetings,
  weather,
  preferences,
  onAddToWardrobe,
  onOpenWardrobeTab,
}) => {
  // Gap analysis pure calculation
  const gapAnalysis = useMemo(() => {
    return analyzeWardrobeGaps(wardrobe, meetings, weather, preferences);
  }, [wardrobe, meetings, weather, preferences]);

  // Query & filter state
  const [userQuery, setUserQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<ShopperRecommendation[]>([]);
  const [webSources, setWebSources] = useState<{ title: string; url: string }[]>([]);
  const [addedItemIds, setAddedItemIds] = useState<Set<string>>(new Set());
  const [lastConsultedQuery, setLastConsultedQuery] = useState<string>('');

  // Fetch recommendations from server-side Gemini Search Grounded endpoint
  const fetchRecommendations = async (customQuery?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/shopper/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          meetings,
          wardrobe,
          preferences,
          gaps: gapAnalysis.gaps,
          userQuery: customQuery !== undefined ? customQuery : userQuery,
        }),
      });

      if (!response.ok) {
        throw new Error(`Shopper agent service responded with ${response.status}`);
      }

      const data = await response.json();
      if (data.recommendations && Array.isArray(data.recommendations)) {
        setRecommendations(data.recommendations);
        if (data.webSources) {
          setWebSources(data.webSources);
        }
        setLastConsultedQuery(customQuery !== undefined ? customQuery : userQuery);
      } else {
        throw new Error('Received invalid recommendations payload.');
      }
    } catch (err: any) {
      console.error('Error contacting personal shopper agent:', err);
      setError(err.message || 'Unable to consult live shopping sources. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount if no recommendations exist
  useEffect(() => {
    if (recommendations.length === 0 && !isLoading) {
      fetchRecommendations();
    }
  }, []);

  // Handle adding recommended item into active wardrobe catalog
  const handleAddRecToWardrobe = (rec: ShopperRecommendation) => {
    const newItem: WardrobeItem = {
      id: `bought-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: `${rec.brand} ${rec.title}`,
      category: rec.category,
      subcategory: rec.subcategory,
      formality: rec.formality,
      warmth: rec.warmth,
      weatherTags: rec.weatherTags,
      color: rec.color,
      colorHex: rec.colorHex,
      material: rec.material,
      imageUrl: rec.imageUrl,
      isFavorite: true,
    };

    onAddToWardrobe(newItem);
    setAddedItemIds(prev => new Set(prev).add(rec.id));
  };

  // Filter recommendations by category
  const filteredRecommendations = useMemo(() => {
    if (selectedCategoryFilter === 'all') return recommendations;
    return recommendations.filter(r => r.category === selectedCategoryFilter);
  }, [recommendations, selectedCategoryFilter]);

  // Quick prompt suggestions
  const quickPrompts = [
    { label: 'Waterproof Commuter Boots', query: 'Waterproof Chelsea boots with rubber Dainite sole for wet London commute' },
    { label: 'Formal Camel Overcoat', query: 'Camel wool cashmere tailored overcoat for Canary Wharf executive meetings' },
    { label: 'Lightweight Merino Knit', query: 'Fine gauge merino wool rollneck or crewneck sweater in charcoal or navy' },
    { label: 'Travel Trousers', query: 'Wrinkle-resistant tailored stretch wool trousers for long transit days' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950/40 rounded-3xl p-6 sm:p-8 border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Grounded Fashion Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-white tracking-tight">
              Jeeves Personal Shopper
            </h1>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Autonomous acquisition advisor. Analyzes your calendar commitments, current wardrobe pieces, and London weather, searching live fashion retailers to find exact pieces that fill your wardrobe gaps.
            </p>
          </div>

          {/* Readiness Score Card */}
          <div className="flex items-center gap-4 bg-slate-800/80 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-inner">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-full bg-slate-900 border-2 border-amber-500/40 shadow-md">
              <span className="text-xl font-bold font-serif text-amber-300">
                {gapAnalysis.overallReadinessScore}
              </span>
              <span className="text-[10px] text-slate-400 absolute bottom-2">/100</span>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Wardrobe Readiness</div>
              <div className="text-sm font-semibold text-white flex items-center gap-1.5 mt-0.5">
                {gapAnalysis.gaps.length === 0 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Fully Optimized
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> {gapAnalysis.gaps.length} Strategic Gap{gapAnalysis.gaps.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 mt-1 max-w-[200px] truncate" title={gapAnalysis.topPriority}>
                Top focus: {gapAnalysis.topPriority}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wardrobe Gaps & Meeting Deficiencies Panel */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-serif font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-amber-600" />
              <span>Wardrobe Gap &amp; Meeting Deficiencies</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Identified by cross-referencing your upcoming {meetings.length} calendar meetings with {wardrobe.length} cataloged pieces.
            </p>
          </div>
          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg self-start sm:self-auto">
            {gapAnalysis.analysisSummary}
          </div>
        </div>

        {gapAnalysis.gaps.length === 0 ? (
          <div className="py-8 text-center text-slate-500">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-slate-800">Your wardrobe is fully prepared!</p>
            <p className="text-xs mt-1">No critical gaps detected for your current schedule and weather outlook.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            {gapAnalysis.gaps.map(gap => (
              <div
                key={gap.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-amber-400/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        gap.severity === 'high'
                          ? 'bg-rose-100 text-rose-700 border border-rose-200'
                          : gap.severity === 'medium'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : 'bg-blue-100 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {gap.severity} Priority
                    </span>
                    <span className="text-xs text-slate-500 capitalize">{gap.suggestedCategory}</span>
                  </div>
                  <h3 className="font-semibold text-sm text-slate-900 group-hover:text-amber-800 transition-colors">
                    {gap.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    {gap.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500">
                    Target: <span className="text-slate-800 capitalize">{gap.suggestedSubcategory}</span>
                  </span>
                  <button
                    onClick={() => {
                      const query = `Find ${gap.suggestedSubcategory} for ${gap.targetFormality || 'business'} meeting in London`;
                      setUserQuery(query);
                      fetchRecommendations(query);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    <span>Find piece</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shopper Agent Interactive Consultation Bar */}
      <section className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-md text-white space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-white">Ask Jeeves to Find Specific Items</h3>
              <p className="text-xs text-slate-400">
                Grounded search across luxury houses, British heritage tailors, and smart commuter brands.
              </p>
            </div>
          </div>
          {lastConsultedQuery && (
            <div className="text-xs text-amber-300/80 bg-amber-950/40 border border-amber-700/40 px-3 py-1 rounded-full truncate max-w-xs">
              Last search: "{lastConsultedQuery}"
            </div>
          )}
        </div>

        {/* Input & Search Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            fetchRecommendations();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={userQuery}
              onChange={e => setUserQuery(e.target.value)}
              placeholder="e.g. Find waterproof Chelsea boots under £250, or breathable summer blazer..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-semibold px-6 py-3 rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 text-sm whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching Retailers...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Consult Shopper</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Prompts Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          <span className="text-xs text-slate-400 font-medium">Suggestions:</span>
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setUserQuery(qp.query);
                fetchRecommendations(qp.query);
              }}
              className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-3 py-1 rounded-full transition-all"
            >
              {qp.label}
            </button>
          ))}
        </div>
      </section>

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchRecommendations()}
            className="text-xs font-semibold underline hover:text-rose-950"
          >
            Retry
          </button>
        </div>
      )}

      {/* Recommendations Display */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-serif font-bold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              <span>Recommended Acquisitions</span>
              <span className="text-xs font-normal text-slate-500 ml-1">
                ({filteredRecommendations.length} item{filteredRecommendations.length === 1 ? '' : 's'})
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live web grounded recommendations tailored to your calendar, warmth lean, and London transit comfort.
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['all', 'outerwear', 'footwear', 'tops', 'bottoms'].map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg capitalize transition-all whitespace-nowrap ${
                  selectedCategoryFilter === cat
                    ? 'bg-amber-600 text-white shadow-sm font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {cat === 'all' ? 'All Categories' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Loading Skeleton */}
        {isLoading && recommendations.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse space-y-4">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-16 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Recommendations Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecommendations.map(rec => {
            const isAdded = addedItemIds.has(rec.id);

            return (
              <div
                key={rec.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
              >
                {/* Header ribbon */}
                <div className="p-5 pb-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold tracking-wider uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        {rec.brand}
                      </span>
                      <h3 className="font-serif font-bold text-lg text-slate-900 mt-1 leading-snug group-hover:text-amber-800 transition-colors">
                        {rec.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-slate-900">{rec.priceEstimate}</div>
                      <div className="text-[11px] text-slate-500">{rec.retailer}</div>
                    </div>
                  </div>

                  {/* Attributes & Badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full capitalize">
                      {rec.category} • {rec.subcategory}
                    </span>
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full capitalize">
                      {rec.formality.replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                        style={{ backgroundColor: rec.colorHex }}
                      />
                      <span>{rec.color}</span>
                    </span>
                    {rec.weatherTags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          tag === 'rain_friendly'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {tag.replace('_', ' ')}
                      </span>
                    ))}
                  </div>

                  {/* Material specification */}
                  <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <span className="font-sans font-semibold text-slate-700">Material: </span>
                    {rec.material}
                  </div>

                  {/* Stylist Rationale */}
                  <div className="bg-amber-50/60 rounded-xl p-3.5 border border-amber-200/60 text-xs text-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>Why Jeeves Recommends This:</span>
                    </div>
                    <p className="leading-relaxed text-slate-700">{rec.reason}</p>
                    {rec.meetingFit && (
                      <div className="text-[11px] text-amber-800 font-medium pt-1">
                        Target meeting: <span className="font-semibold">{rec.meetingFit}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="bg-slate-50 border-t border-slate-100 px-5 py-3.5 flex items-center justify-between gap-3">
                  {/* Direct Buy / Search Link */}
                  <a
                    href={rec.searchQueryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-amber-800 transition-colors"
                    title={`Search and buy ${rec.brand} ${rec.title} online`}
                  >
                    <span>View at Retailer</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {/* Add to Wardrobe One-Click Button */}
                  <button
                    onClick={() => handleAddRecToWardrobe(rec)}
                    disabled={isAdded}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all shadow-sm ${
                      isAdded
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-default'
                        : 'bg-slate-900 hover:bg-slate-800 text-white active:scale-95'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Added to Wardrobe</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
                        <span>Add to Wardrobe</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty search results fallback */}
        {filteredRecommendations.length === 0 && !isLoading && (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="font-serif font-bold text-lg text-slate-900">No items match this category filter</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try switching back to "All Categories" or consult Jeeves with a custom search prompt above.
            </p>
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className="mt-2 text-xs font-semibold text-amber-700 hover:underline"
            >
              Reset to all categories
            </button>
          </div>
        )}
      </section>

      {/* Live Web Grounding Sources Info */}
      {webSources.length > 0 && (
        <section className="bg-slate-100/80 rounded-2xl p-5 border border-slate-200 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <Globe className="w-4 h-4 text-slate-600" />
            <span>Verified Live Fashion Market Sources</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Jeeves consulted the following verified fashion web sources via Google Search Grounding to authenticate product models, retail prices, and availability:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {webSources.slice(0, 6).map((src, sIdx) => (
              <a
                key={sIdx}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 bg-white px-2.5 py-1 rounded-md border border-slate-200 hover:border-amber-400 text-slate-700 hover:text-amber-900 transition-colors truncate max-w-xs"
              >
                <span className="truncate">{src.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
