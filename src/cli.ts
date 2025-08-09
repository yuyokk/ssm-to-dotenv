#!/usr/bin/env node
import { handler } from "./handler.js";

// npx tsx ./src/cli.ts

handler()
  .then(() => {
    console.log("Script completed successfully");
  })
  .catch((error) => {
    console.error("Script failed");
    console.error(error);
    process.exit(1);
  });
