// DPT demo state (round 66): from the business test, the procurement officer and the supplier had nothing to act on.
// The riverbank e-bidding (PC-2570-003) closed for bids yesterday, so its bids wait to be recorded; the online
// building-permit system (PP-2570-005, 400,000 baht) has an approved requisition, the specific method and an RFQ
// waiting for the sample supplier's reply. Every value is sample data. Left out of the artifact build (*data-dpt*).
{
  const base = SEEDS.dpt.seed;
  SEEDS.dpt.seed = () => {
    const s = base(), ev = (c, t, type, by, detail) => s.caseEvents.unshift({ t, case: c.id, type, by, detail: detail || "", state: c.state });
    const rb = s.cases.find(c => c.id === "PC-2570-003");
    if (rb && rb.egp) { rb.egp.close = "2026-10-15"; rb.closeElapsed = true; }
    const p = s.pplan.find(x => x.id === "PP-2570-005"), c = s.cases.find(x => x.plan === "PP-2570-005"), v = s.vendors.find(x => x.id === "V-001");
    if (p && c && v) {
      const rq = { id: "RQ-2570-005", plan: p.id, by: "u1", amount: p.est, why: ["เริ่มให้บริการยื่นขออนุญาตก่อสร้างออนไลน์ในจังหวัดนำร่อง", "Start online building-permit filing in the pilot provinces"],
        need: "2026-12-01", status: "approved", t: "2026-10-08T09:00", decided: { by: "u3", holder: "u3", via: null, t: "2026-10-09T15:00" } };
      s.reqn.push(rq); p.status = "requisitioned";
      Object.assign(c, { reqn: rq.id, state: 4, method: "specific", methodWhy: ["ตรงกับคำแนะนำของระบบ", "Matches the system advice"], methodApproval: { status: "auto", t: "2026-10-09T16:00", by: "u10" } });
      c.rfq = [{ no: "พด 0705/ว 112", sent: "2026-10-12", due: "2026-10-21", by: "u10", rows: [{ v: v.name, reply: null }, { v: (s.vendors.find(x => x.id === "V-003") || v).name, reply: null }] }];
      ev(c, "2026-10-08T09:00", "requested", "u1", rq.id); ev(c, "2026-10-09T15:00", "approved", "u3", rq.id);
      ev(c, "2026-10-09T16:00", "method", "u10", "specific"); ev(c, "2026-10-12T10:00", "rfq_sent", "u10", c.rfq[0].no);
    }
    return s;
  };
}
