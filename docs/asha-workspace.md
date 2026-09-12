# ASHA workspace

Open `/asha-worker` after signing in with an active user whose role is `ASHA_WORKER`. An administrator must assign that role in the database; it is not available through public registration. Sign out and back in after changing a role. Apply the included migration and regenerate Prisma before running the app.

Workers create assisted drafts after recording the villager's permission. Each case belongs to its creating worker. List, search, counts, case pages, uploads, downloads and mutations enforce that ownership on the server. ASHA workers have neither applicant-workspace nor officer-workspace access, and cannot approve applications or verify documents.

Villagers need no email or password. Assisted applicants have a user record with a null email and no credentials. Existing email registrations remain unchanged. Phone numbers belong to the assisted case, may be shared family contacts, and are not used to identify or link existing accounts. No-phone cases are supported.

The workflow is: save details, choose a scheme meeting the checked requirements, upload documents, read back the application, and submit for officer review. This submission enters the existing officer queue. It does not certify eligibility, confirm branch support or approve a loan. Normal applicant submission requirements are unchanged.

Workers can see document rejection reasons and application status history. Follow-up dates and private worker notes are saved in the case. These are dashboard reminders, not automatic calls, messages or officer notifications. Documents can be added while draft or submitted; once officer review starts, corrections need officer coordination.

Consent is a worker attestation with timestamp and version, not a recording or signature. A worker cannot claim an existing application merely by knowing a phone number. Reassignment and linking assisted profiles to future self-service accounts are outside this implementation.
