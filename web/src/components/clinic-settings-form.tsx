"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type ClinicSettings = {
  id: string;
  name: string;
  logoUrl: string | null;
};

export function ClinicSettingsForm({ initial }: { initial: ClinicSettings }) {
  const [name, setName] = useState(initial.name);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl);
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function saveName() {
    setSavingName(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/clinic", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "Could not save", kind: "err" });
        return;
      }
      setName(data.clinic.name);
      setMessage({ text: "Company name saved", kind: "ok" });
    } catch {
      setMessage({ text: "Could not reach server", kind: "err" });
    } finally {
      setSavingName(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploading(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.append("logo", file);
      const res = await fetch("/api/settings/clinic/logo", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "Upload failed", kind: "err" });
        return;
      }
      setLogoUrl(data.clinic.logoUrl ?? null);
      setMessage({ text: "Company logo uploaded", kind: "ok" });
    } catch {
      setMessage({ text: "Upload failed — check your connection", kind: "err" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeLogo() {
    if (!logoUrl) return;
    setRemoving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/clinic/logo", {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "Could not remove logo", kind: "err" });
        return;
      }
      setLogoUrl(null);
      setMessage({ text: "Logo removed", kind: "ok" });
    } catch {
      setMessage({ text: "Could not reach server", kind: "err" });
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Company profile"
          description="Your clinic name and logo appear in the dashboard sidebar and on shared forms."
        />
        <CardBody className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="clinic-name" className="text-sm font-medium text-foreground">
              Company name
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                id="clinic-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
                maxLength={120}
              />
              <Button
                type="button"
                loading={savingName}
                onClick={() => void saveName()}
                disabled={!name.trim()}
              >
                Save name
              </Button>
            </div>
          </div>

          <div className="space-y-3 border-t border-border pt-6">
            <p className="text-sm font-medium text-foreground">Company logo</p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/40">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={`${name} logo`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-2xl font-bold text-muted-foreground">
                    {name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadLogo(file);
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    loading={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload logo
                  </Button>
                  {logoUrl ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-danger hover:text-danger"
                      loading={removing}
                      onClick={() => void removeLogo()}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, WebP, or SVG · max 2 MB · stored in Cloudflare R2
                </p>
              </div>
            </div>
          </div>

          {message ? (
            <p
              className={`text-sm ${
                message.kind === "ok" ? "text-accent" : "text-danger"
              }`}
            >
              {message.text}
            </p>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
