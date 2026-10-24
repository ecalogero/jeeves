import { WeatherCondition } from '../types';

/**
 * Fetches real-time weather from Open-Meteo for given coordinates
 */
export async function fetchWeatherForLocation(
  lat: number = 51.5074,
  lng: number = -0.1278
): Promise<WeatherCondition> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=precipitation_probability&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather fetch failed: ${res.statusText}`);
    const data = await res.json();

    const current = data.current;
    const tempC = Math.round(current.temperature_2m);
    const feelsLikeC = Math.round(current.apparent_temperature);
    const windKmh = Math.round(current.wind_speed_10m);
    const weatherCode = current.weather_code;

    // Estimate precipitation prob from hourly or precipitation amount
    const hourlyProbs: number[] = data.hourly?.precipitation_probability || [];
    const currentHourIndex = new Date().getHours();
    const precipProb = hourlyProbs[currentHourIndex] ?? (current.precipitation > 0 ? 80 : 15);

    // WMO Weather interpretation codes
    let condition: WeatherCondition['condition'] = 'partly_cloudy';
    let summary = 'Partly Cloudy';
    let icon = 'cloud-sun';

    if (weatherCode === 0) {
      condition = 'clear';
      summary = 'Clear Sky';
      icon = 'sun';
    } else if (weatherCode >= 1 && weatherCode <= 3) {
      condition = 'partly_cloudy';
      summary = weatherCode === 3 ? 'Overcast' : 'Partly Cloudy';
      icon = weatherCode === 3 ? 'cloud' : 'cloud-sun';
    } else if (weatherCode >= 51 && weatherCode <= 55) {
      condition = 'drizzle';
      summary = 'Light Drizzle';
      icon = 'cloud-drizzle';
    } else if (weatherCode >= 61 && weatherCode <= 67) {
      condition = weatherCode >= 65 ? 'heavy_rain' : 'rain';
      summary = weatherCode >= 65 ? 'Heavy Rain' : 'Showers';
      icon = 'cloud-rain';
    } else if (weatherCode >= 71 && weatherCode <= 77) {
      condition = 'snow';
      summary = 'Snow Fall';
      icon = 'snowflake';
    } else if (weatherCode >= 80 && weatherCode <= 82) {
      condition = 'rain';
      summary = 'Rain Showers';
      icon = 'cloud-rain';
    }

    if (windKmh > 35) {
      condition = 'windy';
      summary = `${summary} & Gusty`;
    }

    return {
      temperatureC: tempC,
      feelsLikeC,
      condition,
      precipitationProbability: precipProb,
      windSpeedKmh: windKmh,
      summary,
      icon,
    };
  } catch (err) {
    console.warn('Weather API fallback used:', err);
    // London seasonal default
    return {
      temperatureC: 14,
      feelsLikeC: 13,
      condition: 'rain',
      precipitationProbability: 65,
      windSpeedKmh: 18,
      summary: 'Scattered Showers & Breezy',
      icon: 'cloud-rain',
    };
  }
}
