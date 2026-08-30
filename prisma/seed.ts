import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import {
  PrismaClient,
  UserRole,
} from "../src/generated/prisma/client";
import { loanSchemes } from "./loan-schemes";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Set DIRECT_URL or DATABASE_URL before seeding");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// The catalogue is separate so integrity tests never need a database connection.
async function main() {
  // Preserve historical references while keeping superseded generic entries
  // out of the active catalogue.
  await prisma.loanScheme.updateMany({
    where: {
      slug: {
        in: ["model-education-loan-india", "model-education-loan-abroad"],
      },
    },
    data: { isActive: false },
  });

  for (const scheme of loanSchemes) {
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

  console.info(`Seeded ${loanSchemes.length} loan schemes.`);

  // ─── Channel partners (branches) ────────────────────────────────────
  // Prisma cannot write to the Unsupported geography column, so we use
  // raw SQL to upsert channel partners with PostGIS points.

  const channelPartners = [
    {
      id: "cp-sbi-kothrud",
      name: "State Bank of India — Kothrud Branch",
      type: "BANK",
      registrationNumber: "SBI-KOTHRUD-001",
      email: "sbi.kothrud@example.com",
      phone: "020-25380001",
      addressLine: "Kothrud Main Road, Near Dahanukar Colony",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411038",
      serviceRadiusKm: 15,
      fundQuotaAmount: 50_000_000,
      availableFundAmount: 35_000_000,
      npaPercentage: 4.2,
      latitude: 18.5074,
      longitude: 73.8077,
    },
    {
      id: "cp-boi-deccan",
      name: "Bank of India — Deccan Gymkhana",
      type: "BANK",
      registrationNumber: "BOI-DECCAN-002",
      email: "boi.deccan@example.com",
      phone: "020-25650002",
      addressLine: "FC Road, Deccan Gymkhana",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411004",
      serviceRadiusKm: 12,
      fundQuotaAmount: 30_000_000,
      availableFundAmount: 25_000_000,
      npaPercentage: 2.1,
      latitude: 18.5185,
      longitude: 73.8398,
    },
    {
      id: "cp-canara-hadapsar",
      name: "Canara Bank — Hadapsar",
      type: "BANK",
      registrationNumber: "CANARA-HADAPSAR-003",
      email: "canara.hadapsar@example.com",
      phone: "020-26990003",
      addressLine: "Solapur Road, Hadapsar",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411028",
      serviceRadiusKm: 10,
      fundQuotaAmount: 20_000_000,
      availableFundAmount: 5_000_000,
      npaPercentage: 8.5,
      latitude: 18.5018,
      longitude: 73.9260,
    },
    {
      id: "cp-pnb-shivaji",
      name: "Punjab National Bank — Shivajinagar",
      type: "BANK",
      registrationNumber: "PNB-SHIVAJI-004",
      email: "pnb.shivaji@example.com",
      phone: "020-25530004",
      addressLine: "JM Road, Shivajinagar",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411005",
      serviceRadiusKm: 12,
      fundQuotaAmount: 40_000_000,
      availableFundAmount: 32_000_000,
      npaPercentage: 3.0,
      latitude: 18.5314,
      longitude: 73.8446,
    },
    {
      id: "cp-bob-aundh",
      name: "Bank of Baroda — Aundh",
      type: "BANK",
      registrationNumber: "BOB-AUNDH-005",
      email: "bob.aundh@example.com",
      phone: "020-25880005",
      addressLine: "ITI Road, Aundh",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411007",
      serviceRadiusKm: 14,
      fundQuotaAmount: 35_000_000,
      availableFundAmount: 28_000_000,
      npaPercentage: 3.8,
      latitude: 18.5580,
      longitude: 73.8073,
    },
    {
      id: "cp-mfi-warje",
      name: "Janalakshmi Microfinance — Warje",
      type: "MICROFINANCE_INSTITUTION",
      registrationNumber: "MFI-WARJE-006",
      email: "janalakshmi.warje@example.com",
      phone: "020-25230006",
      addressLine: "Warje Malwadi Road",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411058",
      serviceRadiusKm: 8,
      fundQuotaAmount: 8_000_000,
      availableFundAmount: 6_500_000,
      npaPercentage: 5.5,
      latitude: 18.4875,
      longitude: 73.7986,
    },
    {
      id: "cp-nbfc-hinjawadi",
      name: "Bajaj Finance — Hinjawadi",
      type: "NBFC",
      registrationNumber: "NBFC-HINJAWADI-007",
      email: "bajaj.hinjawadi@example.com",
      phone: "020-22930007",
      addressLine: "Phase 1, Hinjawadi IT Park",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411057",
      serviceRadiusKm: 20,
      fundQuotaAmount: 100_000_000,
      availableFundAmount: 75_000_000,
      npaPercentage: 1.8,
      latitude: 18.5912,
      longitude: 73.7390,
    },
    {
      id: "cp-uco-katraj",
      name: "UCO Bank — Katraj",
      type: "BANK",
      registrationNumber: "UCO-KATRAJ-008",
      email: "uco.katraj@example.com",
      phone: "020-24360008",
      addressLine: "Satara Road, Katraj",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411046",
      serviceRadiusKm: 10,
      fundQuotaAmount: 15_000_000,
      availableFundAmount: 2_000_000,
      npaPercentage: 12.0,
      latitude: 18.4575,
      longitude: 73.8556,
    },
    {
      id: "cp-idbi-camp",
      name: "IDBI Bank — Camp",
      type: "BANK",
      registrationNumber: "IDBI-CAMP-009",
      email: "idbi.camp@example.com",
      phone: "020-26160009",
      addressLine: "MG Road, Camp",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411001",
      serviceRadiusKm: 12,
      fundQuotaAmount: 25_000_000,
      availableFundAmount: 20_000_000,
      npaPercentage: 3.5,
      latitude: 18.5196,
      longitude: 73.8780,
    },
    {
      id: "cp-shg-bibwewadi",
      name: "Swayam Sahayata SHG — Bibwewadi",
      type: "SELF_HELP_GROUP",
      registrationNumber: "SHG-BIBWEWADI-010",
      email: "swayam.bibwewadi@example.com",
      phone: "020-24220010",
      addressLine: "Bibwewadi Road, Near Market Yard",
      district: "Pune",
      state: "Maharashtra",
      pincode: "411037",
      serviceRadiusKm: 5,
      fundQuotaAmount: 3_000_000,
      availableFundAmount: 2_800_000,
      npaPercentage: 1.2,
      latitude: 18.4823,
      longitude: 73.8595,
    },
  ];

  for (const cp of channelPartners) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO channel_partners (
        id, name, type, registration_number, email, phone,
        address_line, district, state, pincode,
        service_radius_km, fund_quota_amount, available_fund_amount,
        npa_percentage, health_updated_at,
        is_verified, is_active, created_at, updated_at, location
      ) VALUES (
        $1, $2, $3::\"ChannelPartnerType\", $4, $5, $6,
        $7, $8, $9, $10,
        $11, $12, $13,
        $14, NOW(),
        TRUE, TRUE, NOW(), NOW(),
        ST_SetSRID(ST_MakePoint($16, $15), 4326)::geography
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        registration_number = EXCLUDED.registration_number,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        address_line = EXCLUDED.address_line,
        district = EXCLUDED.district,
        state = EXCLUDED.state,
        pincode = EXCLUDED.pincode,
        service_radius_km = EXCLUDED.service_radius_km,
        fund_quota_amount = EXCLUDED.fund_quota_amount,
        available_fund_amount = EXCLUDED.available_fund_amount,
        npa_percentage = EXCLUDED.npa_percentage,
        health_updated_at = NOW(),
        updated_at = NOW(),
        location = EXCLUDED.location`,
      cp.id,
      cp.name,
      cp.type,
      cp.registrationNumber,
      cp.email,
      cp.phone,
      cp.addressLine,
      cp.district,
      cp.state,
      cp.pincode,
      cp.serviceRadiusKm,
      cp.fundQuotaAmount,
      cp.availableFundAmount,
      cp.npaPercentage,
      cp.latitude,
      cp.longitude,
    );
  }

  console.info(`Seeded ${channelPartners.length} channel partners.`);
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
