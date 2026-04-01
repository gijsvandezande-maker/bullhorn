interface Entity {
  id: number;
  name?: string;
  firstName?: string;
  lastName?: string;
}

interface EntityPickerProps {
  label: string;
  searchName: string;
  candidates: Entity[];
  selected: number | "skip" | null;
  onSelect: (id: number | "skip") => void;
}

function displayName(e: Entity) {
  if (e.name) return e.name;
  return [e.firstName, e.lastName].filter(Boolean).join(" ");
}

export function EntityPicker({
  label,
  searchName,
  candidates,
  selected,
  onSelect,
}: EntityPickerProps) {
  return (
    <div className="picker">
      <p className="picker-label">
        {label}: <strong>"{searchName}"</strong>
      </p>
      <p className="picker-hint">Meerdere matches gevonden — kies de juiste:</p>
      <div className="picker-options">
        {candidates.map((c) => (
          <label key={c.id} className={`picker-option ${selected === c.id ? "selected" : ""}`}>
            <input
              type="radio"
              name={`picker-${label}`}
              value={c.id}
              checked={selected === c.id}
              onChange={() => onSelect(c.id)}
            />
            <span className="picker-name">{displayName(c)}</span>
            <span className="picker-id">#{c.id}</span>
          </label>
        ))}
        <label className={`picker-option picker-skip ${selected === "skip" ? "selected" : ""}`}>
          <input
            type="radio"
            name={`picker-${label}`}
            value="skip"
            checked={selected === "skip"}
            onChange={() => onSelect("skip")}
          />
          <span className="picker-name">Geen koppeling</span>
        </label>
      </div>
    </div>
  );
}
