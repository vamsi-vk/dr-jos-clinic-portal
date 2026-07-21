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

type TemplatePayload = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  fields: FormField[];
};

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
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-white p-3 ${
        selected ? "border-teal-600 ring-1 ring-teal-600" : "border-stone-200"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 cursor-grab touch-none rounded px-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          ⋮⋮
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-stone-900">{field.label}</p>
          <p className="text-xs text-stone-500">
            {field.type}
            {field.required ? " · required" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="text-xs text-red-700 hover:underline"
        >
          Remove
        </button>
      </div>
      {selected && field.type !== "section" && (
        <div className="mt-3 space-y-2 border-t border-stone-100 pt-3" onClick={(e) => e.stopPropagation()}>
          <label className="block text-xs font-medium text-stone-600">
            Label
            <input
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
              value={field.label}
              onChange={(e) => onChange({ ...field, label: e.target.value })}
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Field name (JSON key)
            <input
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 font-mono text-sm"
              value={field.name}
              onChange={(e) =>
                onChange({
                  ...field,
                  name: e.target.value.replace(/\s/g, "_").toLowerCase(),
                })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-stone-600">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) => onChange({ ...field, required: e.target.checked })}
            />
            Required
          </label>
          {field.type === "select" && (
            <label className="block text-xs font-medium text-stone-600">
              Options (one per line)
              <textarea
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
                rows={3}
                value={(field.options ?? []).join("\n")}
                onChange={(e) =>
                  onChange({
                    ...field,
                    options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </label>
          )}
        </div>
      )}
      {selected && field.type === "section" && (
        <div className="mt-3 border-t border-stone-100 pt-3" onClick={(e) => e.stopPropagation()}>
          <label className="block text-xs font-medium text-stone-600">
            Section title
            <input
              className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
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
    setMessage("Saved — extension will load this template when active.");
    router.refresh();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-stone-900">Add field</h2>
        <p className="mt-1 text-xs text-stone-500">Click to add, drag to reorder</p>
        <ul className="mt-4 space-y-1">
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <li key={opt.type}>
              <button
                type="button"
                onClick={() => addField(opt.type)}
                className="w-full rounded-md border border-stone-200 px-3 py-2 text-left text-sm hover:border-teal-400 hover:bg-teal-50"
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="space-y-4">
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <label className="block text-sm font-medium text-stone-700">
            Form name
            <input
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-sm font-medium text-stone-700">
            Description
            <input
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Active (show in Chrome extension)
          </label>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {fields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
                  Add fields from the left panel
                </p>
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
                      setFields((prev) => normalizeFieldOrder(prev.filter((x) => x.id !== field.id)));
                      if (selectedId === field.id) setSelectedId(null);
                    }}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || !name.trim()}
            className="rounded-md bg-teal-800 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-900 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save form"}
          </button>
          {message && <p className="text-sm text-teal-800">{message}</p>}
        </div>
      </div>
    </div>
  );
}
