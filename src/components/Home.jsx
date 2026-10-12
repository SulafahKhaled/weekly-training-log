import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, PersonStanding, Snowflake, Sparkles, Plus, Library, ListChecks, Settings as SettingsIcon, ClipboardList, Bot, Trash2 } from 'lucide-react';
import { DAYS } from '../data/days';
import DayCard from './DayCard';
import ProgressRing from './ProgressRing';
import SessionCard from './session/SessionCard';
import SessionPicker from './pickers/SessionPicker';
import ExercisePicker from './pickers/ExercisePicker';
import { useData } from '../context/DataContext';
import { sessionProgress, combineProgress } from '../lib/progress';
import { streaks } from '../lib/stats';
import { dayIdOf } from '../lib/dates';

export default function Home({ onOpenDay, onNavigate }) {
  const { date, log, store, resolveEntry, instancesForDate, addSessionToDay, addQuickExercise, activePlan, migration } = useData();
  const [pickSession, setPickSession] = useState(false);
  const [pickExercise, setPickExercise] = useState(false);

  const todays = instancesForDate(date);
  // the ring tracks what you owe today: required sessions + anything you added; optional add-ons are extra credit
  const owed = todays.filter((i) => !i.session.optional || i.source !== 'plan');
  const p = combineProgress(owed.map((i) => sessionProgress(i, resolveEntry, log)));
  const pct = p.total ? p.done / p.total : 0;
  const optional = todays.filter((i) => i.session.optional && i.source === 'plan');
  const optDone = optional.filter((i) => sessionProgress(i, resolveEntry, log).status === 'completed').length;
  const claudeItems = [...log.items.values()].filter((i) => i.source === 'claude' && i.date === date && i.kind === 'work');
  const streak = useMemo(() => streaks([...log.items.values()], date), [log.items, date]);
  const todayDay = DAYS.find((d) => d.id === dayIdOf(date));

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
      <div className="hero">
        <div className="kicker">7-DAY SPLIT · UPPER / LOWER / CORE+HIP / HIIT</div>
        <h1>{activePlan?.name || 'This Week’s Plan'}</h1>
        <p>Tap a day to open it. Each move has a timer or checklist and a demo you can preview right here.</p>
      </div>

      {migration && (
        <div className="notice">
          Your history was carried over to the new log: {migration.items} logged sets across {migration.sessions} sessions. The original records are untouched.
        </div>
      )}

      <div className="today-card">
        <ProgressRing fraction={pct} size={64} stroke={7} color="var(--upper)" track="var(--upper-track)">
          <Sparkles size={20} color="var(--upper)" />
        </ProgressRing>
        <div className="info">
          <div className="label">Today · {todayDay?.nameEn}</div>
          <div className="value">
            {p.done}/{p.total} <span>sets done</span>
          </div>
          <div className="hint">
            {streak.current > 0 ? `🔥 ${streak.current}-day streak (best ${streak.best})` : 'Complete your first set today to start a streak'}
            {optional.length > 0 ? ` · add-ons ${optDone}/${optional.length}` : ''}
          </div>
        </div>
      </div>

      <div className="section-label">
        <span>Today’s sessions</span>
        <span className="line" />
      </div>
      <div className="page-actions">
        <button className="btn small" onClick={() => setPickSession(true)}>
          <Plus size={13} /> Add another day’s session
        </button>
        <button className="btn small" onClick={() => setPickExercise(true)}>
          <Plus size={13} /> Quick-add an exercise
        </button>
      </div>
      {todays.map((inst) => (
        <SessionCard key={inst.key} inst={inst} defaultOpen={false} />
      ))}
      {todays.length === 0 && <div className="hint">Nothing scheduled today. Add a session above, or open any day below.</div>}

      {claudeItems.length > 0 && (
        <>
          <div className="section-label">
            <span>Logged by Claude today</span>
            <span className="line" />
          </div>
          {claudeItems.map((i) => (
            <div className="plan-entry" key={i.item_key}>
              <div className="grow">
                {i.exercise_name} <span className="pill extra">Claude</span>
                <div className="mini">
                  set {i.set_index + 1} · {i.status}
                  {i.reps_done != null ? ` · ${i.reps_done} reps` : ''}
                  {i.weight != null ? ` · ${i.weight} kg` : ''}
                  {i.hold_seconds != null ? ` · ${i.hold_seconds}s` : ''}
                </div>
              </div>
              <button className="icon-btn" aria-label="Delete" onClick={() => store.removeItem(i.item_key)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </>
      )}

      <div className="section-label">
        <span>The week</span>
        <span className="line" />
      </div>
      <div className="legend">
        <div className="item"><span className="dot" style={{ background: 'var(--upper)' }} />Upper</div>
        <div className="item"><span className="dot" style={{ background: 'var(--lower)' }} />Lower</div>
        <div className="item"><span className="dot" style={{ background: 'var(--core)' }} />Core + Hip</div>
        <div className="item"><span className="dot" style={{ background: 'var(--hiit)' }} />HIIT / Cardio</div>
        <div className="item"><span className="dot" style={{ background: 'var(--mob)' }} />Mobility</div>
      </div>
      <div className="day-grid">
        {DAYS.map((day, i) => (
          <DayCard key={day.id} day={day} index={i} onOpen={() => onOpenDay(day.id)} />
        ))}
      </div>

      <div className="quicklinks">
        <button onClick={() => onNavigate('warmup')}><Flame size={18} />Warm-up guide</button>
        <button onClick={() => onNavigate('mobility')}><PersonStanding size={18} />Mobility</button>
        <button onClick={() => onNavigate('cooldown')}><Snowflake size={18} />Cool-down guide</button>
      </div>
      <div className="quicklinks">
        <button onClick={() => onNavigate('library')}><Library size={18} />Exercise library</button>
        <button onClick={() => onNavigate('plans')}><ListChecks size={18} />Plans</button>
        <button onClick={() => onNavigate('tests')}><ClipboardList size={18} />Progress tests</button>
        <button onClick={() => onNavigate('settings')}><SettingsIcon size={18} />Settings &amp; backup</button>
        <button onClick={() => onNavigate('connect')}><Bot size={18} />Connect Claude</button>
      </div>

      <footer className="note">
        Weekly cycle repeats every week, Sun → Sat.
        <br />
        Pick a weight where the last 2–3 reps feel hard.
      </footer>

      {pickSession && (
        <SessionPicker
          title="Add a session to today"
          onClose={() => setPickSession(false)}
          skip={todays.map((i) => ({ planId: i.planId, day: i.tplDay, sessionId: i.sessionId }))}
          onPick={(ref) => {
            addSessionToDay(date, { planId: ref.planId, day: ref.day, sessionId: ref.sessionId });
            setPickSession(false);
          }}
        />
      )}
      {pickExercise && (
        <ExercisePicker
          title="Quick-add an exercise for today"
          onClose={() => setPickExercise(false)}
          onPick={(ex) => {
            addQuickExercise(date, ex.id);
            setPickExercise(false);
          }}
        />
      )}
    </motion.div>
  );
}
