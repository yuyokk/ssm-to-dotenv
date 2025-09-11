#!/usr/bin/env node
import { handler } from "../main.js";

handler()
  .then(() => {
    console.log("[ssm-to-dotenv] Script completed successfully");
  })
  .catch((error) => {
    console.error("[ssm-to-dotenv] Script failed");
    console.error(error);
    process.exit(1);
  });
