import { Gender, LoanCategory, Prisma } from "../src/generated/prisma/client";

const verifiedAt = new Date("2026-08-29T00:00:00.000Z");
const identityDocuments = ["Aadhaar card", "PAN card", "Bank statements"];
const businessDocuments = [...identityDocuments, "Business plan or project report"];
const educationDocuments = [
  "Aadhaar card",
  "Academic records",
  "Admission letter",
  "Fee structure",
  "Co-borrower income proof",
];

type SchemeSeed = Prisma.LoanSchemeCreateInput;

function scheme(data: SchemeSeed): SchemeSeed {
  return {
    minAnnualIncome: null,
    maxAnnualIncome: null,
    interestRateMin: null,
    interestRateMax: null,
    tenureMonthsMin: null,
    tenureMonthsMax: null,
    minAge: null,
    maxAge: null,
    projectCategories: [],
    eligibleTrades: [],
    eligibleGenders: [],
    eligibleApplicantTags: [],
    collateralRequired: false,
    requiredDocuments: identityDocuments,
    sourceVerifiedAt: verifiedAt,
    isActive: true,
    ...data,
  };
}

const mudraUrl = "https://financialservices.gov.in/pradhan-mantri-mudra-yojana-pmmy";
const pmegpUrl = "https://common-pmegp.msme.gov.in/";
const svanidhiUrl = "https://mohua.gov.in/pm_svandhi/FAQs_English.pdf";
const janSamarthUrl = "https://www.financialservices.gov.in/node/4300";
const aifUrl = "https://agriinfra.dac.gov.in/Content/DocAttachment/FINALSchemeGuidelinesAIF.pdf";
const acabacUrl = "https://www.manage.gov.in/rti/suomotu/acabc.asp";
const nbcfdcUrl = "https://nbcfdc.gov.in/nbcfdc/web/pattern-of-finance";
const nmdfcUrl = "https://www.nmdfc.org/nmdfcschemes";
const nskfdcUrl = "https://nskfdc.nic.in/en/node/48";
const ndfdcUrl = "https://www.ndfdc.nic.in/schemes";
const sbiEducationUrl = "https://sbi.co.in/web/interest-rates/interest-rates/loan-schemes-interest-rates/education-loan-scheme";

/**
 * National catalogue reviewed against official scheme/provider pages.
 * A tranche, credit line or borrower class is a separate entry only when its
 * ceiling, pricing or eligibility genuinely differs.
 */
export const loanSchemes: SchemeSeed[] = [
  scheme({
    slug: "pmmy-shishu",
    name: "Pradhan Mantri MUDRA Yojana — Shishu",
    provider: "MUDRA / Participating Lending Institutions",
    category: LoanCategory.MICRO_FINANCE,
    description: "Collateral-free micro-enterprise finance for requirements up to ₹50,000.",
    minAmount: 1,
    maxAmount: 50_000,
    projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied"],
    minAge: 18,
    eligibilityCriteria: { tier: "Shishu", purpose: "Income-generating micro enterprise" },
    requiredDocuments: businessDocuments,
    sourceUrl: mudraUrl,
  }),
  scheme({
    slug: "pmmyp-kishor-term-loan",
    name: "Pradhan Mantri MUDRA Yojana — Kishor",
    provider: "MUDRA / Participating Lending Institutions",
    category: LoanCategory.TERM_LOAN,
    description: "Collateral-free finance for an establishing or growing micro enterprise.",
    minAmount: 50_001,
    maxAmount: 500_000,
    projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied"],
    minAge: 18,
    tenureMonthsMax: 60,
    eligibilityCriteria: { tier: "Kishor" },
    requiredDocuments: businessDocuments,
    sourceUrl: mudraUrl,
  }),
  scheme({
    slug: "pmmy-tarun",
    name: "Pradhan Mantri MUDRA Yojana — Tarun",
    provider: "MUDRA / Participating Lending Institutions",
    category: LoanCategory.TERM_LOAN,
    description: "Collateral-free growth finance above ₹5 lakh and up to ₹10 lakh.",
    minAmount: 500_001,
    maxAmount: 1_000_000,
    projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied"],
    minAge: 18,
    tenureMonthsMax: 60,
    eligibilityCriteria: { tier: "Tarun" },
    requiredDocuments: businessDocuments,
    sourceUrl: mudraUrl,
  }),
  scheme({
    slug: "pmmy-tarun-plus",
    name: "Pradhan Mantri MUDRA Yojana — Tarun Plus",
    provider: "MUDRA / Participating Lending Institutions",
    category: LoanCategory.TERM_LOAN,
    description: "Expansion finance above ₹10 lakh for borrowers who successfully repaid a Tarun loan.",
    minAmount: 1_000_001,
    maxAmount: 2_000_000,
    projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied"],
    minAge: 18,
    tenureMonthsMax: 60,
    eligibilityCriteria: { tier: "Tarun Plus", priorLoan: "Tarun loan successfully repaid" },
    requiredDocuments: [...businessDocuments, "Proof of successful Tarun loan repayment"],
    sourceUrl: mudraUrl,
  }),
  scheme({
    slug: "pmegp-manufacturing-term-loan",
    name: "PMEGP — Manufacturing Project",
    provider: "KVIC / Participating Banks",
    category: LoanCategory.TERM_LOAN,
    description: "Credit-linked bank finance for a new manufacturing micro enterprise, with eligible project cost up to ₹50 lakh.",
    minAmount: 10_000,
    maxAmount: 5_000_000,
    projectCategories: ["manufacturing", "micro-enterprise"],
    minAge: 18,
    tenureMonthsMin: 36,
    tenureMonthsMax: 84,
    collateralRequired: true,
    eligibilityCriteria: { enterprise: "New unit only", subsidy: "Margin-money subsidy varies by category and location" },
    requiredDocuments: businessDocuments,
    sourceUrl: pmegpUrl,
  }),
  scheme({
    slug: "pmegp-service-term-loan",
    name: "PMEGP — Service or Business Project",
    provider: "KVIC / Participating Banks",
    category: LoanCategory.TERM_LOAN,
    description: "Credit-linked bank finance for a new service or business micro enterprise, with eligible project cost up to ₹20 lakh.",
    minAmount: 10_000,
    maxAmount: 2_000_000,
    projectCategories: ["services", "trading", "micro-enterprise"],
    minAge: 18,
    tenureMonthsMin: 36,
    tenureMonthsMax: 84,
    collateralRequired: true,
    eligibilityCriteria: { enterprise: "New unit only", subsidy: "Margin-money subsidy varies by category and location" },
    requiredDocuments: businessDocuments,
    sourceUrl: pmegpUrl,
  }),
  ...[
    ["pm-svanidhi-first-tranche", "PM SVANidhi — First Tranche", 1, 10_000, "Initial working-capital loan for an eligible street vendor."],
    ["pm-svanidhi-second-tranche", "PM SVANidhi — Second Tranche", 10_001, 20_000, "Second working-capital tranche after timely repayment of the first."],
    ["pm-svanidhi-third-tranche", "PM SVANidhi — Third Tranche", 20_001, 50_000, "Third working-capital tranche after timely repayment of the second."],
  ].map(([slug, name, minAmount, maxAmount, description]) => scheme({
    slug: String(slug), name: String(name), provider: "Ministry of Housing and Urban Affairs / Lending Institutions",
    category: LoanCategory.MICRO_FINANCE, description: String(description), minAmount: Number(minAmount), maxAmount: Number(maxAmount),
    projectCategories: ["trading", "services", "micro-enterprise", "livelihood"], eligibleApplicantTags: ["STREET_VENDOR"], minAge: 18,
    eligibilityCriteria: { note: "Lender rate applies; Government provides 7% interest subsidy on timely repayment", tranche: String(name).split("—")[1]?.trim() },
    requiredDocuments: [...identityDocuments, "Street-vending eligibility document"], sourceUrl: svanidhiUrl,
  })),
  scheme({
    slug: "weaver-mudra-scheme",
    name: "Weaver MUDRA Scheme",
    provider: "Ministry of Textiles / Participating Banks",
    category: LoanCategory.TERM_LOAN,
    description: "Concessional credit for handloom weavers and weaving enterprises.",
    minAmount: 10_000,
    maxAmount: 500_000,
    projectCategories: ["manufacturing", "micro-enterprise", "livelihood"],
    eligibleTrades: ["handloom weaving", "weaving", "textiles"],
    eligibleApplicantTags: ["ARTISAN"],
    minAge: 18,
    requiredDocuments: [...businessDocuments, "Weaver identity card or eligible proof"],
    sourceUrl: janSamarthUrl,
  }),
  ...[
    ["kcc-crop-production", "Kisan Credit Card — Crop Production", "Crop cultivation and post-harvest working capital."],
    ["kcc-animal-husbandry", "Kisan Credit Card — Animal Husbandry", "Working capital for dairy and other eligible animal-husbandry activity."],
    ["kcc-fisheries", "Kisan Credit Card — Fisheries", "Working capital for eligible inland or marine fisheries activity."],
  ].map(([slug, name, description]) => scheme({
    slug, name, provider: "Participating Banks", category: LoanCategory.MICRO_FINANCE, description,
    minAmount: 1, maxAmount: 300_000, projectCategories: ["agriculture-allied", "livelihood"], eligibleApplicantTags: ["FARMER"],
    eligibilityCriteria: { note: "₹3 lakh is the commonly applicable concessional-credit ceiling; lender assessment governs sanction" },
    requiredDocuments: [...identityDocuments, "Land/activity records or lease proof"], sourceUrl: janSamarthUrl,
  })),
  scheme({
    slug: "agriculture-infrastructure-fund",
    name: "Agriculture Infrastructure Fund",
    provider: "Government of India / Participating Banks",
    category: LoanCategory.TERM_LOAN,
    description: "Project finance with 3% interest subvention for eligible post-harvest and community-farming infrastructure.",
    minAmount: 100_000,
    maxAmount: 20_000_000,
    projectCategories: ["agriculture-allied", "manufacturing", "services"],
    tenureMonthsMax: 84,
    collateralRequired: true,
    eligibilityCriteria: { eligibleBorrowers: "Farmers, FPOs, PACS, SHGs, agri-entrepreneurs and other notified beneficiaries", interestSubvention: "3% up to ₹2 crore", moratorium: "Up to 2 years within a maximum 7-year repayment period" },
    requiredDocuments: businessDocuments,
    sourceUrl: aifUrl,
  }),
  ...[
    ["acabc-individual", "ACABC — Individual Project", 2_000_000, ["AGRICULTURE_GRADUATE"]],
    ["acabc-successful-individual", "ACABC — Successful Individual Project", 2_500_000, ["AGRICULTURE_GRADUATE"]],
    ["acabc-group-project", "ACABC — Group Project", 10_000_000, ["AGRICULTURE_GRADUATE_GROUP"]],
  ].map(([slug, name, maxAmount, tags]) => scheme({
    slug: String(slug), name: String(name), provider: "MANAGE / NABARD / Participating Banks", category: LoanCategory.TERM_LOAN,
    description: "Credit-linked project finance for trained agri-clinic or agri-business-centre ventures.", minAmount: 100_000, maxAmount: Number(maxAmount),
    projectCategories: ["agriculture-allied", "services", "micro-enterprise"], eligibleApplicantTags: tags as string[], minAge: 18,
    eligibilityCriteria: { training: "ACABC training and project eligibility apply", note: "Displayed ceiling is the subsidy-linked model project cost ceiling" },
    requiredDocuments: [...businessDocuments, "Eligible agriculture qualification", "ACABC training proof"], sourceUrl: acabacUrl,
  })),
  ...[
    ["day-nulm-sep-individual", "DAY-NULM SEP — Individual Enterprise", 200_000, ["URBAN_POOR"]],
    ["day-nulm-sep-group", "DAY-NULM SEP — Group Enterprise", 1_000_000, ["URBAN_POOR_GROUP"]],
    ["day-nulm-shg-bank-linkage", "DAY-NULM — SHG Bank Linkage", 1_000_000, ["SHG_MEMBER", "URBAN_POOR"]],
  ].map(([slug, name, maxAmount, tags]) => scheme({
    slug: String(slug), name: String(name), provider: "DAY-NULM / Participating Banks", category: LoanCategory.MICRO_FINANCE,
    description: "Bank-linked livelihood and enterprise credit for eligible urban-poor applicants.", minAmount: 10_000, maxAmount: Number(maxAmount),
    maxAnnualIncome: 300_000, projectCategories: ["micro-enterprise", "services", "trading", "livelihood"], eligibleApplicantTags: tags as string[], minAge: 18,
    requiredDocuments: businessDocuments, sourceUrl: janSamarthUrl,
  })),
  scheme({
    slug: "shg-micro-finance-140k",
    name: "SHG Micro Finance Loan",
    provider: "Participating Banks and Microfinance Institutions",
    category: LoanCategory.MICRO_FINANCE,
    description: "Small livelihood credit for an eligible self-help-group member.",
    minAmount: 10_000,
    maxAmount: 140_000,
    maxAnnualIncome: 300_000,
    projectCategories: ["micro-enterprise", "agriculture-allied", "livelihood", "services", "trading"],
    eligibleApplicantTags: ["SHG_MEMBER"],
    minAge: 18,
    maxAge: 60,
    requiredDocuments: [...identityDocuments, "SHG membership record"],
    sourceUrl: janSamarthUrl,
  }),

  // National Backward Classes Finance and Development Corporation
  ...[
    ["nbcfdc-term-up-to-5l", "NBCFDC General Term Loan — Up to ₹5 Lakh", 1, 500_000, 6, []],
    ["nbcfdc-term-5l-to-10l", "NBCFDC General Term Loan — ₹5–10 Lakh", 500_001, 1_000_000, 7, []],
    ["nbcfdc-term-10l-to-15l", "NBCFDC General Term Loan — ₹10–15 Lakh", 1_000_001, 1_500_000, 8, []],
    ["nbcfdc-new-swarnima", "NBCFDC New Swarnima for Women", 1, 200_000, 5, [Gender.FEMALE]],
    ["nbcfdc-micro-finance", "NBCFDC Micro Finance Scheme", 1, 125_000, 5, []],
    ["nbcfdc-mahila-samriddhi", "NBCFDC Mahila Samriddhi", 1, 125_000, 4, [Gender.FEMALE]],
  ].map(([slug, name, minAmount, maxAmount, rate, genders]) => scheme({
    slug: String(slug), name: String(name), provider: "NBCFDC / State Channelising Agencies", category: Number(maxAmount) <= 200_000 ? LoanCategory.MICRO_FINANCE : LoanCategory.TERM_LOAN,
    description: "Concessional income-generating credit for eligible members of backward classes.", minAmount: Number(minAmount), maxAmount: Number(maxAmount),
    maxAnnualIncome: 300_000, interestRateMin: Number(rate), interestRateMax: Number(rate), tenureMonthsMax: Number(maxAmount) > 200_000 ? 96 : 48,
    projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied", "livelihood"], eligibleGenders: genders as Gender[], eligibleApplicantTags: ["OBC"], minAge: 18,
    requiredDocuments: [...businessDocuments, "OBC certificate", "Income certificate"], sourceUrl: nbcfdcUrl,
  })),
  ...[
    ["nbcfdc-education-india", "NBCFDC Education Loan — India", 1_500_000, 4],
    ["nbcfdc-education-abroad", "NBCFDC Education Loan — Abroad", 2_000_000, 4],
  ].map(([slug, name, maxAmount, rate]) => scheme({
    slug: String(slug), name: String(name), provider: "NBCFDC / State Channelising Agencies", category: LoanCategory.EDUCATION_LOAN,
    description: "Concessional education finance for an eligible OBC student.", minAmount: 10_000, maxAmount: Number(maxAmount), maxAnnualIncome: 300_000,
    interestRateMin: Number(rate), interestRateMax: Number(rate), tenureMonthsMax: 180,
    projectCategories: String(slug).endsWith("abroad") ? ["higher-education-abroad"] : ["higher-education-india", "vocational-education"], eligibleApplicantTags: ["OBC"],
    requiredDocuments: [...educationDocuments, "OBC certificate", "Income certificate"], sourceUrl: nbcfdcUrl,
  })),

  // National Minorities Development and Finance Corporation
  ...[
    ["nmdfc-term-credit-line-1", "NMDFC Term Loan — Credit Line 1", 2_000_000, 6, 300_000, []],
    ["nmdfc-term-credit-line-2", "NMDFC Term Loan — Credit Line 2", 3_000_000, 8, 800_000, []],
    ["nmdfc-virasat-line-1", "NMDFC Virasat — Credit Line 1", 1_000_000, 5, 300_000, ["ARTISAN"]],
    ["nmdfc-virasat-line-2", "NMDFC Virasat — Credit Line 2", 1_000_000, 6, 800_000, ["ARTISAN"]],
    ["nmdfc-micro-line-1", "NMDFC Micro Finance — Credit Line 1", 100_000, 7, 300_000, []],
    ["nmdfc-micro-line-2", "NMDFC Micro Finance — Credit Line 2", 150_000, 10, 800_000, []],
  ].map(([slug, name, maxAmount, rate, income, extraTags]) => scheme({
    slug: String(slug), name: String(name), provider: "NMDFC / State Channelising Agencies", category: Number(maxAmount) <= 150_000 ? LoanCategory.MICRO_FINANCE : LoanCategory.TERM_LOAN,
    description: "Concessional livelihood finance for an eligible notified-minority applicant.", minAmount: 1, maxAmount: Number(maxAmount), maxAnnualIncome: Number(income),
    interestRateMin: Number(rate), interestRateMax: Number(rate), projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied", "livelihood"],
    eligibleApplicantTags: ["MINORITY", ...(extraTags as string[])], minAge: 18, requiredDocuments: [...businessDocuments, "Minority-community declaration", "Income certificate"], sourceUrl: nmdfcUrl,
  })),
  ...[
    ["nmdfc-education-india-line-1", "NMDFC Education Loan India — Credit Line 1", 2_000_000, 3, 300_000],
    ["nmdfc-education-abroad-line-1", "NMDFC Education Loan Abroad — Credit Line 1", 3_000_000, 3, 300_000],
  ].map(([slug, name, maxAmount, rate, income]) => scheme({
    slug: String(slug), name: String(name), provider: "NMDFC / State Channelising Agencies", category: LoanCategory.EDUCATION_LOAN,
    description: "Concessional education finance under NMDFC Credit Line 1.", minAmount: 10_000, maxAmount: Number(maxAmount), maxAnnualIncome: Number(income),
    interestRateMin: Number(rate), interestRateMax: Number(rate), projectCategories: String(slug).includes("abroad") ? ["higher-education-abroad"] : ["higher-education-india", "vocational-education"],
    eligibleApplicantTags: ["MINORITY"], requiredDocuments: [...educationDocuments, "Minority-community declaration", "Income certificate"], sourceUrl: nmdfcUrl,
  })),

  // National Safai Karamcharis Finance and Development Corporation
  ...[
    ["nskfdc-mahila-samriddhi", "NSKFDC Mahila Samridhi", 100_000, 6, 36, [Gender.FEMALE]],
    ["nskfdc-mahila-adhikarita", "NSKFDC Mahila Adhikarita", 200_000, 7, 60, [Gender.FEMALE]],
    ["nskfdc-micro-credit", "NSKFDC Micro Credit Finance", 100_000, 7, 36, []],
    ["nskfdc-general-term-up-to-10l", "NSKFDC General Term Loan — Up to ₹10 Lakh", 1_000_000, 8, 120, []],
    ["nskfdc-general-term-10l-to-15l", "NSKFDC General Term Loan — ₹10–15 Lakh", 1_500_000, 9, 120, []],
    ["nskfdc-community-toilet", "NSKFDC Community Toilet Project", 2_500_000, 8, 120, []],
  ].map(([slug, name, maxAmount, rate, months, genders]) => scheme({
    slug: String(slug), name: String(name), provider: "NSKFDC / State Channelising Agencies", category: Number(maxAmount) <= 200_000 ? LoanCategory.MICRO_FINANCE : LoanCategory.TERM_LOAN,
    description: "Concessional enterprise or sanitation-infrastructure finance for eligible sanitation workers and dependants.", minAmount: 1, maxAmount: Number(maxAmount),
    interestRateMin: Number(rate), interestRateMax: Number(rate), tenureMonthsMax: Number(months), projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "livelihood"],
    eligibleGenders: genders as Gender[], eligibleApplicantTags: ["SAFAI_KARAMCHARI"], minAge: 18,
    requiredDocuments: [...businessDocuments, "Eligible occupation/dependant certificate"], sourceUrl: nskfdcUrl,
  })),
  ...[
    ["nskfdc-education-india", "NSKFDC Education Loan — India", 1_000_000, 6, "higher-education-india"],
    ["nskfdc-education-abroad", "NSKFDC Education Loan — Abroad", 2_000_000, 7, "higher-education-abroad"],
  ].map(([slug, name, maxAmount, rate, projectCategory]) => scheme({
    slug: String(slug), name: String(name), provider: "NSKFDC / State Channelising Agencies", category: LoanCategory.EDUCATION_LOAN,
    description: "Concessional education finance for an eligible sanitation worker or dependant.", minAmount: 10_000, maxAmount: Number(maxAmount),
    interestRateMin: Number(rate), interestRateMax: Number(rate), tenureMonthsMax: 60, projectCategories: [String(projectCategory)], eligibleApplicantTags: ["SAFAI_KARAMCHARI"],
    eligibilityCriteria: { moratorium: "Course period plus one year", womenRebate: "0.5 percentage point" }, requiredDocuments: [...educationDocuments, "Eligible occupation/dependant certificate"], sourceUrl: nskfdcUrl,
  })),

  // National Divyangjan Finance and Development Corporation
  scheme({
    slug: "ndfdc-divyangjan-swavalamban",
    name: "NDFDC Divyangjan Swavalamban Yojana",
    provider: "NDFDC / State Channelising Agencies",
    category: LoanCategory.TERM_LOAN,
    description: "Concessional self-employment and education-linked finance for eligible persons with disabilities.",
    minAmount: 1,
    maxAmount: 5_000_000,
    projectCategories: ["micro-enterprise", "manufacturing", "services", "trading", "agriculture-allied", "livelihood"],
    eligibleApplicantTags: ["PERSON_WITH_DISABILITY"],
    minAge: 18,
    collateralRequired: true,
    requiredDocuments: [...businessDocuments, "Disability certificate"],
    sourceUrl: ndfdcUrl,
  }),
  scheme({
    slug: "ndfdc-vishesh-microfinance",
    name: "NDFDC Vishesh Microfinance Yojana",
    provider: "NDFDC / Partner Institutions",
    category: LoanCategory.MICRO_FINANCE,
    description: "Small livelihood credit for eligible persons with disabilities through partner institutions.",
    minAmount: 1,
    maxAmount: 60_000,
    projectCategories: ["micro-enterprise", "services", "trading", "agriculture-allied", "livelihood"],
    eligibleApplicantTags: ["PERSON_WITH_DISABILITY"],
    minAge: 18,
    requiredDocuments: [...businessDocuments, "Disability certificate"],
    sourceUrl: ndfdcUrl,
  }),

  // SBI education products and institution-list variants
  ...[
    ["sbi-student-loan-unsecured", "SBI Student Loan — Up to ₹7.5 Lakh", 750_000, false, ["higher-education-india", "vocational-education"]],
    ["sbi-student-loan-secured", "SBI Student Loan — Above ₹7.5 Lakh", 15_000_000, true, ["higher-education-india", "higher-education-abroad"]],
    ["sbi-scholar-loan-list-aa", "SBI Scholar Loan — List AA", 5_000_000, false, ["higher-education-india"]],
    ["sbi-scholar-loan-list-a", "SBI Scholar Loan — List A", 4_000_000, false, ["higher-education-india"]],
    ["sbi-scholar-loan-list-b", "SBI Scholar Loan — List B", 3_000_000, false, ["higher-education-india"]],
    ["sbi-scholar-loan-list-c", "SBI Scholar Loan — List C", 750_000, false, ["higher-education-india"]],
    ["sbi-global-ed-vantage", "SBI Global Ed-Vantage", 30_000_000, true, ["higher-education-abroad"]],
    ["sbi-pm-vidyalaxmi", "SBI PM-Vidyalaxmi Education Loan", 10_000_000, false, ["higher-education-india"]],
  ].map(([slug, name, maxAmount, collateral, categories]) => scheme({
    slug: String(slug), name: String(name), provider: "State Bank of India", category: LoanCategory.EDUCATION_LOAN,
    description: "Education loan for admission to an eligible institution; rate and security depend on product, institution list and amount.", minAmount: 10_000, maxAmount: Number(maxAmount),
    tenureMonthsMax: 180, projectCategories: categories as string[], collateralRequired: Boolean(collateral), eligibilityCriteria: { admission: "Admission to an eligible recognized institution/course", pricing: "Current SBI card rate applies" },
    requiredDocuments: educationDocuments, sourceUrl: sbiEducationUrl,
  })),
];
