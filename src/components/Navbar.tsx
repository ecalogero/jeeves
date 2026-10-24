import React from 'react';
import { Sparkles, Calendar, Layers, Navigation, Sliders, LogIn, LogOut, CheckCircle2, ShoppingBag } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'stylist' | 'wardrobe' | 'shopper' | 'commute' | 'trainer';
  setActiveTab: (tab: 'stylist' | 'wardrobe' | 'shopper' | 'commute' | 'trainer') => void;
  wardrobeCount: number;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isLoggingIn: boolean;
  trainingIterations: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  wardrobeCount,
  user,
  onLogin,
  onLogout,
  isLoggingIn,
  trainingIterations,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('stylist')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 flex items-center justify-center shadow-md shadow-amber-900/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-serif text-lg font-bold tracking-tight text-white block leading-tight">
                Jeeves
              </span>
            </div>
          </div>

          {/* Nav Tabs */}
          <nav className="hidden md:flex items-center space-x-1" aria-label="Main Navigation">
            <button
              onClick={() => setActiveTab('stylist')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'stylist'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Stylist</span>
            </button>

            <button
              onClick={() => setActiveTab('wardrobe')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'wardrobe'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Wardrobe</span>
              <span className="ml-1 text-[11px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full border border-slate-700">
                {wardrobeCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('shopper')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'shopper'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>Personal Shopper</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-500/30 font-semibold">
                AI
              </span>
            </button>

            <button
              onClick={() => setActiveTab('commute')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'commute'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Navigation className="w-4 h-4" />
              <span>Commute</span>
            </button>

            <button
              onClick={() => setActiveTab('trainer')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'trainer'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Preferences</span>
              {trainingIterations > 0 && (
                <span className="ml-1 text-[10px] bg-amber-500/30 text-amber-300 font-mono px-1.5 py-0.5 rounded-full">
                  +{trainingIterations}
                </span>
              )}
            </button>
          </nav>

          {/* Google Calendar Auth Control */}
          <div className="flex items-center space-x-3">
            {user ? (
              <div className="flex items-center space-x-3 bg-slate-800/80 border border-slate-700/80 rounded-full px-3 py-1.5">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName || 'User'} className="w-6 h-6 rounded-full" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center font-bold">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-semibold text-white truncate max-w-[120px]">
                    {user.displayName || 'Calendar Sync'}
                  </p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Synced
                  </p>
                </div>
                <button
                  onClick={onLogout}
                  title="Disconnect Google Calendar"
                  aria-label="Disconnect Google Calendar"
                  className="text-slate-400 hover:text-rose-400 p-1 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="flex items-center space-x-2 bg-white hover:bg-slate-100 text-slate-800 font-medium text-xs px-3.5 py-2 rounded-lg border border-slate-200 shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                {/* Official Google Icon */}
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span className="font-sans font-semibold">
                  {isLoggingIn ? 'Connecting...' : 'Login'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-around py-2.5 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('stylist')}
            className={`flex flex-col items-center py-1 px-1.5 rounded ${
              activeTab === 'stylist' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Calendar className="w-4 h-4 mb-1" />
            <span>Stylist</span>
          </button>
          <button
            onClick={() => setActiveTab('wardrobe')}
            className={`flex flex-col items-center py-1 px-1.5 rounded ${
              activeTab === 'wardrobe' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Layers className="w-4 h-4 mb-1" />
            <span>Wardrobe</span>
          </button>
          <button
            onClick={() => setActiveTab('shopper')}
            className={`flex flex-col items-center py-1 px-1.5 rounded ${
              activeTab === 'shopper' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <ShoppingBag className="w-4 h-4 mb-1" />
            <span>Shopper</span>
          </button>
          <button
            onClick={() => setActiveTab('commute')}
            className={`flex flex-col items-center py-1 px-1.5 rounded ${
              activeTab === 'commute' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Navigation className="w-4 h-4 mb-1" />
            <span>Commute</span>
          </button>
          <button
            onClick={() => setActiveTab('trainer')}
            className={`flex flex-col items-center py-1 px-1.5 rounded ${
              activeTab === 'trainer' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Sliders className="w-4 h-4 mb-1" />
            <span>Train</span>
          </button>
        </div>
      </div>
    </header>
  );
};

