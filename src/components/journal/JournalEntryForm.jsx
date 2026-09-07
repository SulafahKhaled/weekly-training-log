import { useState } from 'react';
import { dayForDate } from '../../data/days';
import { saveJournalEntry, todayKey } from '../../lib/api';

export default function JournalEntryForm({ entry, onSaved, onCancel }) {
  const isNew = !entry;
  const [date, setDate] = useState(entry?.date || todayKey());
  const [text, setText] = useState(entry?.text || '');
  const [saving, setSaving] = useState(false);
  const day = dayForDate(date);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await saveJournalEntry({ date, dayId: day.id, text });
      onSaved(res.entry);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="journal-form">
      <div className="journal-form-row">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={!isNew} max={todayKey()} />
        </label>
        <span className="journal-day-tag" style={{ background: `var(--${day.color}-dim)`, color: `var(--${day.color})` }}>
          {day.nameEn} — {day.tag}
        </span>
      </div>
      <textarea
        className="journal-textarea"
        placeholder="How did it feel today? Anything worth remembering for next time..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        autoFocus
      />
      <div className="journal-form-actions">
        <button className="journal-btn journal-btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="journal-btn journal-btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save entry'}
        </button>
      </div>
    </div>
  );
}
