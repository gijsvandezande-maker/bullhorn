import { useState } from "react";
import { parseFunctieprofiel } from "./api";
import { Section } from "./components/Section";
import { EntityPicker } from "./components/EntityPicker";
import type { ParseResult } from "./types";
import { SECTIONS } from "./types";
import "./App.css";

interface BhEntity { id: number; name?: string; firstName?: string; lastName?: string; }

interface LookupResult {
  match: BhEntity | null;
  candidates: BhEntity[];
}

interface BullhornResult {
  jobId: number;
  url: string;
  linkedCorporation: { id: number } | null;
  linkedContact: { id: number } | null;
  warnings: string[];
}

// ── Save flow states ──────────────────────────────────────────────────────────
type SaveState =
  | { step: "idle" }
  | { step: "looking-up" }
  | {
      step: "needs-selection";
      corpCandidates: BhEntity[];
      contactCandidates: BhEntity[];
      chosenCorp: number | "skip" | null;
      chosenContact: number | "skip" | null;
    }
  | { step: "saving" }
  | { step: "done"; result: BullhornResult };

async function lookup(endpoint: string, name: string): Promise<LookupResult> {
  const res = await fetch(`/api/bullhorn/search/${endpoint}?name=${encodeURIComponent(name)}`);
  if (!res.ok) return { match: null, candidates: [] };
  return res.json() as Promise<LookupResult>;
}

async function createJob(
  parsed: ParseResult,
  corporationId: number | "skip" | null,
  contactId: number | "skip" | null
): Promise<BullhornResult> {
  const body = {
    ...parsed,
    corporationId: corporationId === "skip" ? undefined : corporationId ?? undefined,
    contactId: contactId === "skip" ? undefined : contactId ?? undefined,
  };
  const res = await fetch("/api/bullhorn/job", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Onbekende fout");
  return data as BullhornResult;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [apiKey, setApiKey] = useState(
    () => (import.meta as unknown as { env: Record<string, string> }).env.VITE_ANTHROPIC_API_KEY ?? ""
  );
  const [profileText, setProfileText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<SaveState>({ step: "idle" });
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleParse() {
    if (!apiKey.trim()) { setParseError("Voer een Anthropic API-sleutel in."); return; }
    if (!profileText.trim()) { setParseError("Voer een functieprofiel in."); return; }
    setParseError(null);
    setResult(null);
    setSaveState({ step: "idle" });
    setSaveError(null);
    setStreamPreview("");
    setStreaming(true);
    try {
      const parsed = await parseFunctieprofiel(profileText, apiKey.trim(), (c) => setStreamPreview(c));
      setResult(parsed);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : "Er is een fout opgetreden.");
    } finally {
      setStreaming(false);
      setStreamPreview("");
    }
  }

  async function handleStartSave() {
    if (!result) return;
    setSaveError(null);
    setSaveState({ step: "looking-up" });

    try {
      // Run lookups in parallel
      const [corpResult, contactResult] = await Promise.all([
        result.opdrachtgever ? lookup("corporation", result.opdrachtgever) : Promise.resolve({ match: null, candidates: [] }),
        result.contact ? lookup("contact", result.contact) : Promise.resolve({ match: null, candidates: [] }),
      ]);

      const needsCorpPick = corpResult.candidates.length > 1 && !corpResult.match;
      const needsContactPick = contactResult.candidates.length > 1 && !contactResult.match;

      if (needsCorpPick || needsContactPick) {
        // Show pickers — pre-fill single matches
        setSaveState({
          step: "needs-selection",
          corpCandidates: needsCorpPick ? corpResult.candidates : [],
          contactCandidates: needsContactPick ? contactResult.candidates : [],
          chosenCorp: needsCorpPick ? null : (corpResult.match?.id ?? "skip"),
          chosenContact: needsContactPick ? null : (contactResult.match?.id ?? "skip"),
        });
      } else {
        // No ambiguity — save directly
        await doSave(corpResult.match?.id ?? null, contactResult.match?.id ?? null);
      }
    } catch (err) {
      setSaveState({ step: "idle" });
      setSaveError(err instanceof Error ? err.message : "Fout bij opzoeken");
    }
  }

  async function handleConfirmSelection() {
    if (saveState.step !== "needs-selection") return;
    await doSave(
      saveState.chosenCorp === "skip" ? null : saveState.chosenCorp,
      saveState.chosenContact === "skip" ? null : saveState.chosenContact
    );
  }

  async function doSave(corporationId: number | null, contactId: number | null) {
    if (!result) return;
    setSaveError(null);
    setSaveState({ step: "saving" });
    try {
      const bh = await createJob(result, corporationId, contactId);
      setSaveState({ step: "done", result: bh });
    } catch (err) {
      setSaveState({ step: "idle" });
      setSaveError(err instanceof Error ? err.message : "Bullhorn fout");
    }
  }

  const totalFields = result ? Object.keys(result.confidence).length : 0;
  const foundFields = result ? Object.values(result.confidence).filter((c) => c !== "niet_gevonden").length : 0;
  const hoogFields = result ? Object.values(result.confidence).filter((c) => c === "hoog").length : 0;

  // Determine if confirm button should be enabled
  const canConfirm =
    saveState.step === "needs-selection" &&
    (saveState.corpCandidates.length === 0 || saveState.chosenCorp !== null) &&
    (saveState.contactCandidates.length === 0 || saveState.chosenContact !== null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-mark">B</span>
            <div>
              <h1>Bullhorn Parser</h1>
              <p className="subtitle">Functieprofiel → Bullhorn velden</p>
            </div>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="input-panel">
          {/* ── Parse card ── */}
          <div className="card">
            <div className="card-body">
              <label className="form-label" htmlFor="api-key">Anthropic API-sleutel</label>
              <input
                id="api-key"
                type="password"
                className="form-input"
                placeholder="sk-ant-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
            </div>
            <div className="card-body">
              <label className="form-label" htmlFor="profile">Functieprofiel</label>
              <textarea
                id="profile"
                className="form-textarea"
                placeholder="Plak hier het functieprofiel..."
                rows={14}
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
              />
            </div>
            {parseError && <div className="error-box">{parseError}</div>}
            <div className="card-footer">
              <button className="btn-primary" onClick={handleParse} disabled={streaming}>
                {streaming ? <><span className="spinner" /> Verwerken...</> : "Analyseer functieprofiel"}
              </button>
            </div>
          </div>

          {streaming && streamPreview && (
            <div className="stream-preview">
              <p className="stream-label">JSON wordt opgebouwd...</p>
              <pre className="stream-text">{streamPreview}</pre>
            </div>
          )}

          {/* ── Bullhorn save card ── */}
          {result && (
            <div className="card">
              <div className="card-body">
                <p className="form-label">Bullhorn</p>

                {saveState.step === "done" ? (
                  <div className="bullhorn-success">
                    <p>
                      ✓ Vacature aangemaakt —{" "}
                      <a href={saveState.result.url} target="_blank" rel="noreferrer">
                        JobOrder #{saveState.result.jobId}
                      </a>
                    </p>
                    {saveState.result.linkedCorporation && result.opdrachtgever && (
                      <p className="bullhorn-linked">✓ Opdrachtgever gekoppeld: {result.opdrachtgever}</p>
                    )}
                    {saveState.result.linkedContact && result.contact && (
                      <p className="bullhorn-linked">✓ Contact gekoppeld: {result.contact}</p>
                    )}
                    {saveState.result.warnings.map((w, i) => (
                      <p key={i} className="bullhorn-warning">⚠ {w}</p>
                    ))}
                  </div>
                ) : (
                  <>
                    {saveError && (
                      <div className="error-box" style={{ marginBottom: "0.75rem" }}>{saveError}</div>
                    )}

                    {/* Pickers for ambiguous matches */}
                    {saveState.step === "needs-selection" && (
                      <div className="pickers">
                        {saveState.corpCandidates.length > 0 && result.opdrachtgever && (
                          <EntityPicker
                            label="Opdrachtgever"
                            searchName={result.opdrachtgever}
                            candidates={saveState.corpCandidates}
                            selected={saveState.chosenCorp}
                            onSelect={(id) =>
                              setSaveState({ ...saveState, chosenCorp: id })
                            }
                          />
                        )}
                        {saveState.contactCandidates.length > 0 && result.contact && (
                          <EntityPicker
                            label="Contact"
                            searchName={result.contact}
                            candidates={saveState.contactCandidates}
                            selected={saveState.chosenContact}
                            onSelect={(id) =>
                              setSaveState({ ...saveState, chosenContact: id })
                            }
                          />
                        )}
                        <button
                          className="btn-bullhorn"
                          onClick={handleConfirmSelection}
                          disabled={!canConfirm}
                        >
                          Bevestig en opslaan in Bullhorn
                        </button>
                      </div>
                    )}

                    {(saveState.step === "idle" || saveState.step === "looking-up") && (
                      <button
                        className="btn-bullhorn"
                        onClick={handleStartSave}
                        disabled={saveState.step === "looking-up"}
                      >
                        {saveState.step === "looking-up"
                          ? <><span className="spinner spinner-dark" /> Opzoeken...</>
                          : "Opslaan in Bullhorn"}
                      </button>
                    )}

                    {saveState.step === "saving" && (
                      <button className="btn-bullhorn" disabled>
                        <span className="spinner spinner-dark" /> Opslaan...
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Results panel ── */}
        {result && (
          <div className="results-panel">
            <div className="results-header">
              <h2 className="results-title">Resultaat</h2>
              <div className="stats">
                <span className="stat"><span className="stat-dot dot-green" />{hoogFields} hoog</span>
                <span className="stat"><span className="stat-dot dot-orange" />{foundFields - hoogFields} laag</span>
                <span className="stat"><span className="stat-dot dot-gray" />{totalFields - foundFields} niet gevonden</span>
              </div>
            </div>
            {SECTIONS.map((section) => (
              <Section key={section.title} title={section.title} fields={section.fields} result={result} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
