// Shared by the importer and search. Preserve local-script letters and digits.
export function normalizePlaceName(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-IN").replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();
}

export interface SearchPlace {
  id: string;
  name: string;
  district: string | null;
  state: string | null;
  pincode: string | null;
  kind: string;
  latitude: number;
  longitude: number;
  exactMatch?: boolean;
}

export function placeLabel(place: SearchPlace) {
  return [...new Set([place.name, place.district, place.state, place.pincode].filter(Boolean))].join(", ");
}

export function chooseExactPlace(places: SearchPlace[]) {
  const exact = places.filter(place => place.exactMatch);
  const cities = exact.filter(place => place.kind === "city");
  if (cities.length === 1) return cities[0];
  return exact.length === 1 ? exact[0] : null;
}
