export default function BranchesLoading() {
  return <div className="panel space-y-4" role="status" aria-live="polite">
    <h1 className="text-xl font-bold">Finding your location and nearby banks…</h1>
    <p className="text-sm text-slate-600">Searching the India-wide place and bank directory.</p>
    <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
  </div>;
}
