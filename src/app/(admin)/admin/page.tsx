import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  await requireAdmin();
  const leads = await prisma.application.findMany({
    take: 12,
    orderBy: { createdAt: "desc" },
    select: { id: true, referenceNumber: true, status: true, createdAt: true, user: { select: { name: true } }, loanScheme: { select: { name: true } } },
  });
  return (
    <div>
      <span className="eyebrow">Officer workspace</span>
      <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950">Lead dashboard</h1>
      <p className="mt-3 text-slate-600">Role-gated lead visibility is active. Triage mutations and status workflows arrive in Phase 5.</p>
      <div className="panel mt-8 overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-slate-600"><tr><th className="px-5 py-4">Reference</th><th className="px-5 py-4">Applicant</th><th className="px-5 py-4">Scheme</th><th className="px-5 py-4">Status</th><th className="px-5 py-4">Created</th></tr></thead><tbody className="divide-y divide-slate-100">{leads.map((lead) => <tr key={lead.id}><td className="px-5 py-4 font-mono text-xs">{lead.referenceNumber}</td><td className="px-5 py-4 font-semibold">{lead.user.name}</td><td className="px-5 py-4">{lead.loanScheme?.name ?? "Unmatched"}</td><td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold">{lead.status.replaceAll("_", " ")}</span></td><td className="px-5 py-4 text-slate-500">{lead.createdAt.toLocaleDateString("en-IN")}</td></tr>)}</tbody></table>
        {leads.length === 0 && <p className="p-8 text-center text-slate-500">No applications yet.</p>}
      </div>
    </div>
  );
}
