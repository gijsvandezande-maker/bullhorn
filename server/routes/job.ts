import { Router } from "express";
import axios from "axios";
import { getSession, invalidateSession } from "../bullhorn/auth.js";
import { mapToJobOrder } from "../bullhorn/mappers.js";
import { findCorporation, findContact } from "../bullhorn/lookup.js";
import type { ParsedProfile } from "../bullhorn/mappers.js";

const router = Router();

/** POST /api/bullhorn/job — create a JobOrder from parsed profile */
router.post("/job", async (req, res) => {
  try {
    const parsed: ParsedProfile & { corporationId?: number; contactId?: number } = req.body;

    if (!parsed.functietitel) {
      res.status(400).json({ error: "functietitel is verplicht voor Bullhorn" });
      return;
    }

    const session = await getSession();
    const warnings: string[] = [];

    // Auto-lookup opdrachtgever → clientCorporation
    let corporationId: number | null = parsed.corporationId ?? null;
    if (!corporationId && parsed.opdrachtgever) {
      const { match, candidates } = await findCorporation(session, parsed.opdrachtgever);
      if (match) {
        corporationId = match.id;
      } else if (candidates.length > 1) {
        warnings.push(
          `Meerdere matches voor opdrachtgever "${parsed.opdrachtgever}" — kies handmatig in Bullhorn`
        );
      } else {
        warnings.push(
          `Opdrachtgever "${parsed.opdrachtgever}" niet gevonden — koppel handmatig in Bullhorn`
        );
      }
    }

    // Auto-lookup contact → clientContact
    let contactId: number | null = parsed.contactId ?? null;
    if (!contactId && parsed.contact) {
      const { match, candidates } = await findContact(session, parsed.contact);
      if (match) {
        contactId = match.id;
      } else if (candidates.length > 1) {
        warnings.push(
          `Meerdere matches voor contact "${parsed.contact}" — kies handmatig in Bullhorn`
        );
      } else {
        warnings.push(
          `Contact "${parsed.contact}" niet gevonden — koppel handmatig in Bullhorn`
        );
      }
    }

    // Build job order body
    const jobOrder = mapToJobOrder(parsed);
    const { _opdrachtgever: _o, _contact: _c, ...bullhornBody } = jobOrder as Record<string, unknown>;
    void _o; void _c;

    if (corporationId) {
      bullhornBody.clientCorporation = { id: corporationId };
    }
    if (contactId) {
      bullhornBody.clientContact = { id: contactId };
    }

    const url = `${session.restUrl}entity/JobOrder?BhRestToken=${session.BhRestToken}`;
    const response = await axios.put(url, bullhornBody);
    const jobId: number = response.data.changedEntityId;

    res.json({
      jobId,
      url: `https://cls.bullhornstaffing.com/BullhornStaffing/OpenWindow.cfm?entity=JobOrder&id=${jobId}`,
      linkedCorporation: corporationId ? { id: corporationId } : null,
      linkedContact: contactId ? { id: contactId } : null,
      warnings,
    });
  } catch (err: unknown) {
    const axiosErr = err as { response?: { status: number; data: unknown } };
    if (axiosErr.response?.status === 401) {
      invalidateSession();
      res.status(401).json({ error: "Bullhorn sessie verlopen — probeer opnieuw" });
      return;
    }
    console.error("Bullhorn API error:", axiosErr.response?.data ?? err);
    res.status(500).json({
      error: "Bullhorn API fout",
      detail: axiosErr.response?.data ?? String(err),
    });
  }
});

/** GET /api/bullhorn/search/corporation?name=... — search corporations */
router.get("/search/corporation", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (!name) { res.status(400).json({ error: "name query param required" }); return; }
  try {
    const session = await getSession();
    const { match, candidates } = await findCorporation(session, name);
    res.json({ match, candidates });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /api/bullhorn/search/contact?name=... — search contacts */
router.get("/search/contact", async (req, res) => {
  const name = String(req.query.name ?? "").trim();
  if (!name) { res.status(400).json({ error: "name query param required" }); return; }
  try {
    const session = await getSession();
    const { match, candidates } = await findContact(session, name);
    res.json({ match, candidates });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/** GET /api/bullhorn/status — verify credentials work */
router.get("/status", async (_req, res) => {
  try {
    const session = await getSession();
    res.json({ ok: true, restUrl: session.restUrl });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
