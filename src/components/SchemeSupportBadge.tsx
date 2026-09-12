import { supportLabels, type SchemeSupport } from "@/lib/scheme-support";

export function SchemeSupportBadge({ support }: { support?: SchemeSupport }) {
  const status = support?.status ?? "UNKNOWN";
  if (status === "UNKNOWN") return null;
  return <div className="space-y-1 text-xs">
    <span className={`inline-flex rounded-lg px-2 py-1 font-bold ${status === "SUPPORTED" ? "bg-emerald-50 text-emerald-800" : status === "NOT_SUPPORTED" ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>{supportLabels[status]}</span>
    {support?.verifiedAt && <p className="text-slate-600">Checked {support.verifiedAt.slice(0, 10)} · Review by {support.expiresAt?.slice(0, 10)}</p>}
    {support?.evidenceUrl && <a className="block text-blue-700 underline" href={support.evidenceUrl} target="_blank" rel="noopener noreferrer">View verification evidence</a>}
    {support?.notes && <p className="text-slate-600">{support.notes}</p>}
  </div>;
}
