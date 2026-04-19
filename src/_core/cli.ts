import { DocGenerator } from "./DocGenerator";

async function run() {
   const docGenerator = new DocGenerator();
   const startTime = Date.now();

   try {
      console.log(`\n\x1b[46m\x1b[30m\x1b[1m START \x1b[0m \x1b[36m🚀 Starting Documentation Engine...\x1b[0m`);
      console.log(`\x1b[90m${'━'.repeat(50)}\x1b[0m`);

      await docGenerator.generateDocs();

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log(`\x1b[90m${'━'.repeat(50)}\x1b[0m`);
      console.log(`\x1b[42m\x1b[30m\x1b[1m READY \x1b[0m \x1b[32m✨ All files generated in \x1b[1m${duration}s!\x1b[0m`);
      console.log(`\x1b[90m📂 Check your \x1b[36m/problems\x1b[90m folder for output.\x1b[0m\n`);

   } catch (error) {
      const stack = error instanceof Error ? error.stack : String(error);
      console.error(`\n\x1b[41m\x1b[37m\x1b[1m FATAL ERROR \x1b[0m \x1b[31m💥 System crash:\x1b[0m`);
      console.error(`\x1b[90m${stack || error}\x1b[0m\n`);

      process.exit(1); // Exit with error code
   }
}

run();