import { useState } from "react";
import type { Confidence, FieldKey } from "../types";
import { FIELD_LABELS, RICH_TEXT_FIELDS } from "../types";

interface FieldRowProps {
  fieldKey: FieldKey;
  value: string | number | null;
  confidence: Confidence;
}

const CONFIDENCE_STYLES: Record<Confidence, { badge: string; dot: string }> = {
  hoog: {
    badge: "badge-green",
    dot: "dot-green",
  },
  laag: {
    badge: "badge-orange",
    dot: "dot-orange",
  },
  niet_gevonden: {
    badge: "badge-gray",
    dot: "dot-gray",
  },
};

const CONFIDENCE_LABELS: Record<Confidence, string> = {
  hoog: "Hoog",
  laag: "Laag",
  niet_gevonden: "Niet gevonden",
};

export function FieldRow({ fieldKey, value, confidence }: FieldRowProps) {
  const [copied, setCopied] = useState(false);
  const label = FIELD_LABELS[fieldKey];
  const isRichText = RICH_TEXT_FIELDS.includes(fieldKey);
  const displayValue = value !== null ? String(value) : null;
  const styles = CONFIDENCE_STYLES[confidence];

  function handleCopy() {
    if (!displayValue) return;
    navigator.clipboard.writeText(displayValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="field-row">
      <div className="field-header">
        <div className="field-label-group">
          <span className={`dot ${styles.dot}`} />
          <span className="field-label">{label}</span>
        </div>
        <div className="field-actions">
          <span className={`badge ${styles.badge}`}>
            {CONFIDENCE_LABELS[confidence]}
          </span>
          {displayValue && (
            <button
              className="copy-btn"
              onClick={handleCopy}
              title="Kopieer naar klembord"
            >
              {copied ? "✓ Gekopieerd" : "Kopieer"}
            </button>
          )}
        </div>
      </div>
      {isRichText ? (
        <div className={`field-value richtext ${!displayValue ? "empty" : ""}`}>
          {displayValue || "—"}
        </div>
      ) : (
        <div className={`field-value ${!displayValue ? "empty" : ""}`}>
          {displayValue || "—"}
        </div>
      )}
    </div>
  );
}
