import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">This URL does not exist in the admin portal.</p>
      <Link href="/dashboard" className="mt-6">
        <Button>Go to dashboard</Button>
      </Link>
    </main>
  );
}
