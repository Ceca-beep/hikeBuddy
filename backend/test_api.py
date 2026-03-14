import httpx, json

query = """
[out:json][timeout:30];
relation["route"="hiking"](43.6186,20.2619,48.2654,29.7570);
out ids;
"""
r = httpx.post("https://overpass-api.de/api/interpreter", data={"data": query}, timeout=60)
ids = [el["id"] for el in r.json()["elements"]][:3]

for osm_id in ids:
    r = httpx.get(f"https://hiking.waymarkedtrails.org/api/v1/details/relation/{osm_id}")
    data = r.json()
    # Remove the deep nested geometry to keep file small
    shallow = {k: v for k, v in data.items() if k not in ("subroutes", "appendices")}
    with open(f"trail_{osm_id}.json", "w") as f:
        json.dump(shallow, f, indent=2)
    print(f"Saved trail_{osm_id}.json")