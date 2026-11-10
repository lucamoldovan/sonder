"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, Check, ChevronDown, ChevronRight, Code2, FilePlus2, Heart, List, ListOrdered, LoaderCircle, MoreHorizontal, Plus, Quote, Search, Trash2, Type, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { apiRequest } from "@/lib/api";
import type { ApiLifeArea, ApiList, ApiNote, ApiProject } from "@/lib/api";
import type { NoteBlock } from "@sonder/contracts";

type BlockType = NoteBlock["type"];
type SaveState = "saved" | "saving" | "unsaved" | "error";

const blockTools: { type: BlockType; label: string; icon: typeof Type }[] = [
  { type: "paragraph", label: "Text", icon: Type },
  { type: "heading1", label: "Heading 1", icon: Type },
  { type: "heading2", label: "Heading 2", icon: Type },
  { type: "bullet", label: "Bulleted list", icon: List },
  { type: "numbered", label: "Numbered list", icon: ListOrdered },
  { type: "todo", label: "To-do", icon: Check },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "code", label: "Code", icon: Code2 },
  { type: "divider", label: "Divider", icon: MoreHorizontal }
];

function newBlock(type: BlockType = "paragraph"): NoteBlock {
  return { id: crypto.randomUUID(), type, text: "", ...(type === "todo" ? { checked: false } : {}) };
}

function blockPlaceholder(type: BlockType) {
  if (type === "heading1") return "Heading 1";
  if (type === "heading2") return "Heading 2";
  if (type === "bullet") return "List item";
  if (type === "numbered") return "List item";
  if (type === "todo") return "To-do";
  if (type === "quote") return "Write a quote...";
  if (type === "code") return "Write code...";
  return "Start writing, or type '/' for a block...";
}

export default function NotesPage() {
  const { data: session, isPending } = authClient.useSession();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [areas, setAreas] = useState<ApiLifeArea[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📝");
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [tagsText, setTagsText] = useState("");
  const [lifeAreaId, setLifeAreaId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showFavorites, setShowFavorites] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [noteResult, areaResult, projectResult] = await Promise.all([
        apiRequest<ApiList<ApiNote[]>>("/notes"),
        apiRequest<ApiList<ApiLifeArea[]>>("/life-areas"),
        apiRequest<ApiList<ApiProject[]>>("/projects")
      ]);
      setNotes(noteResult.data);
      setAreas(areaResult.data);
      setProjects(projectResult.data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't load your notes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.id) void load();
  }, [session?.user?.id, load]);

  const selected = notes.find(note => note.id === selectedId) || null;

  const openNote = (note: ApiNote) => {
    setSelectedId(note.id);
    setTitle(note.title);
    setIcon(note.icon || "📝");
    setBlocks(note.content?.length ? note.content : [newBlock()]);
    setTagsText((note.tags || []).join(", "));
    setLifeAreaId(note.lifeAreaId || "");
    setProjectId(note.projectId || "");
    setParentId(note.parentId);
    setDirty(false);
    setSaveState("saved");
    setError("");
    setMobileSidebar(false);
  };

  const createNote = async (parent: string | null = null) => {
    try {
      const result = await apiRequest<ApiList<ApiNote>>("/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled", content: [newBlock()], parentId: parent })
      });
      setShowArchived(false);
      setShowFavorites(false);
      setNotes(current => [result.data, ...current.filter(note => !note.archivedAt)]);
      setExpanded(current => parent ? [...new Set([...current, parent])] : current);
      openNote(result.data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't create the page.");
    }
  };

  const markDirty = () => {
    setDirty(true);
    setSaveState("unsaved");
  };

  const updateBlock = (id: string, changes: Partial<NoteBlock>) => {
    setBlocks(current => current.map(block => block.id === id ? { ...block, ...changes } : block));
    markDirty();
  };

  const addBlock = (type: BlockType) => {
    setBlocks(current => [...current, newBlock(type)]);
    markDirty();
  };

  const removeBlock = (id: string) => {
    setBlocks(current => current.length > 1 ? current.filter(block => block.id !== id) : [newBlock()]);
    markDirty();
  };

  useEffect(() => {
    if (!dirty || !selectedId) return;
    const timer = window.setTimeout(async () => {
      setSaveState("saving");
      try {
        const result = await apiRequest<ApiList<ApiNote>>("/notes/" + selectedId, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim() || "Untitled",
            icon,
            content: blocks,
            tags: tagsText.split(",").map(tag => tag.trim()).filter(Boolean).slice(0, 20),
            lifeAreaId: lifeAreaId || null,
            projectId: projectId || null,
            parentId
          })
        });
        setNotes(current => current.map(note => note.id === selectedId ? result.data : note));
        setDirty(false);
        setSaveState("saved");
        setError("");
      } catch (cause) {
        setSaveState("error");
        setError(cause instanceof Error ? cause.message : "Couldn't save this page.");
      }
    }, 700);
    return () => window.clearTimeout(timer);
  }, [dirty, selectedId, title, icon, blocks, tagsText, lifeAreaId, projectId, parentId]);

  const toggleFavorite = async (note: ApiNote) => {
    try {
      const result = await apiRequest<ApiList<ApiNote>>("/notes/" + note.id, {
        method: "PATCH", body: JSON.stringify({ favorite: !note.favorite })
      });
      setNotes(current => current.map(item => item.id === note.id ? result.data : item));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't update favorite."); }
  };

  const archiveNote = async () => {
    if (!selected) return;
    try {
      const affected = new Set<string>([selected.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const note of notes) if (note.parentId && affected.has(note.parentId) && !affected.has(note.id)) { affected.add(note.id); changed = true; }
      }
      await Promise.all([...affected].map(id => apiRequest("/notes/" + id, { method: "PATCH", body: JSON.stringify({ archived: !showArchived }) })));
      setNotes(current => current.filter(item => !affected.has(item.id)));
      setSelectedId(null);
      setSaveState("saved");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't update the page archive."); }
  };

  const switchArchiveView = async (archived: boolean) => {
    setShowArchived(archived);
    setShowFavorites(false);
    setSelectedId(null);
    setDirty(false);
    try {
      const result = await apiRequest<ApiList<ApiNote[]>>(archived ? "/notes?archived=true" : "/notes");
      setNotes(result.data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't load archived pages."); }
  };

  const deleteNote = async () => {
    if (!selected || !window.confirm("Delete this page and all of its subpages? This cannot be undone.")) return;
    try {
      await apiRequest("/notes/" + selected.id, { method: "DELETE" });
      const removeIds = new Set<string>([selected.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const note of notes) if (note.parentId && removeIds.has(note.parentId) && !removeIds.has(note.id)) { removeIds.add(note.id); changed = true; }
      }
      setNotes(current => current.filter(note => !removeIds.has(note.id)));
      setSelectedId(null);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Couldn't delete the page."); }
  };

  const filtered = useMemo(() => notes.filter(note =>
    (!showFavorites || note.favorite) &&
    (!search || (note.title + " " + note.content.map(block => block.text).join(" ")).toLowerCase().includes(search.toLowerCase()))
  ), [notes, search, showFavorites]);

  const renderTree = (parent: string | null, depth = 0): React.ReactNode => filtered
    .filter(note => note.parentId === parent)
    .map(note => {
      const children = filtered.some(child => child.parentId === note.id);
      const isExpanded = expanded.includes(note.id) || Boolean(search);
      return <div key={note.id}>
        <div className={`note-tree-row ${selectedId === note.id ? "selected" : ""}`} style={{ paddingLeft: 10 + depth * 14 }}>
          <button className="note-tree-toggle" aria-label={isExpanded ? "Collapse page" : "Expand page"} onClick={() => setExpanded(current => isExpanded ? current.filter(id => id !== note.id) : [...current, note.id])}>{children ? (isExpanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>) : <span className="tree-spacer"/>}</button>
          <button className="note-tree-open" onClick={() => openNote(note)}><span>{note.icon || "📝"}</span><span>{note.title || "Untitled"}</span></button>
          <button className="note-tree-action" title="Add subpage" onClick={() => void createNote(note.id)}><Plus size={13}/></button>
        </div>
        {children && isExpanded && renderTree(note.id, depth + 1)}
      </div>;
    });

  if (isPending || loading) return <main className="notes-loading"><LoaderCircle className="spin" size={22}/>Loading your notes...</main>;
  if (!session?.user) return <main className="notes-loading">Please <Link href="/">sign in</Link> to open your notes.</main>;

  return <main className="notes-shell">
    <aside className={`notes-sidebar ${mobileSidebar ? "mobile-open" : ""}`}>
      <div className="notes-side-top">
        <Link className="notes-back" href="/"><ArrowLeft size={15}/> Back to Sonder</Link>
        <div className="notes-brand"><span>✳</span><div><strong>Notes</strong><small>Your personal knowledge space</small></div></div>
        <button className="notes-new-button" onClick={() => void createNote()}><Plus size={15}/> New page</button>
        <label className="notes-search"><Search size={15}/><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search your pages..."/><kbd>⌘ K</kbd></label>
        <div className="notes-sidebar-label">WORKSPACE</div>
        <button className={`notes-filter ${!showFavorites && !showArchived ? "active" : ""}`} onClick={() => { void switchArchiveView(false); setShowFavorites(false); }}><FilePlus2 size={15}/> All pages <span>{notes.length}</span></button>
        <button className={`notes-filter ${showFavorites ? "active" : ""}`} onClick={() => { void switchArchiveView(false); setShowFavorites(true); }}><Heart size={15}/> Favorites</button>
        <button className={`notes-filter ${showArchived ? "active" : ""}`} onClick={() => void switchArchiveView(!showArchived)}><Archive size={15}/> Archived</button>
        <div className="notes-sidebar-label notes-pages-label">YOUR PAGES <button onClick={() => void createNote()}><Plus size={14}/></button></div>
        <div className="notes-tree">{renderTree(null)}</div>
      </div>
      <div className="notes-side-bottom"><div className="notes-save-hint"><span className={saveState === "saved" ? "saved-dot" : "saving-dot"}/>{saveState === "saving" ? "Saving changes..." : saveState === "error" ? "Save failed" : "All changes saved"}</div><Link href="/">← Return to workspace</Link></div>
    </aside>

    <section className="notes-editor-area">
      <header className="notes-topbar">
        <div className="notes-breadcrumb"><button className="notes-mobile-menu" onClick={() => setMobileSidebar(!mobileSidebar)}><List size={17}/></button><Link href="/">Sonder</Link><ChevronRight size={13}/><span>Notes</span>{selected && <><ChevronRight size={13}/><strong>{selected.title}</strong></>}</div>
        <div className="notes-top-actions">
          <span className={`notes-save-state ${saveState}`}>{saveState === "saving" ? "Saving..." : saveState === "error" ? "Couldn't save" : saveState === "unsaved" ? "Unsaved changes" : "Saved"}</span>
          {selected && <><button className={`notes-icon-action ${selected.favorite ? "favorited" : ""}`} title="Toggle favorite" onClick={() => void toggleFavorite(selected)}><Heart size={16}/></button><button className="notes-icon-action" title={showArchived ? "Restore page" : "Archive page"} onClick={() => void archiveNote()}><Archive size={16}/></button><button className="notes-icon-action danger" title="Delete page" onClick={() => void deleteNote()}><Trash2 size={16}/></button></>}
        </div>
      </header>

      {error && <div className="notes-error"><span>{error}</span><button onClick={() => setError("")}><X size={14}/></button></div>}

      {!selected ? <div className="notes-empty"><div className="notes-empty-icon">✳</div><div className="notes-eyebrow">YOUR PERSONAL WIKI</div><h1>A place for everything.</h1><p>Capture ideas, build your own knowledge base, and connect it all to the things you&apos;re working on.</p><button className="notes-create-cta" onClick={() => void createNote()}><Plus size={16}/> Create your first page</button></div> :
      <div className="notes-document-wrap">
        <div className="notes-document">
          <div className="notes-document-icon"><input aria-label="Page icon" value={icon} onChange={event => { setIcon(event.target.value.slice(0, 8)); markDirty(); }} maxLength={8}/></div>
          <input className="notes-title-input" value={title} onChange={event => { setTitle(event.target.value); markDirty(); }} placeholder="Untitled" />
          <div className="notes-metadata">
            <label><span>Life area</span><select value={lifeAreaId} onChange={event => { setLifeAreaId(event.target.value); markDirty(); }}><option value="">None</option>{areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
            <label><span>Project</span><select value={projectId} onChange={event => { setProjectId(event.target.value); markDirty(); }}><option value="">None</option>{projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
            <label className="notes-tags-field"><span>Tags</span><input value={tagsText} onChange={event => { setTagsText(event.target.value); markDirty(); }} placeholder="ideas, research, journal..." /></label>
          </div>
          <div className="notes-editor-toolbar"><span>ADD BLOCK</span>{blockTools.map(tool => <button key={tool.type} title={tool.label} onClick={() => addBlock(tool.type)}>{tool.type === "heading1" ? "H1" : tool.type === "heading2" ? "H2" : <tool.icon size={15}/>}</button>)}</div>
          <div className="notes-block-list">
            {blocks.map(block => <div className={`notes-block notes-block-${block.type}`} key={block.id}>
              {block.type === "todo" && <input className="notes-todo-check" type="checkbox" checked={Boolean(block.checked)} onChange={event => updateBlock(block.id, { checked: event.target.checked })}/>}
              {block.type === "divider" ? <div className="notes-divider-block"/> :
                <textarea value={block.text} rows={Math.max(1, Math.min(8, block.type.startsWith("heading") ? 1 : Math.ceil((block.text.length + 1) / 75)))} placeholder={blockPlaceholder(block.type)} onChange={event => updateBlock(block.id, { text: event.target.value })} />}
              <div className="notes-block-actions"><select aria-label="Block type" value={block.type} onChange={event => updateBlock(block.id, { type: event.target.value as BlockType })}>{blockTools.map(tool => <option key={tool.type} value={tool.type}>{tool.label}</option>)}</select><button title="Remove block" onClick={() => removeBlock(block.id)}><X size={13}/></button></div>
            </div>)}
          </div>
          <button className="notes-add-line" onClick={() => addBlock("paragraph")}><Plus size={15}/> Add a block</button>
          <div className="notes-editor-footer"><span>Last edited {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString() : "just now"}</span><span>Type naturally. Organize later.</span></div>
        </div>
      </div>}
    </section>
  </main>;
}
