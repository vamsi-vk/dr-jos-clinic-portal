import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

/** Extended patient profile keyed on MioSalon patient ID */
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    miosalonPatientId: text("miosalon_patient_id").notNull(),
    clinicId: text("clinic_id").notNull().default("drjo-skin-revive"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    miosalonIdx: index("patients_miosalon_id_idx").on(t.miosalonPatientId),
    clinicPatientIdx: index("patients_clinic_patient_idx").on(t.clinicId, t.miosalonPatientId),
  })
);

/** Staff users for admin portal login */
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("staff"), // staff | admin
  clinicId: text("clinic_id").notNull().default("drjo-skin-revive"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Intake form template definitions */
export const formTemplates = pgTable("form_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  clinicId: text("clinic_id").notNull().default("drjo-skin-revive"),
  name: text("name").notNull(),
  description: text("description"),
  fields: jsonb("fields")
    .$type<FormField[]>()
    .notNull()
    .default([]),
  version: integer("version").notNull().default(1),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type FormField = {
  id: string;
  name: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "decimal"
    | "select"
    | "multiselect"
    | "date"
    | "daterange"
    | "boolean"
    | "signature"
    | "section";
  options?: string[];
  required?: boolean;
  displayOrder: number;
};

/** Submitted intake forms per patient */
export const formSubmissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    staffId: uuid("staff_id").references(() => users.id),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    patientIdx: index("form_submissions_patient_idx").on(t.patientId),
  })
);

/** Custom field group definitions (e.g. Skin Assessment, Laser History) */
export const fieldGroups = pgTable("field_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  clinicId: text("clinic_id").notNull().default("drjo-skin-revive"),
  name: text("name").notNull(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Field specs within a group */
export const fieldDefinitions = pgTable(
  "field_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => fieldGroups.id),
    name: text("name").notNull(),
    label: text("label").notNull(),
    type: text("type").notNull(), // text | textarea | number | select | multiselect | date | boolean | signature
    options: jsonb("options").$type<string[]>().default([]),
    required: boolean("required").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
  },
  (t) => ({
    groupIdx: index("field_definitions_group_idx").on(t.groupId),
  })
);

/** Actual field values per patient per field */
export const fieldValues = pgTable(
  "field_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    fieldId: uuid("field_id")
      .notNull()
      .references(() => fieldDefinitions.id),
    value: jsonb("value").$type<unknown>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id),
  },
  (t) => ({
    patientFieldIdx: index("field_values_patient_field_idx").on(t.patientId, t.fieldId),
  })
);

/** Digital signature blobs linked to form submission */
export const signatures = pgTable("signatures", {
  id: uuid("id").defaultRandom().primaryKey(),
  submissionId: uuid("submission_id")
    .notNull()
    .references(() => formSubmissions.id),
  blobUrl: text("blob_url").notNull(),
  signedAt: timestamp("signed_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Append-only audit log */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tableName: text("table_name").notNull(),
    recordId: text("record_id").notNull(),
    staffId: uuid("staff_id").references(() => users.id),
    action: text("action").notNull(), // create | update
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    recordIdx: index("audit_log_record_idx").on(t.tableName, t.recordId),
  })
);
