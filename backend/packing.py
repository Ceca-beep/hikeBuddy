def generate_packing_list(duration: float, weather: str, terrain: str) -> list:
    gear = ["water bottle", "first aid kit", "trail map", "snacks", "sunscreen"]

    if weather == "cold":
        gear += ["thermal layer", "gloves", "beanie", "hand warmers"]
    elif weather == "rainy":
        gear += ["rain jacket", "waterproof boots", "dry bag"]
    elif weather == "hot":
        gear += ["sun hat", "extra water", "electrolyte tablets"]

    if terrain == "rocky":
        gear += ["trekking poles", "ankle support boots"]
    elif terrain == "forest":
        gear += ["bug spray", "long sleeves"]

    if duration > 6:
        gear += ["lunch", "portable charger", "headlamp"]
    if duration > 24:
        gear += ["tent", "sleeping bag", "camp stove", "extra food"]

    return gear
