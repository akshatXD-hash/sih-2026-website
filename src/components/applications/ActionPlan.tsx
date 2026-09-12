
import { T } from "@/components/language/LanguageProvider";
import { RefreshPreparation } from "@/components/applications/RefreshPreparation";
import { UploadDocumentsButton } from "@/components/applications/UploadDocumentsButton";
import Link from "next/link";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { saveCompetenciesAction, setPlanTaskAction } from "@/app/(applicant)/plan-actions";
import { buildActionPlan, compactPreparation, skillLevelLabels, skillLevels, type PlanInput } from "@/lib/action-plan";

export function ActionPlan({ application }: { application: PlanInput }) {
  const plan = buildActionPlan(application);
  const steps = compactPreparation(application);
  const complete = steps.filter(step => step.done).length;
  return <section id="action-plan" className="panel scroll-mt-8 space-y-4">
    <h2 className="text-lg font-bold"><T>Your preparation checklist</T></h2>
    <p className="text-sm text-slate-600"><T>{`${complete} of 3 preparation steps saved`}</T></p>
    <ul className="divide-y divide-slate-100" aria-live="polite">{steps.map(step => <li key={step.key} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 flex-1"><p className="font-semibold"><T>{step.title}</T> <span className={step.done ? "ml-2 text-sm text-teal-700" : "ml-2 text-sm text-amber-800"}><T>{step.status}</T></span></p>
        <p className="mt-1 text-xs text-slate-600"><T>{step.detail}</T></p>
        {step.key === "documents" && application.loanScheme && <p className="mt-2 text-sm text-slate-700"><strong><T>Required:</T></strong> {application.loanScheme.requiredDocuments.join(" · ")}</p>}
      </div>
      {step.key === "documents" ? <UploadDocumentsButton /> : step.disabled ? <span className="text-xs text-slate-500"> <T>Choose scheme first</T> </span> : <Link className="text-sm font-semibold text-teal-700 underline" href={step.href}><T>{step.action}</T></Link>}
    </li>)}</ul>
    <RefreshPreparation />
    <details className="border-t border-slate-200 pt-4"><summary className="cursor-pointer text-sm font-semibold"><T>Build your skills</T> <span className="font-normal text-slate-500">· <T>Optional</T></span></summary><div className="mt-4 space-y-4">
    <form action={saveCompetenciesAction.bind(null, application.id)} className="rounded-xl bg-slate-50 p-4">
      <h3 className="font-bold"> <T>Skill readiness · self-assessment</T> </h3><p className="mt-1 text-sm text-slate-600">Tell us where you need practice. These are your own ratings, not verified qualifications.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{plan.skills.map(skill => <label className="text-sm font-semibold" key={skill.key}><T>{skill.title}</T>
        <select required name={skill.key} defaultValue={application.competencies.find(c => c.skillKey === skill.key)?.level ?? ""} className="mt-2 block w-full rounded-lg border border-slate-300 bg-white p-3">
          <option value="" disabled> <T>Choose your confidence level</T> </option>{skillLevels.map(level => <option key={level} value={level}><T>{skillLevelLabels[level]}</T></option>)}
        </select></label>)}</div><div className="mt-4"><SubmitButton pendingLabel="Saving assessment…"><T>Save skill assessment</T></SubmitButton></div>
    </form>
    <div><h3 className="font-bold">Recommended practice · {plan.recommended.filter(task => task.done).length} of {plan.recommended.length} completed</h3>
      <p className="mt-1 text-sm text-slate-600">Optional guided activities. Mark completion after doing the exercise; this does not certify a skill.</p>
      <div className="mt-4 space-y-3">{plan.recommended.map(task => <details className="rounded-xl border border-slate-200 p-4" key={task.key} open={task.level === "LEARNING" && !task.done}>
        <summary className="cursor-pointer font-semibold">{task.done ? "✓ Completed" : task.priority} · {task.title}</summary>
        <p className="mt-3 text-sm leading-6 text-slate-600">{task.detail}</p>
        <form className="mt-3" action={setPlanTaskAction.bind(null, application.id, task.key, !task.done)}><SubmitButton pendingLabel="Saving progress…">{task.done ? "Mark as unfinished" : "I completed this exercise"}</SubmitButton></form>
      </details>)}</div></div>
    </div></details>
  </section>;
}
