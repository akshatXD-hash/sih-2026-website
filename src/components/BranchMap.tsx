"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";

import type { ScoredBranch } from "@/lib/branch-ranking";
import { supportLabels } from "@/lib/scheme-support";

interface BranchMapProps {
  branches: ScoredBranch[];
  centerLat: number;
  centerLng: number;
  centerLabel?: string;
}

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function scoreColor(score: number): string {
  if (score >= 60) return "#0d9488";
  if (score >= 40) return "#2563eb";
  return "#ea580c";
}

function scoreLabel(score: number): string {
  if (score >= 60) return "Excellent";
  if (score >= 40) return "Good";
  return "Fair";
}

function createPopup(branch: ScoredBranch) {
  const popup = document.createElement("div");
  popup.style.cssText = "font-family:Arial,sans-serif;min-width:220px;line-height:1.5";

  const title = document.createElement("div");
  title.style.cssText = "font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px";
  title.textContent = branch.name;
  popup.append(title);

  const address = document.createElement("div");
  address.style.cssText = "font-size:12px;color:#64748b;margin-bottom:8px";
  address.textContent = [branch.addressLine, branch.pincode].filter(Boolean).join(" ");
  popup.append(address);
  if (branch.schemeSupport && branch.schemeSupport.status !== "UNKNOWN") {
    const support = document.createElement("p");
    support.textContent = supportLabels[branch.schemeSupport.status];
    popup.append(support);
  }

  if (branch.directorySource) {
    const info = document.createElement("p");
    info.textContent = `${branch.distanceKm} km straight-line distance. Mapped bank; contact branch before travelling.`;
    popup.append(info);
    const directions = document.createElement("a");
    directions.href = `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
    directions.target = "_blank";
    directions.rel = "noopener noreferrer";
    directions.textContent = "Get directions";
    popup.append(directions);
    return popup;
  }

  const details = document.createElement("dl");
  details.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:12px";
  const rows = [
    ["Distance", `${branch.distanceKm} km`],
    ["Score", `${branch.score.toFixed(1)} — ${scoreLabel(branch.score)}`],
    ["Available funds", branch.availableFundAmount == null ? "N/A" : INR.format(branch.availableFundAmount)],
    ["NPA", branch.npaPercentage == null ? "N/A" : `${branch.npaPercentage.toFixed(1)}%`],
    ["Type", branch.type.replaceAll("_", " ")],
  ];

  for (const [label, value] of rows) {
    const term = document.createElement("dt");
    term.style.color = "#64748b";
    term.textContent = label;
    const description = document.createElement("dd");
    description.style.cssText = "font-weight:600;color:#0f172a;margin:0";
    description.textContent = value;
    details.append(term, description);
  }
  popup.append(details);
  return popup;
}

export function BranchMap({ branches, centerLat, centerLng, centerLabel = "Search center" }: BranchMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let disposed = false;

    async function initializeMap() {
      if (!containerRef.current) return;
      const L = (await import("leaflet")).default;
      if (disposed || !containerRef.current) return;

      mapRef.current?.remove();
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [centerLat, centerLng],
        13,
      );

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const locationPopup = document.createElement("div");
      locationPopup.style.cssText = "text-align:center;font-weight:600;color:#0f172a";
      locationPopup.textContent = centerLabel;
      L.circleMarker([centerLat, centerLng], {
        radius: 10,
        color: "#dc2626",
        fillColor: "#ef4444",
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(map).bindPopup(locationPopup);

      const bounds = L.latLngBounds([[centerLat, centerLng]]);
      for (const branch of branches) {
        const color = branch.directorySource ? "#2563eb" : scoreColor(branch.score);
        const icon = L.divIcon({
          className: "",
          html: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${color};color:white;font-weight:700;font-size:13px;box-shadow:0 2px 8px rgba(0,0,0,.25);border:2px solid white">${branch.directorySource ? "B" : Math.round(branch.score)}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });
        L.marker([branch.latitude, branch.longitude], { icon })
          .addTo(map)
          .bindPopup(createPopup(branch));
        bounds.extend([branch.latitude, branch.longitude]);
      }

      if (branches.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
      mapRef.current = map;
    }

    void initializeMap().catch(() => setError(true));
    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [branches, centerLat, centerLng, centerLabel]);

  if (error) {
    return (
      <div className="grid min-h-[420px] place-items-center rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm text-red-800">
        Failed to load the map. Please reload the page.
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
