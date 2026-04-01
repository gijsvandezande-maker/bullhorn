export interface ParsedProfile {
  functietitel?: string | null;
  expertisegebied?: string | null;
  contract_type?: "ZZP" | "Detachering" | "Deta-vast" | "W&S" | null;
  vertical?: string | null;
  startdatum?: string | null;
  geplande_einddatum?: string | null;
  opdrachtgever?: string | null;
  contact?: string | null;
  verkooptarief?: number | null;
  dit_zijn_wij?: string | null;
  dit_ga_je_doen?: string | null;
  dit_ben_jij?: string | null;
  knock_out?: string | null;
  nice_to_have?: string | null;
  vaardigheden?: string | null;
  jaren_ervaring?: string | null;
  diploma?: string | null;
  certificaten?: string | null;
  tarief_range?: string | null;
  salaris_range?: string | null;
  inkoop_tarief?: number | null;
  uren_per_week?: number | null;
  flexibiliteit?: string | null;
  dit_krijg_jij?: string | null;
  adres?: string | null;
  stad?: string | null;
  postcode?: string | null;
  regio?: string | null;
  samenvatting?: string | null;
}

const CONTRACT_TYPE_MAP: Record<string, string> = {
  ZZP: "Contract",
  Detachering: "Contract",
  "Deta-vast": "Temp to Perm",
  "W&S": "Direct Hire",
};

/** Parse DD/MM/YYYY → Bullhorn timestamp (ms) */
function parseDate(value: string): number | null {
  const [day, month, year] = value.split("/").map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day).getTime();
}

/** Extract first number from strings like "3-5 jaar" → 3 */
function parseYears(value: string): number | null {
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

/** Build a full description combining all text sections */
function buildDescription(p: ParsedProfile): string {
  const parts: string[] = [];
  if (p.dit_ga_je_doen) parts.push(`Wat ga je doen:\n${p.dit_ga_je_doen}`);
  if (p.dit_ben_jij) parts.push(`Dit ben jij:\n${p.dit_ben_jij}`);
  if (p.knock_out) parts.push(`Knock-out eisen:\n${p.knock_out}`);
  if (p.nice_to_have) parts.push(`Nice to have:\n${p.nice_to_have}`);
  if (p.dit_krijg_jij) parts.push(`Wat krijg je:\n${p.dit_krijg_jij}`);
  if (p.dit_zijn_wij) parts.push(`Over ons:\n${p.dit_zijn_wij}`);
  return parts.join("\n\n");
}

export function mapToJobOrder(p: ParsedProfile): Record<string, unknown> {
  const job: Record<string, unknown> = {
    numOpenings: 1,
    status: "Accepting Candidates",
    type: "Permanent",
  };

  if (p.functietitel) job.title = p.functietitel;
  if (p.samenvatting) job.publicDescription = p.samenvatting;
  if (p.uren_per_week) job.hoursPerWeek = p.uren_per_week;
  if (p.inkoop_tarief) job.payRate = p.inkoop_tarief;
  if (p.verkooptarief) job.clientBillRate = p.verkooptarief;
  if (p.diploma) job.educationDegree = p.diploma;
  if (p.vaardigheden) job.skillList = p.vaardigheden;
  if (p.certificaten) job.certifications = p.certificaten;
  if (p.flexibiliteit) job.onSite = p.flexibiliteit;
  if (p.tarief_range) job.salaryRange = p.tarief_range;
  else if (p.salaris_range) job.salaryRange = p.salaris_range;

  if (p.jaren_ervaring) {
    const yrs = parseYears(p.jaren_ervaring);
    if (yrs !== null) job.yearsRequired = yrs;
  }

  if (p.contract_type) {
    job.employmentType = CONTRACT_TYPE_MAP[p.contract_type] ?? "Contract";
  }

  const description = buildDescription(p);
  if (description) job.description = description;

  if (p.startdatum) {
    const ts = parseDate(p.startdatum);
    if (ts) job.startDate = ts;
  }
  if (p.geplande_einddatum) {
    const ts = parseDate(p.geplande_einddatum);
    if (ts) job.dateEnd = ts;
  }

  // Address
  const address: Record<string, unknown> = { countryID: 1 }; // Netherlands
  if (p.adres) address.address1 = p.adres;
  if (p.stad) address.city = p.stad;
  if (p.postcode) address.zip = p.postcode;
  if (p.regio) address.state = p.regio;
  if (Object.keys(address).length > 1) job.address = address;

  // clientCorporation: lookup by name not possible without extra API call
  // Return opdrachtgever as a note so the front-end can show it
  if (p.opdrachtgever) job._opdrachtgever = p.opdrachtgever;
  if (p.contact) job._contact = p.contact;

  return job;
}
