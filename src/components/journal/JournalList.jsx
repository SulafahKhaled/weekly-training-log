import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { fetchJournal } from '../../lib/api';
import JournalEntryForm from './JournalEntryForm';
import JournalEntryCard from './JournalEntryCard';

export default function JournalList() {
  const [entries, setEntries] = useState(null); // null = loading
  const [editing, setEditing] = useState(null);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    fetchJournal()
      .then((r) => setEntries(r.entries))
      .catch(() => setEntries([]));
  }, []);

  function handleSaved(entry) {
    setEntries((list) => {
      const idx = list.findIndex((e) => e.id === entry.id);
      if (idx === -1) return [{ ...entry, photo_ids: [] }, ...list];
      const next = [...list];
      next[idx] = { ...next[idx], ...entry };
      return next;
    });
    setEditing(null);
    setComposing(false);
  }

  function handleDeleted(id) {
    setEntries((list) => list.filter((e) => e.id !== id));
  }

  function handlePhotosChange(id, photoIds) {
    setEntries((list) => list.map((e) => (e.id === id ? { ...e, photo_ids: photoIds } : e)));
  }

  if (entries === null) return <div className="hint">Loading…</div>;

  const visible = editing ? entries.filter((e) => e.id !== editing.id) : entries;

  return (
    <div>
      {!composing && !editing && (
        <button className="journal-new-btn" onClick={() => setComposing(true)}>
          <Plus size={16} /> New entry
        </button>
      )}

      {composing && <JournalEntryForm onSaved={handleSaved} onCancel={() => setComposing(false)} />}
      {editing && <JournalEntryForm entry={editing} onSaved={handleSaved} onCancel={() => setEditing(null)} />}

      {visible.length === 0 && !composing ? (
        <div className="journal-empty">No entries yet — tap &quot;New entry&quot; to write your first one.</div>
      ) : (
        visible.map((e) => <JournalEntryCard key={e.id} entry={e} onEdit={setEditing} onDeleted={handleDeleted} onPhotosChange={handlePhotosChange} />)
      )}
    </div>
  );
}
