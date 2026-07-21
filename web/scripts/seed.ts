import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/db/schema";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@drjo.clinic").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(password, 10);

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1);

  if (existing) {
    console.log(`Admin already exists: ${email}`);
  } else {
    await db.insert(schema.users).values({
      email,
      name: "Clinic Admin",
      passwordHash,
      role: "admin",
      clinicId: "drjo-skin-revive",
    });
    console.log(`Created admin: ${email}`);
  }

  const [existingGroup] = await db
    .select()
    .from(schema.fieldGroups)
    .where(eq(schema.fieldGroups.name, "Skin Assessment"))
    .limit(1);

  if (!existingGroup) {
    const [group] = await db
      .insert(schema.fieldGroups)
      .values({
        name: "Skin Assessment",
        description: "Fitzpatrick type, TEWL, sebum, pigmentation",
        displayOrder: 1,
        clinicId: "drjo-skin-revive",
      })
      .returning();

    await db.insert(schema.fieldDefinitions).values([
      {
        groupId: group.id,
        name: "fitzpatrick",
        label: "Fitzpatrick Skin Type",
        type: "select",
        options: ["I", "II", "III", "IV", "V", "VI"],
        displayOrder: 1,
        required: true,
      },
      {
        groupId: group.id,
        name: "primary_concerns",
        label: "Primary Concerns",
        type: "textarea",
        displayOrder: 2,
      },
      {
        groupId: group.id,
        name: "last_assessment_date",
        label: "Last Assessment Date",
        type: "date",
        displayOrder: 3,
      },
    ]);

    await db.insert(schema.fieldGroups).values([
      {
        name: "Laser History",
        description: "Treatment dates, device, energy settings",
        displayOrder: 2,
        clinicId: "drjo-skin-revive",
      },
      {
        name: "Medical Clearance",
        description: "Clearance status and expiry",
        displayOrder: 3,
        clinicId: "drjo-skin-revive",
      },
    ]);

    console.log("Seeded default field groups");
  } else {
    console.log("Field groups already seeded");
  }

  await client.end();
  console.log("Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
