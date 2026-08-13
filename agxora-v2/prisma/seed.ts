/**
 * Deterministic / idempotent development seed for Phase 42.1 + Phase 43.
 * Seed users get bcrypt password hashes (never plaintext).
 * Never run against production without explicit confirmation.
 */

import { PrismaClient, type MembershipRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_MARK = "phase42_1";
/** Shared seed password for local/dev only — change in real environments. */
export const SEED_PASSWORD = "AgxoraSeed!23";

type SeedUser = {
  readonly email: string;
  readonly name: string;
  readonly externalAuthId: string;
  readonly token: string;
  readonly orgSlug: string;
  readonly orgName: string;
  readonly role: MembershipRole;
};

const USERS: readonly SeedUser[] = [
  {
    email: "owner-a@agxora.dev",
    name: "Owner Alpha",
    externalAuthId: "usr_seed_owner_a",
    token: "seed_token_owner_a_v1",
    orgSlug: "org-alpha",
    orgName: "Alpha Organization",
    role: "OWNER",
  },
  {
    email: "admin-a@agxora.dev",
    name: "Admin Alpha",
    externalAuthId: "usr_seed_admin_a",
    token: "seed_token_admin_a_v1",
    orgSlug: "org-alpha",
    orgName: "Alpha Organization",
    role: "ADMIN",
  },
  {
    email: "member-a@agxora.dev",
    name: "Member Alpha",
    externalAuthId: "usr_seed_member_a",
    token: "seed_token_member_a_v1",
    orgSlug: "org-alpha",
    orgName: "Alpha Organization",
    role: "MEMBER",
  },
  {
    email: "owner-b@agxora.dev",
    name: "Owner Beta",
    externalAuthId: "usr_seed_owner_b",
    token: "seed_token_owner_b_v1",
    orgSlug: "org-beta",
    orgName: "Beta Organization",
    role: "OWNER",
  },
];

async function upsertOrgWorkspace(input: {
  readonly ownerId: string;
  readonly slug: string;
  readonly name: string;
}) {
  const existing = await prisma.organization.findUnique({
    where: { slug: input.slug },
    include: { workspaces: true },
  });
  if (existing) {
    const workspace =
      existing.workspaces.find((w) => w.slug === "default") ??
      (await prisma.workspace.create({
        data: {
          organizationId: existing.id,
          name: "Default",
          slug: "default",
        },
      }));
    return { organization: existing, workspace };
  }

  const organization = await prisma.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
      ownerId: input.ownerId,
      workspaces: {
        create: { name: "Default", slug: "default" },
      },
    },
    include: { workspaces: true },
  });
  return {
    organization,
    workspace: organization.workspaces[0],
  };
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production" && process.env.AGXORA_ALLOW_PROD_SEED !== "1") {
    throw new Error("Refusing to seed production without AGXORA_ALLOW_PROD_SEED=1");
  }

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, 12);
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const orgWorkspace = new Map<
    string,
    { organizationId: string; workspaceId: string; ownerId: string }
  >();

  for (const seed of USERS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      create: {
        email: seed.email,
        name: seed.name,
        externalAuthId: seed.externalAuthId,
        emailVerified: true,
        passwordHash,
      },
      update: {
        name: seed.name,
        externalAuthId: seed.externalAuthId,
        passwordHash,
        emailVerified: true,
      },
    });

    let pair = orgWorkspace.get(seed.orgSlug);
    if (!pair) {
      const created = await upsertOrgWorkspace({
        ownerId: user.id,
        slug: seed.orgSlug,
        name: seed.orgName,
      });
      pair = {
        organizationId: created.organization.id,
        workspaceId: created.workspace.id,
        ownerId: user.id,
      };
      orgWorkspace.set(seed.orgSlug, pair);
    }

    await prisma.membership.upsert({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId: pair.workspaceId,
        },
      },
      create: {
        userId: user.id,
        organizationId: pair.organizationId,
        workspaceId: pair.workspaceId,
        role: seed.role,
        status: "ACTIVE",
      },
      update: {
        role: seed.role,
        status: "ACTIVE",
        organizationId: pair.organizationId,
      },
    });

    await prisma.session.upsert({
      where: { token: seed.token },
      create: {
        userId: user.id,
        token: seed.token,
        expiresAt,
        revokedAt: null,
        activeWorkspaceId: pair.workspaceId,
      },
      update: {
        userId: user.id,
        expiresAt,
        revokedAt: null,
        activeWorkspaceId: pair.workspaceId,
      },
    });
  }

  const alpha = orgWorkspace.get("org-alpha");
  const beta = orgWorkspace.get("org-beta");
  if (!alpha || !beta) throw new Error("Seed orgs missing");

  // Idempotent sample customers (honesty: isSample=true)
  const samples = [
    {
      key: `${SEED_MARK}:alpha:nordic`,
      organizationId: alpha.organizationId,
      workspaceId: alpha.workspaceId,
      companyName: "Nordic Components GmbH",
      contactName: "Elena Vogt",
      email: "elena@nordic-components.example",
      status: "active" as const,
      owner: "Owner Alpha",
      industry: "Manufacturing",
      country: "DE",
      city: "Hamburg",
    },
    {
      key: `${SEED_MARK}:beta:atlas`,
      organizationId: beta.organizationId,
      workspaceId: beta.workspaceId,
      companyName: "Atlas Retail Group",
      contactName: "Samir Haddad",
      email: "samir@atlas-retail.example",
      status: "prospect" as const,
      owner: "Owner Beta",
      industry: "Retail",
      country: "AE",
      city: "Dubai",
    },
  ];

  for (const sample of samples) {
    const existing = await prisma.customer.findFirst({
      where: {
        workspaceId: sample.workspaceId,
        email: sample.email,
        isSample: true,
      },
    });
    if (existing) continue;
    await prisma.customer.create({
      data: {
        organizationId: sample.organizationId,
        workspaceId: sample.workspaceId,
        companyName: sample.companyName,
        contactName: sample.contactName,
        email: sample.email,
        status: sample.status,
        owner: sample.owner,
        industry: sample.industry,
        country: sample.country,
        city: sample.city,
        isSample: true,
        tags: [{ label: "sample", color: "#94a3b8" }],
      },
    });
  }

  console.log("Phase 42.1–44 seed complete (bcrypt passwords, no invitations)");
  console.log(
    JSON.stringify(
      {
        seedPassword: SEED_PASSWORD,
        tokens: USERS.map((u) => ({ email: u.email, token: u.token, role: u.role })),
        orgs: [...orgWorkspace.entries()].map(([slug, v]) => ({
          slug,
          organizationId: v.organizationId,
          workspaceId: v.workspaceId,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
