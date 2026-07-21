import { z } from "zod";

export const miosalonProfileSchema = z.object({
  name: z.string().optional(),
  customerId: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
  gst: z.string().optional(),
  gender: z.string().optional(),
  dateOfBirth: z.string().optional(),
  anniversary: z.string().optional(),
  customerNote: z.string().optional(),
  sourceUrl: z.string().optional(),
  syncedAt: z.string().optional(),
});

export type MiosalonProfile = z.infer<typeof miosalonProfileSchema>;

export const PROFILE_LABELS: { key: keyof MiosalonProfile; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "customerId", label: "Customer Id" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "gst", label: "GST" },
  { key: "gender", label: "Gender" },
  { key: "dateOfBirth", label: "D.O.B" },
  { key: "anniversary", label: "Anniversary" },
  { key: "customerNote", label: "Customer Note" },
];

export function profileFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): MiosalonProfile | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.miosalonProfile;
  if (!raw || typeof raw !== "object") return null;
  const parsed = miosalonProfileSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
