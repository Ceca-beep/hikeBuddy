import os
from datetime import datetime, timezone
from supabase import create_client
from dotenv import load_dotenv
from weather import get_full_weather_context

load_dotenv()
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))


# ---------------------------------------------------------------------------
# Fake data for testing — used when Supabase is not available
# ---------------------------------------------------------------------------

FAKE_TRAIL = {
    "id": "fake-uuid-001",
    "name": "Vârful Omu via Bușteni",
    "region": "Bucegi",
    "difficulty": "hard",
    "duration": 390,           # minutes — matches DB
    "distance_km": 14.2,
    "ascent": 1420,            # matches DB column name
    "descend": 380,            # matches DB column name
    "max_elevation_m": 2505,   # Raul needs to add this column
    "route_path": {
        "type": "LineString",
        "coordinates": [
            [25.45, 45.35],    # trailhead [lng, lat]
            [25.46, 45.38],
            [25.47, 45.41],
            [25.45, 45.40],    # summit [lng, lat]
        ]
    }
}

FAKE_DANGERS = [
    {
        "type": "bear",
        "date": "2026-03-14T08:00:00+00:00",   # matches pings.date column
        "lat": 45.41,
        "lng": 25.46,
        "description": "Bear seen near trail"
    }
]

FAKE_HIKER = {
    "fitness_level": "average",
    "age": 28,
    "weight_kg": 70
}


# ---------------------------------------------------------------------------
# DB queries — swap fake data for these when Raul confirms DB is ready
# ---------------------------------------------------------------------------

def get_trail_from_db(trail_id: str) -> dict:
    """Fetch a single trail from Supabase by ID."""
    result = supabase.table("trails") \
                     .select("*") \
                     .eq("id", trail_id) \
                     .single() \
                     .execute()
    return result.data


def get_dangers_near_trail(trail_id: str, hours: int = 48) -> list:
    """
    Fetch recent danger reports (pings) from Supabase.
    Filters by last N hours.
    NOTE: Supabase doesn't do time math easily — fetch recent ones
    and filter in Python.
    """
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    result = supabase.table("pings") \
                     .select("*") \
                     .gte("date", cutoff) \
                     .execute()
    return result.data or []


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _hours_ago(danger: dict) -> float:
    """Returns how many hours ago a danger was reported."""
    timestamp_str = danger.get("date") or danger.get("timestamp", "")
    if not timestamp_str:
        return 9999
    ts = datetime.fromisoformat(timestamp_str)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


# ---------------------------------------------------------------------------
# Recommended seasons
# ---------------------------------------------------------------------------

def get_recommended_seasons(trail: dict) -> dict:
    max_elev = trail.get("max_elevation_m", 0)
    gain     = trail.get("ascent", 0)  # matches DB column

    if max_elev > 2200 or gain > 1200:
        seasons = ["summer", "autumn"]
        warning = "⚠️ Only recommended in summer and early autumn — dangerous in winter and spring"
    elif max_elev > 1800:
        seasons = ["spring", "summer", "autumn"]
        warning = "⚠️ Not recommended in winter without crampons and alpine experience"
    else:
        seasons = ["spring", "summer", "autumn", "winter"]
        warning = None

    return {"recommended_seasons": seasons, "season_warning": warning}


# ---------------------------------------------------------------------------
# Gear suggestions
# ---------------------------------------------------------------------------

def suggest_gear(trail: dict, weather: dict, dangers: list) -> dict:
    essential   = [
        "hiking boots",
        "water bottle (min 0.5L/hr)",
        "first aid kit",
        "fully charged phone + powerbank"
    ]
    recommended = []
    optional    = []

    duration_hours = trail.get("duration", 0) / 60  # convert minutes to hours
    gain     = trail.get("ascent", 0)                # DB column name
    max_elev = trail.get("max_elevation_m", 0)

    # duration based
    if duration_hours > 4:
        essential.append("headlamp + spare batteries")
        essential.append("extra snacks — energy bars, nuts")
    if duration_hours > 6:
        recommended.append("emergency bivvy bag")
    if duration_hours > 8:
        recommended.append("trekking poles — long day on legs")

    # elevation based
    if gain > 600:
        recommended.append("trekking poles")
    if max_elev > 1800:
        essential.append("wind/fleece layer")
        essential.append("sun protection — UV stronger at altitude")
    if max_elev > 2200:
        recommended.append("warm hat and gloves")
        optional.append("gaiters")

    # weather based — use SUMMIT conditions for gear (worst case)
    if weather.get("weather_available") and weather.get("summit"):
        summit = weather["summit"]
        if summit["rain_probability"] > 35:
            essential.append("waterproof jacket")
        if summit["wind_kmh"] > 40:
            recommended.append("windproof layer")
        if summit["temp_min_c"] < 5:
            essential.append("insulating layer — cold at summit")
        if summit["temp_min_c"] < 0:
            essential.append("warm gloves and hat")

    # season based
    season = weather.get("season", "summer")
    if season == "winter":
        essential.append("microspikes or crampons")
        recommended.append("ice axe for steep sections")
    if season == "spring":
        recommended.append("waterproof boots — muddy trails")
        optional.append("gaiters")
    if season == "summer" and max_elev > 1800:
        essential.append("sun hat")
        recommended.append("extra 0.5L water — heat at altitude")

    # danger based
    recent_dangers = [d for d in dangers if _hours_ago(d) <= 48]
    danger_types   = [d["type"] for d in recent_dangers]
    if "bear" in danger_types or "wolf" in danger_types:
        recommended.append("bear spray")
        optional.append("whistle — noise deters wildlife")

    # deduplicate
    essential   = list(dict.fromkeys(essential))
    recommended = list(dict.fromkeys(recommended))
    optional    = list(dict.fromkeys(optional))

    return {"essential": essential, "recommended": recommended, "optional": optional}


# ---------------------------------------------------------------------------
# Warnings
# ---------------------------------------------------------------------------

def generate_warnings(trail: dict, weather: dict,
                      dangers: list, seasons: dict) -> list:
    warnings = []

    # weather warnings from weather.py
    warnings.extend(weather.get("warnings", []))

    # season warning
    if seasons["season_warning"]:
        warnings.append(seasons["season_warning"])

    # latest start time
    latest = weather.get("latest_start_time")
    if latest:
        warnings.append(f"⏰ Start before {latest} to finish before dark")

    # danger warnings from pings table
    recent_dangers = [d for d in dangers if _hours_ago(d) <= 48]
    for d in recent_dangers:
        hours    = _hours_ago(d)
        time_str = f"{hours:.0f} hours ago" if hours >= 1 \
                   else f"{hours * 60:.0f} minutes ago"
        warnings.append(
            f"🐻 {d['type'].capitalize()} reported {time_str} near this trail"
        )

    # water warning
    if trail.get("distance_km", 0) > 5:
        warnings.append("💧 Carry at least 1.5L of water from the start")

    return warnings


# ---------------------------------------------------------------------------
# Main function — called by main.py
# ---------------------------------------------------------------------------

def get_suggestions(trail: dict, date: str,
                    dangers: list, hiker: dict) -> dict:
    """
    Main entry point.
    trail: dict from Supabase trails table
    date: "YYYY-MM-DD"
    dangers: list from Supabase pings table
    hiker: dict from Supabase users table
    """
    weather  = get_full_weather_context(
        route_path=trail["route_path"],
        date=date,
        duration_minutes=trail["duration"],
        max_elevation_m=trail.get("max_elevation_m", 0)
    )
    seasons  = get_recommended_seasons(trail)
    gear     = suggest_gear(trail, weather, dangers)
    warnings = generate_warnings(trail, weather, dangers, seasons)

    return {
        "trail_name":          trail["name"],
        "date":                date,
        "gear":                gear,
        "warnings":            warnings,
        "recommended_seasons": seasons["recommended_seasons"],
        "season_warning":      seasons["season_warning"],
        "weather":             weather,
    }


def get_suggestions_from_db(trail_id: str, date: str, hiker: dict) -> dict:
    """
    Full DB version — fetches trail + dangers from Supabase then runs suggestions.
    This is what main.py calls in production.
    """
    trail   = get_trail_from_db(trail_id)
    dangers = get_dangers_near_trail(trail_id, hours=48)
    return get_suggestions(trail, date, dangers, hiker)


# ---------------------------------------------------------------------------
# TEST — run: python suggestions.py
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("=== TESTING WITH FAKE DATA ===\n")
    result = get_suggestions(
        trail=FAKE_TRAIL,
        date="2026-03-14",
        dangers=FAKE_DANGERS,
        hiker=FAKE_HIKER
    )

    print("=== GEAR ===")
    for category, items in result["gear"].items():
        print(f"\n  {category.upper()}:")
        for item in items:
            print(f"    - {item}")

    print("\n=== WARNINGS ===")
    for w in result["warnings"]:
        print(f"  {w}")

    print("\n=== SEASONS ===")
    print(f"  Recommended: {result['recommended_seasons']}")
    if result["season_warning"]:
        print(f"  Warning: {result['season_warning']}")

    print("\n=== WEATHER ===")
    w = result["weather"]
    print(f"  Available: {w['weather_available']}")
    if w["weather_available"]:
        print(f"  Trailhead → Temp: {w['start']['temp_min_c']}°C - {w['start']['temp_max_c']}°C | "
              f"Rain: {w['start']['rain_probability']}% | Wind: {w['start']['wind_kmh']} km/h")
        print(f"  Summit    → Temp: {w['summit']['temp_min_c']}°C - {w['summit']['temp_max_c']}°C | "
              f"Rain: {w['summit']['rain_probability']}% | Wind: {w['summit']['wind_kmh']} km/h")
    print(f"  Sunrise: {w['sunrise']} | Sunset: {w['sunset']} | Daylight: {w['total_daylight_hours']}h")
    print(f"  Latest safe start: {w['latest_start_time']}")
    print(f"  Season: {w['season']}")