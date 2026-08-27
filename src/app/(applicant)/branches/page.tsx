import Link from "next/link";

import { searchBranchesAction } from "@/app/(applicant)/actions";
import { requireApplicant } from "@/lib/auth/guards";

export default async function BranchesPage({ searchParams }: { searchParams: Promise<{ applicationId?: string; district?: string }> }) {
  await requireApplicant();
  const { applicationId, district } = await searchParams;
  return (
    <div>
      <span className="eyebrow">Branch locator · Phase 3 boundary</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Find a servicing branch</h1>
      <p className="mt-3 max-w-2xl text-slate-600">The route and Server Action are wired. PostGIS radius ranking and map pins arrive in Phase 3.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <form action={searchBranchesAction} className="panel h-fit space-y-4">
          {applicationId && <input type="hidden" name="applicationId" value={applicationId} />}
          <label className="block space-y-2"><span className="text-sm font-bold text-slate-700">District or city</span><input className="field" name="district" defaultValue={district} placeholder="e.g. Pune" required /></label>
          <button className="button-primary w-full" type="submit">Search branches</button>
          {district && <p className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">Search accepted for <strong>{district}</strong>. Ranked database results are intentionally deferred to Phase 3.</p>}
          {applicationId && <Link className="button-secondary w-full" href={`/applications/new?applicationId=${encodeURIComponent(applicationId)}`}>Continue application</Link>}
        </form>
        <div className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-slate-300 bg-[radial-gradient(circle_at_center,_rgba(13,148,136,0.12),_transparent_62%)] p-8 text-center"><div><div className="mx-auto grid size-16 place-items-center rounded-full bg-white text-2xl shadow">⌖</div><h2 className="mt-5 text-xl font-bold text-slate-900">Map placeholder</h2><p className="mt-2 max-w-sm text-sm leading-6 text-slate-600">Leaflet or Mapbox will render PostGIS-ranked branch pins here in Phase 3.</p></div></div>
      </div>
    </div>
  );
}
