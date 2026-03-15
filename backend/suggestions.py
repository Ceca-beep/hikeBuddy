from datetime import datetime, timezone, timedelta
from database import get_supabase
from weather import get_full_weather_context


def get_trail_from_db(trail_id: str) -> dict:
    result = get_supabase().table("trails").select("*").eq("id", trail_id).single().execute()
    return result.data


def get_dangers_near_trail(trail_id: str, hours: int = 48) -> list:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    try:
        result = get_supabase().table("pings").select("*").gte("date", cutoff).execute()
        return result.data or []
    except Exception:
        return []


def _hours_ago(danger: dict) -> float:
    timestamp_str = danger.get("date") or danger.get("timestamp", "")
    if not timestamp_str: return 9999
    ts = datetime.fromisoformat(timestamp_str)
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - ts).total_seconds() / 3600


def _to_float(val, default=0):
    if val is None:
        return float(default)
    if isinstance(val, list):
        val = val[0] if val else default
    try:
        return float(val)
    except (TypeError, ValueError):
        return float(default)


def get_recommended_seasons(trail: dict) -> dict:
    max_elev = _to_float(trail.get("max_elevation"))
    gain     = _to_float(trail.get("ascent"))
    if max_elev > 2200 or gain > 1200:
        return {"recommended_seasons": ["summer", "autumn"],
                "season_warning": "[!] Only recommended in summer and early autumn - dangerous in winter and spring"}
    elif max_elev > 1800:
        return {"recommended_seasons": ["spring", "summer", "autumn"],
                "season_warning": "[!] Not recommended in winter without crampons and alpine experience"}
    return {"recommended_seasons": ["spring", "summer", "autumn", "winter"], "season_warning": None}


def suggest_gear(trail: dict, weather: dict, dangers: list) -> dict:
    essential   = ["hiking boots", "water bottle (min 0.5L/hr)", "first aid kit", "fully charged phone + powerbank"]
    recommended = []
    optional    = []

    duration_hours = _to_float(trail.get("duration")) / 60
    gain     = _to_float(trail.get("ascent"))
    max_elev = _to_float(trail.get("max_elevation"))

    if duration_hours > 4:
        essential.append("headlamp + spare batteries")
        essential.append("extra snacks - energy bars, nuts")
    if duration_hours > 6: recommended.append("emergency bivvy bag")
    if duration_hours > 8: recommended.append("trekking poles - long day on legs")
    if gain > 600:         recommended.append("trekking poles")
    if max_elev > 1800:
        essential.append("wind/fleece layer")
        essential.append("sun protection - UV stronger at altitude")
    if max_elev > 2200:
        recommended.append("warm hat and gloves")
        optional.append("gaiters")

    if weather.get("weather_available") and weather.get("summit"):
        summit = weather["summit"]
        if summit["rain_probability"] > 35: essential.append("waterproof jacket")
        if summit["wind_kmh"] > 40:         recommended.append("windproof layer")
        if summit["temp_min_c"] < 5:        essential.append("insulating layer - cold at summit")
        if summit["temp_min_c"] < 0:        essential.append("warm gloves and hat")

    season = weather.get("season", "summer")
    if season == "winter":
        essential.append("microspikes or crampons")
        recommended.append("ice axe for steep sections")
    if season == "spring":
        recommended.append("waterproof boots - muddy trails")
        optional.append("gaiters")
    if season == "summer" and max_elev > 1800:
        essential.append("sun hat")
        recommended.append("extra 0.5L water - heat at altitude")

    recent_dangers = [d for d in dangers if _hours_ago(d) <= 48]
    danger_types   = [d.get("type", "").lower() for d in recent_dangers]
    if "bear" in danger_types or "wolf" in danger_types:
        recommended.append("bear spray")
        optional.append("whistle - noise deters wildlife")

    return {
        "essential":   list(dict.fromkeys(essential)),
        "recommended": list(dict.fromkeys(recommended)),
        "optional":    list(dict.fromkeys(optional)),
    }


def generate_warnings(trail: dict, weather: dict, dangers: list, seasons: dict) -> list:
    warnings = []
    warnings.extend(weather.get("warnings", []))
    if seasons["season_warning"]:
        warnings.append(seasons["season_warning"])
    latest = weather.get("latest_start_time")
    if latest:
        warnings.append(f"[time] Start before {latest} to finish before dark")
    recent_dangers = [d for d in dangers if _hours_ago(d) <= 48]
    for d in recent_dangers:
        hours    = _hours_ago(d)
        time_str = f"{hours:.0f} hours ago" if hours >= 1 else f"{hours * 60:.0f} minutes ago"
        warnings.append(f"[danger] {d.get('type','Danger').capitalize()} reported {time_str} near this trail")
    if _to_float(trail.get("distance_km")) > 5:
        warnings.append("[water] Carry at least 1.5L of water from the start")
    return warnings


def get_suggestions(trail: dict, date: str, dangers: list, hiker: dict) -> dict:
    weather = get_full_weather_context(
        route_path=trail.get("route_path"),
        date=date,
        duration_minutes=_to_float(trail.get("duration"), default=240),
        max_elevation_m=_to_float(trail.get("max_elevation"), default=0),
    )
    seasons  = get_recommended_seasons(trail)
    gear     = suggest_gear(trail, weather, dangers)
    warnings = generate_warnings(trail, weather, dangers, seasons)
    return {
        "trail_name":          trail.get("name"),
        "date":                date,
        "gear":                gear,
        "warnings":            warnings,
        "recommended_seasons": seasons["recommended_seasons"],
        "season_warning":      seasons["season_warning"],
        "weather":             weather,
    }


def get_suggestions_from_db(trail_id: str, date: str, hiker: dict) -> dict:
    trail   = get_trail_from_db(trail_id)
    dangers = get_dangers_near_trail(trail_id, hours=48)
    return get_suggestions(trail, date, dangers, hiker)