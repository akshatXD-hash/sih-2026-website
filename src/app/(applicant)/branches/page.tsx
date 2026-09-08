import Link from "next/link";
import { notFound } from "next/navigation";

import { searchBranchesAction, selectBranchAction } from "@/app/(applicant)/actions";
import { BranchMap } from "@/components/BranchMap";
import { BranchSearchForm } from "@/components/BranchSearchForm";
import { requireApplicant } from "@/lib/auth/guards";
import { findNearbyBranches } from "@/lib/branches";
import { parseBoundedNumber, resolveBranchLocation } from "@/lib/branch-location";
import { prisma } from "@/lib/prisma";

import { findPlaces, findPlaceById } from "@/lib/places";
import { chooseExactPlace, placeLabel } from "@/lib/place-search";
import { findDirectoryBanks } from "@/lib/bank-directory";
import { DirectoryBranches } from "@/components/DirectoryBranches";
import { getBranchSchemeSupport } from "@/lib/branch-scheme-support";
import { SchemeSupportBadge } from "@/components/SchemeSupportBadge";
import { schemeLender } from "@/lib/scheme-lender";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const DEFAULT_RADIUS_KM = 50;

interface PageProps {
  searchParams: Promise<{
    applicationId?: string;
    district?: string;
    placeId?: string;
    lat?: string;
    lng?: string;
    radius?: string;
    schemeId?: string;
    confirmedOnly?: string;
    supportError?: string;
  }>;
}

export default async function BranchesPage({ searchParams }: PageProps) {
  const user = await requireApplicant();
  const { applicationId, district, lat, lng, radius, placeId, schemeId, confirmedOnly: confirmedParam, supportError } = await searchParams;
  const validDistrict = typeof district === "string" && district.trim().length >= 2 && district.trim().length <= 80
    ? district.trim()
    : undefined;

  // If an application ID is provided, verify application exists
  let application = null;
  if (applicationId) {
    application = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { loanScheme: true },
    });
    if (!application) notFound();
  }

  const schemes = await prisma.loanScheme.findMany({ where: { isActive: true }, select: { id: true, name: true, slug: true }, orderBy: { name: "asc" } });
  const selectedScheme = application?.loanScheme ?? schemes.find(scheme => scheme.id === schemeId);
  const lender = schemeLender(selectedScheme?.slug);
  const confirmedOnly = confirmedParam === "1" && Boolean(selectedScheme);

  const candidates = !lat && !lng && !placeId && validDistrict ? await findPlaces(validDistrict) : [];
  const selectedPlace = typeof placeId === "string" ? await findPlaceById(placeId)
    : chooseExactPlace(candidates);
  const center = lat || lng
    ? await resolveBranchLocation({ lat, lng }, async () => null)
    : selectedPlace ? { latitude: selectedPlace.latitude, longitude: selectedPlace.longitude,
      label: placeLabel(selectedPlace) + (selectedPlace.kind === "postal" ? " (approximate postal location)" : " (town/city center)") } : null;
  const radiusKm = parseBoundedNumber(radius, 1, 500) ?? DEFAULT_RADIUS_KM;
  const [rankedBranches, matchedDirectory] = center ? await Promise.all([
    findNearbyBranches({ latitude: center.latitude, longitude: center.longitude, radiusKm, schemeId: selectedScheme?.id, confirmedOnly }),
    findDirectoryBanks(center.latitude, center.longitude, radiusKm, { schemeId: selectedScheme?.id, confirmedOnly, lenderPattern: lender?.namePattern }),
  ]) : [[], { branches: [], expanded: false, radiusKm: Math.max(radiusKm, 100) }];
  const contactFallback = Boolean(center && confirmedOnly && !matchedDirectory.branches.length && lender);
  const directory = contactFallback && center
    ? await findDirectoryBanks(center.latitude, center.longitude, radiusKm, { schemeId: selectedScheme?.id, lenderPattern: lender?.namePattern })
    : matchedDirectory;
  if (selectedScheme) {
    const support = await getBranchSchemeSupport(selectedScheme.id, directory.branches.map(branch => branch.id), rankedBranches.map(branch => branch.id));
    for (const branch of directory.branches) branch.schemeSupport = support.get("BANK:" + branch.id) ?? { status: "UNKNOWN" };
    for (const branch of rankedBranches) branch.schemeSupport = support.get("PARTNER:" + branch.id) ?? { status: "UNKNOWN" };
  }
  const locationMessage = district || lat || lng || placeId
    ? "Choose a matching place below. If none appear, try your six-digit PIN code or village name followed by a comma and state. You can also use GPS."
    : "Use your current location, or search an Indian village, town, city or six-digit PIN code.";

  return (
    <div>
      <span className="eyebrow">Geospatial branch locator · Phase 3</span>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            Find the best branch for you
          </h1>
          <p className="mt-2 text-slate-600">
            Find nearby banks across India and verified application partners. Search by village, town, city or PIN code.
          </p>
        </div>
        {application && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-900">
            Applying for: <strong className="font-bold">{application.loanScheme?.name ?? "Selected Scheme"}</strong>
          </div>
        )}
      </div>

      {supportError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">This branch has no current confirmation for your scheme. Select a confirmed application partner or contact a reviewer to verify support.</p>}
      {selectedScheme && <p className="mt-4 text-sm text-slate-700">Checking branch support for <strong>{selectedScheme.name}</strong>. Confirmation is branch-specific and does not guarantee approval or funds.</p>}
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left Column: Search Form & Branch List */}
        <div className="space-y-6">
          <BranchSearchForm
            key={[lat, lng, district, radius, placeId, selectedScheme?.id, confirmedOnly].join(":")}
            schemes={schemes}
            selectedSchemeId={selectedScheme?.id}
            defaultConfirmedOnly={confirmedOnly}
            defaultPlaceId={selectedPlace?.id}
            action={searchBranchesAction}
            applicationId={applicationId}
            defaultDistrict={validDistrict ?? selectedPlace?.name}
            defaultLat={parseBoundedNumber(lat, -90, 90) ?? undefined}
            defaultLng={parseBoundedNumber(lng, -180, 180) ?? undefined}
            defaultRadius={radiusKm}
          />

          {!center && candidates.length > 0 && <section className="panel space-y-3" aria-label="Matching places">
            <h2 className="font-bold">Choose your location</h2>
            <p className="text-sm text-slate-600">Showing up to 12 matches. Add a state after a comma to narrow the search.</p>
            {candidates.map(place => {
              const params = new URLSearchParams({ placeId: place.id, district: validDistrict ?? "", radius: String(radiusKm) });
              if (applicationId) params.set("applicationId", applicationId);
              if (selectedScheme) params.set("schemeId", selectedScheme.id);
              if (confirmedOnly) params.set("confirmedOnly", "1");
              return <Link key={place.id} className="block rounded-lg border border-slate-200 p-3 text-sm hover:bg-blue-50" href={"/branches?" + params.toString()}>{placeLabel(place)}</Link>;
            })}
          </section>}
          {center && <DirectoryBranches {...directory} schemeName={selectedScheme?.name} confirmedOnly={confirmedOnly} lenderName={lender?.name} contactFallback={contactFallback} lenderSourceUrl={lender?.sourceUrl} locatorUrl={lender?.locatorUrl} />}
          <div className="space-y-4">
            {center && <p className="text-sm text-slate-600">Search center: {center.label}. Distances are measured from this point.</p>}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Verified application partners ({rankedBranches.length})
              </h2>
              <span className="text-xs text-slate-500">
                Within {radiusKm} km radius
              </span>
            </div>

            {!center ? (
              <div className="panel text-sm text-slate-600" role="status">{locationMessage}</div>
            ) : rankedBranches.length === 0 ? (
              <div className="panel text-center py-8">
                <p className="text-slate-600 font-medium">No verified branches found within {radiusKm} km.</p>
                <p className="text-xs text-slate-400 mt-1">Try expanding your search radius. Results include only verified branches registered in this service; no results does not mean no loans or schemes are available in your area.</p>
              </div>
            ) : (
              rankedBranches.map((branch, index) => {
                const selectAction = applicationId && branch.schemeSupport?.status === "SUPPORTED"
                  ? selectBranchAction.bind(null, applicationId, branch.id)
                  : undefined;

                return (
                  <article
                    key={branch.id}
                    className="panel flex flex-col justify-between hover:border-teal-300 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                              {index + 1}
                            </span>
                            <span className="text-xs font-bold uppercase tracking-wider text-teal-700">
                              {branch.type.replaceAll("_", " ")}
                            </span>
                          </div>
                          <h3 className="mt-1 text-lg font-bold text-slate-950">
                            {branch.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {branch.addressLine} {branch.pincode ? `• ${branch.pincode}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex rounded-lg bg-teal-50 px-2.5 py-1 text-sm font-bold text-teal-800">
                            Fit {branch.score.toFixed(1)}
                          </span>
                          <p className="mt-1 text-xs text-slate-500 font-semibold">
                            {branch.distanceKm} km away
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
                        <div>
                          <p className="text-slate-400">Available Funds</p>
                          <p className="mt-0.5 font-bold text-slate-800">
                            {branch.availableFundAmount != null
                              ? INR.format(branch.availableFundAmount)
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">NPA Rate</p>
                          <p className="mt-0.5 font-bold text-slate-800">
                            {branch.npaPercentage != null ? `${branch.npaPercentage}%` : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Distance Score</p>
                          <p className="mt-0.5 font-bold text-slate-800">
                            {branch.distanceScore.toFixed(0)}/100
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedScheme && <div className="mt-3"><SchemeSupportBadge support={branch.schemeSupport} /></div>}
                    {applicationId && !selectAction && <p className="mt-3 text-xs text-amber-800">Current scheme confirmation is required before choosing this application partner.</p>}
                    {selectAction && (
                      <form action={selectAction} className="mt-4">
                        <button className="button-primary w-full" type="submit">
                          Choose this branch
                        </button>
                      </form>
                    )}
                  </article>
                );
              })
            )}

            {applicationId && (
              <Link
                className="button-secondary w-full"
                href={`/applications/new?applicationId=${encodeURIComponent(applicationId)}`}
              >
                Back to application review
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Leaflet Map */}
        <div className="sticky top-6 h-fit">
          <div className="panel p-2">
            {center ? <BranchMap
              branches={[...directory.branches, ...rankedBranches]}
              centerLat={center.latitude}
              centerLng={center.longitude}
              centerLabel={center.label}
            /> : <div className="grid min-h-[420px] place-items-center p-8 text-center text-slate-600">{locationMessage}</div>}
            <div className="mt-3 flex items-center justify-between px-2 text-xs text-slate-500">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="size-3 rounded-full bg-teal-600 inline-block" /> Excellent fit (≥60)
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-3 rounded-full bg-blue-600 inline-block" /> Good fit (≥40)
                </span>
                <span className="flex items-center gap-1">
                  <span className="size-3 rounded-full bg-orange-600 inline-block" /> Fair fit (&lt;40)
                </span>
              </div>
              <span>Blue B: mapped bank</span>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-6 text-xs text-slate-500">Place data: <a className="underline" href="https://www.geonames.org/">GeoNames</a> (CC BY). Bank directory: <a className="underline" href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors, ODbL</a>. Coverage and postal coordinates may be incomplete or approximate. Use GPS for your precise starting point.</p>
    </div>
  );
}
