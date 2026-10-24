import { Meeting, TfLDisruption, CommutePlan, RouteStep } from '../types';

export const DEFAULT_LEAVE_BUFFER_MINUTES = 10;

/**
 * Calculates extra delay padding needed based on TfL line disruptions
 */
export function calculateDisruptionPaddingMinutes(disruptions: TfLDisruption[]): number {
  let padding = 0;
  for (const d of disruptions) {
    if (!d.isDisrupted) continue;
    const desc = d.statusSeverityDescription.toLowerCase();
    if (desc.includes('severe') || desc.includes('suspended') || desc.includes('part suspended')) {
      padding += 20;
    } else if (desc.includes('minor') || desc.includes('delays')) {
      padding += 10;
    } else {
      padding += 5;
    }
  }
  return padding;
}

/**
 * Calculates the exact recommended departure time
 */
export function calculateDepartureTime(
  meetingStartTime: Date,
  commuteDurationMinutes: number,
  bufferMinutes: number = DEFAULT_LEAVE_BUFFER_MINUTES,
  extraDisruptionPaddingMinutes: number = 0
): Date {
  const totalLeadMinutes = commuteDurationMinutes + bufferMinutes + extraDisruptionPaddingMinutes;
  return new Date(meetingStartTime.getTime() - totalLeadMinutes * 60 * 1000);
}

/**
 * Calculates minutes remaining until the user must leave the house
 */
export function getMinutesUntilDeparture(departureTime: Date, currentTime: Date = new Date()): number {
  const diffMs = departureTime.getTime() - currentTime.getTime();
  return Math.round(diffMs / (60 * 1000));
}

/**
 * Determines whether the departure alert should be active (<= 10 mins remaining)
 */
export function isDepartureAlertActive(minutesUntilDeparture: number): boolean {
  // Active if 10 mins or less before departure time, up to 15 mins after departure time (running late)
  return minutesUntilDeparture <= 10 && minutesUntilDeparture >= -15;
}

/**
 * Generates formatted text of directions for sharing, SMS, clipboard, or push notification
 */
export function formatDirectionsText(commute: CommutePlan, meeting: Meeting): string {
  const depTimeStr = commute.departureTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const arrTimeStr = commute.arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let text = `🧭 COMMUTE BRIEF: ${meeting.title}\n`;
  text += `📍 Destination: ${meeting.location}\n`;
  text += `⏰ Recommended Departure: ${depTimeStr} (Buffer: 10m included)\n`;
  text += `⏱️ Est. Travel Time: ${commute.durationMinutes} mins | Arrival: ${arrTimeStr}\n`;
  if (commute.estimatedFare) {
    text += `💳 Est. Fare: ${commute.estimatedFare.formatted} (${commute.estimatedFare.rateLabel}) | Return: £${(commute.estimatedFare.amount * 2).toFixed(2)}\n`;
    if (commute.estimatedFare.breakdown) {
      text += `ℹ️ Fare Rate: ${commute.estimatedFare.breakdown}\n`;
    }
  }

  if (commute.tflStatusAlerts.length > 0) {
    text += `\n⚠️ TfL Transit Notice:\n`;
    commute.tflStatusAlerts.forEach(t => {
      text += `• ${t.lineName}: ${t.statusSeverityDescription}${t.reason ? ` - ${t.reason}` : ''}\n`;
    });
  }

  if (commute.steps && commute.steps.length > 0) {
    text += `\n🚶 ROUTE STEPS:\n`;
    commute.steps.forEach((step, idx) => {
      const mode = step.transitMode ? `[${step.transitMode}] ` : '';
      text += `${idx + 1}. ${mode}${step.instruction} (${step.duration})\n`;
    });
  }

  text += `\n🗺️ Open in Google Maps:\nhttps://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(commute.origin)}&destination=${encodeURIComponent(meeting.location)}&travelmode=transit`;

  return text;
}
