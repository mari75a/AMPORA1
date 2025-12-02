# ml-service/app.py
import os
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
# from dotenv import load_dotenv

from models import db, Station, Charger
from enhanced_ev_planner import EnhancedEVPlanner

# load_dotenv()

def _pg_uri():
    host = os.getenv("POSTGRES_HOST", "localhost")
    port = os.getenv("POSTGRES_PORT", "5432")
    dbn  = os.getenv("POSTGRES_DB", "ampora")
    usr  = os.getenv("POSTGRES_USER", "ampora_user")
    pwd  = os.getenv("POSTGRES_PASSWORD", "a")
    return f"postgresql+psycopg2://{usr}:{pwd}@{host}:{port}/{dbn}"

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = _pg_uri()
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# CORS (allow Vite local + your deployed origins if needed)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:5173", "http://127.0.0.1:5173", "*"]}})
@app.after_request
def add_cors_headers(resp):
    resp.headers.add("Access-Control-Allow-Origin", "*")
    resp.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization")
    resp.headers.add("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
    return resp

db.init_app(app)
planner = EnhancedEVPlanner(max_station_distance_km=5)

# ---------------------------
# Helpers
# ---------------------------
def _load_all_stations():
    """
    Returns a light list of stations suitable for the planner.
    """
    q = Station.query.all()
    items = []
    for s in q:
        # Skip rows without coordinates
        if s.latitude is None or s.longitude is None:
            continue
        items.append({
            "id": s.station_id,
            "name": s.name,
            "address": s.address,
            "lat": s.latitude,
            "lon": s.longitude,
            # You can surface charger summary if you want:
            "chargers": [
                {
                    "id": c.charger_id,
                    "type": c.type,
                    "power_kw": c.power_kw,
                    "status": c.status,
                } for c in s.chargers
            ]
        })
    return items

# ---------------------------
# API
# ---------------------------
@app.get("/api/health")
def health():
    return {"ok": True, "time": datetime.utcnow().isoformat()}

@app.get("/api/cities")
def cities():
    """
    We don't have a city column in station. We’ll derive a 'city-like' token
    from the last comma part of address as a fallback.
    """
    rows = db.session.query(Station.address).filter(Station.address.isnot(None)).all()
    tokens = []
    for (addr,) in rows:
        if not addr:
            continue
        parts = [p.strip() for p in addr.split(",") if p.strip()]
        if parts:
            tokens.append(parts[-1])
    unique = sorted(set(tokens))
    return jsonify({"cities": unique})

@app.get("/api/stations/nearby")
def stations_nearby():
    try:
        lat = float(request.args.get("lat"))
        lon = float(request.args.get("lon"))
        radius_km = float(request.args.get("radius_km", 10))

        from geopy.distance import geodesic
        all_s = _load_all_stations()
        def dist_km(s): return geodesic((lat, lon), (s["lat"], s["lon"])).km

        out = [s for s in all_s if dist_km(s) <= radius_km]
        out.sort(key=lambda s: (s["lat"]-lat)**2 + (s["lon"]-lon)**2)
        return jsonify({"count": len(out), "items": out})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.post("/api/route")
def api_route():
    """
    Body:
    {
      "start": {"lat": 6.9271, "lng": 79.8612},
      "end":   {"lat": 7.2906, "lng": 80.6337}
    }
    """
    try:
        data = request.get_json(force=True)
        start = data.get("start")
        end   = data.get("end")
        if not start or not end:
            return jsonify({"success": False, "error": "start {lat,lng} and end {lat,lng} required"}), 400

        s = (float(start["lat"]), float(start["lng"]))
        e = (float(end["lat"]), float(end["lng"]))

        routes = planner.get_routes_from_osrm(s, e, alternatives=2)
        if not routes:
            return jsonify({"success": False, "error": "No routes returned"}), 404

        stations = _load_all_stations()
        near = planner.stations_near_route(routes[0]["path"], stations)

        # Optional: save a Folium map for debugging/viewing
        map_name = f"route_{abs(hash((s, e))) % 10**8}.html"
        planner.build_map(s, e, routes, near, map_name)

        return jsonify({
            "success": True,
            "routes": [{
                "distance_km": round(r["distance_km"], 1),
                "duration_min": round(r["duration_min"], 0),
                "path": r["path"],
            } for r in routes],
            "nearby_stations": near[:50],
            "map_file": map_name
        })
    except Exception as e:
        # Ensure frontend sees a readable error
        return jsonify({"success": False, "error": str(e)}), 500

@app.get("/map/<name>")
def get_map(name):
    path = os.path.join("maps", name)
    if not os.path.exists(path):
        return jsonify({"error": "not found"}), 404
    return send_file(path)

if __name__ == "__main__":
    # Do NOT create tables — you already have them in your Spring Boot/Postgres app.
    # We just verify connectivity.
    with app.app_context():
        db.session.execute(db.text("SELECT 1"))
    app.run(host="127.0.0.1", port=8000, debug=True)
