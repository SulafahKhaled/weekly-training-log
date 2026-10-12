import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, Upload } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { fetchBackup, importBackup } from '../../lib/api';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const ZONES = ['Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Africa/Cairo', 'Europe/London', 'Europe/Berlin', 'America/New_York', 'America/Los_Angeles', 'UTC'];

function NumberSetting({ label, hint, value, onChange, min = 0 }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input type="number" min={min} inputMode="numeric" value={value} onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))} />
      {hint && <span className="hint" style={{ margin: 0 }}>{hint}</span>}
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, reloadAll } = useData();
  const fileRef = useRef(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  async function exportBackup() {
    setBusy(true);
    setMessage(null);
    try {
      const data = await fetchBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = URL.createObjectURL(blob);
      a.download = `training-backup-${stamp}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      const n = data.data.session_items.length + data.data.legacy.set_logs.length;
      setMessage({ ok: true, text: `Backup downloaded: ${data.data.session_items.length} logged items (+ ${data.data.legacy.set_logs.length} original v1 set records), ${data.data.plans.length} plans, ${data.data.exercises.length} edited/custom exercises.${n === 0 ? ' (No workout history yet.)' : ''}` });
    } catch (e) {
      setMessage({ ok: false, text: e.message });
    }
    setBusy(false);
  }

  async function importFile(file) {
    if (!file) return;
    setBusy(true);
    setMessage(null);
    try {
      const backup = JSON.parse(await file.text());
      const preview = `${backup.data?.session_items?.length ?? 0} logged items, ${backup.data?.plans?.length ?? 0} plans`;
      if (!window.confirm(`Import this backup (${preview})? It is merged into your data — nothing is deleted. Rows that already exist are updated to the backup's version.`)) {
        setBusy(false);
        return;
      }
      const res = await importBackup(backup);
      setMessage({ ok: true, text: `Imported: ${Object.entries(res.imported).map(([k, v]) => `${v} ${k}`).join(', ')}. Reloading…` });
      setTimeout(() => window.location.reload(), 900);
    } catch (e) {
      setMessage({ ok: false, text: e.message || 'That file could not be read.' });
    }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge">الإعدادات</div>
        <h2>Settings &amp; backup</h2>
        <p>Timing defaults, how weeks are counted, and a full JSON backup you can export and import.</p>
      </div>

      <div className="section-label"><span>Timing defaults</span><span className="line" /></div>
      <div className="hint">Used when neither the exercise, the plan nor the session entry sets its own value (precedence: entry → plan → exercise → these).</div>
      <div className="field-row">
        <NumberSetting label="Countdown (s)" value={settings.countdown} onChange={(v) => updateSettings({ countdown: v })} />
        <NumberSetting label="Work (s)" value={settings.work} onChange={(v) => updateSettings({ work: v })} />
        <NumberSetting label="Rest (s)" value={settings.rest} onChange={(v) => updateSettings({ rest: v })} />
      </div>

      <div className="section-label"><span>Weeks &amp; time</span><span className="line" /></div>
      <div className="field">
        <label>Week starts on</label>
        <select value={settings.weekStart} onChange={(e) => updateSettings({ weekStart: Number(e.target.value) })}>
          {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </div>
      <div className="field">
        <label>Timezone</label>
        <select value={settings.timezone} onChange={(e) => updateSettings({ timezone: e.target.value })}>
          {[...new Set([settings.timezone, ...ZONES])].map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
        <span className="hint" style={{ margin: 0 }}>Which calendar day a workout belongs to is decided in this timezone (default Asia/Riyadh).</span>
      </div>
      <NumberSetting label="Seconds per rep (for estimating time trained)" hint="Only used for rep-based sets that weren't timed." value={settings.secondsPerRep} min={1} onChange={(v) => updateSettings({ secondsPerRep: v })} />

      <div className="section-label"><span>Stick drills</span><span className="line" /></div>
      <div className="field">
        <label>Current stick level</label>
        <select value={settings.stickLevel} onChange={(e) => updateSettings({ stickLevel: Number(e.target.value) })}>
          <option value={1}>Level 1 — control (weeks 1–4)</option>
          <option value={2}>Level 2 — speed & linking (weeks 5–8)</option>
          <option value={3}>Level 3 — fighting (weeks 9–12)</option>
        </select>
      </div>

      <div className="section-label"><span>Backup</span><span className="line" /></div>
      <div className="hint">
        The file contains your settings, edited/custom exercises, plans, the full session log, the original v1 records, progress tests, journal text, body and nutrition logs. Journal photos are not included. Importing merges — it never deletes.
      </div>
      <div className="page-actions">
        <button className="btn primary" disabled={busy} onClick={exportBackup}>
          <Download size={15} /> Export JSON backup
        </button>
        <button className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
          <Upload size={15} /> Import backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
        <button className="btn" disabled={busy} onClick={() => reloadAll()}>
          Reload log
        </button>
      </div>
      {message && <div className={`notice ${message.ok ? '' : 'warn'}`}>{message.text}</div>}
      {settings.migratedAt && (
        <div className="hint">
          Data format v{settings.schemaVersion}. Your v1 history was copied into the session log on {new Date(settings.migratedAt).toLocaleDateString()} ({settings.migratedCounts?.items ?? 0} sets / {settings.migratedCounts?.sessions ?? 0} sessions); the original records are kept unchanged.
        </div>
      )}
    </motion.div>
  );
}
