import type { ScoredBranch } from "@/lib/branch-ranking";
import { SchemeSupportBadge } from "@/components/SchemeSupportBadge";

export function DirectoryBranches({ branches, expanded, radiusKm, schemeName, confirmedOnly, lenderName, contactFallback, lenderSourceUrl, locatorUrl }: {
  branches: ScoredBranch[]; expanded: boolean; radiusKm: number;
  schemeName?: string; confirmedOnly?: boolean;
  lenderName?: string; contactFallback?: boolean; lenderSourceUrl?: string; locatorUrl?: string;
}) {
  return <section className="space-y-3" aria-label="Nearby bank directory">
    {contactFallback && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">No current branch-specific confirmations are recorded here for this scheme. The listings below are nearby {lenderName} contact options, not confirmed scheme matches.</p>}
    <h2 className="text-lg font-bold text-slate-900">{lenderName ? `Nearby ${lenderName} branches to contact` : "Nearby banks"} ({branches.length})</h2>
    {lenderSourceUrl && <p className="text-sm text-slate-600">Bank identity matches the scheme lender; local processing must still be checked. <a className="text-blue-700 underline" href={lenderSourceUrl} target="_blank" rel="noopener noreferrer">Official loan information</a> · <a className="text-blue-700 underline" href={locatorUrl} target="_blank" rel="noopener noreferrer">Official branch locator</a></p>}
    <p className="text-sm text-slate-600">Closest mapped branches first. Contact the bank to confirm opening hours and support for your scheme. These listings are not verified application partners.</p>
    {expanded && <p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Few banks were mapped in your chosen radius. Showing the closest alternatives within {radiusKm} km, including those outside your radius.</p>}
    {!branches.length && <p className="panel text-sm text-slate-600">{confirmedOnly ? "No banks with current confirmation for this scheme were found in this area. Turn off the confirmed-only filter to see banks you can contact. This does not mean that no banks offer the scheme." : `No mapped banks found within ${radiusKm} km. Try a nearby town or a more precise location. Map coverage is incomplete.`}</p>}
    {branches.map(branch => <article key={branch.id} className="panel space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="font-bold text-slate-950">{branch.name}</h3>
          <p className="mt-1 text-sm text-slate-600">{[branch.addressLine, branch.district, branch.state, branch.pincode].filter(Boolean).join(", ") || "See the map pin for this bank's location."}</p>
        </div>
        <span className="shrink-0 rounded-lg bg-blue-50 px-2 py-1 text-sm font-semibold text-blue-900">{branch.distanceKm} km</span>
      </div>
      <div className="flex flex-wrap gap-3 text-sm">
        <a className="font-semibold text-blue-700 underline" href={`https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`} target="_blank" rel="noopener noreferrer">Get directions</a>
        {branch.phone && /^[+\d\s()-]{5,30}$/.test(branch.phone) && <a className="font-semibold text-blue-700 underline" href={`tel:${branch.phone.replace(/[^+\d]/g, "")}`}>Call {branch.phone}</a>}
        <a className="text-slate-600 underline" href={branch.directorySource?.url} target="_blank" rel="noopener noreferrer">Source map</a>
      </div>
      {schemeName && <div><p className="mb-1 text-xs font-bold">{schemeName}</p><SchemeSupportBadge support={branch.schemeSupport} /></div>}
      <p className="text-xs text-slate-500">{schemeName ? "Support confirmation does not guarantee loan approval or funds." : "Select a scheme above to check branch support."} Map data imported {branch.directorySource?.importedAt.slice(0, 10)}.</p>
      <p className="text-xs text-slate-500">Mapped point: {branch.latitude.toFixed(6)}, {branch.longitude.toFixed(6)}. Confirm the exact branch using the source map or official locator.</p>
    </article>)}
    <p className="text-xs text-slate-500">Distances are straight-line distances. Road travel may be longer. Showing up to 60 closest mapped banks.</p>
  </section>;
}
