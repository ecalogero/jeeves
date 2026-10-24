import React, { useState, useEffect } from 'react';
import { X, Send, Copy, ExternalLink, Check, BellRing, MapPin, Clock, Train, CreditCard } from 'lucide-react';
import { CommutePlan, Meeting } from '../types';
import { formatDirectionsText } from '../utils/commuteCalculator';

interface SendDirectionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  commute: CommutePlan;
  meeting: Meeting;
}

export const SendDirectionsModal: React.FC<SendDirectionsModalProps> = ({
  isOpen,
  onClose,
  commute,
  meeting,
}) => {
  const [copied, setCopied] = useState(false);
  const [sentAlert, setSentAlert] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const directionsText = formatDirectionsText(commute, meeting);
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
    commute.origin
  )}&destination=${encodeURIComponent(meeting.location)}&travelmode=transit`;

  const handleCopy = () => {
    navigator.clipboard.writeText(directionsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Commute to ${meeting.title}`,
          text: directionsText,
          url: googleMapsUrl,
        });
      } catch (err) {
        console.warn('Share dismissed:', err);
      }
    } else {
      handleCopy();
    }
  };

  const handleSendNotification = () => {
    // Check Notification API permission if supported
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Leave for ${meeting.title}!`, {
          body: `Depart by ${commute.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Travel time: ${commute.durationMinutes} mins.`,
          icon: '/favicon.ico',
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(`Leave for ${meeting.title}!`, {
              body: `Depart by ${commute.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Travel time: ${commute.durationMinutes} mins.`,
            });
          }
        });
      }
    }

    setSentAlert(true);
    setTimeout(() => setSentAlert(false), 3000);
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-slate-900 text-base">Send Directions Brief</h3>
              <p className="text-xs text-slate-500">Live navigation &amp; step-by-step transit itinerary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {sentAlert && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 rounded-xl flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="font-medium">Directions alert broadcasted to your system device notification center.</span>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-800">
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
              <span className="text-[11px] font-semibold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-600" /> Recommended Departure
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {commute.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                {commute.minutesUntilDeparture > 0 ? `In ${commute.minutesUntilDeparture} mins` : 'Right now'} (10m buffer)
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
              <span className="text-[11px] font-semibold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <Train className="w-3.5 h-3.5 text-blue-600" /> Total Journey
              </span>
              <p className="text-lg font-bold text-slate-900 mt-1">
                {commute.durationMinutes} mins
              </p>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                Arrive {commute.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({commute.distanceKm} km)
              </p>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/60">
              <span className="text-[11px] font-semibold uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> Estimated Fare
              </span>
              <p className="text-lg font-bold font-mono text-emerald-800 mt-1">
                {commute.estimatedFare?.formatted || '£3.40'}
              </p>
              <p className="text-xs text-slate-700 font-medium mt-0.5">
                {commute.estimatedFare?.rateLabel || 'TfL Transit Fare'}
              </p>
            </div>
          </div>

          {/* Destination */}
          <div className="bg-amber-50/60 border border-amber-200/70 rounded-xl p-3.5 text-xs text-slate-700 flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-900">{meeting.title}</p>
              <p className="text-slate-600">{meeting.location}</p>
            </div>
          </div>

          {/* Steps Preview */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">Step-by-Step Transit Route</h4>
            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50">
              {commute.steps.map((step, idx) => (
                <div key={idx} className="p-3 text-xs flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-800">{step.instruction}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {step.lineName && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                            {step.lineName}
                          </span>
                        )}
                        {step.stepFare && (
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded">
                            {step.stepFare}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-500 font-mono text-[11px] shrink-0">{step.duration}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Text brief formatted */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">Formatted Message Preview</h4>
            <pre className="text-[11px] font-mono bg-slate-900 text-slate-200 p-3 rounded-xl whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed border border-slate-800">
              {directionsText}
            </pre>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={handleSendNotification}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors flex items-center space-x-1.5"
          >
            <BellRing className="w-3.5 h-3.5 text-slate-600" />
            <span>Send Notification</span>
          </button>

          <button
            onClick={handleCopy}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-800 transition-colors flex items-center space-x-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
          </button>

          <button
            onClick={handleWebShare}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-900 text-white transition-colors flex items-center space-x-1.5"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>Share to Mobile</span>
          </button>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all flex items-center space-x-1.5"
          >
            <span>Open Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
