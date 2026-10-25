import { Meeting } from '../types';
import { inferFormalityFromTitle } from './calendarService';

export async function fetchIcsCalendarEvents(icsUrl: string): Promise<Meeting[]> {
  const res = await fetch(`/api/ical-proxy?url=${encodeURIComponent(icsUrl)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`iCal fetch failed (${res.status}): ${text}`);
  }
  return res.json();
}
