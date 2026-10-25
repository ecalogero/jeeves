import React, { useState } from 'react';
import { X, RefreshCw, Link, CheckCircle2, AlertCircle } from 'lucide-react';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncGoogle: () => Promise<void>;
  onSyncMicrosoft: () => Promise<void>;
  onSyncIcs: (url: string) => Promise<void>;
  activeSource: 'google' | 'microsoft' | 'ics' | null;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncGoogle,
  onSyncMicrosoft,
  onSyncIcs,
  activeSource,
}) => {
  const [icsUrl, setIcsUrl] = useState('');
  const [loading, setLoading] = useState<'google' | 'microsoft' | 'ics' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handle = async (source: 'google' | 'microsoft' | 'ics') => {
    setError(null);
    setLoading(source);
    try {
      if (source === 'google') await onSyncGoogle();
      else if (source === 'microsoft') await onSyncMicrosoft();
      else await onSyncIcs(icsUrl.trim());
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Sync failed. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Sync Calendar</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Calendar */}
          <button
            onClick={() => handle('google')}
            disabled={!!loading}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Google Calendar</p>
                <p className="text-xs text-slate-500">Sign in with your Google account</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSource === 'google' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {loading === 'google' ? <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" /> : null}
            </div>
          </button>

          {/* Microsoft Calendar */}
          <button
            onClick={() => handle('microsoft')}
            disabled={!!loading}
            className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                {/* Microsoft logo */}
                <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-slate-800">Microsoft / Teams</p>
                <p className="text-xs text-slate-500">Outlook, Exchange & Teams calendar</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeSource === 'microsoft' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
              {loading === 'microsoft' ? <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" /> : null}
            </div>
          </button>

          {/* iCal / Apple */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm shrink-0">
                {/* Apple Calendar icon approximation */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="18" rx="3" fill="#FF3B30"/>
                  <rect x="2" y="4" width="20" height="6" rx="3" fill="#FF3B30"/>
                  <rect x="2" y="7" width="20" height="3" fill="#FF3B30"/>
                  <rect x="2" y="9" width="20" height="13" rx="2" fill="white"/>
                  <text x="12" y="19" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#FF3B30">iCal</text>
                  <line x1="7" y1="2" x2="7" y2="6" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="17" y1="2" x2="17" y2="6" stroke="#FF3B30" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-semibold text-slate-800">Apple iCal / Other</p>
                <p className="text-xs text-slate-500">Paste a calendar feed URL (.ics)</p>
              </div>
              {activeSource === 'ics' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>
            <div className="px-4 pb-3.5 space-y-2">
              <input
                type="url"
                placeholder="webcal:// or https:// iCal feed URL"
                value={icsUrl}
                onChange={e => setIcsUrl(e.target.value)}
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 placeholder:text-slate-400"
              />
              <button
                onClick={() => handle('ics')}
                disabled={!!loading || !icsUrl.trim()}
                className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
              >
                <Link className="w-3.5 h-3.5" />
                {loading === 'ics' ? 'Importing...' : 'Import feed'}
              </button>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In Apple Calendar: right-click a calendar → Share → Copy Link. Paste the URL above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
