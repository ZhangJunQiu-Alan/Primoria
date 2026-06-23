#!/usr/bin/env tsx

import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failed: ${message}`);
}

function read(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

async function main() {
  const libraryPage = read("src/app/library/page.tsx");
  const libraryGrid = read("src/components/library/course-library-grid.tsx");
  const generativeUi = read("src/hooks/use-primoria-copilot.tsx");
  const toolCard = read("src/components/generative-ui/tool-card.tsx");
  const styles = read("src/app/globals.css");

  assert(libraryPage.includes("CourseLibraryGrid"), "library delegates course grid to client component");
  assert(libraryPage.includes("listActiveLessonGenerationJobsByOwner"), "library fetches active lesson generation jobs");
  assert(libraryGrid.includes("/api/lesson-generation-jobs"), "library course grid polls lesson generation jobs");
  assert(libraryGrid.includes("/api/courses"), "library course grid refreshes completed courses");
  assert(libraryGrid.includes("library-card-generating"), "library renders generating placeholders");
  assert(libraryGrid.includes("library-card-failed"), "library renders failed placeholders");
  assert(libraryGrid.includes("window.setInterval"), "library keeps polling while jobs are active");
  assert(libraryGrid.includes("Filter by Status"), "library exposes a status filter menu");
  assert(libraryGrid.includes("SortHeaderButton"), "library exposes sortable table headers");
  assert(libraryGrid.includes("sortEntries"), "library sorts course rows client-side");
  assert(styles.includes(".library-card-generating"), "generating placeholders have dedicated styling");
  assert(styles.includes(".library-card-failed"), "failed placeholders have dedicated styling");
  assert(styles.includes(".library-filter-menu"), "status filter menu has dedicated styling");
  assert(styles.includes(".library-sort-button"), "sortable headers have dedicated styling");

  for (const blockType of ["quiz", "mind_map", "slide", "worksheet"]) {
    assert(generativeUi.includes(`"${blockType}"`), `course card parser accepts ${blockType} outline items`);
  }

  assert(
    toolCard.includes('artifact.status === "ready"'),
    "chat course card only navigates once a course is ready",
  );

  process.stdout.write("[course-generation-ui-static.unit] ALL CHECKS PASSED\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
