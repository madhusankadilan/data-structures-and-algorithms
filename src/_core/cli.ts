import { DocGenerator } from "./DocGenerator";

async function run() {
   const docGenerator = new DocGenerator();
   const startTime = Date.now();

   try {
      console.log("\n🚀  [BUILD] Starting Documentation Engine...");
      console.log("-------------------------------------------");

      await docGenerator.generateDocs();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log("-------------------------------------------");
      console.log(`✨  [DONE] All files generated in ${duration}s!`);
      console.log("📂  Check your /problems folder for output.\n");
   } catch (error) {
      console.error("\n💥  [FATAL ERROR]:", error);
      process.exit(1); // Exit with error code
   }
}

run();