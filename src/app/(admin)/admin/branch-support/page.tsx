import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { BranchSupportForm } from "@/components/BranchSupportForm";

type Branch = { id: string; name: string; address: string | null; kind: string };
export default async function BranchSupportPage({ searchParams }: {
  searchParams: Promise<{ q?: string; branchId?: string; kind?: string }>;
}) {
  const user = await requireAdmin();
  if (user.role !== "ADMIN" && user.role !== "REVIEWER") redirect("/unauthorized");
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const id = typeof params.branchId === "string" ? params.branchId.slice(0, 100) : "";
  const kind = params.kind === "PARTNER" ? "PARTNER" : "BANK";
  const branches = query.length >= 2 ? await prisma.$queryRaw<Branch[]>`
    SELECT id, name, CONCAT_WS(', ', address_line, district, state, pincode) AS address, 'BANK' AS kind
    FROM bank_directory WHERE LOWER(name) LIKE ${query.toLowerCase().replace(/[%_\\]/g, "") + "%"} OR pincode = ${query}
    UNION ALL
    SELECT id, name, CONCAT_WS(', ', address_line, district, state, pincode) AS address, 'PARTNER' AS kind
    FROM channel_partners WHERE is_active = true AND is_verified = true AND (LOWER(name) LIKE ${query.toLowerCase().replace(/[%_\\]/g, "") + "%"} OR pincode = ${query})
    ORDER BY name, id LIMIT 30
  ` : [];
  const selected = !id ? [] : kind === "BANK"
    ? await prisma.$queryRaw<Branch[]>`SELECT id, name, address_line AS address, 'BANK' AS kind FROM bank_directory WHERE id = ${id}`
    : await prisma.$queryRaw<Branch[]>`SELECT id, name, address_line AS address, 'PARTNER' AS kind FROM channel_partners WHERE id = ${id} AND is_active = true AND is_verified = true`;
  const schemes = selected.length ? await prisma.loanScheme.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }) : [];
  const reviews = selected.length ? await prisma.$queryRaw<Array<{ id: number; status: string; name: string; evidence_url: string; notes: string; verified_at: Date; expires_at: Date; reviewer: string }>>`
    SELECT s.id, s.status, l.name, s.evidence_url, s.notes, s.verified_at, s.expires_at, u.name AS reviewer
    FROM branch_scheme_support s JOIN loan_schemes l ON l.id = s.scheme_id JOIN users u ON u.id = s.reviewer_id
    WHERE (${kind} = 'BANK' AND s.bank_id = ${id}) OR (${kind} = 'PARTNER' AND s.partner_id = ${id})
    ORDER BY s.id DESC LIMIT 30
  ` : [];
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">Verify branch scheme support</h1>
    <p className="text-slate-600">Record evidence for a specific branch and scheme. General bank participation does not establish branch-level support.</p>
    <form method="GET" className="panel flex gap-3"><input className="field" name="q" defaultValue={query} placeholder="Bank name starts with… or exact PIN code" aria-label="Find a branch" minLength={2} required /><button className="button-primary">Search</button></form>
    {query && !branches.length && <p>No matching branches. Try the bank name as shown on the map, or a PIN code.</p>}
    <div className="space-y-2">{branches.map(branch => <Link className="panel block" key={branch.kind + branch.id} href={"/admin/branch-support?" + new URLSearchParams({ q: query, branchId: branch.id, kind: branch.kind })}><strong>{branch.name}</strong><p className="text-sm">{branch.address} · {branch.kind === "BANK" ? "Mapped bank" : "Application partner"}</p><p className="text-xs text-slate-500">{branch.id}</p></Link>)}</div>
    {selected[0] && <><h2 className="text-xl font-bold">{selected[0].name}</h2><p>{selected[0].address}</p><BranchSupportForm key={kind + id} branchId={id} branchType={kind} schemes={schemes} />
      <h2 className="text-xl font-bold">Review history (latest 30)</h2>
      {reviews.map(review => <article key={review.id} className="panel text-sm"><strong>{review.name}: {review.status.replaceAll("_", " ")}</strong><p>Checked {review.verified_at.toISOString().slice(0, 10)} · Expires {review.expires_at.toISOString().slice(0, 10)} · Recorded by {review.reviewer}</p><p>{review.notes}</p><a className="text-blue-700 underline" href={review.evidence_url} target="_blank" rel="noopener noreferrer">Evidence</a></article>)}
    </>}
  </div>;
}
