"use client";
import { T } from "@/components/language/LanguageProvider";


import { useState } from "react";

import { calculateEMI, type EMIResult } from "@/lib/finance";

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function EmiCalculator({
  principal,
  initialRate,
  initialTenure,
  gender,
}: {
  principal: number;
  initialRate: number;
  initialTenure: number;
  gender: string | null;
}) {
  const [result, setResult] = useState<EMIResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function calculate(formData: FormData) {
    try {
      const calculation = calculateEMI({
        principal,
        annualInterestRate: Number(formData.get("rate")),
        tenureMonths: Number(formData.get("tenure")),
        moratoriumMonths: Number(formData.get("moratorium")),
        femaleInterestRebate: Number(formData.get("rebate") ?? 0.5),
        gender,
      });
      setResult(calculation);
      setError(null);
    } catch (caught) {
      setResult(null);
      setError(caught instanceof Error ? caught.message : "Could not calculate EMI");
    }
  }

  return (
    <section className="panel">
      <div>
        <h2 className="text-xl font-bold text-slate-950">EMI and moratorium planner</h2>
        <p className="mt-1 text-sm text-slate-600">
          Estimate repayments for {INR.format(principal)}. This is illustrative, not a sanction quote.
        </p>
      </div>
      <form action={calculate} className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1.5 text-sm font-bold text-slate-700"> <T>Annual rate</T> <input className="field" name="rate" type="number" min="6.5" max="8" step="0.05" defaultValue={initialRate} required />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-slate-700"> <T>Tenure (months)</T> <input className="field" name="tenure" type="number" min="6" max="240" step="1" defaultValue={initialTenure} required />
        </label>
        <label className="space-y-1.5 text-sm font-bold text-slate-700"> <T>Grace period</T> <select className="field" name="moratorium" defaultValue="0">
            <option value="0"><T>None</T></option>
            <option value="3">3 months</option>
            <option value="6">6 months</option>
            <option value="9">9 months</option>
            <option value="12">12 months</option>
          </select>
        </label>
        <label className="space-y-1.5 text-sm font-bold text-slate-700"> <T>Female rebate</T> <select className="field" name="rebate" defaultValue="0.5" disabled={gender !== "FEMALE"}>
            <option value="0.5">0.5%</option>
            <option value="0.75">0.75%</option>
            <option value="1">1.0%</option>
          </select>
        </label>
        <button className="button-secondary sm:col-span-2 lg:col-span-4" type="submit"> <T>Calculate repayment</T> </button>
      </form>

      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {result && (
        <div className="mt-6">
          <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-teal-50 p-4"><dt className="text-sm text-teal-700">Monthly EMI</dt><dd className="mt-1 text-xl font-bold text-teal-950">{INR.format(result.monthlyEMI)}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Effective rate</dt><dd className="mt-1 text-xl font-bold text-slate-950">{result.effectiveInterestRate}%</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Moratorium interest</dt><dd className="mt-1 text-xl font-bold text-slate-950">{INR.format(result.capitalizedInterest)}</dd></div>
            <div className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-500">Total payable</dt><dd className="mt-1 text-xl font-bold text-slate-950">{INR.format(result.totalPayable)}</dd></div>
          </dl>
          <details className="mt-4 rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-bold text-slate-800">View amortization schedule</summary>
            <div className="mt-4 max-h-80 overflow-auto">
              <table className="w-full min-w-[560px] text-right text-sm">
                <thead className="sticky top-0 bg-white text-slate-500"><tr><th className="py-2 text-left">Month</th><th>Payment</th><th>Principal</th><th>Interest</th><th>Balance</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {result.schedule.map((entry) => (
                    <tr key={entry.month}><td className="py-2 text-left">{entry.month}</td><td>{INR.format(entry.emi)}</td><td>{INR.format(entry.principalPaid)}</td><td>{INR.format(entry.interestPaid)}</td><td>{INR.format(entry.remainingBalance)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
