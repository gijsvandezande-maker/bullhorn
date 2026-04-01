import { useState } from "react";
import { parseFunctieprofiel } from "./api";
import { Section } from "./components/Section";
import type { ParseResult } from "./types";
import { SECTIONS } from "./types";
import "./App.css";

export default function App() {
  const [apiKey, setApiKey] = useState(
    () => (import.meta as unknown as { env: Record<string, string> }).env.VITE_ANTHROPIC_API_KEY ?? ""
  );
  const [profileText, setProfileText] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleParse() {
    if (!apiKey.trim()) {
      setError("Voer een Anthropic API-sleutel in.");
      return;
    }
    if (!profileText.trim()) {
      setError("Voer een functieprofiel in.");
      return;
    }
    setError(null);
    setResult(null);
    setStreamPreview("");
    setStreaming(true);

    try {
      const parsed = await parseFunctieprofiel(
        profileText,
        apiKey.trim(),
        (chunk) => setStreamPreview(chunk)
      );
      setResult(parsed);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Er is een fout opgetreden."
      );
    } finally {
      setStreaming(false);
      setStreamPreview("");
    }
  }

  const totalFields = result
    ? Object.keys(result.confidence).length
    : 0;
  const foundFields = result
    ? Object.values(result.confidence).filter((c) => c !== "niet_gevonden").length
    : 0;
  const hoogFields = result
    ? Object.values(result.confidence).filter((c) => c === "hoog").length
    : 0;

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
          <div className="card">
            <div className="card-body">
              <label className="form-label" htmlFor="api-key">
                Anthropic API-sleutel
              </label>
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
              <label className="form-label" htmlFor="profile">
                Functieprofiel
              </label>
              <textarea
                id="profile"
                className="form-textarea"
                placeholder="Plak hier het functieprofiel..."
                rows={14}
                value={profileText}
                onChange={(e) => setProfileText(e.target.value)}
              />
            </div>

            {error && <div className="error-box">{error}</div>}

            <div className="card-footer">
              <button
                className="btn-primary"
                onClick={handleParse}
                disabled={streaming}
              >
                {streaming ? (
                  <>
                    <span className="spinner" /> Verwerken...
                  </>
                ) : (
                  "Analyseer functieprofiel"
                )}
              </button>
            </div>
          </div>

          {streaming && streamPreview && (
            <div className="stream-preview">
              <p className="stream-label">JSON wordt opgebouwd...</p>
              <pre className="stream-text">{streamPreview}</pre>
            </div>
          )}
        </div>

        {result && (
          <div className="results-panel">
            <div className="results-header">
              <h2 className="results-title">Resultaat</h2>
              <div className="stats">
                <span className="stat">
                  <span className="stat-dot dot-green" />
                  {hoogFields} hoog
                </span>
                <span className="stat">
                  <span className="stat-dot dot-orange" />
                  {foundFields - hoogFields} laag
                </span>
                <span className="stat">
                  <span className="stat-dot dot-gray" />
                  {totalFields - foundFields} niet gevonden
                </span>
              </div>
            </div>

            {SECTIONS.map((section) => (
              <Section
                key={section.title}
                title={section.title}
                fields={section.fields}
                result={result}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
