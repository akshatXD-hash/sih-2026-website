import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAshaWorker } from "@/lib/asha/access";
import { nextAshaAction } from "@/lib/asha/forms";
import { T } from "@/components/language/LanguageProvider";

export default async function AshaDashboard({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; page?: string }> }) {
  const worker = await requireAshaWorker();
  const { q, filter, page } = await searchParams;
  const query = q?.trim().slice(0, 100) ?? "";
  const current = Math.max(1, Math.min(10000, Number.parseInt(page ?? "1", 10) || 1));
  const today = new Date(new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) + "T23:59:59+05:30");
  const scope = { workerId: worker.id };
  const attention = { application: { documents: { some: { status: "REJECTED" as const } } } };
  const where = { ...scope,
    ...(query ? { OR: [{ applicant: { name: { contains: query, mode: "insensitive" as const } } }, { phone: { contains: query } }, { village: { contains: query, mode: "insensitive" as const } }] } : {}),
    ...(filter === "attention" ? attention : filter === "followups" ? { followUpAt: { lte: today } } : filter === "drafts" ? { application: { status: "DRAFT" as const } } : filter === "submitted" ? { application: { status: { in: ["SUBMITTED" as const, "UNDER_REVIEW" as const] } } } : {}),
  };
  const [records, total, drafts, submitted, needsAttention] = await Promise.all([
    prisma.ashaCase.findMany({ where, orderBy: { updatedAt: "desc" }, take: 20, skip: (current - 1) * 20, include: { applicant: { select: { name: true } }, application: { select: { referenceNumber: true, status: true, loanScheme: { select: { name: true } }, documents: { where: { status: "REJECTED" }, select: { id: true } } } } } }),
    prisma.ashaCase.count({ where }),
    prisma.ashaCase.count({ where: { ...scope, application: { status: "DRAFT" } } }),
    prisma.ashaCase.count({ where: { ...scope, application: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } } }),
    prisma.ashaCase.count({ where: { ...scope, ...attention } }),
  ]);
  const href = (pageNumber: number) => "/asha-worker?" + new URLSearchParams({ q: query, filter: filter ?? "", page: String(pageNumber) });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-3xl font-bold"><T>My villagers and applications</T></h1><p className="mt-2 text-sm text-slate-600">Only the villagers you are authorised to assist appear here.</p></div><Link className="button-primary" href="/asha-worker/new"><T>Help a villager</T></Link></div>
    <div className="grid grid-cols-3 gap-3">{[["Drafts", drafts, "drafts"], ["In review", submitted, "submitted"], ["Rejected files", needsAttention, "attention"]].map(([label, count, value]) => <Link key={label} className="panel" href={`/asha-worker?filter=${value}`}><p className="text-sm"><T>{String(label)}</T></p><p className="mt-1 text-2xl font-bold">{count}</p></Link>)}</div>
    <form className="flex flex-wrap gap-3" method="GET"><input className="field min-w-0 flex-1" name="q" defaultValue={query} placeholder="Search villager, phone or village" aria-label="Search villager, phone or village" /><select name="filter" className="field w-auto" defaultValue={filter ?? ""} aria-label="Filter applications"><option value="">All applications</option><option value="drafts">Drafts</option><option value="submitted">Submitted / under review</option><option value="attention">Has rejected documents</option><option value="followups">Follow-ups due today or earlier</option></select><button className="button-secondary" type="submit"><T>Search</T></button><Link className="button-secondary" href="/asha-worker">Clear</Link></form>
    <div className="panel overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><caption className="mb-4 text-left text-slate-600">{total} applications · Phone numbers are for consented follow-ups.</caption><thead><tr className="border-b border-slate-200">{["Villager", "Phone number", "Scheme", "Status", "Next action"].map(label => <th key={label} className="p-3"><T>{label}</T></th>)}</tr></thead><tbody>{records.map(record => <tr key={record.id} className="border-b border-slate-100 align-top">
      <td className="p-3"><Link className="font-semibold text-teal-800 underline" href={`/asha-worker/${record.id}`}>{record.applicant.name}</Link><p className="text-xs text-slate-500">{record.village}</p><p className="mt-1 text-xs text-slate-500">{record.application.referenceNumber}</p></td>
      <td className="p-3">{record.phone ? <><a className="font-semibold text-teal-800 underline" href={`tel:${record.phone}`}>{record.phone}</a><p className="text-xs text-slate-500">{record.contactKind === "FAMILY" ? `Family contact: ${record.contactName}` : "Villager's phone"}</p></> : <span className="text-slate-500">No phone available</span>}</td>
      <td className="p-3">{record.application.loanScheme?.name ?? "Not selected"}</td><td className="p-3"><T>{record.application.status.replaceAll("_", " ")}</T>{record.followUpAt && <p className="mt-1 text-xs">Follow-up: {record.followUpAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</p>}</td>
      <td className="p-3"><Link className="text-teal-800 underline" href={`/asha-worker/${record.id}`}>{nextAshaAction(record.application.status, Boolean(record.application.loanScheme), record.application.documents.length)}</Link></td>
    </tr>)}</tbody></table>{!records.length && <p className="py-8 text-center text-slate-600">No matching applications. Use “Help a villager” to start an assisted draft.</p>}</div>
    <div className="flex justify-between text-sm">{current > 1 ? <Link href={href(current - 1)}>← Previous</Link> : <span />}{current * 20 < total && <Link href={href(current + 1)}>Next →</Link>}</div>
  </div>;
}
