import Link from "next/link";

import { ApplicationStatus } from "@/generated/prisma/enums";
import { AiHealthCard } from "@/components/ai/AiHealthCard";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

const statuses = Object.values(ApplicationStatus);

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = statuses.includes(params.status as ApplicationStatus)
    ? params.status as ApplicationStatus
    : undefined;
  const query = params.q?.trim().slice(0, 100);
  const leads = await prisma.application.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(query
        ? {
            OR: [
              { referenceNumber: { contains: query, mode: "insensitive" as const } },
              { user: { name: { contains: query, mode: "insensitive" as const } } },
              { user: { email: { contains: query, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    },
    take: 50,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      createdAt: true,
      user: { select: { name: true } },
      loanScheme: { select: { name: true } },
      channelPartner: { select: { name: true } },
      _count: { select: { documents: true } },
    },
  });

  return (
    <div>
      <span className="eyebrow">Officer workspace</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Lead triage</h1>
      <p className="mt-3 text-slate-600">Review documents, leave notes, and move applications through controlled status transitions.</p>
      <AiHealthCard />

      <form className="panel mt-7 grid gap-3 sm:grid-cols-[1fr_220px_auto]" method="GET">
        <input className="field" name="q" defaultValue={query} placeholder="Reference, applicant, or email" />
        <select className="field" name="status" defaultValue={status ?? ""}>
          <option value="">All statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
        </select>
        <button className="button-primary" type="submit">Filter leads</button>
      </form>

      <div className="panel mt-6 overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
            <tr><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Applicant</th><th className="px-5 py-4">Scheme / branch</th><th className="px-5 py-4">Documents</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Created</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-5 py-4"><Link className="font-mono text-xs font-bold text-teal-700 hover:underline" href={`/admin/applications/${lead.id}`}>{lead.referenceNumber}</Link></td>
                <td className="px-5 py-4 font-semibold">{lead.user.name}</td>
                <td className="px-5 py-4"><p>{lead.loanScheme?.name ?? "Unmatched"}</p><p className="text-xs text-slate-500">{lead.channelPartner?.name ?? "No branch"}</p></td>
                <td className="px-5 py-4">{lead._count.documents}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{lead.status.replaceAll("_", " ")}</span></td>
                <td className="px-5 py-4 text-slate-500">{lead.createdAt.toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {leads.length === 0 && <p className="p-8 text-center text-slate-500">No applications match these filters.</p>}
      </div>
    </div>
  );
}
