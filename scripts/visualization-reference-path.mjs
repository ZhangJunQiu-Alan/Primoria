import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Reference-site inventory and observation evidence are third-party material
// and stay outside the public repository (gitignored .private/). Override with
// PRIMORIA_REFERENCE_INVENTORY when the private copy lives elsewhere.
const root = fileURLToPath(new URL("../", import.meta.url));

export const REFERENCE_PRIVATE_DIR = resolve(root, ".private/visualization-reference");

export function referenceInventoryPath() {
  return process.env.PRIMORIA_REFERENCE_INVENTORY
    ? resolve(process.env.PRIMORIA_REFERENCE_INVENTORY)
    : resolve(REFERENCE_PRIVATE_DIR, "reference-inventory.v1.json");
}
