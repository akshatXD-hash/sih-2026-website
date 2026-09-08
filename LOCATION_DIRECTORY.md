# India location and bank directory

Location lookup no longer depends on channel-partner coverage. GeoNames provides
city aliases (including Bengaluru/Bangalore) and postal localities. A PIN code
can cover multiple villages: the UI asks the applicant to choose. Postal points
are approximate, not household coordinates. Same-name cities also require a choice.

The bank directory uses named OpenStreetMap `amenity=bank` records inside India's
administrative boundary. It excludes ATMs and nameless features. Public directory
records never become verified channel partners and cannot receive applications
through the branch-selection action. Scheme participation, fund balances and loan
health are not inferred. The existing verified partner workflow remains separate.

## Import or refresh

1. Run `npm run db:deploy` to create the indexed tables.
2. Run `powershell -File scripts/download-location-data.ps1` (or `pwsh -File ...`).
3. Run `npm run db:locations` with the intended database configured in `.env`.

The importer accepts an optional directory argument containing the source files.
It uses one transaction with batched, parameterized upserts and preserves existing
application/partner records. Downloads stay in ignored `tmp/location-import`.
Do not run the nationwide Overpass download on each page request. Public Overpass
capacity is limited; retain source downloads and refresh deliberately. This
initial upsert importer does not delete vanished upstream records, so operators
must review closures/removals before treating a refreshed listing as current.

Initial import on 2026-09-07: **162,670 places and 21,604 named bank features**.
OSM features are not guaranteed to correspond one-to-one with physical branches.
Coverage is incomplete and opening hours, contact details and locations may be stale.

## Sources and attribution

- Postal data: https://download.geonames.org/export/zip/IN.zip
- Cities and aliases: https://download.geonames.org/export/dump/cities500.zip
- State labels: https://download.geonames.org/export/dump/admin1CodesASCII.txt
- GeoNames terms/readme: https://download.geonames.org/export/zip/readme.txt
  and https://www.geonames.org/about.html (CC BY).
- Banks: https://overpass-api.de/api/interpreter, from OpenStreetMap contributors,
  ODbL: https://www.openstreetmap.org/copyright

The UI credits both sources. Each bank includes its original OSM link and import
date. Import date is not the date that a bank was independently verified.

## Search behavior and performance

Names, aliases and PIN codes have database indexes. Search returns up to 12
choices; use `village, state` to narrow ambiguous results. City aliases include
those supplied by GeoNames, not arbitrary spelling correction.

Bank queries use PostGIS geography, a GiST spatial index, bounded radius and a
60-result cap. Banks sort by straight-line distance. If fewer than three are
mapped in the requested radius, the same query supplies up to three nearest
alternatives within 100 km (or the larger user-selected radius). The UI explicitly
marks this expansion. Directions open an external maps app for road travel.

## Verification

`npm test` includes normalization, ambiguous-place selection, coordinate validation,
branch ranking and rural fallback tests. Read-only database checks are opt-in:

```powershell
$env:TEST_LOCATION_DATABASE = '1'
npx vitest run src/__tests__/location-directory.integration.test.ts
```

These check Bengaluru/Bangalore alias equivalence, nearby mapped banks, rural
PIN 562110, state context and unknown locations against the imported database.

## Branch-level scheme confirmation

`/admin/branch-support` lets ADMIN and REVIEWER users search a bank/partner and
record branch-specific evidence for an active scheme. A check needs a public
HTTPS evidence link, explanatory notes and a check date within the last 90 days.
Statuses are SUPPORTED, NOT_SUPPORTED and UNKNOWN. Every save appends an audit
record attributed to the signed-in reviewer; later reviews supersede earlier ones.
Confirmations expire 90 days after their check date. No confirmations are seeded.

Applicants can select a scheme and optionally filter for current confirmations.
Filtering happens before the nearby result cap. The latest negative or expired
review cannot be overridden by an older positive one. Choosing an application
partner and submitting recheck support on the server; changing scheme clears
the earlier partner selection. Directory contacts do not become application partners.

## Hubballi–Dharwad and SBI contacts

The reviewed OSM city nodes in `prisma/local-place-overrides.json` supplement the
GeoNames import. Hubli/Hubballi and Dharwar/Dharwad resolve individually; combined
twin-city queries offer both towns. These are city centers, not a user's GPS point.
Source full-address tags are retained. Listings with ATM in their names are excluded
from search, including older imported records that were incorrectly tagged as banks.

SBI catalogue products use a bounded lender-name match before the 60-bank result cap.
That establishes a **contact suggestion only**, not verified loan processing at
that branch. The UI links SBI's official education-loan information and branch locator.
If a confirmed-only SBI search has no results, a separately labelled contact section
shows nearby SBI listings with unknown/expired support. Currently negative confirmations
remain excluded. Selecting a different scheme refreshes results using the current location.

On 2026-09-08 the importer refreshed 162,671 places and upserted 21,139 non-ATM named
bank features. Old rows are retained by the upsert policy; the search excludes ATM rows.
Local checks additionally cover both towns, aliases, SBI lender filtering, restored
addresses, and the distinction between contact suggestions and confirmed support.
