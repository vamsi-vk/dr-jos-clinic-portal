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

/** Extended patient profile keyed on external customer ID */
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

/** Clinic / company profile (one row per clinicId) */
export const clinics = pgTable("clinics", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  logoKey: text("logo_key"),
  logoUrl: text("logo_url"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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
export const formTemplates = pgTable(
  "form_templates",
  {
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
    /** Public share token for QR / unauthenticated form page */
    publicToken: text("public_token"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    publicTokenIdx: index("form_templates_public_token_idx").on(t.publicToken),
  })
);

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
    patientId: uuid("patient_id").references(() => patients.id),
    templateId: uuid("template_id")
      .notNull()
      .references(() => formTemplates.id),
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),
    staffId: uuid("staff_id").references(() => users.id),
    /** Active host-page context captured from localStorage */
    networkId: text("network_id"),
    storeId: text("store_id"),
    activeUserId: text("active_user_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    patientIdx: index("form_submissions_patient_idx").on(t.patientId),
    patientTemplateIdx: index("form_submissions_patient_template_idx").on(
      t.patientId,
      t.templateId
    ),
    networkIdx: index("form_submissions_network_idx").on(t.networkId),
    storeIdx: index("form_submissions_store_idx").on(t.storeId),
  })
);

/** Staff notes for a customer, optionally linked to a form (per network/store) */
export const formNotes = pgTable(
  "form_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    templateId: uuid("template_id").references(() => formTemplates.id),
    networkId: text("network_id").notNull(),
    storeId: text("store_id").notNull(),
    activeUserId: text("active_user_id").notNull(),
    content: text("content").notNull().default(""),
    staffId: uuid("staff_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    patientFormNetworkIdx: index("form_notes_patient_form_network_idx").on(
      t.patientId,
      t.templateId,
      t.networkId,
      t.storeId
    ),
    patientNetworkIdx: index("form_notes_patient_network_idx").on(
      t.patientId,
      t.networkId,
      t.storeId
    ),
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
