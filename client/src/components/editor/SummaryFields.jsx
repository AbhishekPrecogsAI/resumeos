import { TextField, TextArea } from '../ui/Field.jsx';
import { ADVISORY, LIMITS } from '@resumeos/shared/limits.js';

export function SummaryFields({ headline, summary, onChange }) {
  const long = summary.length > ADVISORY.summaryChars;
  return (
    <div className="grid gap-5">
      <TextField
        label="Headline"
        value={headline}
        maxLength={LIMITS.headline}
        hint='One line under your name, like "Backend engineer, payments and logistics".'
        onChange={(e) => onChange({ headline: e.target.value }, { coalesceKey: 'headline' })}
      />
      <TextArea
        label="Summary"
        rows={5}
        value={summary}
        maxLength={LIMITS.summary}
        hint={`${summary.length} characters.${long ? ' Summaries over about 600 characters are often skimmed.' : ' Two to four sentences is typical.'}`}
        onChange={(e) => onChange({ summary: e.target.value }, { coalesceKey: 'summary' })}
      />
    </div>
  );
}
