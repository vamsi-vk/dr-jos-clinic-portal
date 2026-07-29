/**
 * Notes dialog with TipTap rich-text editor.
 * Lazy-created on first open for instant sidebar boot.
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

export type NoteItem = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

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
  .notes-editor {
    min-height: 120px;
    max-height: 200px;
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
        </div>
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
  activeEditor = new Editor({
    element: mount,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
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
          const preview = stripHtml(n.content) || "(empty)";
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
    const chain = activeEditor.chain().focus();
    if (cmd === "bold") chain.toggleBold().run();
    if (cmd === "italic") chain.toggleItalic().run();
    if (cmd === "bullet") chain.toggleBulletList().run();
    if (cmd === "ordered") chain.toggleOrderedList().run();
  });

  host.querySelector("#notesList")?.addEventListener("click", (ev) => {
    const btn = (ev.target as HTMLElement).closest("[data-edit]") as HTMLElement | null;
    if (!btn || !activeEditor) return;
    const id = btn.getAttribute("data-edit");
    const note = localNotes.find((n) => n.id === id);
    if (!note) return;
    editingId = note.id;
    activeEditor.commands.setContent(note.content || "");
    const status = host.querySelector("#notesStatus");
    if (status) {
      status.textContent = "Editing note — save to update";
      status.className = "notes-status";
    }
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
      if (!stripHtml(html)) {
        const status = host.querySelector("#notesStatus");
        if (status) {
          status.textContent = "Write a note before saving";
          status.className = "notes-status err";
        }
        return;
      }
      const saveBtn = host.querySelector("#notesSave") as HTMLButtonElement;
      saveBtn.disabled = true;
      const status = host.querySelector("#notesStatus");
      if (status) {
        status.textContent = "Saving…";
        status.className = "notes-status";
      }
      try {
        const saved = await onSave(html, editingId);
        if (!saved) {
          if (status) {
            status.textContent = "Save failed";
            status.className = "notes-status err";
          }
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
        if (status) {
          status.textContent = "Saved";
          status.className = "notes-status ok";
        }
      } catch {
        if (status) {
          status.textContent = "Could not save note";
          status.className = "notes-status err";
        }
      } finally {
        saveBtn.disabled = false;
      }
    })();
  });
}

function syncToolbar(host: HTMLElement, editor: Editor) {
  host.querySelectorAll("#notesToolbar button[data-cmd]").forEach((btn) => {
    const cmd = btn.getAttribute("data-cmd");
    let active = false;
    if (cmd === "bold") active = editor.isActive("bold");
    if (cmd === "italic") active = editor.isActive("italic");
    if (cmd === "bullet") active = editor.isActive("bulletList");
    if (cmd === "ordered") active = editor.isActive("orderedList");
    btn.classList.toggle("is-active", active);
  });
}
