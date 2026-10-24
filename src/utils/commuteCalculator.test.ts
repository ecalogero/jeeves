import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDisruptionPaddingMinutes,
  calculateDepartureTime,
  getMinutesUntilDeparture,
  isDepartureAlertActive,
  formatDirectionsText,
} from './commuteCalculator';
import { TfLDisruption, CommutePlan, Meeting } from '../types';

test('calculateDisruptionPaddingMinutes adds delay padding based on disruption severity', () => {
  const noDisruptions: TfLDisruption[] = [
    { lineId: 'jubilee', lineName: 'Jubilee', statusSeverityDescription: 'Good Service', isDisrupted: false },
  ];
  assert.equal(calculateDisruptionPaddingMinutes(noDisruptions), 0);

  const minorDisruptions: TfLDisruption[] = [
    { lineId: 'central', lineName: 'Central', statusSeverityDescription: 'Minor Delays', isDisrupted: true },
  ];
  assert.equal(calculateDisruptionPaddingMinutes(minorDisruptions), 10);

  const severeDisruptions: TfLDisruption[] = [
    { lineId: 'piccadilly', lineName: 'Piccadilly', statusSeverityDescription: 'Part Suspended', isDisrupted: true },
  ];
  assert.equal(calculateDisruptionPaddingMinutes(severeDisruptions), 20);
});

test('calculateDepartureTime accounts for commute, 10m buffer, and disruptions', () => {
  const meetingTime = new Date('2026-10-24T10:00:00Z');
  const commuteMins = 30;
  const bufferMins = 10;
  const disruptionMins = 10; // extra padding

  const departure = calculateDepartureTime(meetingTime, commuteMins, bufferMins, disruptionMins);
  // Total 50 mins before meeting -> 09:10:00Z
  assert.equal(departure.toISOString(), new Date('2026-10-24T09:10:00Z').toISOString());
});

test('isDepartureAlertActive flags alert when <= 10 minutes remain', () => {
  assert.equal(isDepartureAlertActive(15), false);
  assert.equal(isDepartureAlertActive(10), true);
  assert.equal(isDepartureAlertActive(5), true);
  assert.equal(isDepartureAlertActive(0), true);
  assert.equal(isDepartureAlertActive(-5), true); // 5 mins overdue
  assert.equal(isDepartureAlertActive(-20), false); // long passed
});

test('formatDirectionsText produces formatted itinerary and Google Maps link', () => {
  const meeting: Meeting = {
    id: 'm1',
    title: 'Client Strategy Meeting',
    startTime: '2026-10-24T10:00:00Z',
    endTime: '2026-10-24T11:00:00Z',
    location: '1 Canada Square, Canary Wharf, London',
    formality: 'business_formal',
  };

  const commute: CommutePlan = {
    origin: 'Kensington High St, London',
    destination: '1 Canada Square, Canary Wharf, London',
    durationMinutes: 35,
    distanceKm: 12.4,
    departureTime: new Date('2026-10-24T09:15:00Z'),
    arrivalTime: new Date('2026-10-24T09:50:00Z'),
    minutesUntilDeparture: 8,
    isAlertActive: true,
    tflStatusAlerts: [],
    suggestedPaddingMinutes: 0,
    steps: [
      { instruction: 'Walk to High Street Kensington Station', distance: '300m', duration: '4 mins', transitMode: 'WALK' },
      { instruction: 'Take Circle Line to Westminster', distance: '5 km', duration: '14 mins', transitMode: 'TUBE' },
      { instruction: 'Transfer to Jubilee Line to Canary Wharf', distance: '7 km', duration: '12 mins', transitMode: 'TUBE' },
    ],
  };

  const text = formatDirectionsText(commute, meeting);
  assert.ok(text.includes('Client Strategy Meeting'));
  assert.ok(text.includes('Canary Wharf'));
  assert.ok(text.includes('google.com/maps/dir'));
  assert.ok(text.includes('Circle Line'));
});
