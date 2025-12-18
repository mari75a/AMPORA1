/* global google */
import React, { useState, useRef } from "react";
import {
  GoogleMap,
  DirectionsRenderer,
  Autocomplete,
  Marker,
  InfoWindow,
  useLoadScript,
} from "@react-google-maps/api";

import PulsingMarker from "../PulsingMarker";
import elec from "../../assets/bolt.png";

const BACKEND = "http://localhost:8083";

const EV_GREEN = "#00d491";
const EV_BG = "#edffff";

const containerStyle = { width: "100%", height: "100%" };

/* ---------------- POLYLINE DECODER ---------------- */
function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== "string") return [];

  let points = [];
  let index = 0, lat = 0, lng = 0;

  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/* ---------------- COMPONENT ---------------- */
export default function TripPlanner() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  const mapCenter = { lat: 7.8731, lng: 80.7718 };

  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");

  const [rawDirections, setRawDirections] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(null);

  const [stations, setStations] = useState([]);
  const [selectedStation, setSelectedStation] = useState(null);
  const [stops, setStops] = useState([]);

  const acStartRef = useRef(null);
  const acEndRef = useRef(null);

  const onPlaceChanged = (ref, setter) => {
    const place = ref.current?.getPlace();
    if (!place?.geometry) return;
    setter(place.formatted_address);
  };

  async function findRoutes() {
    const service = new google.maps.DirectionsService();

    const res = await service.route({
      origin: startText,
      destination: endText,
      travelMode: google.maps.TravelMode.DRIVING,
      provideRouteAlternatives: true,
      // avoidHighways: true,
    });

    setRawDirections(res);
    setRoutes(res.routes);
    setSelectedRouteIndex(null);
    setStations([]);
    setStops([]);
    setSelectedStation(null);
  }

  async function selectRoute(idx) {
    setSelectedRouteIndex(idx);
    setStations([]);
    setStops([]);
    setSelectedStation(null);

    const r = routes[idx];
    const encoded =
      r.overview_polyline?.points ||
      r.overview_polyline?.encodedPolyline ||
      r.overview_polyline;

    const decoded = decodePolyline(encoded);

    const resp = await fetch(`${BACKEND}/api/trip/stations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        polylinePoints: decoded.map((p) => [p.lat, p.lng]),
      }),
    });

    const data = await resp.json();
    setStations(data.stations || []);
  }

  function addStopFromStation(st) {
    setStops((prev) => [...prev, st]);
  }

  if (!isLoaded) return <div className="p-10">Loading maps…</div>;

  return (
    <div className="min-h-screen bg-[#edffff] px-4 pb-16">
      <div className="max-w-7xl mx-auto pt-24">
        {/* ================= HOW IT WORKS ================= */}
<div className="mb-14">
  <h2 className="text-xl font-semibold text-gray-700 mb-6">
    How to plan your EV trip
  </h2>

  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

    {/* STEP 1 */}
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-black font-bold"
        style={{ background: EV_GREEN }}
      >
        1
      </div>
      <h3 className="font-semibold mb-2">Enter Locations</h3>
      <p className="text-sm text-gray-600">
        Choose your starting point and destination using smart place suggestions.
      </p>
    </div>

    {/* STEP 2 */}
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-black font-bold"
        style={{ background: EV_GREEN }}
      >
        2
      </div>
      <h3 className="font-semibold mb-2">Select a Route</h3>
      <p className="text-sm text-gray-600">
        Compare available routes and select the one that fits your journey best.
      </p>
    </div>

    {/* STEP 3 */}
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-black font-bold"
        style={{ background: EV_GREEN }}
      >
        3
      </div>
      <h3 className="font-semibold mb-2">Find Charging Stations</h3>
      <p className="text-sm text-gray-600">
        View EV charging stations located close to your selected route.
      </p>
    </div>

    {/* STEP 4 */}
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-4 text-black font-bold"
        style={{ background: EV_GREEN }}
      >
        4
      </div>
      <h3 className="font-semibold mb-2">Add Stops & Go</h3>
      <p className="text-sm text-gray-600">
        Add stations as stops and enjoy a smooth, worry-free EV journey.
      </p>
    </div>

  </div>
</div>


        {/* ================= SEARCH PANEL ================= */}
        <div className="bg-white/80 backdrop-blur-2xl rounded-[28px] p-10 mb-12
                        shadow-[0_20px_60px_rgba(0,0,0,0.15)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            <Autocomplete
              onLoad={(ref) => (acStartRef.current = ref)}
              onPlaceChanged={() => onPlaceChanged(acStartRef, setStartText)}
            >
              <input
                className="p-4 rounded-2xl w-full shadow-inner outline-none
                           bg-[#edffff] placeholder:text-gray-400"
                placeholder="Start location"
                value={startText}
                onChange={(e) => setStartText(e.target.value)}
              />
            </Autocomplete>

            <Autocomplete
              onLoad={(ref) => (acEndRef.current = ref)}
              onPlaceChanged={() => onPlaceChanged(acEndRef, setEndText)}
            >
              <input
                className="p-4 rounded-2xl w-full shadow-inner outline-none
                           bg-[#edffff] placeholder:text-gray-400"
                placeholder="Destination"
                value={endText}
                onChange={(e) => setEndText(e.target.value)}
              />
            </Autocomplete>

            <button
              onClick={findRoutes}
              className="rounded-2xl font-semibold text-black transition-all
                         hover:scale-[1.02] active:scale-95 shadow-lg"
              style={{ background: EV_GREEN }}
            >
              Search Routes
            </button>
          </div>
        </div>

        {/* ================= ROUTES ================= */}
        {routes.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-700 mb-4">
              Choose a route
            </h2>

            <div className="space-y-3">
              {routes.map((r, i) => (
                <button
                  key={i}
                  onClick={() => selectRoute(i)}
                  className={`w-full p-4 rounded-2xl text-left transition-all
                    ${selectedRouteIndex === i
                      ? "bg-[#00d491] text-black"
                      : "bg-white hover:bg-[#edffff]"} shadow-sm`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">Route {i + 1}</span>
                    <span className="text-sm opacity-70">
                      {(r.legs[0].distance.value / 1000).toFixed(1)} km
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ================= MAP + PANEL ================= */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* MAP */}
          <div className="col-span-3 h-[560px] rounded-[28px] overflow-hidden
                          shadow-[0_30px_80px_rgba(0,0,0,0.25)]">
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={mapCenter}
              zoom={7}
            >
              {selectedRouteIndex !== null && rawDirections && (
                <DirectionsRenderer
                  directions={{
                    ...rawDirections,
                    routes: [rawDirections.routes[selectedRouteIndex]],
                  }}
                />
              )}

              {stations.map((s) => (
                <PulsingMarker
                  key={s.stationId}
                  position={{ lat: s.lat, lng: s.lon }}
                  onClick={() => setSelectedStation(s)}
                />
              ))}

              {selectedStation && (
                <InfoWindow
                  position={{ lat: selectedStation.lat, lng: selectedStation.lon }}
                  onCloseClick={() => setSelectedStation(null)}
                >
                  <div className="text-sm">
                    <strong>{selectedStation.name}</strong>
                    <p>{selectedStation.address}</p>
                    <p>{selectedStation.powerKw} kW</p>
                    <button
                      className="mt-2 px-3 py-1 rounded-lg text-white"
                      style={{ background: EV_GREEN }}
                      onClick={() => addStopFromStation(selectedStation)}
                    >
                      Add Stop
                    </button>
                  </div>
                </InfoWindow>
              )}

              {stops.map((s, i) => (
                <Marker
                  key={i}
                  position={{ lat: s.lat, lng: s.lon }}
                  icon={{
                    url: elec,
                    scaledSize: new google.maps.Size(36, 36),
                  }}
                />
              ))}
            </GoogleMap>
          </div>

          {/* STATION PANEL */}
          <div className="bg-white rounded-[24px] p-6 max-h-[560px] overflow-y-auto
                          shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
            <h2 className="font-semibold mb-4">Nearby Stations</h2>

            {stations.length === 0 && (
              <p className="text-sm text-gray-500">
                Select a route to see charging stations.
              </p>
            )}

            {stations.map((s) => (
              <div
                key={s.stationId}
                className="p-5 rounded-2xl mb-4 bg-[#edffff]
                           hover:shadow-md transition-all cursor-pointer"
                onClick={() => setSelectedStation(s)}
              >
                <h3 className="font-medium">{s.name}</h3>
                <p className="text-sm opacity-70">{s.address}</p>

                <div className="flex gap-2 mt-2 text-sm">
                  <span className="px-2 py-1 rounded-full bg-[#00d491] text-black">
                    {s.powerKw} kW
                  </span>
                  <span className="px-2 py-1 rounded-full bg-white border">
                    {s.distanceToRouteKm} km
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
