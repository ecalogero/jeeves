import { Meeting, Formality } from '../types';
import { getAccessToken } from './firebaseAuth';

/**
 * Infer formality level from meeting title and description
 */
export function inferFormalityFromTitle(title: string, description: string = ''): Formality {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('board') || text.includes('executive') || text.includes('gala') || text.includes('investor') || text.includes('formal') || text.includes('keynote')) {
    return 'business_formal';
  }
  if (text.includes('client') || text.includes('sales') || text.includes('presentation') || text.includes('pitch') || text.includes('partnership')) {
    return 'business_casual';
  }
  if (text.includes('design') || text.includes('sprint') || text.includes('retro') || text.includes('interview') || text.includes('workshop') || text.includes('offsite')) {
    return 'smart_casual';
  }
  if (text.includes('coffee') || text.includes('catch up') || text.includes('lunch') || text.includes('drinks') || text.includes('casual') || text.includes('1:1')) {
    return 'casual';
  }

  return 'smart_casual';
}

/**
 * Fetches upcoming calendar events from Google Calendar API
 */
export async function fetchGoogleCalendarEvents(): Promise<Meeting[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No Google Calendar access token available');
  }

  const now = new Date();
  const timeMin = now.toISOString();
  // Fetch up to 7 days ahead
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=20`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Calendar API error (${res.status}): ${errorText}`);
  }

  const data = await res.json();
  const items = data.items || [];

  return items.map((item: any): Meeting => {
    const title = item.summary || 'Scheduled Meeting';
    const location = item.location || 'London Central Office, UK';
    const startTime = item.start?.dateTime || item.start?.date || new Date().toISOString();
    const endTime = item.end?.dateTime || item.end?.date || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();
    const isVirtual = !item.location || item.location.includes('meet.google.com') || item.location.includes('zoom.us') || item.location.includes('teams.microsoft.com');

    return {
      id: item.id,
      title,
      startTime,
      endTime,
      location: isVirtual && !item.location ? 'Virtual Meeting (Home Office)' : location,
      formality: inferFormalityFromTitle(title, item.description || ''),
      description: item.description,
      isVirtual,
      attendeesCount: item.attendees?.length || 1,
    };
  });
}
