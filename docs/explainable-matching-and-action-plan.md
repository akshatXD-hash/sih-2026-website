# Explainable matching and application preparation

Open **Schemes** from a draft eligibility check. The result tabs include schemes
that meet the checked rules, have unmet rules, or need more information. Expand
**Why?** on any card for the requirement, applicant answer, outcome and official
scheme source. Selection and explanations both use `evaluateEligibility` in
`src/lib/matching.ts`. A missing answer is not interpreted as zero or a failed
requirement. If a profile has both failed and missing rules, it is grouped under
unmet requirements and both kinds remain visible in the explanation.

**Review or complete my answers** edits the existing owned draft. Saving clears
its scheme and branch, so they must be selected against the updated answers.
Uploaded documents and learning progress remain attached to the application.

Open **My skill readiness & action plan**, or the application review page, for:

- Live preparation steps derived from profile checks, scheme, branch and the
  selected scheme's document list.
- Uploaded versus reviewer-verified document states. Failed/rejected uploads
  reopen the preparation step. Certificates that cannot be uniquely identified
  by the current document types require branch review and remain outstanding.
  An arbitrary OTHER upload never completes a specific certificate requirement.
- Self-reported skill confidence and guided practice. Business applications get
  costing, records and marketing exercises; education applications get study
  budgeting and evidence organisation. Unknown confidence never implies inability.
- Saved, reversible practice completion. Learning never gates eligibility or
  submission. The preparation progress bar is not an approval score.

## Storage and operation

Migration `20260908100000_application_action_plan` adds `application_tasks` and
`applicant_competencies`. Each stores only a few rows per application, with unique
application/key indexes and cascading deletion. Reads derive the current checklist
without inserting tasks. Writes authenticate the applicant and load the owned
application. Only currently applicable practice keys accept manual completion.
Versioned practice keys preserve progress when switching between schemes using
the same skills; education/business exercises stay distinct.

Run `npx prisma migrate deploy` and `npx prisma generate` in each deployment before
starting the updated app. Standard validation: `npm test`, `npm run lint`,
`npm run build`. The opt-in action-plan database test uses a transaction that is
always rolled back: set `TEST_ACTION_PLAN_DATABASE=1` and run
`npx vitest run src/__tests__/action-plan.integration.test.ts`.

## Catalogue boundary

The explanations cover structured catalogue rules, not every lender condition.
Source links use the existing scheme-level official URL; rule-specific source
sections are not recorded. No new official-rule verification dates, training
certifications or credit approvals are inferred by this feature. Guided practice
is an in-app exercise, not an accredited training course.

## Demo checks

1. Leave income blank in the profile editor: schemes show missing information.
2. Enter actual zero income: income is evaluated as an answer, not as missing.
3. Request an amount beyond a scheme's limit: see the failed amount rule.
4. Choose a matching scheme and open the plan; upload a listed document and see
   it become ready for review, without claiming verification.
5. Set costing confidence to “I need practice”, save, complete the exercise,
   refresh, and reopen it. Selection eligibility is unchanged.
6. Switch to an education scheme: the plan displays study budgeting and document
   organisation rather than business marketing exercises.
