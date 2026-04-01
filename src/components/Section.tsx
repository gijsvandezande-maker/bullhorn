import type { ParseResult, FieldKey } from "../types";
import { FieldRow } from "./FieldRow";

interface SectionProps {
  title: string;
  fields: FieldKey[];
  result: ParseResult;
}

export function Section({ title, fields, result }: SectionProps) {
  return (
    <section className="section">
      <div className="section-header">
        <h2>{title}</h2>
      </div>
      <div className="section-fields">
        {fields.map((key) => (
          <FieldRow
            key={key}
            fieldKey={key}
            value={result[key] as string | number | null}
            confidence={result.confidence[key]}
          />
        ))}
      </div>
    </section>
  );
}
