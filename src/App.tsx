import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { Navbar } from './components/Navbar';
import { DepartureAlertBanner } from './components/DepartureAlertBanner';
import { StylistView } from './components/StylistView';
import { WardrobeCatalog } from './components/WardrobeCatalog';
import { CommuteMapView } from './components/CommuteMapView';
import { PreferencesTrainer } from './components/PreferencesTrainer';
import { SendDirectionsModal } from './components/SendDirectionsModal';
import { PersonalShopperView } from './components/PersonalShopperView';
import { CalendarSyncModal } from './components/CalendarSyncModal';

import { WardrobeItem, Meeting, WeatherCondition, UserPreferences, CommutePlan } from './types';
import { SEED_WARDROBE } from './data/seedWardrobe';
import { SEED_MEETINGS } from './data/seedMeetings';
import { generateOutfitSuggestions, trainPreferences } from './utils/outfitEngine';
import { calculateDepartureTime, getMinutesUntilDeparture, isDepartureAlertActive } from './utils/commuteCalculator';
import { calculateRouteFare, calculateAllModeOptions, annotateRouteStepFares } from './utils/commuteFareCalculator';
import { fetchWeatherForLocation } from './utils/weatherUtils';
import { auth, initAuth, googleSignIn, logout } from './services/firebaseAuth';
import { fetchGoogleCalendarEvents } from './services/calendarService';
import { microsoftSignIn, getMicrosoftAccount, microsoftSignOut } from './services/microsoftAuth';
import { fetchMicrosoftCalendarEvents } from './services/microsoftCalendarService';
import { fetchIcsCalendarEvents } from './services/icsCalendarService';
import * as api from './services/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY ?? '';

export default function App() {
  // Navigation
  const [activeTab, setActiveTab] = useState<'stylist' | 'wardrobe' | 'shopper' | 'commute' | 'trainer'>('stylist');

  // Wardrobe state
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(() => {
    const saved = localStorage.getItem('sartorial_wardrobe');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return SEED_WARDROBE;
  });

  // Persist to localStorage only when unauthenticated (DB is used when signed in)
  useEffect(() => {
    if (!auth.currentUser) {
      localStorage.setItem('sartorial_wardrobe', JSON.stringify(wardrobe));
    }
  }, [wardrobe]);

  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>(SEED_MEETINGS);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting>(SEED_MEETINGS[0]);

  // Auth & Calendar
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCalendarSynced, setIsCalendarSynced] = useState(false);

  // Weather state
  const [weather, setWeather] = useState<WeatherCondition | null>(null);

  // User preferences & training
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const saved = localStorage.getItem('sartorial_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      warmthLean: 'balanced',
      formalityLean: 0,
      commuteComfortPriority: true,
      rainToleranceThreshold: 30,
      favoriteColors: ['navy', 'charcoal', 'white'],
      dislikedMaterials: ['polyester'],
      feedbackCount: 2,
      weights: {
        weatherWeight: 1.1,
        formalityWeight: 1.0,
        comfortWeight: 1.2,
        favoriteWeight: 1.0,
      },
    };
  });

  useEffect(() => {
    if (!auth.currentUser) {
      localStorage.setItem('sartorial_preferences', JSON.stringify(preferences));
    }
  }, [preferences]);

  // Commute state
  const [commute, setCommute] = useState<CommutePlan>(() => {
    const duration = 32;
    const distanceKm = 11.2;
    const meetingStart = new Date(SEED_MEETINGS[0].startTime);
    const departure = calculateDepartureTime(meetingStart, duration, 10, 0);
    const minsUntil = getMinutesUntilDeparture(departure);

    const initialSteps = [
      { instruction: 'Walk to High Street Kensington Underground Station', distance: '300m', duration: '4 mins', transitMode: 'WALK' as const },
      { instruction: 'Board District Line eastbound towards Tower Hill', distance: '4.8 km', duration: '14 mins', transitMode: 'TUBE' as const, lineName: 'District' },
      { instruction: 'Change at Westminster for Jubilee Line eastbound towards Stratford', distance: '5.6 km', duration: '11 mins', transitMode: 'TUBE' as const, lineName: 'Jubilee' },
      { instruction: 'Arrive at Canary Wharf Station & walk 180m to 1 Canada Square', distance: '180m', duration: '3 mins', transitMode: 'WALK' as const },
    ];

    const annotatedSteps = annotateRouteStepFares(initialSteps, departure);
    const estimatedFare = calculateRouteFare({
      mode: 'TRANSIT',
      distanceKm,
      durationMinutes: duration,
      departureTime: departure,
      steps: annotatedSteps,
    });
    const modeComparisons = calculateAllModeOptions(distanceKm, duration, departure);

    return {
      origin: 'Kensington High St, London',
      destination: SEED_MEETINGS[0].location,
      durationMinutes: duration,
      distanceKm,
      departureTime: departure,
      arrivalTime: new Date(departure.getTime() + duration * 60 * 1000),
      minutesUntilDeparture: minsUntil,
      isAlertActive: isDepartureAlertActive(minsUntil),
      tflStatusAlerts: [],
      suggestedPaddingMinutes: 0,
      steps: annotatedSteps,
      selectedMode: 'TRANSIT',
      estimatedFare,
      modeComparisons,
    };
  });

  const [isSendDirectionsModalOpen, setIsSendDirectionsModalOpen] = useState(false);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [isCalendarSyncModalOpen, setIsCalendarSyncModalOpen] = useState(false);
  const [calendarSource, setCalendarSource] = useState<'google' | 'microsoft' | 'ics' | null>(null);

  // Load wardrobe + preferences from DB, migrating from localStorage on first sign-in
  const loadUserData = async () => {
    try {
      const [dbWardrobe, dbPrefs] = await Promise.all([
        api.getWardrobe(),
        api.getPreferences(),
      ]);

      if (dbWardrobe.length === 0) {
        // Migrate any existing localStorage wardrobe into the DB
        const saved = localStorage.getItem('sartorial_wardrobe');
        if (saved) {
          try {
            const localItems = JSON.parse(saved) as WardrobeItem[];
            if (localItems.length > 0) {
              const migrated = await api.bulkCreateWardrobeItems(localItems);
              setWardrobe(migrated);
              localStorage.removeItem('sartorial_wardrobe');
            }
          } catch {}
        }
      } else {
        setWardrobe(dbWardrobe);
      }

      setPreferences(dbPrefs);
      localStorage.removeItem('sartorial_preferences');
    } catch (err) {
      console.warn('Could not load user data from DB (DATABASE_URL may not be set):', err);
    }
  };

  // Initialize Firebase Auth listener
  useEffect(() => {
    initAuth(
      (currentUser) => {
        setUser(currentUser);
        loadUserData();
        // Sync Calendar automatically once authenticated
        fetchGoogleCalendarEvents()
          .then(events => {
            if (events && events.length > 0) {
              setMeetings(events);
              setSelectedMeeting(events[0]);
              setIsCalendarSynced(true);
            }
          })
          .catch(err => {
            console.warn('Calendar sync notice:', err);
          });
      },
      () => {
        setUser(null);
        setIsCalendarSynced(false);
      }
    );
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        await loadUserData();
        const events = await fetchGoogleCalendarEvents();
        if (events && events.length > 0) {
          setMeetings(events);
          setSelectedMeeting(events[0]);
          setIsCalendarSynced(true);
        }
      }
    } catch (err) {
      console.error('Google Sign-in failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setIsCalendarSynced(false);
    // Restore from localStorage on sign-out
    const saved = localStorage.getItem('sartorial_wardrobe');
    setWardrobe(saved ? JSON.parse(saved) : SEED_WARDROBE);
  };

  const applyCalendarEvents = (events: Meeting[]) => {
    if (events.length > 0) {
      setMeetings(events);
      setSelectedMeeting(events[0]);
      setIsCalendarSynced(true);
    }
  };

  const handleSyncGoogleCalendar = async () => {
    if (!user) await handleLogin();
    const events = await fetchGoogleCalendarEvents();
    applyCalendarEvents(events);
    setCalendarSource('google');
  };

  const handleSyncMicrosoftCalendar = async () => {
    const existing = await getMicrosoftAccount();
    if (!existing) await microsoftSignIn();
    const events = await fetchMicrosoftCalendarEvents();
    applyCalendarEvents(events);
    setCalendarSource('microsoft');
  };

  const handleSyncIcsCalendar = async (url: string) => {
    const normalised = url.replace(/^webcal:\/\//i, 'https://');
    const events = await fetchIcsCalendarEvents(normalised);
    applyCalendarEvents(events as Meeting[]);
    setCalendarSource('ics');
  };

  const handleSyncCalendar = () => setIsCalendarSyncModalOpen(true);

  // Fetch weather whenever selected meeting changes
  useEffect(() => {
    const coords = selectedMeeting.coordinates || { lat: 51.5074, lng: -0.1278 };
    fetchWeatherForLocation(coords.lat, coords.lng)
      .then(w => setWeather(w))
      .catch(e => console.error(e));
  }, [selectedMeeting.id]);

  // Recalculate countdown every 15 seconds
  useEffect(() => {
    const updateCountdown = () => {
      const meetingStart = new Date(selectedMeeting.startTime);
      const departure = calculateDepartureTime(
        meetingStart,
        commute.durationMinutes,
        10,
        commute.suggestedPaddingMinutes
      );
      const mins = getMinutesUntilDeparture(departure);
      setCommute(prev => ({
        ...prev,
        departureTime: departure,
        arrivalTime: new Date(departure.getTime() + prev.durationMinutes * 60 * 1000),
        minutesUntilDeparture: mins,
        isAlertActive: isDepartureAlertActive(mins),
      }));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 15000);
    return () => clearInterval(interval);
  }, [selectedMeeting.startTime, commute.durationMinutes, commute.suggestedPaddingMinutes]);

  // Generate outfit suggestions
  const fallbackWeather: WeatherCondition = weather || {
    temperatureC: 14,
    feelsLikeC: 13,
    condition: 'rain',
    precipitationProbability: 60,
    windSpeedKmh: 16,
    summary: 'Overcast & Drizzle',
    icon: 'cloud-rain',
  };

  const outfitSuggestions = generateOutfitSuggestions(
    wardrobe,
    fallbackWeather,
    selectedMeeting.formality,
    preferences,
    selectedMeeting
  );

  // Training handler — saves updated preferences to DB when authenticated
  const handleTrainPreference = async (feedback: {
    type: 'thumbs_up' | 'too_formal' | 'too_casual' | 'too_cold' | 'too_warm' | 'love_comfort' | 'prefer_formal';
    itemColor?: string;
  }) => {
    const updated = trainPreferences(preferences, feedback);
    setPreferences(updated);
    if (user) {
      try { await api.upsertPreferences(updated); } catch {}
    }
  };

  const handleUpdatePreferences = async (updated: UserPreferences) => {
    setPreferences(updated);
    if (user) {
      try { await api.upsertPreferences(updated); } catch {}
    }
  };

  // Wardrobe CRUD — calls API when authenticated, otherwise updates local state only
  const handleAddItem = async (item: WardrobeItem) => {
    if (user) {
      try {
        const created = await api.createWardrobeItem(item);
        setWardrobe(prev => [created, ...prev]);
        return;
      } catch (err) {
        console.error('Failed to save wardrobe item to DB:', err);
      }
    }
    setWardrobe(prev => [item, ...prev]);
  };

  const handleUpdateItem = async (item: WardrobeItem) => {
    if (user) {
      try {
        const updated = await api.updateWardrobeItem(item);
        setWardrobe(prev => prev.map(i => (i.id === item.id ? updated : i)));
        return;
      } catch (err) {
        console.error('Failed to update wardrobe item in DB:', err);
      }
    }
    setWardrobe(prev => prev.map(i => (i.id === item.id ? item : i)));
  };

  const handleDeleteItem = async (id: string) => {
    if (user) {
      try {
        await api.deleteWardrobeItem(id);
      } catch (err) {
        console.error('Failed to delete wardrobe item from DB:', err);
      }
    }
    setWardrobe(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased selection:bg-amber-500/20 selection:text-amber-900">
      {/* 10-Min Departure Alert Banner (Triggers up to 10 mins before departure) */}
      {commute.isAlertActive && !isAlertDismissed && (
        <DepartureAlertBanner
          commute={commute}
          meeting={selectedMeeting}
          onOpenDirections={() => setIsSendDirectionsModalOpen(true)}
          onDismiss={() => setIsAlertDismissed(true)}
        />
      )}

      {/* Main Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        wardrobeCount={wardrobe.length}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        isLoggingIn={isLoggingIn}
        trainingIterations={preferences.feedbackCount}
      />

      {/* Main View Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'stylist' && (
          <StylistView
            meetings={meetings}
            selectedMeeting={selectedMeeting}
            onSelectMeeting={setSelectedMeeting}
            weather={weather}
            outfits={outfitSuggestions}
            wardrobe={wardrobe}
            onTrainPreference={handleTrainPreference}
            onOpenCommute={() => setActiveTab('commute')}
            onOpenShopper={() => setActiveTab('shopper')}
            onAddNewMeeting={m => setMeetings(prev => [m, ...prev])}
            userPreferences={preferences}
            isCalendarSynced={isCalendarSynced}
            onSyncCalendar={handleSyncCalendar}
          />
        )}

        {activeTab === 'wardrobe' && (
          <WardrobeCatalog
            wardrobe={wardrobe}
            onAddItem={handleAddItem}
            onUpdateItem={handleUpdateItem}
            onDeleteItem={handleDeleteItem}
          />
        )}

        {activeTab === 'shopper' && (
          <PersonalShopperView
            wardrobe={wardrobe}
            meetings={meetings}
            weather={weather || fallbackWeather}
            preferences={preferences}
            onAddToWardrobe={handleAddItem}
            onOpenWardrobeTab={() => setActiveTab('wardrobe')}
          />
        )}

        {activeTab === 'commute' && (
          <CommuteMapView
            meeting={selectedMeeting}
            commute={commute}
            onUpdateCommute={setCommute}
            onOpenSendDirections={() => setIsSendDirectionsModalOpen(true)}
            googleMapsApiKey={GOOGLE_MAPS_API_KEY}
          />
        )}

        {activeTab === 'trainer' && (
          <PreferencesTrainer
            preferences={preferences}
            onUpdatePreferences={handleUpdatePreferences}
            wardrobe={wardrobe}
            weather={fallbackWeather}
          />
        )}
      </main>

      {/* Calendar Sync Modal */}
      <CalendarSyncModal
        isOpen={isCalendarSyncModalOpen}
        onClose={() => setIsCalendarSyncModalOpen(false)}
        onSyncGoogle={handleSyncGoogleCalendar}
        onSyncMicrosoft={handleSyncMicrosoftCalendar}
        onSyncIcs={handleSyncIcsCalendar}
        activeSource={calendarSource}
      />

      {/* Send Directions Modal */}
      <SendDirectionsModal
        isOpen={isSendDirectionsModalOpen}
        onClose={() => setIsSendDirectionsModalOpen(false)}
        commute={commute}
        meeting={selectedMeeting}
      />
    </div>
  );
}
