import { Meeting } from '../types';

// Anchor times to today relative to current time so the countdown and departure alerts can be experienced live
const now = new Date();

const formatIso = (hoursFromNow: number) => {
  const d = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
  return d.toISOString();
};

const formatDayIso = (dayOffset: number, hour: number, minute: number = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

export const SEED_MEETINGS: Meeting[] = [
  // Today's Meetings
  {
    id: 'm-gym',
    title: 'Morning Functional Strength & Conditioning Session',
    startTime: formatIso(1.5),
    endTime: formatIso(2.5),
    location: 'Third Space Mayfair, 67 Clarges St, Mayfair, London W1J 8AB',
    coordinates: { lat: 51.5072, lng: -0.1458 },
    formality: 'casual',
    activityType: 'gym',
    description: 'High-intensity functional conditioning, barbell hypertrophy, and mobility recovery session with personal coach. Requires technical sportswear, training shoes, and gym equipment.',
    attendeesCount: 2,
  },
  {
    id: 'm-1',
    title: 'Q4 Executive Leadership & Strategy Review',
    startTime: formatIso(0.65), // ~39 mins from now (triggers <= 10min departure countdown!)
    endTime: formatIso(1.65),
    location: '1 Canada Square, Canary Wharf, London E14 5AA',
    coordinates: { lat: 51.5050, lng: -0.0197 },
    formality: 'business_formal',
    activityType: 'business',
    description: 'Quarterly review with group managing directors. In-person executive boardroom presentation followed by dinner.',
    attendeesCount: 8,
  },
  {
    id: 'm-2',
    title: 'Client Brand Identity Workshop & Soho Lunch',
    startTime: formatIso(3.5),
    endTime: formatIso(5.0),
    location: 'Dean Street Townhouse, 69-71 Dean St, Soho, London W1D 3SE',
    coordinates: { lat: 51.5133, lng: -0.1332 },
    formality: 'business_casual',
    activityType: 'business',
    description: 'Creative brand alignment session and working lunch with marketing partners.',
    attendeesCount: 5,
  },

  // Tomorrow (Day +1)
  {
    id: 'm-golf',
    title: 'Client Championship 18-Hole Golf & Clubhouse Luncheon',
    startTime: formatDayIso(1, 10, 0),
    endTime: formatDayIso(1, 15, 0),
    location: 'The Wisley Golf Club, Mill Lane, Ripley, Surrey GU23 6QU',
    coordinates: { lat: 51.3175, lng: -0.4789 },
    formality: 'smart_casual',
    activityType: 'golf',
    description: '18-hole championship match play with key corporate clients followed by a three-course clubhouse lunch. Strict club dress code: performance collared polo, tailored golf trousers, spikeless leather golf shoes, and golf equipment.',
    attendeesCount: 4,
  },
  {
    id: 'm-birthday-40',
    title: "Julian's 40th Birthday Celebration & Gala Dinner",
    startTime: formatDayIso(1, 19, 30),
    endTime: formatDayIso(1, 23, 30),
    location: "Annabel's Private Members Club, 46 Berkeley Square, Mayfair, London W1J 5AT",
    coordinates: { lat: 51.5098, lng: -0.1471 },
    formality: 'formal',
    activityType: 'celebration',
    description: "Milestone 40th birthday dinner and champagne celebration with close friends in The Garden Room at Annabel's. High-end evening dress code: velvet cocktail blazer, tailored trousers, silk accessories, and luxury dress shoes.",
    attendeesCount: 18,
  },
  {
    id: 'm-3',
    title: 'Venture Capital Investor Pitch & Partner Breakfast',
    startTime: formatDayIso(2, 9, 30),
    endTime: formatDayIso(2, 11, 0),
    location: 'Claridge’s, Brook St, Mayfair, London W1K 4HR',
    coordinates: { lat: 51.5126, lng: -0.1492 },
    formality: 'business_formal',
    activityType: 'business',
    description: 'Series B pitch and portfolio strategy breakfast with European partners.',
    attendeesCount: 6,
  },
  {
    id: 'm-4',
    title: 'Product Engineering Architecture Sync',
    startTime: formatDayIso(1, 14, 0),
    endTime: formatDayIso(1, 15, 30),
    location: 'Silicon Roundabout Campus, Old St, Shoreditch, London EC1Y 1BE',
    coordinates: { lat: 51.5255, lng: -0.0875 },
    formality: 'smart_casual',
    description: 'Technical sync and roadmap planning with the distributed systems team.',
    attendeesCount: 12,
  },

  // Day +2
  {
    id: 'm-5',
    title: 'Design Studio Review & Creative Team Lunch',
    startTime: formatDayIso(2, 11, 30),
    endTime: formatDayIso(2, 13, 30),
    location: 'Somerset House, Strand, London WC2R 1LA',
    coordinates: { lat: 51.5111, lng: -0.1171 },
    formality: 'smart_casual',
    description: 'Reviewing brand editorial assets and typography systems with the creative directors.',
    attendeesCount: 7,
  },

  // Day +3
  {
    id: 'm-6',
    title: 'Corporate Governance & Annual Audit Hearing',
    startTime: formatDayIso(3, 10, 0),
    endTime: formatDayIso(3, 12, 0),
    location: 'The Gherkin, 30 St Mary Axe, City of London EC3A 8EP',
    coordinates: { lat: 51.5144, lng: -0.0803 },
    formality: 'business_formal',
    description: 'Formal regulatory compliance hearing and committee sign-off.',
    attendeesCount: 10,
  },

  // Day +4
  {
    id: 'm-7',
    title: 'Founder Mentor Coffee & Walking Catch-up',
    startTime: formatDayIso(4, 10, 0),
    endTime: formatDayIso(4, 11, 30),
    location: 'Monmouth Coffee, 27 Monmouth St, Covent Garden, London WC2H 9EU',
    coordinates: { lat: 51.5134, lng: -0.1265 },
    formality: 'casual',
    description: 'Casual morning coffee discussing seed-stage founders and product vision.',
    attendeesCount: 2,
  },
  {
    id: 'm-8',
    title: 'Fintech Leadership Networking & Cocktail Reception',
    startTime: formatDayIso(4, 18, 30),
    endTime: formatDayIso(4, 21, 0),
    location: 'The Ned, 27 Poultry, London EC2R 8AJ',
    coordinates: { lat: 51.5132, lng: -0.0894 },
    formality: 'formal',
    description: 'Evening keynote reception and private networking drinks in the Banking Hall.',
    attendeesCount: 40,
  },

  // Day +5
  {
    id: 'm-9',
    title: 'Cross-Functional Quarterly Retro & Pub Social',
    startTime: formatDayIso(5, 16, 0),
    endTime: formatDayIso(5, 19, 0),
    location: 'The Culpeper, 40 Commercial St, Spitalfields, London E1 6LP',
    coordinates: { lat: 51.5168, lng: -0.0733 },
    formality: 'smart_casual',
    description: 'Quarterly retrospective and celebratory rooftop drinks with the team.',
    attendeesCount: 15,
  },

  // Multi-day calendar events (Detected by Sartorial Concierge)
  {
    id: 'm-trip-edinburgh',
    title: 'Edinburgh Executive Strategy Offsite & Highland Board Review',
    startTime: formatDayIso(2, 9, 0),
    endTime: formatDayIso(4, 17, 30), // Spans 3 days (Day +2 to Day +4)
    location: 'The Balmoral Hotel, 1 Princes St, Edinburgh EH2 2EQ',
    coordinates: { lat: 55.9527, lng: -3.1896 },
    formality: 'business_casual',
    description: '3-day executive leadership retreat in Edinburgh: quarterly strategic workshops, networking dinner at The Balmoral, and outdoor countryside walk.',
    attendeesCount: 14,
  },
  {
    id: 'm-trip-paris',
    title: 'Paris Global Luxury Retail & Fashion Summit',
    startTime: formatDayIso(8, 9, 30),
    endTime: formatDayIso(9, 18, 0), // Spans 2 days (Day +8 to Day +9)
    location: 'Le Meurice, 228 Rue de Rivoli, 75001 Paris, France',
    coordinates: { lat: 48.8656, lng: 2.3283 },
    formality: 'business_formal',
    description: '2-day international luxury summit: keynote address, buyer roundtables, and VIP evening gala in Paris.',
    attendeesCount: 65,
  },
];

