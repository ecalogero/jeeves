import React, { useState } from 'react';
import { AlertCircle, Clock, Navigation, Send, X, Check, Volume2 } from 'lucide-react';
import { CommutePlan, Meeting } from '../types';

interface DepartureAlertBannerProps {
  commute: CommutePlan;
  meeting: Meeting;
  onOpenDirections: () => void;
  onDismiss?: () => void;
}

export const DepartureAlertBanner: React.FC<DepartureAlertBannerProps> = ({
  commute,
  meeting,
  onOpenDirections,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  const minutes = commute.minutesUntilDeparture;
  const isUrgent = minutes <= 5;

  const handleQuickCopy = () => {
    const text = `🚨 Time to leave! Meeting: ${meeting.title} at ${meeting.location}. Depart now (${commute.durationMinutes} mins commute). Directions: https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(meeting.location)}&travelmode=transit`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      role="alert"
      className={`relative z-50 border-b transition-colors shadow-lg ${
        isUrgent
          ? 'bg-rose-900/95 border-rose-700 text-rose-50'
          : 'bg-amber-900/95 border-amber-700 text-amber-50'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl flex items-center justify-center animate-pulse ${
              isUrgent ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'
            }`}>
              <AlertCircle className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm uppercase px-2 py-0.5 rounded bg-black/30 font-mono">
                  {minutes <= 0
                    ? `DEPART NOW (${Math.abs(minutes)}m overdue)`
                    : `LEAVE IN ${minutes} MINS`}
                </span>
                <span className="text-xs opacity-90 font-medium hidden md:inline">
                  {commute.durationMinutes}m travel &bull; {commute.estimatedFare?.formatted || '£3.40'} ({commute.estimatedFare?.rateLabel || 'TfL Transit'})
                </span>
              </div>
              <p className="text-sm font-semibold truncate max-w-md md:max-w-xl mt-0.5">
                {meeting.title} &rarr; <span className="opacity-90">{meeting.location}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={handleQuickCopy}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/30 hover:bg-black/50 transition-colors flex items-center space-x-1.5 border border-white/10"
              title="Copy directions brief to clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Send className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Quick Copy'}</span>
            </button>

            <button
              onClick={onOpenDirections}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow-md transition-all flex items-center space-x-1.5 active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5 text-amber-600" />
              <span>Send Directions &amp; Route</span>
            </button>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1.5 rounded-lg hover:bg-black/20 text-white/70 hover:text-white"
                aria-label="Dismiss Alert"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
