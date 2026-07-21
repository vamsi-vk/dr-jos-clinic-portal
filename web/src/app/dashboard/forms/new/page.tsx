import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/db";
import { formTemplates } from "@/db/schema";

export default async function NewFormPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/");

  const clinicId = session.user.clinicId ?? "drjo-skin-revive";

  const [template] = await db
    .insert(formTemplates)
    .values({
      clinicId,
      name: "Untitled form",
      description: "",
      active: true,
      fields: [],
    })
    .returning();

  redirect(`/dashboard/forms/${template.id}`);
}
