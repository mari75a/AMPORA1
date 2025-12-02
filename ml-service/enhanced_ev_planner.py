# ml-service/enhanced_ev_planner.py
import os
import math
import json
import requests
import folium
from geopy.distance import geodesic


class EnhancedEVPlanner:
    """
    - Fetches driving routes from OSRM (public server).
    - Loads stations from DB (provided by caller).
    - Finds stations near the shortest route path.
    - Optionally renders a Folium map.
    """

    OSRM_BASE = "https://router.project-osrm.org/route/v1/driving"

    def __init__(self, max_station_distance_km=5.0):
        self.max_station_distance_km = max_station_distance_km
        os.makedirs("maps", exist_ok=True)

    # ---------------------------
    # Routing with OSRM
    # ---------------------------
    def get_routes_from_osrm(self, start, end, alternatives=2):
        """
        start, end: (lat, lon) tuples
        returns: [{distance_km, duration_min, path:[[lat,lon], ...]}...]
        """
        s_lat, s_lon = start
        e_lat, e_lon = end
        url = (
            f"{self.OSRM_BASE}/{s_lon},{s_lat};{e_lon},{e_lat}"
            f"?alternatives={max(0, int(alternatives))}"
            "&overview=full&geometries=geojson&steps=false"
        )
        r = requests.get(url, timeout=20)
        if r.status_code != 200:
            return []

        data = r.json()
        if "routes" not in data or not data["routes"]:
            return []

        out = []
        for route in data["routes"]:
            coords = route["geometry"]["coordinates"]  # [ [lon,lat], ... ]
            path = [[lat, lon] for lon, lat in coords]
            out.append({
                "distance_km": route["distance"] / 1000.0,
                "duration_min": route["duration"] / 60.0,
                "path": path,
            })
        # shortest first
        out.sort(key=lambda r: r["distance_km"])
        return out

    # ---------------------------
    # Stations near route
    # ---------------------------
    def stations_near_route(self, path, stations):
        """
        path: [[lat,lon], ...]
        stations: [{lat,lon, ...}, ...]
        returns: subset of stations within max_station_distance_km of route
        """
        if not path or len(path) < 2:
            return []

        def dist_point_to_segment_km(p, a, b):
            # Convert all to radians for rough projection-free distance.
            # We'll use a simple projection on lat/lon for short segments,
            # then geodesic from point to nearest point on segment approach.
            # For simplicity we’ll approximate by min(geodesic(p,a), geodesic(p,b))
            # and a perpendicular check using dot products in lat/lon degrees.
            # Good enough for ~few-km buffers.
            (plat, plon), (alat, alon), (blat, blon) = p, a, b

            # quick endpoints distance
            d1 = geodesic((plat, plon), (alat, alon)).km
            d2 = geodesic((plat, plon), (blat, blon)).km

            # vector projection in lat/lon space
            ax, ay = alon, alat
            bx, by = blon, blat
            px, py = plon, plat

            abx, aby = (bx - ax), (by - ay)
            apx, apy = (px - ax), (py - ay)
            ab2 = abx * abx + aby * aby
            if ab2 == 0:
                return min(d1, d2)
            t = (apx * abx + apy * aby) / ab2
            if t < 0.0:
                return d1
            if t > 1.0:
                return d2
            # nearest point on segment
            qx = ax + t * abx
            qy = ay + t * aby
            return geodesic((py, px), (qy, qx)).km

        near = []
        for s in stations:
            p = (s["lat"], s["lon"])
            min_km = math.inf
            for i in range(len(path) - 1):
                a = tuple(path[i])
                b = tuple(path[i + 1])
                d = dist_point_to_segment_km(p, a, b)
                if d < min_km:
                    min_km = d
                if min_km <= self.max_station_distance_km:
                    break
            if min_km <= self.max_station_distance_km:
                near.append({**s, "distance_to_route_km": round(min_km, 2)})
        near.sort(key=lambda s: s["distance_to_route_km"])
        return near

    # ---------------------------
    # Folium map builder (optional)
    # ---------------------------
    def build_map(self, start, end, routes, near_stations, filename):
        """
        Saves a folium map to maps/{filename}, returns filename.
        """
        center = (
            (start[0] + end[0]) / 2.0,
            (start[1] + end[1]) / 2.0,
        )
        m = folium.Map(location=center, zoom_start=8, control_scale=True)

        # Start/end
        folium.Marker(
            start, icon=folium.Icon(color="green", icon="play"),
            tooltip="Start"
        ).add_to(m)
        folium.Marker(
            end, icon=folium.Icon(color="red", icon="stop"),
            tooltip="Destination"
        ).add_to(m)

        # Routes
        colors = ["#3498db", "#e74c3c", "#2ecc71"]
        for idx, r in enumerate(routes[:3]):
            folium.PolyLine(
                r["path"],
                color=colors[idx % len(colors)],
                weight=5,
                opacity=0.8,
                tooltip=f"Route {idx+1} • {r['distance_km']:.1f} km / {r['duration_min']:.0f} min",
            ).add_to(m)

        # Stations near route
        for s in near_stations:
            folium.CircleMarker(
                location=(s["lat"], s["lon"]),
                radius=5,
                color="#f39c12",
                fill=True,
                fill_opacity=0.9,
                tooltip=f"{s.get('name','Station')} • {s.get('distance_to_route_km','?')} km from route",
            ).add_to(m)

        out = os.path.join("maps", filename)
        m.save(out)
        return filename
