import { useState } from 'react';
import { Pencil, Trash2, ImagePlus, X } from 'lucide-react';
import { DAYS, dayForDate } from '../../data/days';
import { deleteJournalEntry, uploadJournalPhoto, deleteJournalPhoto, journalPhotoUrl } from '../../lib/api';
import { compressImage } from '../../lib/photo';
import PhotoLightbox from './PhotoLightbox';

function fmtEntryDate(dateStr) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function JournalEntryCard({ entry, onEdit, onDeleted, onPhotosChange }) {
  const photoIds = entry.photo_ids || [];
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const day = DAYS.find((d) => d.id === entry.day_id) || dayForDate(entry.date);

  async function handleDelete() {
    if (!window.confirm('Delete this journal entry? Its photos will be removed too.')) return;
    await deleteJournalEntry(entry.id);
    onDeleted(entry.id);
  }

  async function handleAddPhotos(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      let ids = photoIds;
      for (const file of files) {
        const { mime, data } = await compressImage(file);
        const res = await uploadJournalPhoto(entry.id, { mime, data });
        ids = [...ids, res.id];
        onPhotosChange(entry.id, ids);
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleRemovePhoto(id) {
    onPhotosChange(entry.id, photoIds.filter((pid) => pid !== id));
    await deleteJournalPhoto(id);
  }

  return (
    <div className="journal-entry-card">
      <div className="journal-entry-head">
        <div>
          <div className="journal-entry-date">{fmtEntryDate(entry.date)}</div>
          <span className="journal-day-tag" style={{ background: `var(--${day.color}-dim)`, color: `var(--${day.color})` }}>
            {day.tag}
          </span>
        </div>
        <div className="journal-entry-actions">
          <button className="journal-icon-btn" onClick={() => onEdit(entry)} aria-label="Edit">
            <Pencil size={15} />
          </button>
          <button className="journal-icon-btn" onClick={handleDelete} aria-label="Delete">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {entry.text && <div className="journal-entry-text">{entry.text}</div>}

      {photoIds.length > 0 && (
        <div className="journal-photos">
          {photoIds.map((id) => (
            <div className="journal-photo-thumb" key={id} onClick={() => setLightbox(journalPhotoUrl(id))}>
              <img src={journalPhotoUrl(id)} alt="" />
              <button
                className="journal-photo-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePhoto(id);
                }}
                aria-label="Remove photo"
              >
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label className="journal-add-photo">
        <ImagePlus size={14} />
        {uploading ? 'Uploading…' : 'Add photo'}
        <input type="file" accept="image/*" multiple onChange={handleAddPhotos} disabled={uploading} />
      </label>

      <PhotoLightbox src={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}
