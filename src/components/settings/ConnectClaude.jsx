import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, KeyRound, Trash2 } from 'lucide-react';
import { fetchMcpToken, createMcpToken, revokeMcpToken } from '../../lib/api';

const TOOLS = [
  ['log_meal', 'Log a meal (estimates are marked)'],
  ['log_workout', 'Log exercises, sets, reps, weight, seconds, status'],
  ['log_measurement', 'Weight, body composition, tape measurements'],
  ['log_journal_entry', 'Add a journal note'],
  ['get_today · get_plan · list_exercises · get_stats', 'Read-only, so Claude can check before it writes'],
  ['update_entry · delete_entry', 'Fix a mistake by id'],
];

export default function ConnectClaude() {
  const [status, setStatus] = useState(null);
  const [fresh, setFresh] = useState(null); // the plain token — only exists in memory, right after creation
  const [copied, setCopied] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = () => fetchMcpToken().then(setStatus).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const origin = window.location.origin;
  const url = fresh ? `${origin}/mcp/${fresh}` : null;

  async function create() {
    if (status?.exists && !window.confirm('Create a new token? The old one stops working immediately.')) return;
    setBusy(true);
    setError('');
    try {
      const r = await createMcpToken();
      setFresh(r.token);
      await load();
    } catch (e) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function revoke() {
    if (!window.confirm('Revoke the token? Claude will no longer be able to read or write your tracker.')) return;
    setBusy(true);
    await revokeMcpToken().catch((e) => setError(e.message));
    setFresh(null);
    await load();
    setBusy(false);
  }

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(''), 1800);
    } catch {
      setError('Copy failed — select the text and copy it manually.');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge">Claude</div>
        <h2>Connect Claude</h2>
        <p>Tell Claude “I ate X” or “I did these exercises” in a normal chat and it writes straight into this tracker.</p>
      </div>

      <div className="section-label"><span>1 · Your private connector link</span><span className="line" /></div>
      {status?.exists ? (
        <div className="hint">
          A token exists (created {new Date(status.created_at).toLocaleString()}
          {status.last_used_at ? `, last used ${new Date(status.last_used_at).toLocaleString()}` : ', never used yet'}). For safety only a hash is stored, so the link can’t be shown again — create a new token if you lost it.
        </div>
      ) : (
        <div className="hint">No token yet. Nothing outside this app can read or write your data until you create one.</div>
      )}

      {url && (
        <>
          <div className="notice warn">
            <strong>Copy this now — it is shown only once.</strong> Anyone with this link can read and write your tracker. Don’t share it or paste it anywhere public.
          </div>
          <div className="field">
            <label>Connector URL</label>
            <input readOnly value={url} onFocus={(e) => e.target.select()} />
          </div>
          <div className="page-actions">
            <button className="btn primary" onClick={() => copy(url, 'url')}>
              <Copy size={14} /> {copied === 'url' ? 'Copied' : 'Copy URL'}
            </button>
            <button className="btn" onClick={() => copy(fresh, 'token')}>
              <KeyRound size={14} /> {copied === 'token' ? 'Copied' : 'Copy token only'}
            </button>
          </div>
          <div className="hint">
            Clients that can send headers can use <code>{origin}/mcp</code> with <code>Authorization: Bearer &lt;token&gt;</code> instead.
          </div>
        </>
      )}

      <div className="page-actions">
        <button className="btn primary" disabled={busy} onClick={create}>
          <KeyRound size={14} /> {status?.exists ? 'Regenerate token' : 'Create token'}
        </button>
        {status?.exists && (
          <button className="btn danger" disabled={busy} onClick={revoke}>
            <Trash2 size={14} /> Revoke
          </button>
        )}
      </div>
      {error && <div className="notice warn">{error}</div>}

      <div className="section-label"><span>2 · Add it to Claude</span><span className="line" /></div>
      <ol style={{ paddingInlineStart: 20, lineHeight: 1.7 }}>
        <li>Open claude.ai → <strong>Settings</strong> → <strong>Connectors</strong>.</li>
        <li><strong>Add custom connector</strong>, name it “Training tracker”, paste the Connector URL above.</li>
        <li>Start a chat and say: “I had two eggs and toast for breakfast” or “Today I did bench press 3×12 at 20 kg.”</li>
      </ol>
      <div className="hint">Custom connectors need a Claude plan that includes them and are added from the claude.ai web/desktop settings; a free plan may not have the option.</div>

      <div className="section-label"><span>What Claude can do</span><span className="line" /></div>
      {TOOLS.map(([name, text]) => (
        <div className="plan-entry" key={name}>
          <div className="grow"><code>{name}</code><div className="mini">{text}</div></div>
        </div>
      ))}
      <div className="hint">Everything Claude writes is tagged “Claude”, counted in your statistics like anything else, and can be edited or deleted here or by asking Claude.</div>
    </motion.div>
  );
}
