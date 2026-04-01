export type Confidence = "hoog" | "laag" | "niet_gevonden";

export interface ParseResult {
  functietitel: string | null;
  expertisegebied: string | null;
  contract_type: "ZZP" | "Detachering" | "Deta-vast" | "W&S" | null;
  vertical: string | null;
  startdatum: string | null;
  geplande_einddatum: string | null;
  deadline_aanbieden: string | null;
  opdrachtgever: string | null;
  contact: string | null;
  verkooptarief: number | null;
  dit_zijn_wij: string | null;
  dit_ga_je_doen: string | null;
  dit_ben_jij: string | null;
  knock_out: string | null;
  nice_to_have: string | null;
  vaardigheden: string | null;
  jaren_ervaring: string | null;
  diploma: string | null;
  certificaten: string | null;
  tarief_range: string | null;
  salaris_range: string | null;
  inkoop_tarief: number | null;
  uren_per_week: number | null;
  flexibiliteit: string | null;
  dit_krijg_jij: string | null;
  adres: string | null;
  stad: string | null;
  postcode: string | null;
  regio: string | null;
  samenvatting: string | null;
  confidence: Record<keyof Omit<ParseResult, "confidence">, Confidence>;
}

export type FieldKey = keyof Omit<ParseResult, "confidence">;

export interface SectionDef {
  title: string;
  fields: FieldKey[];
}

export const SECTIONS: SectionDef[] = [
  {
    title: "Algemeen",
    fields: [
      "functietitel",
      "expertisegebied",
      "contract_type",
      "vertical",
      "startdatum",
      "geplande_einddatum",
      "deadline_aanbieden",
    ],
  },
  {
    title: "Opdrachtgever",
    fields: ["opdrachtgever", "contact", "verkooptarief", "dit_zijn_wij"],
  },
  {
    title: "Functie omschrijving",
    fields: ["dit_ga_je_doen"],
  },
  {
    title: "Functie-eisen",
    fields: [
      "dit_ben_jij",
      "knock_out",
      "nice_to_have",
      "vaardigheden",
      "jaren_ervaring",
      "diploma",
      "certificaten",
    ],
  },
  {
    title: "Aanbod",
    fields: [
      "tarief_range",
      "salaris_range",
      "inkoop_tarief",
      "uren_per_week",
      "flexibiliteit",
      "dit_krijg_jij",
    ],
  },
  {
    title: "Locatie",
    fields: ["adres", "stad", "postcode", "regio"],
  },
  {
    title: "Samenvatting",
    fields: ["samenvatting"],
  },
];

export const FIELD_LABELS: Record<FieldKey, string> = {
  functietitel: "Functietitel",
  expertisegebied: "Expertisegebied",
  contract_type: "Contract professional",
  vertical: "Vertical",
  startdatum: "Startdatum",
  geplande_einddatum: "Geplande Einddatum",
  deadline_aanbieden: "Deadline aanbieden",
  opdrachtgever: "Opdrachtgever",
  contact: "Contact",
  verkooptarief: "Verkooptarief Opdrachtgever",
  dit_zijn_wij: "Dit zijn wij",
  dit_ga_je_doen: "Dit ga je doen",
  dit_ben_jij: "Dit ben jij",
  knock_out: "Knock out",
  nice_to_have: "Nice to have",
  vaardigheden: "Vaardigheden",
  jaren_ervaring: "Aantal Jaren Ervaring",
  diploma: "Diploma",
  certificaten: "Certificaten",
  tarief_range: "Tarief range per uur",
  salaris_range: "Salaris range",
  inkoop_tarief: "Verwacht inkoop tarief",
  uren_per_week: "Aantal Uren per Week",
  flexibiliteit: "Flexibiliteit",
  dit_krijg_jij: "Dit krijg jij",
  adres: "Adres locatie",
  stad: "Stad",
  postcode: "Postcode",
  regio: "Regio",
  samenvatting: "Samenvatting Vacature",
};

export const RICH_TEXT_FIELDS: FieldKey[] = [
  "dit_zijn_wij",
  "dit_ga_je_doen",
  "dit_ben_jij",
  "dit_krijg_jij",
  "samenvatting",
];
