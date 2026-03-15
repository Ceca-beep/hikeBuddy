import requests
from datetime import datetime, timezone, timedelta, date as date_type


def check_forecast_availability(selected_date: str) -> dict:
    today = date_type.today()
    target = datetime.strptime(selected_date, "%Y-%m-%d").date()
    days_ahead = (target - today).days

    if days_ahead < 0:
        return {"available": False, "reliability": "none",
                "message": "This date is in the past."}
    elif days_ahead <= 3:
        return {"available": True, "reliability": "high", "message": None}
    elif days_ahead <= 7:
        return {"available": True, "reliability": "medium",
                "message": "⚠️ Forecast is approximate — check again closer to your hike date"}
    elif days_ahead <= 16:
        return {"available": True, "reliability": "low",
                "message": "⚠️ Weather this far ahead is very uncertain — rough estimate only"}
    else:
        return {"available": False, "reliability": "none",
                "message": "⚠️ Weather forecast not available beyond 16 days"}


def get_weather(lat: float, lng: float, date: str) -> dict:
    """Fetch daily weather summary for a specific coordinate and date."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lng,
        "daily": [
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max",
            "windspeed_10m_max",
        ],
        "timezone": "Europe/Bucharest",
        "start_date": date,
        "end_date": date
    }
    response = requests.get(url, params=params)
    daily = response.json()["daily"]
    return {
        "temp_max_c":       daily["temperature_2m_max"][0],
        "temp_min_c":       daily["temperature_2m_min"][0],
        "rain_probability": daily["precipitation_probability_max"][0],
        "wind_kmh":         daily["windspeed_10m_max"][0],
    }


def get_daylight(lat: float, lng: float, date: str) -> dict:
    """Always accurate for ANY date — pure astronomy, not a forecast."""
    url = "https://api.sunrise-sunset.org/json"
    params = {"lat": lat, "lng": lng, "date": date, "formatted": 0}
    response = requests.get(url, params=params)
    data = response.json()["results"]

    sunrise_utc = datetime.fromisoformat(data["sunrise"])
    sunset_utc  = datetime.fromisoformat(data["sunset"])

    month = datetime.strptime(date, "%Y-%m-%d").month if date != "today" \
            else datetime.now().month
    offset = 3 if month in [4, 5, 6, 7, 8, 9, 10] else 2
    romania_tz = timezone(timedelta(hours=offset))

    sunrise_ro = sunrise_utc.astimezone(romania_tz)
    sunset_ro  = sunset_utc.astimezone(romania_tz)

    return {
        "sunrise":              sunrise_ro.strftime("%H:%M"),
        "sunset":               sunset_ro.strftime("%H:%M"),
        "total_daylight_hours": round((sunset_utc - sunrise_utc).seconds / 3600, 1),
    }


def get_season(date: str) -> str:
    month = datetime.strptime(date, "%Y-%m-%d").month
    if month in [12, 1, 2]:  return "winter"
    if month in [3, 4, 5]:   return "spring"
    if month in [6, 7, 8]:   return "summer"
    return "autumn"


def compute_latest_start(duration_minutes: float, sunset_str: str) -> str:
    """
    duration_minutes: trail duration in minutes (from DB)
    sunset_str: "HH:MM" Romanian time
    Returns latest safe start time as "HH:MM"
    """
    sunset = datetime.strptime(sunset_str, "%H:%M")
    safety_buffer   = timedelta(minutes=30)
    duration_delta  = timedelta(minutes=duration_minutes)
    latest_start    = sunset - duration_delta - safety_buffer
    return latest_start.strftime("%H:%M")


def extract_coords_from_route_path(route_path) -> tuple:
    import json

    if isinstance(route_path, str):
        route_path = json.loads(route_path)

    if isinstance(route_path, dict):
        geo_type = route_path.get("type", "")
        coords_raw = route_path.get("coordinates", [])

        if geo_type == "LineString":
            coords = coords_raw
        elif geo_type == "MultiLineString":
            # flatten all lines into one list of points
            coords = []
            for line in coords_raw:
                coords.extend(line)
        else:
            coords = coords_raw
    elif isinstance(route_path, list):
        coords = route_path
    else:
        return None, None

    if not coords or len(coords) < 2:
        return None, None

    def to_lat_lng(point):
        if isinstance(point, (list, tuple)) and len(point) >= 2:
            return float(point[1]), float(point[0])
        elif isinstance(point, dict):
            return float(point.get("lat", 0)), float(point.get("lng", 0))
        return None, None

    start_lat, start_lng = to_lat_lng(coords[0])
    end_lat,   end_lng   = to_lat_lng(coords[-1])

    return (start_lat, start_lng), (end_lat, end_lng)

def generate_weather_warnings(start_w: dict, summit_w: dict,
                               season: str, max_elevation_m: float) -> list:
    warnings = []

    # summit warnings — most important
    if summit_w["rain_probability"] > 50:
        warnings.append(
            f"🔴 Heavy rain at summit ({summit_w['rain_probability']}%) — waterproof jacket essential")
    elif summit_w["rain_probability"] > 35:
        warnings.append(
            f"⚠️ Rain likely at summit ({summit_w['rain_probability']}%) — carry waterproof jacket")

    if summit_w["wind_kmh"] > 70:
        warnings.append(
            f"🔴 CRITICAL: Dangerous winds at summit ({summit_w['wind_kmh']:.0f} km/h) — do not attempt")
    elif summit_w["wind_kmh"] > 50:
        warnings.append(
            f"🟠 Strong winds at summit ({summit_w['wind_kmh']:.0f} km/h) — exposed sections dangerous")
    elif summit_w["wind_kmh"] > 40:
        warnings.append(
            f"⚠️ Windy at summit ({summit_w['wind_kmh']:.0f} km/h) — windproof layer recommended")

    if summit_w["temp_min_c"] < 0:
        warnings.append(
            f"🔴 Below freezing at summit ({summit_w['temp_min_c']}°C) — ice possible on trail")
    elif summit_w["temp_min_c"] < 3:
        warnings.append(
            f"⚠️ Near freezing at summit ({summit_w['temp_min_c']}°C) — insulating layer essential")

    # storm combo at summit
    if summit_w["rain_probability"] > 40 and summit_w["wind_kmh"] > 40:
        warnings.append("🔴 CRITICAL: Storm conditions likely at summit — rain and strong wind combined")

    # trailhead warnings
    if start_w["rain_probability"] > 35:
        warnings.append(f"⚠️ Rain at trailhead ({start_w['rain_probability']}%)")
    if start_w["temp_min_c"] < 2:
        warnings.append(f"⚠️ Cold at trailhead ({start_w['temp_min_c']}°C) — dress in layers")

    # season warnings
    if season == "winter" and max_elevation_m > 1800:
        warnings.append("⚠️ High altitude winter trail — crampons or microspikes needed")
    if season == "summer" and max_elevation_m > 1800:
        warnings.append("⚠️ Afternoon thunderstorms common above 1800m — start before 8AM")
    if season == "spring":
        warnings.append("⚠️ Snowmelt may make river crossings dangerous")
    if season == "autumn" and max_elevation_m > 2000:
        warnings.append("⚠️ First snow possible above 2000m — check conditions before going")

    return warnings


def get_full_weather_context(route_path, date: str,
                              duration_minutes: float,
                              max_elevation_m: float) -> dict:
    """
    Main function — called by suggestions.py.
    Takes route_path directly from DB, extracts start + summit coords.
    Always returns sunlight + season.
    Returns weather for start + summit if date is within 16 days.
    """
    start_coords, summit_coords = extract_coords_from_route_path(route_path)

    if not start_coords or not summit_coords:
        return {"weather_available": False,
                "forecast_message": "Could not extract trail coordinates"}

    start_lat, start_lng     = start_coords
    summit_lat, summit_lng   = summit_coords

    # always available regardless of date
    daylight      = get_daylight(start_lat, start_lng, date)
    season        = get_season(date)
    latest_start  = compute_latest_start(duration_minutes, daylight["sunset"])
    forecast_status = check_forecast_availability(date)

    if not forecast_status["available"]:
        return {
            "weather_available":    False,
            "forecast_message":     forecast_status["message"],
            "sunrise":              daylight["sunrise"],
            "sunset":               daylight["sunset"],
            "total_daylight_hours": daylight["total_daylight_hours"],
            "latest_start_time":    latest_start,
            "season":               season,
            "start":                None,
            "summit":               None,
            "warnings":             [forecast_status["message"]]
        }

    # fetch weather at both points
    start_weather  = get_weather(start_lat,  start_lng,  date)
    summit_weather = get_weather(summit_lat, summit_lng, date)

    warnings = generate_weather_warnings(
        start_weather, summit_weather, season, max_elevation_m)

    if forecast_status["message"]:
        warnings.insert(0, forecast_status["message"])

    return {
        "weather_available":    True,
        "forecast_reliability": forecast_status["reliability"],
        "start": {
            "temp_max_c":       start_weather["temp_max_c"],
            "temp_min_c":       start_weather["temp_min_c"],
            "rain_probability": start_weather["rain_probability"],
            "wind_kmh":         start_weather["wind_kmh"],
        },
        "summit": {
            "temp_max_c":       summit_weather["temp_max_c"],
            "temp_min_c":       summit_weather["temp_min_c"],
            "rain_probability": summit_weather["rain_probability"],
            "wind_kmh":         summit_weather["wind_kmh"],
        },
        "sunrise":              daylight["sunrise"],
        "sunset":               daylight["sunset"],
        "total_daylight_hours": daylight["total_daylight_hours"],
        "latest_start_time":    latest_start,
        "season":               season,
        "warnings":             warnings
    }


# TEST — run: python weather.py
if __name__ == "__main__":
    FAKE_ROUTE_PATH = {
        "type": "LineString",
        "coordinates": [
            [25.45, 45.35],   # start — trailhead (lng, lat)
            [25.46, 45.38],
            [25.47, 45.41],
            [25.45, 45.40],   # summit (lng, lat)
        ]
    }

    print("=== DATE WITHIN 3 DAYS ===")
    result = get_full_weather_context(FAKE_ROUTE_PATH, "2026-03-14", 390, 2505)
    for key, value in result.items():
        print(f"{key}: {value}")

    print("\n=== DATE 2 MONTHS AHEAD (no weather, sunlight still available) ===")
    result = get_full_weather_context(FAKE_ROUTE_PATH, "2026-05-14", 390, 2505)
    for key, value in result.items():
        print(f"{key}: {value}")