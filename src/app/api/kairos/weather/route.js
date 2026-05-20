/**
 * GET /api/kairos/weather?lat=<n>&lon=<n>
 *
 * Server-side proxy for OpenWeatherMap One Call 3.0 + AI weather overview.
 *
 * What this provides to the Kairos page that Open-Meteo doesn't:
 *   - Government weather alerts (NOAA, EUMETNET, …) for the requested region
 *   - Real-time current conditions (temp, humidity, wind, pressure, UV, clouds)
 *   - An AI-generated human-readable weather summary for today
 *
 * Open-Meteo stays as the primary feed for historical + 14-day forward daily
 * charts; OpenWeather supplements with the bits Open-Meteo can't surface in a
 * single call. The OPENWEATHER_API_KEY is server-only — it must never be
 * shipped to the browser, which is why this proxy exists.
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Read at request time, not module load. Module-level captures freeze
// build-container env values; this getter sees rotations after deploy.
function getOwmKey() {
  return process.env.OPENWEATHER_API_KEY || '';
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'lat and lon required' }, { status: 400 });
  }

  const OWM_KEY = getOwmKey();
  if (!OWM_KEY) {
    // Return a degraded but valid response so the page doesn't break.
    // All Open-Meteo-powered cards still work; only OWM-exclusive features
    // (AI summary, live conditions, government alerts) are missing.
    return NextResponse.json(
      {
        ok: false,
        degraded: true,
        reason: 'OPENWEATHER_API_KEY not configured',
        current: null,
        daily: [],
        alerts: [],
        overview: null,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=60' },
      },
    );
  }

  try {
    // One Call (current + daily + alerts + hourly) and the AI overview run in
    // parallel. Overview is best-effort — if it fails we still return the rest.
    const [oneCallRes, overviewRes] = await Promise.all([
      fetch(
        `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(OWM_KEY)}`,
        { cache: 'no-store' },
      ),
      fetch(
        `https://api.openweathermap.org/data/3.0/onecall/overview?lat=${lat}&lon=${lon}&units=metric&appid=${encodeURIComponent(OWM_KEY)}`,
        { cache: 'no-store' },
      ).catch(() => null),
    ]);

    if (!oneCallRes.ok) {
      const body = await oneCallRes.text();
      console.error(
        `[kairos/weather] OWM ${oneCallRes.status} for lat=${lat},lon=${lon}: key=${
          OWM_KEY ? OWM_KEY.slice(0, 4) + '***' : 'MISSING'
        }, body=${body.slice(0, 200)}`,
      );
      return NextResponse.json(
        { error: `OpenWeather ${oneCallRes.status}`, detail: body.slice(0, 100) },
        {
          status: oneCallRes.status,
          headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
        },
      );
    }

    const oneCall = await oneCallRes.json();
    const overview = overviewRes?.ok ? await overviewRes.json() : null;

    const result = {
      ok: true,

      current: {
        temp: oneCall.current?.temp,
        feelsLike: oneCall.current?.feels_like,
        humidity: oneCall.current?.humidity,
        pressure: oneCall.current?.pressure,
        windSpeed: oneCall.current?.wind_speed,
        windGust: oneCall.current?.wind_gust,
        windDeg: oneCall.current?.wind_deg,
        clouds: oneCall.current?.clouds,
        uvi: oneCall.current?.uvi,
        visibility: oneCall.current?.visibility,
        weather: oneCall.current?.weather?.[0] || null,
        rain1h: oneCall.current?.rain?.['1h'] || 0,
        snow1h: oneCall.current?.snow?.['1h'] || 0,
        dt: oneCall.current?.dt,
        sunrise: oneCall.current?.sunrise,
        sunset: oneCall.current?.sunset,
      },

      daily: (oneCall.daily || []).map((d) => ({
        dt: d.dt,
        tempDay: d.temp?.day,
        tempNight: d.temp?.night,
        tempMin: d.temp?.min,
        tempMax: d.temp?.max,
        feelsLikeDay: d.feels_like?.day,
        humidity: d.humidity,
        pressure: d.pressure,
        windSpeed: d.wind_speed,
        windGust: d.wind_gust,
        windDeg: d.wind_deg,
        clouds: d.clouds,
        uvi: d.uvi,
        pop: d.pop,
        rain: d.rain || 0,
        snow: d.snow || 0,
        summary: d.summary,
        weather: d.weather?.[0] || null,
      })),

      // Government weather alerts (NOAA, EUMETNET, …). Empty array when none.
      alerts: (oneCall.alerts || []).map((a) => ({
        sender: a.sender_name,
        event: a.event,
        start: a.start,
        end: a.end,
        description: a.description,
        tags: a.tags || [],
      })),

      overview: overview?.weather_overview || null,

      timezone: oneCall.timezone,
      timezoneOffset: oneCall.timezone_offset,
      lat: oneCall.lat,
      lon: oneCall.lon,
    };

    // 5-minute edge cache so alerts stay fresh; SWR keeps the UI responsive.
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[kairos/weather]', err);
    return NextResponse.json(
      { error: err.message },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      },
    );
  }
}
