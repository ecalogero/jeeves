import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTfLPeakHour,
  calculateTubeFare,
  calculateBusFare,
  calculateTaxiFare,
  calculateWalkFare,
  calculateCycleFare,
  calculateDrivingFare,
  calculateRouteFare,
  calculateAllModeOptions,
  annotateRouteStepFares,
} from './commuteFareCalculator';
import { RouteStep } from '../types';

test('isTfLPeakHour accurately detects TfL peak and off-peak windows', () => {
  // Monday morning peak (08:30)
  const mondayPeak = new Date('2026-10-26T08:30:00'); // Mon
  assert.equal(isTfLPeakHour(mondayPeak), true, 'Monday 08:30 should be peak');

  // Monday morning boundary start (06:30)
  const mondayPeakStart = new Date('2026-10-26T06:30:00');
  assert.equal(isTfLPeakHour(mondayPeakStart), true, 'Monday 06:30 should be peak start');

  // Monday morning boundary end (09:30)
  const mondayPeakEnd = new Date('2026-10-26T09:30:00');
  assert.equal(isTfLPeakHour(mondayPeakEnd), true, 'Monday 09:30 should be peak end');

  // Monday midday off-peak (11:15)
  const mondayOffPeak = new Date('2026-10-26T11:15:00');
  assert.equal(isTfLPeakHour(mondayOffPeak), false, 'Monday 11:15 should be off-peak');

  // Friday evening peak (17:45)
  const fridayEveningPeak = new Date('2026-10-30T17:45:00'); // Fri
  assert.equal(isTfLPeakHour(fridayEveningPeak), true, 'Friday 17:45 should be evening peak');

  // Friday night off-peak (21:00)
  const fridayNight = new Date('2026-10-30T21:00:00');
  assert.equal(isTfLPeakHour(fridayNight), false, 'Friday 21:00 should be off-peak');

  // Saturday morning (08:30) - All weekends are off-peak in London TfL
  const saturdayMorning = new Date('2026-10-31T08:30:00'); // Sat
  assert.equal(isTfLPeakHour(saturdayMorning), false, 'Saturday 08:30 should be off-peak on weekends');

  // Sunday evening (17:30) - All weekends are off-peak
  const sundayEvening = new Date('2026-11-01T17:30:00'); // Sun
  assert.equal(isTfLPeakHour(sundayEvening), false, 'Sunday 17:30 should be off-peak on weekends');
});

test('calculateTubeFare scales by distance and peak pricing', () => {
  const peakTime = new Date('2026-10-26T08:30:00'); // Mon peak
  const offPeakTime = new Date('2026-10-26T14:00:00'); // Mon off-peak

  // Short trip (Zone 1)
  const peakShort = calculateTubeFare(3.5, peakTime);
  assert.equal(peakShort.amount, 3.40);
  assert.equal(peakShort.formatted, '£3.40');
  assert.equal(peakShort.isPeak, true);

  const offPeakShort = calculateTubeFare(3.5, offPeakTime);
  assert.equal(offPeakShort.amount, 2.80);
  assert.equal(offPeakShort.formatted, '£2.80');
  assert.equal(offPeakShort.isPeak, false);

  // Medium trip (Zones 1-2)
  const peakMedium = calculateTubeFare(8.0, peakTime);
  assert.equal(peakMedium.amount, 3.70);
  assert.equal(peakMedium.formatted, '£3.70');

  const offPeakMedium = calculateTubeFare(8.0, offPeakTime);
  assert.equal(offPeakMedium.amount, 3.00);

  // Longer trip (Zones 1-3)
  const peakLong = calculateTubeFare(14.0, peakTime);
  assert.equal(peakLong.amount, 4.30);
  assert.ok(peakLong.dailyCap?.includes('£10.00'));
});

test('calculateBusFare returns flat £1.75 Hopper fare', () => {
  const busFare = calculateBusFare();
  assert.equal(busFare.amount, 1.75);
  assert.equal(busFare.formatted, '£1.75');
  assert.equal(busFare.rateType, 'flat');
  assert.ok(busFare.breakdown.includes('1.75'));
  assert.ok(busFare.dailyCap?.includes('£5.25'));
});

test('calculateTaxiFare computes metered fare with base flag fall and per-km cost', () => {
  const taxiFare = calculateTaxiFare(10, 25);
  // Base £3.80 + 10km * £2.20 = £25.80 + 25m * £0.35 = £8.75 => ~£34.55
  assert.ok(taxiFare.amount > 20);
  assert.equal(taxiFare.currency, 'GBP');
  assert.equal(taxiFare.currencySymbol, '£');
  assert.ok(taxiFare.formatted.startsWith('£'));
  assert.equal(taxiFare.rateType, 'metered');
});

test('calculateWalkFare and calculateCycleFare return correct values', () => {
  const walk = calculateWalkFare();
  assert.equal(walk.amount, 0.00);
  assert.equal(walk.formatted, '£0.00');
  assert.equal(walk.rateType, 'free');

  const cycle = calculateCycleFare();
  assert.equal(cycle.amount, 1.65);
  assert.equal(cycle.formatted, '£1.65');
});

test('calculateDrivingFare includes London Congestion Charge during operating hours', () => {
  const weekdayChargeHour = new Date('2026-10-26T10:00:00'); // Mon 10:00
  const weekdayNight = new Date('2026-10-26T22:00:00'); // Mon 22:00

  const fareDay = calculateDrivingFare(10, weekdayChargeHour, true);
  // Congestion charge £15 + fuel ~£2.20 => £17.20
  assert.ok(fareDay.amount >= 17.00);
  assert.ok(fareDay.breakdown.includes('Congestion Charge'));

  const fareNight = calculateDrivingFare(10, weekdayNight, true);
  // Fuel only ~£2.20
  assert.ok(fareNight.amount < 10.00);
  assert.ok(fareNight.breakdown.includes('fuel'));
});

test('calculateRouteFare attaches savings vs cab for public transit', () => {
  const peakTime = new Date('2026-10-26T08:30:00');
  const routeFare = calculateRouteFare({
    mode: 'TRANSIT',
    distanceKm: 11.2,
    durationMinutes: 32,
    departureTime: peakTime,
  });

  assert.equal(routeFare.amount, 4.30);
  assert.equal(routeFare.isPeak, true);
  assert.ok(routeFare.savingsVsCab, 'Should compute savings vs taxi');
  assert.ok(routeFare.savingsVsCab?.includes('Save £'));
});

test('calculateAllModeOptions generates comparisons for 5 transport modes', () => {
  const peakTime = new Date('2026-10-26T08:30:00');
  const comparisons = calculateAllModeOptions(8.5, 28, peakTime);

  assert.equal(comparisons.length, 5);
  const modes = comparisons.map(c => c.mode);
  assert.ok(modes.includes('TRANSIT'));
  assert.ok(modes.includes('BUS'));
  assert.ok(modes.includes('TAXI'));
  assert.ok(modes.includes('BICYCLE'));
  assert.ok(modes.includes('WALK'));

  const transit = comparisons.find(c => c.mode === 'TRANSIT')!;
  assert.equal(transit.fare.formatted, '£3.70');
  assert.equal(transit.isRecommended, true);

  const bus = comparisons.find(c => c.mode === 'BUS')!;
  assert.equal(bus.fare.formatted, '£1.75');

  const walk = comparisons.find(c => c.mode === 'WALK')!;
  assert.equal(walk.fare.formatted, '£0.00');
  assert.equal(walk.co2Grams, 0);
});

test('annotateRouteStepFares marks tube, bus, and free walk/transfers', () => {
  const departureTime = new Date('2026-10-26T08:30:00');
  const steps: RouteStep[] = [
    { instruction: 'Walk to station', distance: '300m', duration: '4 mins', transitMode: 'WALK' },
    { instruction: 'Board District Line', distance: '4.8 km', duration: '14 mins', transitMode: 'TUBE', lineName: 'District' },
    { instruction: 'Change at Westminster for Jubilee Line', distance: '5.6 km', duration: '11 mins', transitMode: 'TUBE', lineName: 'Jubilee' },
    { instruction: 'Walk to office', distance: '180m', duration: '3 mins', transitMode: 'WALK' },
  ];

  const annotated = annotateRouteStepFares(steps, departureTime);
  assert.equal(annotated[0].stepFare, 'Free');
  assert.ok(annotated[1].stepFare?.includes('£3.40'));
  assert.equal(annotated[2].stepFare, '£0.00 (Free interchange)');
  assert.equal(annotated[3].stepFare, 'Free');
});
