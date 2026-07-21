import { redirect } from "next/navigation";

/** Legacy URL — single entry is the home page */
export default function LoginPage() {
  redirect("/");
}
