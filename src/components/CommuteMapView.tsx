import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import {
  Navigation,
  Train,
  Clock,
  AlertTriangle,
  Send,
  MapPin,
  RefreshCw,
  CreditCard,
  Coins,
  Bus,
  Car,
  Bike,
  Footprints,
  TrendingDown,
  ShieldCheck,
  Sparkles,
  Info,
} from 'lucide-react';
import { Meeting, CommutePlan, TfLDisruption, RouteStep, TransportModeType, CommuteFareEstimate, ModeCostOption } from '../types';
import { calculateDepartureTime, getMinutesUntilDeparture, isDepartureAlertActive } from '../utils/commuteCalculator';
import {
  calculateRouteFare,
  calculateAllModeOptions,
  annotateRouteStepFares,
  isTfLPeakHour,
} from '../utils/commuteFareCalculator';
import { fetchTfLLineStatuses } from '../utils/tflService';

interface CommuteMapViewProps {
  meeting: Meeting;
  commute: CommutePlan;
  onUpdateCommute: (plan: CommutePlan) => void;
  onOpenSendDirections: () => void;
  googleMapsApiKey: string;
}

// Inner component that handles route calculation and polyline rendering via Maps JS SDK
function MapRouteRenderer({
  origin,
  destination,
  selectedMode,
  departureTime,
  onRouteCalculated,
}: {
  origin: string;
  destination: string;
  selectedMode: TransportModeType;
  departureTime: Date;
  onRouteCalculated: (durationMins: number, distanceKm: number, steps: RouteStep[], mode: TransportModeType) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const polylinesRef = useRef<google.maps.Polyline[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;

    // Cleanup previous polylines
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    // Cleanup previous markers
    markersRef.current.forEach(m => m.setMap(null));
    markersRef.current = [];

    // Map UI mode to Routes API TravelMode
    let apiTravelMode = 'TRANSIT';
    if (selectedMode === 'WALK') apiTravelMode = 'WALK';
    else if (selectedMode === 'BICYCLE') apiTravelMode = 'BICYCLE';
    else if (selectedMode === 'TAXI' || selectedMode === 'DRIVING') apiTravelMode = 'DRIVE';

    const request = {
      origin,
      destination,
      travelMode: apiTravelMode,
      fields: ['path', 'distanceMeters', 'durationMillis', 'viewport', 'legs'],
    };

    (routesLib.Route as any).computeRoutes(request)
      .then(({ routes }: { routes: any[] }) => {
        if (!routes || routes.length === 0) return;
        const primaryRoute = routes[0];

        // Draw polylines
        const newPolylines = primaryRoute.createPolylines();
        const strokeColor =
          selectedMode === 'BUS' ? '#dc2626' :
          selectedMode === 'TAXI' ? '#d97706' :
          selectedMode === 'WALK' ? '#059669' :
          selectedMode === 'BICYCLE' ? '#0284c7' : '#2563eb';

        newPolylines.forEach((p: google.maps.Polyline) => {
          p.setOptions({
            strokeColor,
            strokeWeight: 5,
            strokeOpacity: 0.85,
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;

        // Fit map viewport
        if (primaryRoute.viewport) {
          map.fitBounds(primaryRoute.viewport);
        }

        const durationMins = Math.round((primaryRoute.durationMillis || 1800000) / 60000);
        const distanceKm = Number(((primaryRoute.distanceMeters || 10000) / 1000).toFixed(1));

        // Parse legs/steps if available
        const steps: RouteStep[] = [];
        const leg = primaryRoute.legs?.[0];
        if (leg?.steps && leg.steps.length > 0) {
          leg.steps.forEach((s: any) => {
            const transitLine = s.transitDetails?.transitLine?.name || s.transitDetails?.transitLine?.shortName;
            const depStop = s.transitDetails?.stopDetails?.departureStop?.name;
            const arrStop = s.transitDetails?.stopDetails?.arrivalStop?.name;
            let inst = s.navigationInstruction?.instructions;
            if (!inst && transitLine && depStop) {
              inst = `Take ${transitLine} from ${depStop}${arrStop ? ` to ${arrStop}` : ''}`;
            } else if (!inst && s.travelMode === 'WALK') {
              inst = `Walk to next transit connection (${s.localizedValues?.distance?.text || 'nearby'})`;
            } else if (!inst) {
              inst = `Proceed towards destination`;
            }

            steps.push({
              instruction: inst,
              distance: s.localizedValues?.distance?.text || `${((s.distanceMeters || 1000) / 1000).toFixed(1)} km`,
              duration: s.localizedValues?.staticDuration?.text || `${Math.max(1, Math.round((s.staticDurationMillis || 180000) / 60000))} mins`,
              transitMode: s.travelMode || (transitLine ? 'TUBE' : 'WALK'),
              lineName: transitLine,
              departureStop: depStop,
              arrivalStop: arrStop,
            });
          });
        }

        const annotatedSteps = annotateRouteStepFares(steps, departureTime);
        onRouteCalculated(durationMins, distanceKm, annotatedSteps, selectedMode);
      })
      .catch((err: any) => {
        console.warn('Routes API computeRoutes fallback:', err);
        // Fallback calculations adjusted for mode
        let fallbackDuration = 32;
        let fallbackDistance = 11.2;
        let simulatedSteps: RouteStep[] = [];

        if (selectedMode === 'BUS') {
          fallbackDuration = 48;
          simulatedSteps = [
            { instruction: `Walk to Kensington Church St bus stop`, distance: '220m', duration: '3 mins', transitMode: 'WALK' },
            { instruction: 'Board London Bus Route 9 / 15 towards Aldwych / City', distance: '10.8 km', duration: '41 mins', transitMode: 'BUS', lineName: 'Bus Route 9' },
            { instruction: `Walk from bus stop to ${destination}`, distance: '180m', duration: '4 mins', transitMode: 'WALK' },
          ];
        } else if (selectedMode === 'TAXI') {
          fallbackDuration = 24;
          simulatedSteps = [
            { instruction: `Hail London Black Cab / Rideshare at ${origin}`, distance: '0m', duration: '2 mins', transitMode: 'WALK' },
            { instruction: `Direct taxi transit via A4 / Embankment to ${destination}`, distance: '11.2 km', duration: '22 mins', transitMode: 'WALK' },
          ];
        } else if (selectedMode === 'BICYCLE') {
          fallbackDuration = 38;
          simulatedSteps = [
            { instruction: 'Unlock Santander Cycle at nearby docking station', distance: '120m', duration: '2 mins', transitMode: 'WALK' },
            { instruction: 'Cycle east via Cycleway C3 (East-West Cycle Superhighway)', distance: '11.0 km', duration: '34 mins', transitMode: 'WALK' },
            { instruction: 'Dock cycle at destination station', distance: '80m', duration: '2 mins', transitMode: 'WALK' },
          ];
        } else if (selectedMode === 'WALK') {
          fallbackDuration = 135;
          simulatedSteps = [
            { instruction: `Walk east from ${origin} through Hyde Park & The Mall`, distance: '5.2 km', duration: '60 mins', transitMode: 'WALK' },
            { instruction: `Continue along Thames Path towards ${destination}`, distance: '6.0 km', duration: '75 mins', transitMode: 'WALK' },
          ];
        } else {
          simulatedSteps = [
            { instruction: `Walk from ${origin} to nearest London Underground station`, distance: '300m', duration: '4 mins', transitMode: 'WALK' },
            { instruction: 'Board District Line eastbound towards Tower Hill', distance: '4.8 km', duration: '14 mins', transitMode: 'TUBE', lineName: 'District' },
            { instruction: 'Change at Westminster for Jubilee Line eastbound towards Stratford', distance: '5.6 km', duration: '11 mins', transitMode: 'TUBE', lineName: 'Jubilee' },
            { instruction: `Arrive at Canary Wharf Station & walk 180m to ${destination}`, distance: '180m', duration: '3 mins', transitMode: 'WALK' },
          ];
        }

        const annotated = annotateRouteStepFares(simulatedSteps, departureTime);
        onRouteCalculated(fallbackDuration, fallbackDistance, annotated, selectedMode);
      });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
      polylinesRef.current = [];
    };
  }, [routesLib, map, origin, destination, selectedMode]);

  return null;
}

export const CommuteMapView: React.FC<CommuteMapViewProps> = ({
  meeting,
  commute,
  onUpdateCommute,
  onOpenSendDirections,
  googleMapsApiKey,
}) => {
  const [homeOrigin, setHomeOrigin] = useState(commute.origin || 'Kensington High St, London');
  const [isEditingOrigin, setIsEditingOrigin] = useState(false);
  const [originInput, setOriginInput] = useState(homeOrigin);
  const [tflStatuses, setTflStatuses] = useState<TfLDisruption[]>([]);
  const [isLoadingTfl, setIsLoadingTfl] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TransportModeType>(commute.selectedMode || 'TRANSIT');

  // Compute live fare and multimodal comparison options
  const currentFare: CommuteFareEstimate = commute.estimatedFare || calculateRouteFare({
    mode: selectedMode,
    distanceKm: commute.distanceKm || 11.2,
    durationMinutes: commute.durationMinutes || 32,
    departureTime: commute.departureTime || new Date(meeting.startTime),
  });

  const modeOptions: ModeCostOption[] = calculateAllModeOptions(
    commute.distanceKm || 11.2,
    commute.durationMinutes || 32,
    commute.departureTime || new Date(meeting.startTime)
  );

  // Load TfL Statuses
  const refreshTfL = async () => {
    setIsLoadingTfl(true);
    try {
      const statuses = await fetchTfLLineStatuses();
      setTflStatuses(statuses);

      // Check disruptions that affect commute
      const disrupted = statuses.filter(s => s.isDisrupted);
      const extraPadding = (disrupted.length > 0 && selectedMode === 'TRANSIT') ? 10 : 0;
      const meetingStart = new Date(meeting.startTime);
      const departure = calculateDepartureTime(meetingStart, commute.durationMinutes, 10, extraPadding);
      const minsUntil = getMinutesUntilDeparture(departure);

      const updatedFare = calculateRouteFare({
        mode: selectedMode,
        distanceKm: commute.distanceKm,
        durationMinutes: commute.durationMinutes,
        departureTime: departure,
      });

      onUpdateCommute({
        ...commute,
        departureTime: departure,
        arrivalTime: new Date(departure.getTime() + commute.durationMinutes * 60 * 1000),
        minutesUntilDeparture: minsUntil,
        isAlertActive: isDepartureAlertActive(minsUntil),
        tflStatusAlerts: disrupted,
        suggestedPaddingMinutes: extraPadding,
        selectedMode,
        estimatedFare: updatedFare,
        modeComparisons: modeOptions,
      });
    } catch (err) {
      console.error('TfL error:', err);
    } finally {
      setIsLoadingTfl(false);
    }
  };

  useEffect(() => {
    refreshTfL();
    const interval = setInterval(refreshTfL, 60000); // Poll TfL every minute
    return () => clearInterval(interval);
  }, [meeting.id, commute.durationMinutes, selectedMode]);

  const handleRouteCalculated = (
    durationMins: number,
    distanceKm: number,
    steps: RouteStep[],
    mode: TransportModeType
  ) => {
    const meetingStart = new Date(meeting.startTime);
    const extraPadding = (commute.suggestedPaddingMinutes || 0);
    const departure = calculateDepartureTime(meetingStart, durationMins, 10, extraPadding);
    const minsUntil = getMinutesUntilDeparture(departure);

    const calculatedFare = calculateRouteFare({
      mode,
      distanceKm,
      durationMinutes: durationMins,
      departureTime: departure,
      steps,
    });

    const comparisonOptions = calculateAllModeOptions(distanceKm, durationMins, departure);

    onUpdateCommute({
      ...commute,
      origin: homeOrigin,
      destination: meeting.location,
      durationMinutes: durationMins,
      distanceKm,
      departureTime: departure,
      arrivalTime: new Date(departure.getTime() + durationMins * 60 * 1000),
      minutesUntilDeparture: minsUntil,
      isAlertActive: isDepartureAlertActive(minsUntil),
      steps: steps.length > 0 ? steps : commute.steps,
      selectedMode: mode,
      estimatedFare: calculatedFare,
      modeComparisons: comparisonOptions,
    });
  };

  const handleSelectMode = (newMode: TransportModeType) => {
    setSelectedMode(newMode);
    const targetOption = modeOptions.find(o => o.mode === newMode);
    const newDuration = targetOption ? targetOption.durationMinutes : commute.durationMinutes;

    const meetingStart = new Date(meeting.startTime);
    const extraPadding = (newMode === 'TRANSIT' && commute.tflStatusAlerts.length > 0) ? 10 : 0;
    const departure = calculateDepartureTime(meetingStart, newDuration, 10, extraPadding);
    const minsUntil = getMinutesUntilDeparture(departure);

    const newFare = calculateRouteFare({
      mode: newMode,
      distanceKm: commute.distanceKm,
      durationMinutes: newDuration,
      departureTime: departure,
    });

    onUpdateCommute({
      ...commute,
      selectedMode: newMode,
      durationMinutes: newDuration,
      departureTime: departure,
      arrivalTime: new Date(departure.getTime() + newDuration * 60 * 1000),
      minutesUntilDeparture: minsUntil,
      isAlertActive: isDepartureAlertActive(minsUntil),
      estimatedFare: newFare,
    });
  };

  const handleSaveOrigin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!originInput.trim()) return;
    setHomeOrigin(originInput);
    setIsEditingOrigin(false);
  };

  const defaultCenter = meeting.coordinates || { lat: 51.5074, lng: -0.1278 };
  const isPeak = isTfLPeakHour(commute.departureTime);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Navigation className="w-6 h-6 text-amber-600" />
            <span>Commute Navigator &amp; Fare Tracking</span>
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Real-time travel duration, multimodal fare calculation (TfL Oyster/Contactless), and live Tube line statuses.
          </p>
        </div>

        <button
          onClick={onOpenSendDirections}
          className="inline-flex items-center space-x-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send Route &amp; Directions Brief</span>
        </button>
      </div>

      {/* Multimodal Transport Mode & Cost Selector */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center space-x-2">
            <Coins className="w-4 h-4 text-amber-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Transport Mode &amp; Fare Comparison
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Select a mode to update ETA, route steps, and live commute expenditure
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {modeOptions.map(option => {
            const isSelected = selectedMode === option.mode;
            let ModeIcon = Train;
            if (option.mode === 'BUS') ModeIcon = Bus;
            else if (option.mode === 'TAXI') ModeIcon = Car;
            else if (option.mode === 'BICYCLE') ModeIcon = Bike;
            else if (option.mode === 'WALK') ModeIcon = Footprints;

            return (
              <button
                key={option.mode}
                onClick={() => handleSelectMode(option.mode)}
                className={`p-3 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? 'border-amber-600 bg-amber-50/60 shadow-sm ring-1 ring-amber-500'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-white'
                }`}
              >
                {option.isRecommended && (
                  <span className="absolute -top-2 right-2 text-[9px] font-bold uppercase px-1.5 py-0.2 bg-amber-600 text-white rounded-full tracking-wider shadow-xs">
                    Fastest
                  </span>
                )}

                <div className="flex items-center justify-between mb-1.5">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    <ModeIcon className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-bold text-sm text-slate-900">
                    {option.fare.formatted}
                  </span>
                </div>

                <p className="font-bold text-xs text-slate-800 truncate">{option.label}</p>
                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {option.durationMinutes}m
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {option.co2Grams === 0 ? '0g CO2' : `${option.co2Grams}g CO2`}
                  </span>
                </div>

                {option.fare.savingsVsCab && option.mode !== 'TAXI' && (
                  <p className="text-[10px] text-emerald-700 font-semibold mt-1 truncate">
                    {option.fare.savingsVsCab}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Map & Route on Left, TfL & Departure on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Google Map & Route Details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Origin & Destination Bar */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5 text-amber-600" />
                <span>Origin &amp; Destination</span>
              </div>
              {!isEditingOrigin && (
                <button
                  onClick={() => setIsEditingOrigin(true)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-800"
                >
                  Change Origin
                </button>
              )}
            </div>

            {isEditingOrigin ? (
              <form onSubmit={handleSaveOrigin} className="flex items-center gap-2">
                <input
                  type="text"
                  value={originInput}
                  onChange={e => setOriginInput(e.target.value)}
                  placeholder="Enter departure address (e.g. Home, Hotel, Work)"
                  className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs text-slate-800"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingOrigin(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">From (Home / Origin)</span>
                  <p className="font-semibold text-slate-800 truncate mt-0.5">{homeOrigin}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] uppercase font-bold text-slate-600 block">To (Meeting Location)</span>
                  <p className="font-semibold text-slate-800 truncate mt-0.5">{meeting.location}</p>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Google Map with explicit height */}
          <div className="bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-sm relative h-[420px]">
            <APIProvider apiKey={googleMapsApiKey}>
              <Map
                mapId="DEMO_MAP_ID"
                defaultCenter={defaultCenter}
                defaultZoom={13}
                gestureHandling="greedy"
                disableDefaultUI={false}
                style={{ width: '100%', height: '100%' }}
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              >
                <MapRouteRenderer
                  origin={homeOrigin}
                  destination={meeting.location}
                  selectedMode={selectedMode}
                  departureTime={commute.departureTime}
                  onRouteCalculated={handleRouteCalculated}
                />
              </Map>
            </APIProvider>

            {/* Map Legend & Fare Overlay */}
            <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-md text-[11px] text-slate-700 flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-1.5">
                <div className={`w-3 h-1 rounded-full ${
                  selectedMode === 'BUS' ? 'bg-red-600' :
                  selectedMode === 'TAXI' ? 'bg-amber-600' :
                  selectedMode === 'WALK' ? 'bg-emerald-600' :
                  selectedMode === 'BICYCLE' ? 'bg-sky-600' : 'bg-blue-600'
                }`} />
                <span className="font-bold text-slate-900">{selectedMode} Route</span>
              </div>
              <span className="text-slate-300">|</span>
              <span className="font-bold text-slate-900 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                {commute.durationMinutes} mins ({commute.distanceKm} km)
              </span>
              <span className="text-slate-300">|</span>
              <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {currentFare.formatted} ({currentFare.rateLabel})
              </span>
            </div>
          </div>

          {/* Commute Cost & Budget Insights Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <h3 className="font-serif font-bold text-sm text-slate-900">
                  Fare Tracking &amp; Budget Insights
                </h3>
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                currentFare.isPeak ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {currentFare.isPeak ? 'TfL Peak Hours' : 'Off-Peak Rate'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Single Journey</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  {currentFare.formatted}
                </span>
                <span className="text-[10px] text-slate-500 block truncate">{currentFare.breakdown}</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Return Projection</span>
                <span className="text-base font-bold font-mono text-slate-900 mt-0.5 block">
                  £{(currentFare.amount * 2).toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-500 block">Two legs today</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">TfL Daily Cap</span>
                <span className="text-base font-bold font-mono text-emerald-700 mt-0.5 block">
                  {currentFare.dailyCap ? currentFare.dailyCap.replace('Daily cap ', '') : '£8.50'}
                </span>
                <span className="text-[10px] text-slate-500 block">Max daily charge</span>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Vs. Black Cab</span>
                <span className="text-base font-bold font-mono text-amber-700 mt-0.5 block">
                  {selectedMode === 'TAXI' ? 'Baseline' : (currentFare.savingsVsCab ? currentFare.savingsVsCab.replace('vs Taxi', '') : '£0.00')}
                </span>
                <span className="text-[10px] text-slate-500 block">Per trip savings</span>
              </div>
            </div>

            {/* Smart Off-Peak Timing Advisory */}
            <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl text-xs text-amber-950 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900">
                  {isPeak
                    ? 'Peak Time Notice (Mon–Fri 06:30–09:30 & 16:00–19:00)'
                    : 'Off-Peak Fare Active'}
                </p>
                <p className="text-[11px] text-amber-800/90 mt-0.5">
                  {isPeak
                    ? 'Departing outside peak hours reduces your Underground fare by £0.60–£1.00 per single journey.'
                    : 'You are travelling during off-peak hours with lower contactless fares and less station crowding.'}
                </p>
              </div>
            </div>
          </div>

          {/* Turn-by-Turn Route Steps with Leg Fares */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-serif font-bold text-sm text-slate-900 flex items-center gap-2">
                <span>Transit Itinerary &amp; Leg Fare Breakdown</span>
              </h3>
              <span className="text-xs font-normal text-slate-500">{commute.steps?.length || 0} stages</span>
            </div>

            <div className="space-y-2">
              {commute.steps && commute.steps.length > 0 ? (
                commute.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                  >
                    <div className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-slate-800 leading-snug">{step.instruction}</p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          {step.lineName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              {step.lineName}
                            </span>
                          )}
                          {step.stepFare && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              step.stepFare.includes('Free') || step.stepFare.includes('£0.00')
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}>
                              {step.stepFare}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px] shrink-0">{step.duration}</span>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-slate-500">
                  Calculating transit steps...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Departure Clock & Live TfL Line Statuses */}
        <div className="space-y-4">
          {/* Departure Target Countdown Card with Fare Prominently Displayed */}
          <div className={`rounded-3xl p-6 text-white border shadow-md ${
            commute.minutesUntilDeparture <= 10
              ? 'bg-gradient-to-br from-rose-900 via-rose-800 to-slate-950 border-rose-700'
              : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/10">
              <span className="uppercase font-bold tracking-wider text-amber-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Departure Schedule
              </span>
              <span className="text-[10px] font-mono text-slate-300">
                Meeting at {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="my-4">
              <span className="text-4xl md:text-5xl font-serif font-bold text-white tracking-tight">
                {commute.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                  commute.minutesUntilDeparture <= 10 ? 'bg-rose-500 text-white' : 'bg-slate-800 text-amber-400'
                }`}>
                  {commute.minutesUntilDeparture > 0
                    ? `Leave in ${commute.minutesUntilDeparture} mins`
                    : `Depart now (${Math.abs(commute.minutesUntilDeparture)}m late)`}
                </span>
                <span className="text-[11px] text-slate-300">10 min leave buffer</span>
              </div>
            </div>

            {/* Travel Time & Estimated Fare Side-by-Side Highlight */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Travel Time:
                </span>
                <span className="font-bold text-white font-mono">
                  {commute.durationMinutes} mins
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-white/10">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  Estimated Fare:
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold font-mono text-emerald-300 text-sm">
                    {currentFare.formatted}
                  </span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-black/40 text-slate-200">
                    {currentFare.rateLabel}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-white/5">
                <span>Return Spend Projection:</span>
                <span className="font-mono font-medium text-slate-200">
                  £{(currentFare.amount * 2).toFixed(2)}
                </span>
              </div>
            </div>

            {commute.suggestedPaddingMinutes > 0 && (
              <div className="mt-3 bg-amber-500/20 border border-amber-400/30 p-2.5 rounded-xl text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  +{commute.suggestedPaddingMinutes} mins disruption buffer added due to active TfL delays.
                </span>
              </div>
            )}

            <button
              onClick={onOpenSendDirections}
              className="mt-5 w-full py-2.5 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center space-x-2 shadow-sm active:scale-98"
            >
              <Send className="w-3.5 h-3.5 text-amber-600" />
              <span>Send Me Directions &amp; Fare</span>
            </button>
          </div>

          {/* Live TfL Status Board */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Train className="w-4 h-4 text-slate-700" />
                <h3 className="font-serif font-bold text-sm text-slate-900">TfL Live Travel Status</h3>
              </div>
              <button
                onClick={refreshTfL}
                disabled={isLoadingTfl}
                className="text-xs text-slate-400 hover:text-slate-700 p-1 rounded transition-colors"
                title="Refresh TfL status"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTfl ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {tflStatuses.map(line => (
                <div
                  key={line.lineId}
                  className={`p-2.5 rounded-xl border text-xs transition-colors ${
                    line.isDisrupted
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                      : 'bg-slate-50/60 border-slate-200/80 text-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{line.lineName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        line.isDisrupted
                          ? 'bg-amber-200 text-amber-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {line.statusSeverityDescription}
                    </span>
                  </div>

                  {line.reason && (
                    <p className="text-[11px] text-amber-900/90 mt-1.5 leading-snug">
                      {line.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
