import requests
from datetime import datetime, timezone, timedelta


def get_weather(lat: float, lng: float, date: str) -> dict:
    
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
    data = response.json()
    daily = data["daily"]

    return {
        "temp_max_c":       daily["temperature_2m_max"][0],
        "temp_min_c":       daily["temperature_2m_min"][0],
        "rain_probability": daily["precipitation_probability_max"][0],
        "wind_kmh":         daily["windspeed_10m_max"][0],
    }


def get_daylight(lat: float, lng: float, date: str) -> dict:
    
    url = "https://api.sunrise-sunset.org/json"

    params = {
        "lat": lat,
        "lng": lng,
        "date": date,
        "formatted": 0  # returns proper ISO format
    }

    response = requests.get(url, params=params)
    data = response.json()["results"]

    sunrise_utc = datetime.fromisoformat(data["sunrise"])
    sunset_utc  = datetime.fromisoformat(data["sunset"])

    # Romania is UTC+2 in winter, UTC+3 in summer (DST)
    month = datetime.strptime(date, "%Y-%m-%d").month if date != "today" \
            else datetime.now().month
    offset = 3 if month in [4, 5, 6, 7, 8, 9, 10] else 2
    romania_tz = timezone(timedelta(hours=offset))

    sunrise_ro = sunrise_utc.astimezone(romania_tz)
    sunset_ro  = sunset_utc.astimezone(romania_tz)

    daylight_hours = round((sunset_utc - sunrise_utc).seconds / 3600, 1)

    return {
        "sunrise":              sunrise_ro.strftime("%H:%M"),
        "sunset":               sunset_ro.strftime("%H:%M"),
        "total_daylight_hours": daylight_hours,
    }


def get_season(date: str) -> str:
    month = datetime.strptime(date, "%Y-%m-%d").month
    if month in [12, 1, 2]:  return "winter"
    if month in [3, 4, 5]:   return "spring"
    if month in [6, 7, 8]:   return "summer"
    return "autumn"


def compute_latest_start(duration_hours: float, sunset_str: str) -> dict:
    
    sunset = datetime.strptime(sunset_str, "%H:%M")
    safety_buffer = timedelta(minutes=30)
    latest_start  = sunset - timedelta(hours=duration_hours) - safety_buffer

    return {
        "latest_start_time": latest_start.strftime("%H:%M"),
        "warning": f"Start before {latest_start.strftime('%H:%M')} to finish before dark"
    }


def generate_weather_warnings(weather: dict, season: str,
                               max_elevation_m: float) -> list:
    warnings = []

    if weather["rain_probability"] > 35:
        warnings.append("⚠️ Rain forecast — carry a waterproof jacket")

    if weather["wind_kmh"] > 40:
        warnings.append("⚠️ Strong winds expected — dangerous above treeline")

    if weather["temp_min_c"] < 2:
        warnings.append("⚠️ Near freezing temperatures — insulating layer essential")

    if season == "winter" and max_elevation_m > 1800:
        warnings.append("⚠️ High altitude winter trail — crampons or microspikes needed")

    if season == "summer" and max_elevation_m > 1800:
        warnings.append("⚠️ Afternoon thunderstorms common above 1800m — start before 8AM")

    if season == "spring":
        warnings.append("⚠️ Snowmelt may make river crossings dangerous")

    if season == "autumn" and max_elevation_m > 2000:
        warnings.append("⚠️ First snow possible above 2000m — check conditions before going")

    return warnings


def get_full_weather_context(lat: float, lng: float, date: str,
                              duration_hours: float,
                              max_elevation_m: float) -> dict:
    
    weather  = get_weather(lat, lng, date)
    daylight = get_daylight(lat, lng, date)
    season   = get_season(date)
    latest   = compute_latest_start(duration_hours, daylight["sunset"])
    warnings = generate_weather_warnings(weather, season, max_elevation_m)

    return {
        # weather
        "temp_max_c":          weather["temp_max_c"],
        "temp_min_c":          weather["temp_min_c"],
        "rain_probability":    weather["rain_probability"],
        "wind_kmh":            weather["wind_kmh"],
        # daylight
        "sunrise":             daylight["sunrise"],
        "sunset":              daylight["sunset"],
        "total_daylight_hours": daylight["total_daylight_hours"],
        # planning
        "season":              season,
        "latest_start_time":   latest["latest_start_time"],
        # warnings
        "warnings":            warnings
    }


# TEST — run: python weather.py
if __name__ == "__main__":
    # Test with Bucegi mountain coordinates
    print("=== BUCEGI MOUNTAIN (trail weather) ===")
    result = get_full_weather_context(
        lat=45.4,
        lng=25.45,
        date="2026-03-14",
        duration_hours=6.5,
        max_elevation_m=2505
    )
    for key, value in result.items():
        print(f"{key}: {value}")
