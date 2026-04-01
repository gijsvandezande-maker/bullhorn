import axios from "axios";
import type { Session } from "./auth.js";

export interface BhCorporation {
  id: number;
  name: string;
}

export interface BhContact {
  id: number;
  firstName: string;
  lastName: string;
  name: string;
}

/** Search ClientCorporation by name — returns best match or null */
export async function findCorporation(
  session: Session,
  name: string
): Promise<{ match: BhCorporation | null; candidates: BhCorporation[] }> {
  const encoded = encodeURIComponent(`name:"${name}"`);
  const url =
    `${session.restUrl}search/ClientCorporation` +
    `?query=${encoded}&fields=id,name&count=10&BhRestToken=${session.BhRestToken}`;

  const res = await axios.get(url);
  const items: BhCorporation[] = res.data.data ?? [];

  if (items.length === 0) return { match: null, candidates: [] };

  // Exact match first
  const exact = items.find(
    (c) => c.name.toLowerCase() === name.toLowerCase()
  );
  if (exact) return { match: exact, candidates: items };

  // Single result → use it
  if (items.length === 1) return { match: items[0], candidates: items };

  // Multiple → return candidates for user to choose
  return { match: null, candidates: items };
}

/** Search ClientContact by full name — returns best match or null */
export async function findContact(
  session: Session,
  fullName: string
): Promise<{ match: BhContact | null; candidates: BhContact[] }> {
  // Try full name search first
  const encoded = encodeURIComponent(`name:"${fullName}"`);
  const url =
    `${session.restUrl}search/ClientContact` +
    `?query=${encoded}&fields=id,firstName,lastName,name&count=10&BhRestToken=${session.BhRestToken}`;

  const res = await axios.get(url);
  const items: BhContact[] = res.data.data ?? [];

  if (items.length === 0) return { match: null, candidates: [] };

  const exact = items.find(
    (c) => c.name?.toLowerCase() === fullName.toLowerCase()
  );
  if (exact) return { match: exact, candidates: items };
  if (items.length === 1) return { match: items[0], candidates: items };

  return { match: null, candidates: items };
}
