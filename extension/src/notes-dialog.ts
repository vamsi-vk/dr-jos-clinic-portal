/**
 * Notes dialog with TipTap rich-text editor + photo attach.
 * Lazy-created on first open for instant sidebar boot.
 */

import { Editor } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

export type NoteItem = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_PHOTO_EDGE = 1200;
const PHOTO_JPEG_QUALITY = 0.78;

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripHtml(html: string) {
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || "").trim();
}

function hasNoteContent(html: string) {
  if (stripHtml(html)) return true;
  return /<img\b/i.test(html);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read photo"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load photo"));
    img.src = src;
  });
}

/** Resize / re-encode so notes stay reasonably small in the DB. */
async function compressPhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file (JPEG, PNG, or WebP)");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new Error("Photo must be 5 MB or smaller");
  }

  const raw = await readFileAsDataUrl(file);
  const img = await loadImage(raw);
  const scale = Math.min(1, MAX_PHOTO_EDGE / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process photo");
  ctx.drawImage(img, 0, 0, width, height);

  // Keep PNG when transparency likely matters; otherwise JPEG for size.
  if (file.type === "image/png" || file.type === "image/webp") {
    const png = canvas.toDataURL("image/png");
    if (png.length < 1_800_000) return png;
  }
  return canvas.toDataURL("image/jpeg", PHOTO_JPEG_QUALITY);
}

export const notesDialogStyles = `
  .notes-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 8px;
  }
  .notes-toolbar button {
    border: 1px solid #d6d3d1;
    background: #fff;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    color: #44403c;
  }
  .notes-toolbar button.is-active {
    background: #0f766e;
    border-color: #0f766e;
    color: #fff;
  }
  .notes-toolbar button:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .notes-editor {
    min-height: 120px;
    max-height: 240px;
    overflow: auto;
    border: 1px solid #d6d3d1;
    border-radius: 8px;
    padding: 10px;
    font-size: 13px;
    line-height: 1.5;
    background: #fff;
    color: #1c1917;
  }
  .notes-editor:focus { outline: 2px solid rgba(15,118,110,0.25); border-color: #0f766e; }
  .notes-editor p { margin: 0 0 0.5em; }
  .notes-editor ul, .notes-editor ol { margin: 0 0 0.5em; padding-left: 1.25em; }
  .notes-editor img,
  .note-body img {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 8px 0;
    display: block;
    border: 1px solid #e7e5e4;
  }
  .notes-list {
    margin-bottom: 14px;
    border-bottom: 1px solid #e7e5e4;
    padding-bottom: 12px;
    max-height: 220px;
    overflow: auto;
  }
  .notes-list h4 {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #78716c;
  }
  .notes-editor-title {
    margin: 0 0 8px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #78716c;
  }
  .note-item {
    border: 1px solid #e7e5e4;
    border-radius: 8px;
    padding: 10px;
    margin-bottom: 8px;
    background: #fafaf9;
  }
  .note-item .note-meta {
    font-size: 10px;
    color: #a8a29e;
    margin-bottom: 6px;
  }
  .note-item .note-body {
    font-size: 12px;
    color: #1c1917;
    line-height: 1.45;
  }
  .note-item .note-actions {
    margin-top: 8px;
    display: flex;
    gap: 6px;
  }
  .note-item .note-actions button {
    border: 0;
    background: transparent;
    color: #0f766e;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  .notes-status { font-size: 11px; min-height: 14px; margin-top: 8px; color: #78716c; }
  .notes-status.ok { color: #0f766e; }
  .notes-status.err { color: #b91c1c; }
`;

type NotesDialogOpts = {
  shadowRoot: ShadowRoot;
  title: string;
  notes: NoteItem[];
  onSave: (html: string, editingId: string | null) => Promise<NoteItem | null>;
  onClose: () => void;
};

let activeEditor: Editor | null = null;

export function closeNotesDialog(shadowRoot: ShadowRoot) {
  activeEditor?.destroy();
  activeEditor = null;
  shadowRoot.getElementById("modalHost")?.remove();
}

export function openNotesDialog(opts: NotesDialogOpts) {
  const { shadowRoot, title, notes, onSave, onClose } = opts;
  closeNotesDialog(shadowRoot);

  let editingId: string | null = null;
  let localNotes = [...notes];

  const host = document.createElement("div");
  host.id = "modalHost";
  host.innerHTML = `
    <div class="modal-backdrop" id="notesBackdrop">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Notes">
        <h3 class="view-title">Notes — ${esc(title)}</h3>
        <div class="notes-list" id="notesList"></div>
        <h4 class="notes-editor-title">Add Note</h4>
        <div class="notes-toolbar" id="notesToolbar">
          <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
          <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
          <button type="button" data-cmd="bullet" title="Bullet list">• List</button>
          <button type="button" data-cmd="ordered" title="Numbered list">1. List</button>
          <button type="button" data-cmd="photo" title="Add photo">Photo</button>
        </div>
        <input type="file" id="notesPhotoInput" accept="image/jpeg,image/png,image/webp,image/*" hidden />
        <div class="notes-editor" id="notesEditorMount"></div>
        <div class="modal-actions">
          <button type="button" class="modal-btn" id="notesCancel">Close</button>
          <button type="button" class="modal-btn primary" id="notesSave">Save Notes</button>
        </div>
        <p class="notes-status" id="notesStatus"></p>
      </div>
    </div>
  `;
  shadowRoot.appendChild(host);

  const mount = host.querySelector("#notesEditorMount") as HTMLElement;
  const photoInput = host.querySelector("#notesPhotoInput") as HTMLInputElement;
  activeEditor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: {
          class: "note-photo",
        },
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "notes-editor-inner",
        style: "outline:none;min-height:100px;",
      },
    },
    onSelectionUpdate: ({ editor }) => syncToolbar(host, editor),
    onTransaction: ({ editor }) => syncToolbar(host, editor),
  });

  function setStatus(text: string, kind: "" | "ok" | "err" = "") {
    const status = host.querySelector("#notesStatus");
    if (!status) return;
    status.textContent = text;
    status.className = kind ? `notes-status ${kind}` : "notes-status";
  }

  function renderList() {
    const list = host.querySelector("#notesList");
    if (!list) return;
    if (!localNotes.length) {
      list.innerHTML = `<h4>Previous Notes</h4><p class="muted" style="font-size:12px;margin:0">No notes yet.</p>`;
      return;
    }
    list.innerHTML = `
      <h4>Previous Notes</h4>
      ${localNotes
        .map((n) => {
          const when = new Date(n.updatedAt || n.createdAt).toLocaleString();
          const preview = stripHtml(n.content) || (/<img\b/i.test(n.content) ? "(photo)" : "(empty)");
          return `
            <div class="note-item" data-note-id="${esc(n.id)}">
              <div class="note-meta">${esc(when)}</div>
              <div class="note-body">${n.content || esc(preview)}</div>
              <div class="note-actions">
                <button type="button" data-edit="${esc(n.id)}">Edit</button>
              </div>
            </div>
          `;
        })
        .join("")}
    `;
  }

  renderList();

  host.querySelector("#notesToolbar")?.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest("button[data-cmd]") as HTMLButtonElement | null;
    if (!btn || !activeEditor) return;
    const cmd = btn.getAttribute("data-cmd");
    if (cmd === "photo") {
      photoInput.click();
      return;
    }
    const chain = activeEditor.chain().focus();
    if (cmd === "bold") chain.toggleBold().run();
    if (cmd === "italic") chain.toggleItalic().run();
    if (cmd === "bullet") chain.toggleBulletList().run();
    if (cmd === "ordered") chain.toggleOrderedList().run();
  });

  photoInput.addEventListener("change", () => {
    void (async () => {
      const file = photoInput.files?.[0];
      photoInput.value = "";
      if (!file || !activeEditor) return;

      const photoBtn = host.querySelector(
        '#notesToolbar button[data-cmd="photo"]'
      ) as HTMLButtonElement | null;
      if (photoBtn) photoBtn.disabled = true;
      setStatus("Adding photo…");

      try {
        const src = await compressPhoto(file);
        activeEditor
          .chain()
          .focus()
          .setImage({ src, alt: file.name || "Note photo" })
          .run();
        setStatus("Photo added — save to keep it", "ok");
      } catch (err) {
        setStatus(
          err instanceof Error ? err.message : "Could not add photo",
          "err"
        );
      } finally {
        if (photoBtn) photoBtn.disabled = false;
      }
    })();
  });

  host.querySelector("#notesList")?.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest("[data-edit]") as HTMLElement | null;
    if (!btn || !activeEditor) return;
    const id = btn.getAttribute("data-edit");
    const note = localNotes.find((n) => n.id === id);
    if (!note) return;
    editingId = note.id;
    activeEditor.commands.setContent(note.content || "");
    setStatus("Editing note — save to update");
  });

  host.querySelector("#notesCancel")?.addEventListener("click", () => {
    closeNotesDialog(shadowRoot);
    onClose();
  });

  host.querySelector("#notesBackdrop")?.addEventListener("click", (ev) => {
    if (ev.target === host.querySelector("#notesBackdrop")) {
      closeNotesDialog(shadowRoot);
      onClose();
    }
  });

  host.querySelector("#notesSave")?.addEventListener("click", () => {
    void (async () => {
      if (!activeEditor) return;
      const html = activeEditor.getHTML();
      if (!hasNoteContent(html)) {
        setStatus("Write a note or add a photo before saving", "err");
        return;
      }
      const saveBtn = host.querySelector("#notesSave") as HTMLButtonElement;
      saveBtn.disabled = true;
      setStatus("Saving…");
      try {
        const saved = await onSave(html, editingId);
        if (!saved) {
          setStatus("Save failed", "err");
          return;
        }
        if (editingId) {
          localNotes = localNotes.map((n) => (n.id === editingId ? saved : n));
        } else {
          localNotes = [saved, ...localNotes];
        }
        editingId = null;
        activeEditor.commands.clearContent();
        renderList();
        setStatus("Saved", "ok");
      } catch {
        setStatus("Could not save note", "err");
      } finally {
        saveBtn.disabled = false;
      }
    })();
  });
}

function syncToolbar(host: HTMLElement, editor: Editor) {
  host.querySelectorAll("#notesToolbar button[data-cmd]").forEach((btn) => {
    const cmd = btn.getAttribute("data-cmd");
    if (cmd === "photo") return;
    let active = false;
    if (cmd === "bold") active = editor.isActive("bold");
    if (cmd === "italic") active = editor.isActive("italic");
    if (cmd === "bullet") active = editor.isActive("bulletList");
    if (cmd === "ordered") active = editor.isActive("orderedList");
    btn.classList.toggle("is-active", active);
  });
}
