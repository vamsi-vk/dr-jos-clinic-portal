"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateClientDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [customerId, setCustomerId] = useState("");

  function reset() {
    setName("");
    setMobile("");
    setEmail("");
    setGender("");
    setCustomerId("");
    setError(null);
  }

  function close() {
    if (saving) return;
    setOpen(false);
    reset();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!customerId.trim()) {
      setError("Customer ID is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim(),
          email: email.trim(),
          gender,
          customerId: customerId.trim(),
        }),
      });
      const json = (await res.json().catch(() => null)) as
        | { error?: string; miosalonPatientId?: string }
        | null;
      if (!res.ok) {
        setError(json?.error ?? "Could not create client.");
        return;
      }
      const id = json?.miosalonPatientId;
      setOpen(false);
      reset();
      if (id) {
        router.push(`/dashboard/patients/${encodeURIComponent(id)}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } catch {
      setError("Could not create client. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <span className="text-base leading-none">+</span>
        New Client
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <form
            onSubmit={submit}
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
          >
            <div className="border-b border-gray-100 px-6 py-4">
              <p className="text-base font-bold text-gray-900">New Client</p>
              <p className="mt-0.5 text-xs text-gray-400">
                Create a record here — no MioSalon sync required
              </p>
            </div>

            <div className="space-y-4 px-6 py-5">
              <Field label="Name *" value={name} onChange={setName} placeholder="Client full name" autoFocus />
              <Field label="Phone" value={mobile} onChange={setMobile} placeholder="Mobile number" type="tel" />
              <Field label="Email" value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-500">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">Select</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <Field
                label="Customer ID *"
                value={customerId}
                onChange={setCustomerId}
                placeholder="e.g. JSR3366"
              />
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Creating…" : "Create client"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-gray-500">{label}</label>
      <input
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
      />
    </div>
  );
}
