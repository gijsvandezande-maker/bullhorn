import { Router } from "express";
import axios from "axios";
import { getSession, invalidateSession } from "../bullhorn/auth.js";
import { mapToJobOrder } from "../bullhorn/mappers.js";
import type { ParsedProfile } from "../bullhorn/mappers.js";

const router = Router();

/** POST /api/bullhorn/job — create a JobOrder from parsed profile */
router.post("/job", async (req, res) => {
  try {
    const parsed: ParsedProfile = req.body;

    if (!parsed.functietitel) {
      res.status(400).json({ error: "functietitel is verplicht voor Bullhorn" });
      return;
    }

    const session = await getSession();

    // Strip internal _fields before sending to Bullhorn
    const jobOrder = mapToJobOrder(parsed);
    const { _opdrachtgever, _contact, ...bullhornBody } = jobOrder as Record<string, unknown>;

    const url = `${session.restUrl}entity/JobOrder?BhRestToken=${session.BhRestToken}`;
    const response = await axios.put(url, bullhornBody);

    const jobId: number = response.data.changedEntityId;

    res.json({
      jobId,
      url: `https://cls.bullhornstaffing.com/BullhornStaffing/OpenWindow.cfm?entity=JobOrder&id=${jobId}`,
      warnings: [
        ...(_opdrachtgever
          ? [`Opdrachtgever "${_opdrachtgever}" moet handmatig worden gekoppeld in Bullhorn`]
          : []),
        ...(_contact
          ? [`Contact "${_contact}" moet handmatig worden gekoppeld in Bullhorn`]
          : []),
      ],
    });
  } catch (err: unknown) {
    // If session expired, invalidate and retry once
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
