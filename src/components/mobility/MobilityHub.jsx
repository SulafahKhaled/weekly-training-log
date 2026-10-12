import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ChevronDown } from 'lucide-react';
import VideoBlock from '../VideoBlock';
import { useData } from '../../context/DataContext';
import {
  MOBILITY_SESSIONS, PROGRAM, YOGA_PROGRESSION, FASCIA_RULES, BREATH_NOTES, STICK_LEVELS, STICK_NOTES, WEEKLY_ADDONS, EVERY_DAY, PDF_SOURCE,
} from '../../data/pdfProgram';
import { DAYS } from '../../data/days';

function Item({ item, exercise }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="list-row" style={{ display: 'block', cursor: 'default' }}>
      <button className="sess-head" style={{ padding: 0 }} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="names">
          <span className="en">{item.en}</span>
          <span className="sub ar">{item.ar}</span>
        </span>
        <span className="pill">{item.dose}</span>
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : undefined }} />
      </button>
      {open && (
        <>
          <div className="entry-how ar" dir="rtl">{item.how}</div>
          <VideoBlock media={exercise?.media} />
        </>
      )}
    </div>
  );
}

function SessionBlock({ session, byId, onDoToday, canDo }) {
  return (
    <div className="plan-day">
      <h4>
        {session.en}
        <span className="pill">{session.minutes} min</span>
      </h4>
      <div className="ar hint" style={{ margin: 0 }}>{session.ar}</div>
      {session.items.map((it) => <Item key={it.id} item={it} exercise={byId.get(it.id)} />)}
      {canDo && (
        <div className="page-actions">
          <button className="btn small" onClick={() => onDoToday(session.id)}>
            <Plus size={13} /> Do this today
          </button>
        </div>
      )}
    </div>
  );
}

/** The PDF's whole program as a reference: sessions, yoga, fascia, breathing, stick levels, weekly table, rules. */
export default function MobilityHub({ onNavigate }) {
  const { library, activePlan, addSessionToDay, date, settings } = useData();
  const [done, setDone] = useState(null);

  function doToday(sessionId) {
    const day = Object.keys(activePlan?.days || {}).find((d) => activePlan.days[d].some((s) => s.id === sessionId));
    if (!day) return;
    addSessionToDay(date, { planId: activePlan.id, day, sessionId });
    setDone(sessionId);
  }
  const has = (id) => activePlan && Object.values(activePlan.days).some((list) => list.some((s) => s.id === id));
  const level = STICK_LEVELS[settings.stickLevel] || STICK_LEVELS[1];
  const sess = (id) => MOBILITY_SESSIONS.find((s) => s.id === id);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="info-hero">
        <div className="badge ar">{PROGRAM.title}</div>
        <h2>Mobility, yoga, fascia, breathing &amp; stick</h2>
        <p className="ar" dir="rtl">{PROGRAM.subtitle}</p>
        <p>Content comes from “{PDF_SOURCE}” (12-week program). It sits on top of your resistance plan as optional add-ons, so you can complete the workout without it.</p>
      </div>
      {done && <div className="notice">Added to today — find it on Home under Today’s sessions.</div>}

      <div className="section-label"><span>Weekly add-ons</span><span className="line" /></div>
      <div className="plan-day">
        {DAYS.map((d) => (
          <div className="plan-entry" key={d.id}>
            <div className="grow">
              <strong>{d.nameEn}</strong> <span className="mini">{d.tag}</span>
              <div className="ar mini" dir="rtl">{WEEKLY_ADDONS[d.id].ar}</div>
            </div>
            <span className="pill opt">{WEEKLY_ADDONS[d.id].minutes} min</span>
          </div>
        ))}
        <div className="plan-entry">
          <div className="grow"><strong>Every morning</strong><div className="ar mini" dir="rtl">{EVERY_DAY.morning.ar}</div></div>
          <span className="pill opt">{EVERY_DAY.morning.minutes} min</span>
        </div>
        <div className="plan-entry">
          <div className="grow"><strong>Every night</strong><div className="ar mini" dir="rtl">{EVERY_DAY.night.ar}</div></div>
          <span className="pill opt">{EVERY_DAY.night.minutes} min</span>
        </div>
      </div>

      <div className="section-label"><span>Principles</span><span className="line" /></div>
      <div className="info-card ar" dir="rtl">
        {PROGRAM.principles.map((p) => (
          <p key={p.label} style={{ margin: '0 0 8px' }}><strong>{p.label}:</strong> {p.text}</p>
        ))}
      </div>

      <div className="section-label"><span>Mobility sessions</span><span className="line" /></div>
      {['mob_a', 'mob_b', 'mob_c'].map((id) => <SessionBlock key={id} session={sess(id)} byId={library.byId} canDo={has(id)} onDoToday={doToday} />)}

      <div className="section-label"><span>Long yoga session</span><span className="line" /></div>
      <SessionBlock session={sess('yoga')} byId={library.byId} canDo={has('yoga')} onDoToday={doToday} />
      <div className="notice ar" dir="rtl">{YOGA_PROGRESSION}</div>

      <div className="section-label"><span>Fascia release</span><span className="line" /></div>
      <SessionBlock session={sess('fascia')} byId={library.byId} canDo={has('fascia')} onDoToday={doToday} />
      <div className="notice warn ar" dir="rtl">{FASCIA_RULES}</div>

      <div className="section-label"><span>Breathing</span><span className="line" /></div>
      <div className="hint ar" dir="rtl">{BREATH_NOTES.intro}</div>
      <SessionBlock session={sess('breath_am')} byId={library.byId} canDo={has('breath_am')} onDoToday={doToday} />
      <SessionBlock session={sess('breath_pm')} byId={library.byId} canDo={has('breath_pm')} onDoToday={doToday} />
      <div className="notice ar" dir="rtl">{BREATH_NOTES.fighting}</div>
      <div className="notice warn ar" dir="rtl">{BREATH_NOTES.dizzy}</div>

      <div className="section-label"><span>Stick drills</span><span className="line" /></div>
      <div className="notice ar" dir="rtl">{STICK_NOTES.intro}</div>
      <div className="notice ar" dir="rtl">{STICK_NOTES.stance}</div>
      <div className="notice ar" dir="rtl">{STICK_NOTES.angles}</div>
      {[1, 2, 3].map((l) => (
        <div className="plan-day" key={l} style={l === settings.stickLevel ? { borderColor: 'var(--mob)' } : undefined}>
          <h4>
            {STICK_LEVELS[l].en}
            {l === settings.stickLevel && <span className="pill opt">your level</span>}
          </h4>
          <div className="ar hint" style={{ margin: 0 }}>{STICK_LEVELS[l].title}</div>
          {STICK_LEVELS[l].items.map((it) => <Item key={it.id} item={it} exercise={library.byId.get(it.id)} />)}
        </div>
      ))}
      <div className="notice ar" dir="rtl">{STICK_NOTES.speedRule}</div>
      <div className="hint">Showing your level ({level.en}) in the daily stick sessions. Change it in Settings.</div>

      <div className="section-label"><span>Stages, tools &amp; safety</span><span className="line" /></div>
      <div className="info-card ar" dir="rtl">
        {PROGRAM.stages.map((t, i) => <p key={i} style={{ margin: '0 0 8px' }}>{t}</p>)}
      </div>
      <div className="plan-day">
        <h4>Tools</h4>
        {PROGRAM.tools.map((t) => (
          <div className="plan-entry ar" key={t.tool} dir="rtl">
            <div className="grow"><strong>{t.tool}</strong> — {t.spec}</div>
            <span className="mini">بديل: {t.alt}</span>
          </div>
        ))}
      </div>
      <div className="notice warn ar" dir="rtl">
        <strong>قواعد السلامة:</strong>
        <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
          {PROGRAM.safety.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
      <div className="page-actions">
        <button className="btn primary" onClick={() => onNavigate('tests')}>Open the progress tests</button>
      </div>
    </motion.div>
  );
}
