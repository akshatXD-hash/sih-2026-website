export function parseBoundedNumber(value: unknown, min: number, max: number) {
  if (typeof value !== "string" || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export async function resolveBranchLocation(
  input: { lat?: string; lng?: string; district?: string },
  findDistrict: (district: string) => Promise<{ latitude: number; longitude: number } | null>,
) {
  const latitude = parseBoundedNumber(input.lat, -90, 90);
  const longitude = parseBoundedNumber(input.lng, -180, 180);
  if (input.lat || input.lng) {
    return latitude != null && longitude != null
      ? { latitude, longitude, label: "Selected coordinates" }
      : null;
  }
  const district = typeof input.district === "string" ? input.district.trim() : "";
  if (district.length < 2 || district.length > 80) return null;
  const center = await findDistrict(district);
  return center ? { ...center, label: `${district} branch area (approximate)` } : null;
}
