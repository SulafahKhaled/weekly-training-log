import { useData } from '../../context/DataContext';
import RepsBlock from './RepsBlock';
import HoldBlock from './HoldBlock';
import CircuitBlock from './CircuitBlock';
import ExerciseShell from '../ExerciseShell';

/** One exercise / circuit in a session — picks the right block for its (effective) type. */
export default function EntryCard({ inst, entry }) {
  const { resolveEntry } = useData();
  if (entry.kind === 'circuit') return <CircuitBlock inst={inst} entry={entry} />;
  const { exercise, eff } = resolveEntry(entry, inst.plan);
  if (!exercise) {
    return <ExerciseShell done={false} en={entry.exerciseId} ar="" meta="This exercise is no longer in the library" />;
  }
  if (eff.type === 'reps') return <RepsBlock inst={inst} entry={entry} exercise={exercise} eff={eff} />;
  return <HoldBlock inst={inst} entry={entry} exercise={exercise} eff={eff} />;
}
