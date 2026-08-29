"use client";

import { useRef, useState, useTransition } from "react";

interface BranchSearchFormProps {
  applicationId?: string;
  defaultDistrict?: string;
  defaultLat?: number;
  defaultLng?: number;
  defaultRadius?: number;
  action: (formData: FormData) => void;
}

export function BranchSearchForm({
  applicationId,
  defaultDistrict,
  defaultLat,
  defaultLng,
  defaultRadius,
  action,
}: BranchSearchFormProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleGeolocate() {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by this browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (latRef.current) latRef.current.value = String(pos.coords.latitude);
        if (lngRef.current) lngRef.current.value = String(pos.coords.longitude);
        setLocating(false);
        // Auto-submit after getting location
        if (formRef.current) {
          startTransition(() => {
            const fd = new FormData(formRef.current!);
            action(fd);
          });
        }
      },
      (err) => {
        setLocating(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setGeoError("Location permission denied. Enter coordinates or a district manually.");
            break;
          case err.POSITION_UNAVAILABLE:
            setGeoError("Location unavailable. Try again or enter manually.");
            break;
          default:
            setGeoError("Could not get your location. Enter manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  }

  return (
    <form ref={formRef} action={action} className="panel h-fit space-y-4">
      {applicationId && (
        <input type="hidden" name="applicationId" value={applicationId} />
      )}

      {/* Geolocation button */}
      <button
        type="button"
        onClick={handleGeolocate}
        disabled={locating || isPending}
        className="button-primary w-full gap-2"
      >
        {locating ? (
          <>
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Locating…
          </>
        ) : (
          <>📍 Use my current location</>
        )}
      </button>

      {geoError && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          {geoError}
        </p>
      )}

      <div className="relative flex items-center gap-3">
        <hr className="flex-1 border-slate-200" />
        <span className="text-xs font-semibold text-slate-400">OR</span>
        <hr className="flex-1 border-slate-200" />
      </div>

      {/* Manual lat/lng */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-600">Latitude</span>
          <input
            ref={latRef}
            className="field text-sm"
            name="lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            defaultValue={defaultLat ?? ""}
            placeholder="e.g. 18.52"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-600">Longitude</span>
          <input
            ref={lngRef}
            className="field text-sm"
            name="lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            defaultValue={defaultLng ?? ""}
            placeholder="e.g. 73.85"
          />
        </label>
      </div>

      {/* District fallback */}
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-slate-600">
          District / City <span className="font-normal text-slate-400">(fallback)</span>
        </span>
        <input
          className="field text-sm"
          name="district"
          defaultValue={defaultDistrict}
          placeholder="e.g. Pune"
        />
      </label>

      {/* Radius */}
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-slate-600">
          Search radius <span className="font-normal text-slate-400">(km)</span>
        </span>
        <input
          className="field text-sm"
          name="radius"
          type="number"
          min={1}
          max={500}
          defaultValue={defaultRadius ?? 50}
        />
      </label>

      <button className="button-primary w-full" type="submit" disabled={isPending}>
        {isPending ? "Searching…" : "Search branches"}
      </button>
    </form>
  );
}
