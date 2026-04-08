import { processPendingUploadJobs } from "../src/modules/uploads/service";

async function main() {
  const processed = await processPendingUploadJobs();
  console.log(`Processed ${processed.length} upload job(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
