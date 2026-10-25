import { existsSync, readFileSync } from "node:fs";

/**
 * Pre-approval curriculum/KG migration scripts rebuild their outputs with
 * review_status "needs_review". Rerunning one after an owner approval landed would
 * silently revoke that approval and revert later reviewed corrections, so refuse
 * before writing anything. Change approved content through a new review record.
 */
export function refuseOwnerApprovedTargets(paths) {
  const approved = Object.values(paths).filter((path) => {
    if (!path.endsWith(".json") || !existsSync(path)) return false;
    return JSON.parse(readFileSync(path, "utf8")).review_status === "approved";
  });
  if (approved.length === 0) return;
  process.stderr.write(
    `Refusing to run: these owner-approved KG files would be rewritten as needs_review:\n${approved
      .map((path) => `  ${path}`)
      .join("\n")}\nChange approved content through a new review record instead.\n`,
  );
  process.exit(1);
}
