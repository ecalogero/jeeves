import React, { useState } from 'react';
import { Plus, Search, Filter, Star, Trash2, Edit3, X, Check, Shirt, ShieldCheck, Thermometer } from 'lucide-react';
import { WardrobeItem, Category, Formality, WeatherTag } from '../types';

interface WardrobeCatalogProps {
  wardrobe: WardrobeItem[];
  onAddItem: (item: WardrobeItem) => void;
  onUpdateItem: (item: WardrobeItem) => void;
  onDeleteItem: (id: string) => void;
}

const CATEGORIES: { id: Category | 'all'; label: string }[] = [
  { id: 'all', label: 'All Items' },
  { id: 'tops', label: 'Tops' },
  { id: 'bottoms', label: 'Bottoms' },
  { id: 'outerwear', label: 'Outerwear' },
  { id: 'footwear', label: 'Footwear' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'one_piece', label: 'Suits & One-Piece' },
];

const FORMALITIES: { id: Formality | 'all'; label: string }[] = [
  { id: 'all', label: 'All Formalities' },
  { id: 'casual', label: 'Casual' },
  { id: 'smart_casual', label: 'Smart Casual' },
  { id: 'business_casual', label: 'Business Casual' },
  { id: 'business_formal', label: 'Business Formal' },
];

const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?w=600&auto=format&fit=crop&q=80', label: 'White Shirt' },
  { url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&auto=format&fit=crop&q=80', label: 'Navy Knit' },
  { url: 'https://images.unsplash.com/photo-1544923246-77307dd654cb?w=600&auto=format&fit=crop&q=80', label: 'Trench Coat' },
  { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=600&auto=format&fit=crop&q=80', label: 'Blazer' },
  { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=600&auto=format&fit=crop&q=80', label: 'Wool Trousers' },
  { url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=600&auto=format&fit=crop&q=80', label: 'Chinos' },
  { url: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=600&auto=format&fit=crop&q=80', label: 'Chelsea Boots' },
  { url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=600&auto=format&fit=crop&q=80', label: 'Sneakers' },
  { url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=600&auto=format&fit=crop&q=80', label: 'Umbrella' },
  { url: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&auto=format&fit=crop&q=80', label: 'Navy Suit' },
];

export const WardrobeCatalog: React.FC<WardrobeCatalogProps> = ({
  wardrobe,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<Category | 'all'>('all');
  const [selectedFormality, setSelectedFormality] = useState<Formality | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [rainFilterOnly, setRainFilterOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WardrobeItem | null>(null);

  // Form State for modal
  const [formData, setFormData] = useState<Partial<WardrobeItem>>({
    name: '',
    category: 'tops',
    subcategory: '',
    formality: 'smart_casual',
    warmth: 3,
    weatherTags: ['all_weather'],
    color: 'Navy',
    colorHex: '#1E293B',
    material: 'Cotton',
    imageUrl: PRESET_IMAGES[0].url,
    isFavorite: false,
  });

  const filteredWardrobe = wardrobe.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedFormality !== 'all' && item.formality !== selectedFormality) return false;
    if (rainFilterOnly && !item.weatherTags.includes('rain_friendly')) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match = item.name.toLowerCase().includes(q) ||
        item.subcategory.toLowerCase().includes(q) ||
        item.color.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'tops',
      subcategory: 'Shirt',
      formality: 'smart_casual',
      warmth: 3,
      weatherTags: ['all_weather'],
      color: 'Navy',
      colorHex: '#1E293B',
      material: 'Cotton',
      imageUrl: PRESET_IMAGES[0].url,
      isFavorite: false,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: WardrobeItem) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;

    if (editingItem) {
      onUpdateItem({
        ...(formData as WardrobeItem),
        id: editingItem.id,
      });
    } else {
      onAddItem({
        ...(formData as WardrobeItem),
        id: `item-${Date.now()}`,
      });
    }
    setIsModalOpen(false);
  };

  const handleToggleFavorite = (item: WardrobeItem) => {
    onUpdateItem({
      ...item,
      isFavorite: !item.isFavorite,
    });
  };

  const toggleWeatherTag = (tag: WeatherTag) => {
    const current = formData.weatherTags || [];
    if (current.includes(tag)) {
      setFormData({ ...formData, weatherTags: current.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, weatherTags: [...current, tag] });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
            Your Curated Wardrobe
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {wardrobe.length} cataloged pieces indexed for weather adaptation, formality matching, and travel comfort.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium text-sm shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Add Wardrobe Item</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items, fabrics, colors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Formality Selector & Rain Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedFormality}
            onChange={(e) => setSelectedFormality(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
          >
            {FORMALITIES.map(f => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>

          <button
            onClick={() => setRainFilterOnly(!rainFilterOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center space-x-1.5 ${
              rainFilterOnly
                ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>🌧️ Rain Ready</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="mt-4 flex items-center space-x-1.5 overflow-x-auto pb-2 scrollbar-none">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Wardrobe Grid */}
      {filteredWardrobe.length === 0 ? (
        <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl mt-6">
          <Shirt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-serif font-bold text-slate-800 text-lg">No garments match your filters</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Try resetting your search query or add a new piece to expand your catalog.
          </p>
          <button
            onClick={() => { setSelectedCategory('all'); setSelectedFormality('all'); setSearchQuery(''); setRainFilterOnly(false); }}
            className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mt-6">
          {filteredWardrobe.map(item => (
            <div
              key={item.id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
                    <Shirt className="w-12 h-12" />
                  </div>
                )}

                {/* Formality Tag Overlay */}
                <div className="absolute top-2.5 left-2.5">
                  <span className="text-[10px] font-bold tracking-wide uppercase px-2 py-0.5 rounded-full bg-slate-900/80 text-white backdrop-blur-sm shadow-sm">
                    {item.formality.replace('_', ' ')}
                  </span>
                </div>

                {/* Favorite Star Button */}
                <button
                  onClick={() => handleToggleFavorite(item)}
                  aria-label={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  className={`absolute top-2.5 right-2.5 p-1.5 rounded-full backdrop-blur-md shadow-sm transition-all ${
                    item.isFavorite
                      ? 'bg-amber-400 text-white'
                      : 'bg-white/80 hover:bg-white text-slate-400 hover:text-amber-500'
                  }`}
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>

              {/* Item Details */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="capitalize font-medium">{item.category.replace('_', ' ')} &bull; {item.subcategory}</span>
                    <div className="flex items-center space-x-1" title={`Warmth: ${item.warmth}/5`}>
                      <Thermometer className="w-3 h-3 text-amber-600" />
                      <span className="font-mono text-[10px] font-bold text-slate-700">{item.warmth}/5</span>
                    </div>
                  </div>

                  <h3 className="font-serif font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-amber-800 transition-colors">
                    {item.name}
                  </h3>

                  <div className="flex items-center space-x-2 mt-2">
                    <span
                      className="w-3 h-3 rounded-full border border-slate-300 shrink-0"
                      style={{ backgroundColor: item.colorHex }}
                      title={item.color}
                    />
                    <span className="text-xs text-slate-600 truncate">{item.color}</span>
                    <span className="text-slate-300">&bull;</span>
                    <span className="text-xs text-slate-500 truncate">{item.material}</span>
                  </div>

                  {/* Weather Badges */}
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {item.weatherTags.map(tag => (
                      <span
                        key={tag}
                        className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                          tag === 'rain_friendly'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : tag === 'cold'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : tag === 'sunny'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {tag === 'rain_friendly' ? '🌧️ Rain' : tag === 'cold' ? '❄️ Cold' : tag === 'sunny' ? '☀️ Warm' : tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end space-x-1.5">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                    title="Edit item"
                    aria-label={`Edit ${item.name}`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete item"
                    aria-label={`Delete ${item.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-serif font-bold text-slate-900 text-base">
                {editingItem ? 'Edit Wardrobe Piece' : 'Add New Wardrobe Piece'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Item Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Navy Merino Wool Turtleneck"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as Category })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    <option value="tops">Tops</option>
                    <option value="bottoms">Bottoms</option>
                    <option value="outerwear">Outerwear</option>
                    <option value="footwear">Footwear</option>
                    <option value="accessories">Accessories</option>
                    <option value="one_piece">Suits / One-Piece</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Formality Level
                  </label>
                  <select
                    value={formData.formality}
                    onChange={e => setFormData({ ...formData, formality: e.target.value as Formality })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                  >
                    <option value="casual">Casual</option>
                    <option value="smart_casual">Smart Casual</option>
                    <option value="business_casual">Business Casual</option>
                    <option value="business_formal">Business Formal</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Material / Fabric
                  </label>
                  <input
                    type="text"
                    value={formData.material || ''}
                    onChange={e => setFormData({ ...formData, material: e.target.value })}
                    placeholder="e.g. 100% Cashmere"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Color &amp; Hex
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.colorHex || '#1E293B'}
                      onChange={e => setFormData({ ...formData, colorHex: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={formData.color || ''}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      placeholder="e.g. Charcoal"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Warmth Slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Warmth Rating: {formData.warmth}/5
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {formData.warmth === 1
                      ? 'Light Summer'
                      : formData.warmth === 2
                      ? 'Spring Mild'
                      : formData.warmth === 3
                      ? 'Moderate Layer'
                      : formData.warmth === 4
                      ? 'Cold Autumn'
                      : 'Heavy Winter Shield'}
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={formData.warmth || 3}
                  onChange={e => setFormData({ ...formData, warmth: parseInt(e.target.value) })}
                  className="w-full accent-amber-600 cursor-pointer"
                />
              </div>

              {/* Weather Tags */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Weather Suitability
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['rain_friendly', 'cold', 'sunny', 'windy', 'breathable', 'all_weather'] as WeatherTag[]).map(tag => {
                    const isSelected = formData.weatherTags?.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleWeatherTag(tag)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {tag === 'rain_friendly' ? '🌧️ Rain Friendly' : tag === 'cold' ? '❄️ Cold Weather' : tag === 'sunny' ? '☀️ Hot/Sunny' : tag === 'windy' ? '💨 Wind Resistant' : tag === 'breathable' ? '🍃 Breathable' : '✨ All Weather'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Image Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Photo / Preset Thumbnail
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {PRESET_IMAGES.map((img, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setFormData({ ...formData, imageUrl: img.url })}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        formData.imageUrl === img.url ? 'border-amber-600 scale-95 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      {formData.imageUrl === img.url && (
                        <div className="absolute inset-0 bg-amber-600/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Image URL input option */}
              <div>
                <input
                  type="url"
                  placeholder="Or paste custom image URL..."
                  value={formData.imageUrl || ''}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                >
                  {editingItem ? 'Save Changes' : 'Add to Wardrobe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
