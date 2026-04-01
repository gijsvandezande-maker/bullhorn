import Anthropic from "@anthropic-ai/sdk";
import type { ParseResult } from "./types";

const SYSTEM_PROMPT = `Je bent een gespecialiseerde recruitmentsysteem-assistent voor Essentium.
Analyseer het functieprofiel en extraheer alleen onderstaande velden als JSON.

Regels:
- Vul alleen in wat aantoonbaar in het profiel staat. Verzin NOOIT iets.
- Zet ontbrekende velden op null — laat ze nooit leeg of gefabriceerd.
- Geef per veld een confidence: "hoog", "laag" of "niet_gevonden".
- Rich text velden: bewaar originele tekst als nette alinea's zonder opmaakcodes.
- knock_out: harde eisen als korte bullets, max 10 woorden per eis.
- vaardigheden: komma-gescheiden lijst van technische en soft skills.
- contract_type: kies alleen uit ["ZZP", "Detachering", "Deta-vast", "W&S", null].
- samenvatting: genereer zelf een feitelijke samenvatting van max 150 woorden
  op basis van het profiel. Dit is de enige uitzondering op de verzinregel.

Retourneer ALLEEN geldig JSON. Geen preamble, geen uitleg, geen backticks.

{
  "functietitel": string | null,
  "expertisegebied": string | null,
  "contract_type": "ZZP"|"Detachering"|"Deta-vast"|"W&S"|null,
  "vertical": string | null,
  "startdatum": string | null,
  "geplande_einddatum": string | null,
  "deadline_aanbieden": string | null,
  "opdrachtgever": string | null,
  "contact": string | null,
  "verkooptarief": number | null,
  "dit_zijn_wij": string | null,
  "dit_ga_je_doen": string | null,
  "dit_ben_jij": string | null,
  "knock_out": string | null,
  "nice_to_have": string | null,
  "vaardigheden": string | null,
  "jaren_ervaring": string | null,
  "diploma": string | null,
  "certificaten": string | null,
  "tarief_range": string | null,
  "salaris_range": string | null,
  "inkoop_tarief": number | null,
  "uren_per_week": number | null,
  "flexibiliteit": string | null,
  "dit_krijg_jij": string | null,
  "adres": string | null,
  "stad": string | null,
  "postcode": string | null,
  "regio": string | null,
  "samenvatting": string | null,
  "confidence": {
    "functietitel": "hoog"|"laag"|"niet_gevonden",
    "expertisegebied": "hoog"|"laag"|"niet_gevonden",
    "contract_type": "hoog"|"laag"|"niet_gevonden",
    "vertical": "hoog"|"laag"|"niet_gevonden",
    "startdatum": "hoog"|"laag"|"niet_gevonden",
    "geplande_einddatum": "hoog"|"laag"|"niet_gevonden",
    "deadline_aanbieden": "hoog"|"laag"|"niet_gevonden",
    "opdrachtgever": "hoog"|"laag"|"niet_gevonden",
    "contact": "hoog"|"laag"|"niet_gevonden",
    "verkooptarief": "hoog"|"laag"|"niet_gevonden",
    "dit_zijn_wij": "hoog"|"laag"|"niet_gevonden",
    "dit_ga_je_doen": "hoog"|"laag"|"niet_gevonden",
    "dit_ben_jij": "hoog"|"laag"|"niet_gevonden",
    "knock_out": "hoog"|"laag"|"niet_gevonden",
    "nice_to_have": "hoog"|"laag"|"niet_gevonden",
    "vaardigheden": "hoog"|"laag"|"niet_gevonden",
    "jaren_ervaring": "hoog"|"laag"|"niet_gevonden",
    "diploma": "hoog"|"laag"|"niet_gevonden",
    "certificaten": "hoog"|"laag"|"niet_gevonden",
    "tarief_range": "hoog"|"laag"|"niet_gevonden",
    "salaris_range": "hoog"|"laag"|"niet_gevonden",
    "inkoop_tarief": "hoog"|"laag"|"niet_gevonden",
    "uren_per_week": "hoog"|"laag"|"niet_gevonden",
    "flexibiliteit": "hoog"|"laag"|"niet_gevonden",
    "dit_krijg_jij": "hoog"|"laag"|"niet_gevonden",
    "adres": "hoog"|"laag"|"niet_gevonden",
    "stad": "hoog"|"laag"|"niet_gevonden",
    "postcode": "hoog"|"laag"|"niet_gevonden",
    "regio": "hoog"|"laag"|"niet_gevonden",
    "samenvatting": "hoog"|"laag"|"niet_gevonden"
  }
}`;

export async function parseFunctieprofiel(
  text: string,
  apiKey: string,
  onChunk: (chunk: string) => void
): Promise<ParseResult> {
  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  let fullText = "";

  const stream = await client.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      fullText += event.delta.text;
      onChunk(fullText);
    }
  }

  const cleaned = fullText.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned) as ParseResult;
}
