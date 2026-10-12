// The PDF's own cue + dose (verbatim, Arabic), shown on any exercise that carries them.
export function EntryNotes({ exercise }) {
  if (!exercise.how && !exercise.dose) return null;
  return (
    <div className="entry-how ar" dir="rtl">
      {exercise.how}
      {exercise.dose && <span className="dose">{exercise.dose}</span>}
    </div>
  );
}
