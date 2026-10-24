import { CommuteFareEstimate, ModeCostOption, RouteStep, TransportModeType } from '../types';

/**
 * Determines if a given date and time falls within TfL Peak Fare hours.
 * TfL Peak hours: Monday to Friday from 06:30 to 09:30, and from 16:00 to 19:00.
 * Weekends (Saturday and Sunday) are strictly off-peak all day.
 */
export function isTfLPeakHour(date: Date): boolean {
  const day = date.getDay(); // 0 is Sunday, 6 is Saturday
  if (day === 0 || day === 6) {
    return false;
  }

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  // Morning peak: 06:30 (390 mins) to 09:30 (570 mins)
  const isMorningPeak = timeInMinutes >= 6 * 60 + 30 && timeInMinutes <= 9 * 60 + 30;

  // Evening peak: 16:00 (960 mins) to 19:00 (1140 mins)
  const isEveningPeak = timeInMinutes >= 16 * 60 && timeInMinutes <= 19 * 60;

  return isMorningPeak || isEveningPeak;
}

/**
 * Calculates estimated fare for London Underground / Overground / Elizabeth line
 * based on distance and peak vs off-peak times.
 */
export function calculateTubeFare(distanceKm: number, departureTime: Date): CommuteFareEstimate {
  const isPeak = isTfLPeakHour(departureTime);

  let amount = 0;
  let breakdown = '';
  let dailyCap = 'Daily cap £8.50';

  if (distanceKm <= 5) {
    amount = isPeak ? 3.40 : 2.80;
    breakdown = `Zone 1 Contactless (${isPeak ? 'Peak' : 'Off-Peak'})`;
  } else if (distanceKm <= 10) {
    amount = isPeak ? 3.70 : 3.00;
    breakdown = `Zones 1–2 Contactless (${isPeak ? 'Peak' : 'Off-Peak'})`;
  } else if (distanceKm <= 16) {
    amount = isPeak ? 4.30 : 3.40;
    breakdown = `Zones 1–3 Contactless (${isPeak ? 'Peak' : 'Off-Peak'})`;
    dailyCap = 'Daily cap £10.00';
  } else if (distanceKm <= 24) {
    amount = isPeak ? 5.30 : 4.00;
    breakdown = `Zones 1–4 Contactless (${isPeak ? 'Peak' : 'Off-Peak'})`;
    dailyCap = 'Daily cap £12.10';
  } else {
    amount = isPeak ? 6.70 : 4.70;
    breakdown = `Zones 1–6 Contactless (${isPeak ? 'Peak' : 'Off-Peak'})`;
    dailyCap = 'Daily cap £15.60';
  }

  return {
    amount,
    currency: 'GBP',
    currencySymbol: '£',
    formatted: `£${amount.toFixed(2)}`,
    rateType: isPeak ? 'peak' : 'off_peak',
    rateLabel: isPeak ? 'TfL Peak Tube' : 'TfL Off-Peak Tube',
    isPeak,
    breakdown,
    dailyCap,
  };
}

/**
 * Calculates TfL Bus fare (£1.75 flat Hopper fare).
 */
export function calculateBusFare(): CommuteFareEstimate {
  return {
    amount: 1.75,
    currency: 'GBP',
    currencySymbol: '£',
    formatted: '£1.75',
    rateType: 'flat',
    rateLabel: 'TfL Hopper Bus',
    isPeak: false,
    breakdown: 'Flat £1.75 fare (Unlimited bus/tram transfers within 60 mins)',
    dailyCap: 'Daily bus cap £5.25',
  };
}

/**
 * Calculates London Black Cab / Taxi fare estimate.
 */
export function calculateTaxiFare(distanceKm: number, durationMinutes: number): CommuteFareEstimate {
  // Flag fall £3.80 + ~£2.20 per km + ~£0.35 per minute in traffic
  const base = 3.80;
  const distanceCost = distanceKm * 2.20;
  const timeCost = durationMinutes * 0.35;
  const rawAmount = Math.max(7.50, Math.round((base + distanceCost + timeCost) * 10) / 10);
  const roundedAmount = Math.round(rawAmount * 100) / 100;

  return {
    amount: roundedAmount,
    currency: 'GBP',
    currencySymbol: '£',
    formatted: `£${roundedAmount.toFixed(2)}`,
    rateType: 'metered',
    rateLabel: 'London Black Cab / Taxi',
    isPeak: false,
    breakdown: `Metered estimate (£3.80 base + £2.20/km + time in traffic)`,
  };
}

/**
 * Calculates Walking fare (Free).
 */
export function calculateWalkFare(): CommuteFareEstimate {
  return {
    amount: 0.00,
    currency: 'GBP',
    currencySymbol: '£',
    formatted: '£0.00',
    rateType: 'free',
    rateLabel: 'Free / Zero Carbon',
    isPeak: false,
    breakdown: 'Walking route (0g CO2, £0 expenditure)',
  };
}

/**
 * Calculates Cycling fare (Santander Cycles / Personal bike).
 */
export function calculateCycleFare(): CommuteFareEstimate {
  return {
    amount: 1.65,
    currency: 'GBP',
    currencySymbol: '£',
    formatted: '£1.65',
    rateType: 'flat',
    rateLabel: 'Santander Cycle Hire',
    isPeak: false,
    breakdown: '£1.65 per 30 mins (Or £0.00 with personal bicycle)',
  };
}

/**
 * Calculates Driving fare including fuel and optional London Congestion Charge.
 */
export function calculateDrivingFare(
  distanceKm: number,
  departureTime: Date,
  isCentralLondon: boolean = true
): CommuteFareEstimate {
  const fuelCost = Math.round(distanceKm * 0.22 * 100) / 100;
  const day = departureTime.getDay();
  const hours = departureTime.getHours();

  // Congestion charge applies:
  // Mon–Fri 07:00–18:00, Sat–Sun 12:00–18:00
  let isCongestionCharged = false;
  if (isCentralLondon) {
    if (day >= 1 && day <= 5) {
      isCongestionCharged = hours >= 7 && hours < 18;
    } else {
      isCongestionCharged = hours >= 12 && hours < 18;
    }
  }

  const congestionCharge = isCongestionCharged ? 15.00 : 0.00;
  const total = Math.round((fuelCost + congestionCharge) * 100) / 100;

  return {
    amount: total,
    currency: 'GBP',
    currencySymbol: '£',
    formatted: `£${total.toFixed(2)}`,
    rateType: 'metered',
    rateLabel: isCongestionCharged ? 'Driving + Congestion Charge' : 'Driving (Fuel Only)',
    isPeak: isCongestionCharged,
    breakdown: isCongestionCharged
      ? `£${fuelCost.toFixed(2)} fuel + £15.00 London Congestion Charge`
      : `£${fuelCost.toFixed(2)} fuel consumption estimate`,
  };
}

/**
 * General route fare calculator based on transport mode, distance, duration, and departure time.
 */
export function calculateRouteFare(params: {
  mode?: TransportModeType;
  distanceKm: number;
  durationMinutes: number;
  departureTime: Date;
  steps?: RouteStep[];
}): CommuteFareEstimate {
  const { mode = 'TRANSIT', distanceKm, durationMinutes, departureTime } = params;

  let estimate: CommuteFareEstimate;
  switch (mode) {
    case 'BUS':
      estimate = calculateBusFare();
      break;
    case 'TAXI':
      estimate = calculateTaxiFare(distanceKm, durationMinutes);
      break;
    case 'WALK':
      estimate = calculateWalkFare();
      break;
    case 'BICYCLE':
      estimate = calculateCycleFare();
      break;
    case 'DRIVING':
      estimate = calculateDrivingFare(distanceKm, departureTime);
      break;
    case 'TRANSIT':
    default:
      estimate = calculateTubeFare(distanceKm, departureTime);
      break;
  }

  // Calculate savings vs taxi for public transit/active travel
  const taxi = calculateTaxiFare(distanceKm, durationMinutes);
  if (estimate.amount < taxi.amount) {
    const diff = Math.round((taxi.amount - estimate.amount) * 100) / 100;
    estimate.savingsVsCab = `Save £${diff.toFixed(2)} vs Taxi`;
  }

  return estimate;
}

/**
 * Generates a full multimodal cost and time comparison across transport modes.
 */
export function calculateAllModeOptions(
  distanceKm: number,
  baseTransitDurationMinutes: number,
  departureTime: Date
): ModeCostOption[] {
  // Tube / Public transit
  const transitFare = calculateTubeFare(distanceKm, departureTime);
  const taxiFare = calculateTaxiFare(distanceKm, Math.max(12, Math.round(distanceKm * 2.2)));
  const busFare = calculateBusFare();
  const walkFare = calculateWalkFare();
  const cycleFare = calculateCycleFare();

  // Duration estimations
  const taxiDuration = Math.max(12, Math.round(distanceKm * 2.3 + 4));
  const busDuration = Math.round(baseTransitDurationMinutes * 1.35 + 5);
  const cycleDuration = Math.max(8, Math.round(distanceKm * 3.5));
  const walkDuration = Math.round(distanceKm * 12);

  // CO2 estimations (g CO2 per passenger)
  // Tube ~33g/km, Bus ~82g/km, Taxi ~210g/km, Walk 0g, Bike 0g
  const options: ModeCostOption[] = [
    {
      mode: 'TRANSIT',
      label: 'London Underground / Rail',
      iconName: 'train',
      durationMinutes: baseTransitDurationMinutes,
      distanceKm,
      fare: {
        ...transitFare,
        savingsVsCab: `Save £${(taxiFare.amount - transitFare.amount).toFixed(2)} vs Cab`,
      },
      co2Grams: Math.round(distanceKm * 33),
      isRecommended: true,
    },
    {
      mode: 'BUS',
      label: 'TfL Red Bus (Hopper)',
      iconName: 'bus',
      durationMinutes: busDuration,
      distanceKm,
      fare: {
        ...busFare,
        savingsVsCab: `Save £${(taxiFare.amount - busFare.amount).toFixed(2)} vs Cab`,
      },
      co2Grams: Math.round(distanceKm * 82),
    },
    {
      mode: 'TAXI',
      label: 'London Black Cab / Taxi',
      iconName: 'car',
      durationMinutes: taxiDuration,
      distanceKm,
      fare: taxiFare,
      co2Grams: Math.round(distanceKm * 210),
    },
    {
      mode: 'BICYCLE',
      label: 'Santander Cycles / Bike',
      iconName: 'bike',
      durationMinutes: cycleDuration,
      distanceKm,
      fare: cycleFare,
      co2Grams: 0,
    },
    {
      mode: 'WALK',
      label: 'Walking Route',
      iconName: 'footprints',
      durationMinutes: walkDuration,
      distanceKm,
      fare: walkFare,
      co2Grams: 0,
    },
  ];

  return options;
}

/**
 * Annotates individual route steps with their respective segment fare
 */
export function annotateRouteStepFares(steps: RouteStep[], departureTime: Date): RouteStep[] {
  const isPeak = isTfLPeakHour(departureTime);
  let hasBilledTube = false;
  let hasBilledBus = false;

  return steps.map((step) => {
    let stepFare = 'Included in ticket';

    if (step.transitMode === 'WALK') {
      stepFare = 'Free';
    } else if (step.transitMode === 'BUS') {
      if (!hasBilledBus) {
        stepFare = '£1.75 (TfL Hopper)';
        hasBilledBus = true;
      } else {
        stepFare = '£0.00 (Hopper Transfer)';
      }
    } else if (step.transitMode === 'TUBE' || step.transitMode === 'TRAIN' || step.transitMode === 'DLR' || step.transitMode === 'OVERGROUND') {
      if (!hasBilledTube) {
        stepFare = isPeak ? '£3.40 (TfL Peak)' : '£2.80 (TfL Off-Peak)';
        hasBilledTube = true;
      } else {
        stepFare = '£0.00 (Free interchange)';
      }
    }

    return {
      ...step,
      stepFare,
    };
  });
}
