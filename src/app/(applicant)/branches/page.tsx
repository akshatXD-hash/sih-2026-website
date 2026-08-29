import Link from "next/link";
import { notFound } from "next/navigation";

import { searchBranchesAction, selectBranchAction } from "@/app/(applicant)/actions";
import { BranchMap } from "@/components/BranchMap";
import { BranchSearchForm } from "@/components/BranchSearchForm";
import { requireApplicant } from "@/lib/auth/guards";
import { findDistrictCenter, findNearbyBranches } from "@/lib/branches";
import { prisma } from "@/lib/prisma";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

// Default coordinates centered in Pune
const DEFAULT_LAT = 18.5204;
const DEFAULT_LNG = 73.8567;
const DEFAULT_RADIUS_KM = 50;

interface PageProps {
  searchParams: Promise<{
    applicationId?: string;
    district?: string;
    lat?: string;
    lng?: string;
    radius?: string;
  }>;
}

function parseBoundedNumber(value: string | undefined, min: number, max: number) {
  if (value == null || value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export default async function BranchesPage({ searchParams }: PageProps) {
  const user = await requireApplicant();
  const { applicationId, district, lat, lng, radius } = await searchParams;
  const validDistrict = district && district.trim().length >= 2 && district.trim().length <= 80
    ? district.trim()
    : undefined;

  let centerLat = parseBoundedNumber(lat, -90, 90);
  let centerLng = parseBoundedNumber(lng, -180, 180);
  const radiusKm = parseBoundedNumber(radius, 1, 500) ?? DEFAULT_RADIUS_KM;

  // If lat/lng not supplied, but district is, attempt to resolve district center from DB
  if ((centerLat == null || centerLng == null) && validDistrict) {
    const match = await findDistrictCenter(validDistrict);
    if (match) {
      centerLat = match.latitude;
      centerLng = match.longitude;
    }
  }

  // Fallback to default coordinates if still unresolved
  if (centerLat == null || centerLng == null || Number.isNaN(centerLat) || Number.isNaN(centerLng)) {
    centerLat = DEFAULT_LAT;
    centerLng = DEFAULT_LNG;
  }

  const rankedBranches = await findNearbyBranches({
    latitude: centerLat,
    longitude: centerLng,
    radiusKm,
  });

  // If an application ID is provided, verify application exists
  let application = null;
  if (applicationId) {
    application = await prisma.application.findFirst({
      where: { id: applicationId, userId: user.id },
      include: { loanScheme: true },
    });
    if (!application) notFound();
  }

  return (
    <div>
      <span className="eyebrow">Geospatial branch locator · Phase 3</span>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950">
            Find the best branch for you
          </h1>
          <p className="mt-2 text-slate-600">
            Ranked by proximity (40%), available lending funds (35%), and loan health (25%).
          </p>
        </div>
        {application && (
          <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm text-teal-900">
            Applying for: <strong className="font-bold">{application.loanScheme?.name ?? "Selected Scheme"}</strong>
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        {/* Left Column: Search Form & Branch List */}
        <div className="space-y-6">
          <BranchSearchForm
            action={searchBranchesAction}
            applicationId={applicationId}
            defaultDistrict={validDistrict}
            defaultLat={lat ? Number.parseFloat(lat) : undefined}
            defaultLng={lng ? Number.parseFloat(lng) : undefined}
            defaultRadius={radius ? Number.parseFloat(radius) : undefined}
          />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                Ranked Branches ({rankedBranches.length})
              </h2>
              <span className="text-xs text-slate-500">
                Within {radiusKm} km radius
              </span>
            </div>

            {rankedBranches.length === 0 ? (
              <div className="panel text-center py-8">
                <p className="text-slate-600 font-medium">No verified branches found within {radiusKm} km.</p>
                <p className="text-xs text-slate-400 mt-1">Try expanding your search radius or selecting a different location.</p>
              </div>
            ) : (
              rankedBranches.map((branch, index) => {
                const selectAction = applicationId
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
            <BranchMap
              branches={rankedBranches}
              centerLat={centerLat}
              centerLng={centerLng}
            />
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
              <span>Click any pin to inspect</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
