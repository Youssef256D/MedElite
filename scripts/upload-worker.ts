import { processPendingUploadJobs } from "../src/modules/uploads/service";

async function loop() {
  while (true) {
    try {
      const processed = await processPendingUploadJobs(10);
      console.log(`[worker] processed ${processed.length} upload job(s)`);
    } catch (error) {
      console.error("[worker] upload processing failed", error);
    }

    await new Promise((resolve) => setTimeout(resolve, 15_000));
  }
}

loop().catch((error) => {
  console.error(error);
  process.exit(1);
});
