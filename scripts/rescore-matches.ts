/**
 * Re-classifies every existing "needs_review" job match using hard-requirement
 * evaluation and permanently deletes reject-tier matches.
 *
 * SAFE: Only touches "needs_review" matches. Favorited jobs are never deleted.
 *
 * DRY RUN (default):
 *   npx tsx scripts/rescore-matches.ts
 *
 * LIVE RUN:
 *   npx tsx scripts/rescore-matches.ts --confirm
 */

import { PrismaClient } from "@prisma/client";
import { rescoreNeedsReviewMatches } from "../src/lib/job-search/rescore-matches";

const prisma = new PrismaClient();
const isDryRun = !process.argv.includes("--confirm");

function log(msg: string) { console.log(msg); }
function section(title: string) { console.log(`\n── ${title}`); }

async function main() {
  if (isDryRun) {
    log("DRY RUN — pass --confirm to delete rejects and update match tiers.\n");
  } else {
    log("LIVE RUN — reclassifying and pruning needs_review matches.\n");
  }

  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" }, select: { id: true } });
  const result = await rescoreNeedsReviewMatches({ dryRun: isDryRun, userId: user?.id });

  log(`Found ${result.total} needs_review matches to reclassify.`);

  section("Results");
  log(`  ${result.toDelete} reject-tier matches → will be permanently deleted`);
  log(`  ${result.skippedFavorites} favorited reject matches → will be updated, not deleted`);
  log(`  ${result.fullCount} full matches → will be updated`);
  log(`  ${result.partialCount} partial matches → will be updated`);

  if (result.sampleDeletes.length > 0) {
    section("Sample rejects (up to 20)");
    for (const item of result.sampleDeletes) {
      log(`  ✗ ${item.job}`);
      log(`    ${item.reason}`);
    }
  }

  if (result.sampleUpdates.length > 0) {
    section("Sample updates (up to 10)");
    for (const item of result.sampleUpdates) {
      log(`  ${item.tier === "full" ? "✓" : item.tier === "partial" ? "~" : "✗"} [${item.tier}] ${item.job}`);
      if (item.pendingRequirements.length) {
        log(`    pending: ${item.pendingRequirements.join("; ")}`);
      }
    }
  }

  if (isDryRun) {
    log("\nRun with --confirm to apply changes.");
    return;
  }

  section("Applying changes");
  log(`  Deleted ${result.deleted} reject-tier matches`);
  log(`  Updated ${result.updated} remaining matches (${result.fullCount} full, ${result.partialCount} partial)`);
  log("\n✓ Done. Refresh /jobs to see full vs partial queues.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
