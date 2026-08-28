import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import {
  Gender,
  LoanCategory,
  Prisma,
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DIRECT_URL or DATABASE_URL before seeding");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const commonDocuments = [
  "Aadhaar card",
  "PAN card",
  "Bank statements",
  "Income proof",
];

const schemes = [
  {
    slug: "shg-micro-finance-140k",
    name: "SHG Micro Finance Loan",
    provider: "Participating Banks and Microfinance Institutions",
    category: LoanCategory.MICRO_FINANCE,
    description:
      "Collateral-free livelihood credit for eligible low-income borrowers and self-help-group members.",
    minAmount: 10_000,
    maxAmount: 140_000,
    maxAnnualIncome: 300_000,
    interestRateMin: 12,
    interestRateMax: 24,
    tenureMonthsMin: 6,
    tenureMonthsMax: 36,
    projectCategories: [
      "micro-enterprise",
      "agriculture-allied",
      "livelihood",
    ],
    eligibleTrades: [
      "tailoring",
      "handicrafts",
      "dairy",
      "food processing",
      "street vending",
    ],
    eligibleGenders: [Gender.FEMALE, Gender.TRANSGENDER],
    collateralRequired: false,
    eligibilityCriteria: {
      age: { min: 18, max: 60 },
      residency: "India",
      borrowerType: ["individual", "self-help group member"],
    },
    requiredDocuments: [...commonDocuments, "SHG membership record (if applicable)"],
  },
  {
    slug: "pmmyp-kishor-term-loan",
    name: "Pradhan Mantri MUDRA Yojana — Kishor",
    provider: "MUDRA / Participating Lending Institutions",
    category: LoanCategory.TERM_LOAN,
    description:
      "Business term finance for non-corporate, non-farm micro enterprises that are establishing or expanding operations.",
    minAmount: 50_001,
    maxAmount: 500_000,
    tenureMonthsMin: 12,
    tenureMonthsMax: 60,
    projectCategories: ["manufacturing", "services", "trading"],
    eligibleTrades: [
      "repair services",
      "retail",
      "transport",
      "food processing",
      "artisan",
    ],
    eligibleGenders: [],
    collateralRequired: false,
    eligibilityCriteria: {
      enterpriseType: "non-corporate, non-farm micro enterprise",
      stage: ["establishment", "expansion"],
    },
    requiredDocuments: [...commonDocuments, "Business plan", "Business registration proof"],
    sourceUrl: "https://www.mudra.org.in/",
  },
  {
    slug: "pmegp-manufacturing-term-loan",
    name: "PMEGP Manufacturing Project Finance",
    provider: "KVIC / Participating Banks",
    category: LoanCategory.TERM_LOAN,
    description:
      "Credit-linked finance for a new micro-enterprise manufacturing project under PMEGP.",
    minAmount: 100_000,
    maxAmount: 5_000_000,
    tenureMonthsMin: 36,
    tenureMonthsMax: 84,
    projectCategories: ["manufacturing", "micro-enterprise"],
    eligibleTrades: [
      "agro processing",
      "textiles",
      "wood products",
      "engineering works",
      "recycling",
    ],
    eligibleGenders: [],
    collateralRequired: true,
    eligibilityCriteria: {
      age: { min: 18 },
      enterprise: "new unit only",
      note: "Bank finance and margin-money subsidy depend on applicant category and location.",
    },
    requiredDocuments: [
      ...commonDocuments,
      "Detailed project report",
      "Education or skill certificate where applicable",
    ],
    sourceUrl: "https://www.kviconline.gov.in/pmegpeportal/",
  },
  {
    slug: "model-education-loan-india",
    name: "Model Education Loan — Study in India",
    provider: "Indian Banks' Association / Participating Banks",
    category: LoanCategory.EDUCATION_LOAN,
    description:
      "Education finance for tuition, hostel, books, equipment, and other eligible costs at a recognized Indian institution.",
    minAmount: 50_000,
    maxAmount: 1_000_000,
    interestRateMin: 8.5,
    interestRateMax: 12.5,
    tenureMonthsMin: 60,
    tenureMonthsMax: 180,
    projectCategories: ["higher-education-india", "vocational-education"],
    eligibleTrades: [],
    eligibleGenders: [],
    collateralRequired: false,
    eligibilityCriteria: {
      admission: "secured admission to a recognized course/institution",
      coBorrower: "parent or guardian generally required",
    },
    requiredDocuments: [
      "Aadhaar card",
      "Academic records",
      "Admission letter",
      "Fee structure",
      "Co-borrower income proof",
      "Bank statements",
    ],
    sourceUrl: "https://www.vidyalakshmi.co.in/",
  },
  {
    slug: "model-education-loan-abroad",
    name: "Model Education Loan — Study Abroad",
    provider: "Participating Banks",
    category: LoanCategory.EDUCATION_LOAN,
    description:
      "Education finance for an eligible degree or professional course at a recognized overseas institution.",
    minAmount: 500_000,
    maxAmount: 2_000_000,
    interestRateMin: 9,
    interestRateMax: 13.5,
    tenureMonthsMin: 60,
    tenureMonthsMax: 180,
    projectCategories: ["higher-education-abroad"],
    eligibleTrades: [],
    eligibleGenders: [],
    collateralRequired: true,
    eligibilityCriteria: {
      admission: "secured admission to a recognized overseas institution",
      coBorrower: "creditworthy co-borrower generally required",
      note: "Collateral and margin requirements vary by lender and amount.",
    },
    requiredDocuments: [
      "Aadhaar card",
      "Passport",
      "Academic records",
      "Admission letter",
      "Fee structure",
      "Co-borrower income proof",
      "Bank statements",
    ],
    sourceUrl: "https://www.vidyalakshmi.co.in/",
  },
] satisfies Prisma.LoanSchemeCreateInput[];

async function main() {
  for (const scheme of schemes) {
    await prisma.loanScheme.upsert({
      where: { slug: scheme.slug },
      update: scheme,
      create: scheme,
    });
  }

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    if (adminPassword.length < 12) {
      throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters");
    }
    const adminPasswordHash = await hash(adminPassword, 12);
    await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
        isActive: true,
      },
      create: {
        email: adminEmail,
        name: "Development Admin",
        passwordHash: adminPasswordHash,
        role: UserRole.ADMIN,
      },
    });
    console.info(`Seeded development admin ${adminEmail}.`);
  }

  console.info(`Seeded ${schemes.length} loan schemes.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
