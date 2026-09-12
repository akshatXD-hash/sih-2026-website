"use client";
import { T } from "@/components/language/LanguageProvider";


import { useRef, useState, useTransition } from "react";

interface BranchSearchFormProps {
  applicationId?: string;
  defaultDistrict?: string;
  defaultPlaceId?: string;
  schemes?: Array<{ id: string; name: string }>;
  selectedSchemeId?: string;
  defaultConfirmedOnly?: boolean;
  defaultLat?: number;
  defaultLng?: number;
  defaultRadius?: number;
  action: (formData: FormData) => void | Promise<void>;
}

export function BranchSearchForm({
  applicationId,
  defaultDistrict,
  defaultPlaceId,
  schemes = [],
  selectedSchemeId,
  defaultConfirmedOnly,
  defaultLat,
  defaultLng,
  defaultRadius,
  action,
}: BranchSearchFormProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lngRef = useRef<HTMLInputElement>(null);
  const districtRef = useRef<HTMLInputElement>(null);
  const placeRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();

  function handleGeolocate() {
    if (!window.isSecureContext) {
      setGeoError("Current location requires HTTPS or localhost. Enter your district or coordinates below.");
      return;
    }
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
        if (districtRef.current) districtRef.current.value = "";
        if (placeRef.current) placeRef.current.value = "";
        setLocating(false);
        if (pos.coords.accuracy > 1000) {
          setGeoError(`Your browser estimates this location within ${Math.ceil(pos.coords.accuracy / 1000)} km. Enter your district for a more useful search, or press Search branches to use these coordinates.`);
          return;
        }
        // Submit through the same validation path as manual input.
        if (formRef.current) {
          formRef.current.requestSubmit();
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
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  }

  return (
    <form ref={formRef} action={action} onSubmit={(event) => {
      event.preventDefault();
      const formData = new FormData(event.currentTarget);
      if (formData.get("confirmedOnly") === "1" && !formData.get("schemeId")) {
        setGeoError("Choose a scheme to search only confirmed branches.");
        return;
      }
      const lat = String(formData.get("lat") ?? "").trim();
      const lng = String(formData.get("lng") ?? "").trim();
      const district = String(formData.get("district") ?? "").trim();
      if (Boolean(lat) !== Boolean(lng) || (!lat && district.length < 2 && !formData.get("placeId"))) {
        setGeoError("Enter both coordinates, or a village, city or PIN code with at least two characters.");
        return;
      }
      formData.set("lat", lat);
      formData.set("lng", lng);
      formData.set("district", district);
      setGeoError(null);
      startTransition(async () => { await action(formData); });
    }} className="panel h-fit space-y-4">
      {applicationId && (
        <input type="hidden" name="applicationId" value={applicationId} />
      )}
      <input ref={placeRef} type="hidden" name="placeId" defaultValue={defaultPlaceId ?? ""} />
      {applicationId ? <input type="hidden" name="schemeId" value={selectedSchemeId ?? ""} /> : <label className="block text-sm font-semibold"> <T>Check support for a scheme</T> <select name="schemeId" className="field mt-1" defaultValue={selectedSchemeId ?? ""} disabled={isPending} onChange={() => {
        if (!locating && (placeRef.current?.value || districtRef.current?.value || (latRef.current?.value && lngRef.current?.value))) formRef.current?.requestSubmit();
      }}><option value=""> <T>All banks (no scheme selected)</T> </option>{schemes.map(scheme => <option key={scheme.id} value={scheme.id}>{scheme.name}</option>)}</select></label>}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="confirmedOnly" value="1" defaultChecked={defaultConfirmedOnly} /> <T>Only show branches with current scheme confirmation</T> </label>

      {/* Geolocation button */}
      <button
        type="button"
        onClick={handleGeolocate}
        disabled={locating || isPending}
        className="button-primary w-full gap-2"
      >
        {locating ? (
          <>
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> <T>Locating…</T> </>
        ) : (
          <> <T>📍 Use my current location</T> </>
        )}
      </button>

      {geoError && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          {geoError}
        </p>
      )}

      <div className="relative flex items-center gap-3">
        <hr className="flex-1 border-slate-200" />
        <span className="text-xs font-semibold text-slate-400"> <T>OR</T> </span>
        <hr className="flex-1 border-slate-200" />
      </div>

      {/* Manual lat/lng */}
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-600"> <T>Latitude</T> </span>
          <input
            ref={latRef}
            onChange={() => { if (districtRef.current) districtRef.current.value = ""; if (placeRef.current) placeRef.current.value = ""; }}
            readOnly={locating || isPending}
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
          <span className="text-xs font-bold text-slate-600"> <T>Longitude</T> </span>
          <input
            ref={lngRef}
            onChange={() => { if (districtRef.current) districtRef.current.value = ""; if (placeRef.current) placeRef.current.value = ""; }}
            readOnly={locating || isPending}
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
        <span className="text-xs font-bold text-slate-600"> <T>Village, town, city or PIN code</T> </span>
        <input
          className="field text-sm"
          name="district"
          ref={districtRef}
          minLength={2}
          maxLength={80}
          readOnly={locating || isPending}
          onChange={() => {
            if (placeRef.current) placeRef.current.value = "";
            if (latRef.current) latRef.current.value = "";
            if (lngRef.current) lngRef.current.value = "";
          }}
          defaultValue={defaultDistrict}
          placeholder="e.g. Bengaluru, Devanahalli or 562110"
        />
      </label>

      <p className="text-xs text-slate-500"> <T>For villages with the same name, add a comma and your state. PIN codes show matching postal localities to choose from.</T> </p>

      {/* Radius */}
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-slate-600"> <T>Search radius</T> <span className="font-normal text-slate-400">(km)</span>
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

      <button className="button-primary w-full" type="submit" disabled={locating || isPending}>
        {isPending ? "Searching…" : "Search branches"}
      </button>
    </form>
  );
}
