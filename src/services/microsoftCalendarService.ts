import { Meeting } from '../types';
import { getMicrosoftToken } from './microsoftAuth';
import { inferFormalityFromTitle } from './calendarService';

export async function fetchMicrosoftCalendarEvents(): Promise<Meeting[]> {
  const token = await getMicrosoftToken();
  if (!token) throw new Error('No Microsoft access token available');

  const now = new Date();
  const timeMax = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${now.toISOString()}&endDateTime=${timeMax.toISOString()}&$orderby=start/dateTime&$top=20&$select=id,subject,start,end,location,bodyPreview,attendees,isOnlineMeeting`;

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Microsoft Graph API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  return (data.value ?? []).map((item: any): Meeting => {
    const title = item.subject || 'Scheduled Meeting';
    const locationStr = item.location?.displayName || '';
    const isVirtual = item.isOnlineMeeting || locationStr.toLowerCase().includes('teams') || locationStr.toLowerCase().includes('zoom');
    const startTime = item.start?.dateTime
      ? new Date(item.start.dateTime + (item.start.timeZone === 'UTC' ? 'Z' : '')).toISOString()
      : new Date().toISOString();
    const endTime = item.end?.dateTime
      ? new Date(item.end.dateTime + (item.end.timeZone === 'UTC' ? 'Z' : '')).toISOString()
      : new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString();

    return {
      id: item.id,
      title,
      startTime,
      endTime,
      location: isVirtual && !locationStr ? 'Virtual Meeting (Teams)' : locationStr || 'London Office',
      formality: inferFormalityFromTitle(title, item.bodyPreview || ''),
      description: item.bodyPreview,
      isVirtual,
      attendeesCount: item.attendees?.length ?? 1,
    };
  });
}
