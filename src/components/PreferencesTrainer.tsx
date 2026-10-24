import React from 'react';
import { Sliders, Sparkles, Thermometer, Shield, Heart, RotateCcw, Check, Footprints, Droplets } from 'lucide-react';
import { UserPreferences, OutfitSuggestion, WardrobeItem, WeatherCondition } from '../types';
import { generateOutfitSuggestions } from '../utils/outfitEngine';

interface PreferencesTrainerProps {
  preferences: UserPreferences;
  onUpdatePreferences: (updated: UserPreferences) => void;
  wardrobe: WardrobeItem[];
  weather: WeatherCondition;
}

const COLOR_OPTIONS = [
  { name: 'Navy', hex: '#1E293B' },
  { name: 'Charcoal', hex: '#334155' },
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Olive', hex: '#3F4E3A' },
  { name: 'Sand Khaki', hex: '#D4B996' },
  { name: 'Black', hex: '#000000' },
  { name: 'Camel Brown', hex: '#A3704C' },
  { name: 'Sky Blue', hex: '#BAE6FD' },
];

const FABRIC_OPTIONS = ['Polyester', 'Synthetic Blends', 'Heavy Acrylic', 'Scratchy Wool', 'Linen', 'Silk'];

export const PreferencesTrainer: React.FC<PreferencesTrainerProps> = ({
  preferences,
  onUpdatePreferences,
  wardrobe,
  weather,
}) => {
  const handleToggleColor = (color: string) => {
    const c = color.toLowerCase();
    const current = preferences.favoriteColors;
    if (current.includes(c)) {
      onUpdatePreferences({
        ...preferences,
        favoriteColors: current.filter(x => x !== c),
      });
    } else {
      onUpdatePreferences({
        ...preferences,
        favoriteColors: [...current, c],
      });
    }
  };

  const handleToggleFabric = (fabric: string) => {
    const f = fabric.toLowerCase();
    const current = preferences.dislikedMaterials;
    if (current.includes(f)) {
      onUpdatePreferences({
        ...preferences,
        dislikedMaterials: current.filter(x => x !== f),
      });
    } else {
      onUpdatePreferences({
        ...preferences,
        dislikedMaterials: [...current, f],
      });
    }
  };

  const handleReset = () => {
    onUpdatePreferences({
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
    });
  };

  // Generate live preview outfit using current trained preferences
  const previewOutfits = generateOutfitSuggestions(wardrobe, weather, 'business_casual', preferences);
  const topPreview = previewOutfits[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-amber-600" />
            <span>Train Your Personal Stylist</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Calibrate your personal temperature comfort, commute walking preferences, and style palette.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{preferences.feedbackCount} Training Iterations</span>
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-xl flex items-center space-x-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Warmth Tendency */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-slate-900">
              <Thermometer className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-serif font-bold text-base">Thermal Comfort Tendency</h3>
                <p className="text-xs text-slate-500">Do you typically feel warmer or colder than ambient forecast?</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'runs_hot', label: 'Runs Warm', desc: 'Lighter layers & breathable knits' },
                { id: 'balanced', label: 'Balanced', desc: 'Standard thermal calibration' },
                { id: 'runs_cold', label: 'Runs Cold', desc: 'Extra thermal protection & overcoats' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => onUpdatePreferences({ ...preferences, warmthLean: opt.id as any })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    preferences.warmthLean === opt.id
                      ? 'bg-amber-500/10 border-amber-600 text-slate-900 ring-2 ring-amber-500/20'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-xs">{opt.label}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Formality Bias */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-slate-900">
              <Shield className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="font-serif font-bold text-base">Formality Bias</h3>
                <p className="text-xs text-slate-500">How you prefer to dress relative to meeting expectations.</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { val: -1, label: 'Relaxed & Modern', desc: 'One notch more casual than dress code' },
                { val: 0, label: 'Exact Calibration', desc: 'Exact match to meeting dress code' },
                { val: 1, label: 'Sharp & Overdressed', desc: 'One notch more formal and elevated' },
              ].map(opt => (
                <button
                  key={opt.val}
                  onClick={() => onUpdatePreferences({ ...preferences, formalityLean: opt.val as any })}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    preferences.formalityLean === opt.val
                      ? 'bg-amber-500/10 border-amber-600 text-slate-900 ring-2 ring-amber-500/20'
                      : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <p className="font-bold text-xs">{opt.label}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Commute Walking Comfort & Rain Sensitivity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Commute Footwear Preference */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center space-x-2.5 text-slate-900">
                <Footprints className="w-5 h-5 text-purple-600" />
                <h3 className="font-serif font-bold text-base">Transit Footwear Comfort</h3>
              </div>
              <p className="text-xs text-slate-500">
                Prioritize clean commuter sneakers, loafers, or flat boots over stiff dress shoes when navigating London stations.
              </p>

              <button
                onClick={() => onUpdatePreferences({ ...preferences, commuteComfortPriority: !preferences.commuteComfortPriority })}
                className={`w-full mt-2 py-3 px-4 rounded-xl border font-bold text-xs flex items-center justify-between transition-all ${
                  preferences.commuteComfortPriority
                    ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <span>{preferences.commuteComfortPriority ? 'Prioritizing Commuter Comfort' : 'Standard Dress Shoes'}</span>
                {preferences.commuteComfortPriority && <Check className="w-4 h-4 text-purple-600" />}
              </button>
            </div>

            {/* Rain Sensitivity Threshold */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <div className="flex items-center space-x-2.5 text-slate-900">
                <Droplets className="w-5 h-5 text-blue-600" />
                <h3 className="font-serif font-bold text-base">Rain Sensitivity: {preferences.rainToleranceThreshold}%</h3>
              </div>
              <p className="text-xs text-slate-500">
                Precipitation probability trigger before mandating waterproof outerwear and umbrellas.
              </p>

              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={preferences.rainToleranceThreshold}
                onChange={e => onUpdatePreferences({ ...preferences, rainToleranceThreshold: parseInt(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer mt-2"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                <span>10% (Ultra cautious)</span>
                <span>80% (Risk taker)</span>
              </div>
            </div>
          </div>

          {/* Color & Material Preferences */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center space-x-2.5 text-slate-900">
              <Heart className="w-5 h-5 text-rose-500" />
              <div>
                <h3 className="font-serif font-bold text-base">Favorite Color Palette</h3>
                <p className="text-xs text-slate-500">Stylist prioritizes these color tones in outfit combinations.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(c => {
                const isSelected = preferences.favoriteColors.includes(c.name.toLowerCase());
                return (
                  <button
                    key={c.name}
                    onClick={() => handleToggleColor(c.name)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
                      isSelected
                        ? 'bg-amber-50 border-amber-400 text-amber-950 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span>{c.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-amber-600" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Live Feedback Simulation Preview */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-lg border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs">
              <span className="font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Live Stylist Preview
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Real-time Recalculation</span>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-xs text-slate-300">
                Notice how your trained parameters immediately recalibrate today&apos;s primary outfit suggestion:
              </p>

              {topPreview && (
                <div className="bg-white/10 rounded-2xl p-4 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm text-white">{topPreview.title}</h4>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-slate-900 font-bold">
                      {topPreview.score}% Fit
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300 italic leading-snug">
                    &ldquo;{topPreview.reasoning}&rdquo;
                  </p>

                  <div className="border-t border-white/10 pt-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                      Ensemble Pieces
                    </span>
                    {topPreview.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-200">
                        <span className="truncate max-w-[170px]">&bull; {item.name}</span>
                        <span className="text-[10px] text-slate-400">{item.color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trained Model Weights */}
              <div className="pt-3 border-t border-white/10 text-[11px] space-y-1 text-slate-400">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] block">
                  Model Weight Configuration
                </span>
                <div className="flex justify-between">
                  <span>Weather Adaptation:</span>
                  <span className="font-mono text-amber-300">{preferences.weights.weatherWeight.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Formality Calibration:</span>
                  <span className="font-mono text-amber-300">{preferences.weights.formalityWeight.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Commute Footwear Comfort:</span>
                  <span className="font-mono text-amber-300">{preferences.weights.comfortWeight.toFixed(2)}x</span>
                </div>
                <div className="flex justify-between">
                  <span>Color &amp; Favorite Bias:</span>
                  <span className="font-mono text-amber-300">{preferences.weights.favoriteWeight.toFixed(2)}x</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
