"use client";

import { useEffect, useRef, useState } from "react";

import type { ScoredBranch } from "@/lib/branch-ranking";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BranchMapProps {
  branches: ScoredBranch[];
  centerLat: number;
  centerLng: number;
  applicationId?: string;
}

// Minimal Leaflet type shims to avoid importing the full library at compile time
// (Leaflet is loaded from CDN at runtime to avoid SSR/React 19 conflicts).
/* eslint-disable @typescript-eslint/no-explicit-any */
type LMap = any;
type LMarker = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const LEAFLET_CSS =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// ---------------------------------------------------------------------------
// Score → colour mapping
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 60) return "#0d9488"; // teal-600
  if (score >= 40) return "#2563eb"; // blue-600
  return "#ea580c"; // orange-600
}

function scoreLabel(score: number): string {
  if (score >= 60) return "Excellent";
  if (score >= 40) return "Good";
  return "Fair";
}

// ---------------------------------------------------------------------------
// Helpers to inject Leaflet once from CDN
// ---------------------------------------------------------------------------

let leafletPromise: Promise<void> | null = null;

function loadLeaflet(): Promise<void> {
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise<void>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }

    // JS
    if ((window as unknown as Record<string, unknown>).L) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Leaflet"));
    document.head.appendChild(script);
  });

  return leafletPromise;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BranchMap({
  branches,
  centerLat,
  centerLng,
  applicationId,
}: BranchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<LMarker[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Leaflet once
  useEffect(() => {
    loadLeaflet()
      .then(() => setReady(true))
      .catch((err) => setError(String(err)));
  }, []);

  // Initialize map when Leaflet is ready
  useEffect(() => {
    if (!ready || !containerRef.current) return;

    const L = (window as unknown as Record<string, any>).L; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Cleanup previous map instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map: LMap = L.map(containerRef.current, {
      scrollWheelZoom: true,
    }).setView([centerLat, centerLng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Applicant location marker
    L.circleMarker([centerLat, centerLng], {
      radius: 10,
      color: "#dc2626",
      fillColor: "#ef4444",
      fillOpacity: 0.9,
      weight: 2,
    })
      .addTo(map)
      .bindPopup(
        `<div style="text-align:center;font-weight:600;color:#0f172a">📍 Your location</div>`,
      );

    // Branch markers
    const markers: LMarker[] = [];
    const bounds = L.latLngBounds([[centerLat, centerLng]]);

    for (const branch of branches) {
      const color = scoreColor(branch.score);
      const label = scoreLabel(branch.score);

      const icon = L.divIcon({
        className: "",
        html: `<div style="
          display:flex;align-items:center;justify-content:center;
          width:32px;height:32px;border-radius:50%;
          background:${color};color:white;font-weight:700;font-size:13px;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;
          cursor:pointer;
        ">${Math.round(branch.score)}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const fundDisplay =
        branch.availableFundAmount != null
          ? INR.format(branch.availableFundAmount)
          : "N/A";
      const npaDisplay =
        branch.npaPercentage != null
          ? `${branch.npaPercentage.toFixed(1)}%`
          : "N/A";

      const selectButton = applicationId
        ? `<form action="/branches" method="GET" style="margin-top:8px">
             <input type="hidden" name="selectBranch" value="${branch.id}" />
             <input type="hidden" name="applicationId" value="${applicationId}" />
             <button type="submit" style="
               width:100%;padding:6px 12px;border:none;border-radius:8px;
               background:${color};color:white;font-weight:600;font-size:13px;
               cursor:pointer;
             ">Select this branch</button>
           </form>`
        : "";

      const popup = `
        <div style="font-family:Arial,sans-serif;min-width:220px;line-height:1.5">
          <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px">
            ${branch.name}
          </div>
          <div style="font-size:12px;color:#64748b;margin-bottom:8px">
            ${branch.addressLine ?? ""} ${branch.pincode ?? ""}
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px;">
            <div style="color:#64748b">Distance</div>
            <div style="font-weight:600;color:#0f172a">${branch.distanceKm} km</div>
            <div style="color:#64748b">Score</div>
            <div style="font-weight:700;color:${color}">${branch.score.toFixed(1)} — ${label}</div>
            <div style="color:#64748b">Available Funds</div>
            <div style="font-weight:600;color:#0f172a">${fundDisplay}</div>
            <div style="color:#64748b">NPA</div>
            <div style="font-weight:600;color:#0f172a">${npaDisplay}</div>
            <div style="color:#64748b">Type</div>
            <div style="font-weight:600;color:#0f172a">${branch.type.replaceAll("_", " ")}</div>
          </div>
          ${selectButton}
        </div>
      `;

      const marker = L.marker([branch.latitude, branch.longitude], { icon })
        .addTo(map)
        .bindPopup(popup);

      markers.push(marker);
      bounds.extend([branch.latitude, branch.longitude]);
    }

    if (branches.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }

    mapRef.current = map;
    markersRef.current = markers;

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current = [];
    };
  }, [ready, branches, centerLat, centerLng, applicationId]);

  if (error) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
        Failed to load the map. Check your internet connection and reload.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-[420px] w-full rounded-2xl border border-slate-200 shadow-sm"
      style={{ zIndex: 0 }}
    />
  );
}
