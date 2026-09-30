import { aiEnabled, rewriteReasons } from "./match-reasons.js";
import { loadWorkbook } from "./sheet-client.js";
import { buildDesk, rewriteSuggestionReasons } from "./workbook.js";

export async function loadDesk() {
  const workbook = await loadWorkbook();
  const desk = buildDesk(workbook);
  if (!aiEnabled()) return desk;
  try {
    const reasons = [];
    for (const row of [...desk.working, ...desk.subs]) {
      if (row.suggestion?.reason) reasons.push(row.suggestion.reason);
    }
    const rewritten = await rewriteReasons(reasons);
    if (rewritten) await rewriteSuggestionReasons(desk, async () => rewritten);
  } catch (err) {
    console.error("Match reasons stayed as subject matches:", err);
  }
  return desk;
}
