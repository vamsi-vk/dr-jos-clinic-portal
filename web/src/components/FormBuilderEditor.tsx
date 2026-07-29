"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { FormField } from "@/db/schema";
import { FIELD_TYPE_OPTIONS, newField, normalizeFieldOrder } from "@/lib/form-builder";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconPlus } from "@/components/ui/icons";

type TemplatePayload = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  fields: FormField[];
};

const inputClass =
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/20";

function SortableFieldRow({
  field,
  selected,
  onSelect,
  onChange,
  onRemove,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onChange: (f: FormField) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3.5 transition ${
        selected
          ? "border-accent shadow-glow ring-1 ring-accent"
          : "border-border hover:border-[color-mix(in_srgb,var(--accent)_30%,var(--border))]"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none rounded-md px-1.5 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{field.label}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge>{field.type}</Badge>
            {field.required ? <Badge tone="warning">required</Badge> : null}
          </div>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-xs font-medium text-danger hover:underline"
        >
          Remove
        </button>
      </div>
      {selected && field.type !== "section" && (
        <div
          className="mt-3 space-y-2.5 border-t border-border pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="block text-xs font-medium text-muted-foreground">
            Label
            <input
              className={inputClass}
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-muted-foreground">
            Field name (JSON key)
            <input
              className={`${inputClass} font-mono`}
              value={field.name}
              onChange={(e) =>
                onChange({
                  ...field,
                  name: e.target.value.replace(/\s/g, "_").toLowerCase(),
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
              className="rounded border-input text-accent focus:ring-accent"
            />
            Required
          </label>
          {field.type === "select" && (
            <label className="block text-xs font-medium text-muted-foreground">
              Options (one per line)
              <textarea
                className={inputClass}
                rows={3}
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: e.target.value
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </label>
          )}
        </div>
      )}
      {selected && field.type === "section" && (
        <div
          className="mt-3 border-t border-border pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          <label className="block text-xs font-medium text-muted-foreground">
            Section title
            <input
              className={inputClass}
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export function FormBuilderEditor({ initial }: { initial: TemplatePayload }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description ?? "");
  const [active, setActive] = useState(initial.active);
  const [fields, setFields] = useState<FormField[]>(
    [...initial.fields].sort((a, b) => a.displayOrder - b.displayOrder)
  );
  const [selectedId, setSelectedId] = useState<string | null>(fields[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFields((items) => {
      const oldIndex = items.findIndex((f) => f.id === active.id);
      const newIndex = items.findIndex((f) => f.id === over.id);
      return normalizeFieldOrder(arrayMove(items, oldIndex, newIndex));
    });
  }, []);

  function addField(type: FormField["type"]) {
    const f = newField(type, fields.length);
    setFields((prev) => normalizeFieldOrder([...prev, f]));
    setSelectedId(f.id);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    const payload = {
      name,
      description: description || null,
      active,
      fields: normalizeFieldOrder(fields),
    };
    const res = await fetch(`/api/form-templates/${initial.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      setMessage("Save failed");
      return;
    }
    setMessage("Saved — active forms appear in the extension QR flow.");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <Card className="h-fit lg:sticky lg:top-20">
        <CardHeader
          title="Add field"
          description="Click to add, then drag to reorder"
        />
        <CardBody className="!pt-0">
          <ul className="space-y-1.5">
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <li key={opt.type}>
                <button
                  type="button"
                  onClick={() => addField(opt.type)}
                  className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm text-foreground transition hover:border-accent hover:bg-accent-muted"
                >
                  <IconPlus size={14} className="text-accent" />
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardBody className="space-y-3">
            <label className="block text-sm font-medium text-foreground">
              Form name
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="block text-sm font-medium text-foreground">
              Description
              <input
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="rounded border-input text-accent focus:ring-accent"
              />
              Active (show in Chrome extension)
            </label>
          </CardBody>
        </Card>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card/50 px-6 py-12 text-center text-sm text-muted-foreground">
                  Add fields from the left panel to start building this form.
                </div>
              ) : (
                fields.map((field) => (
                  <SortableFieldRow
                    key={field.id}
                    field={field}
                    selected={field.id === selectedId}
                    onSelect={() => setSelectedId(field.id)}
                    onChange={(f) =>
                      setFields((prev) => prev.map((x) => (x.id === f.id ? f : x)))
                    }
                    onRemove={() => {
                      setFields((prev) =>
                        normalizeFieldOrder(prev.filter((x) => x.id !== field.id))
                      );
                      if (selectedId === field.id) setSelectedId(null);
                    }}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={save}
            disabled={!name.trim()}
            loading={saving}
          >
            Save form
          </Button>
          {message ? (
            <p
              className={`text-sm ${
                message.startsWith("Save failed") ? "text-danger" : "text-accent"
              }`}
            >
              {message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
