#!/usr/bin/env node

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const requiredDevDependencies = [
  "typescript",
  "tailwindcss",
  "@tailwindcss/postcss",
];

const missing = requiredDevDependencies.filter((name) => {
  try {
    require.resolve(name);
    return false;
  } catch {
    return true;
  }
});

const productionEnvironment = process.env.NODE_ENV === "production";

if (!productionEnvironment && missing.length === 0) {
  process.exit(0);
}

const reasons = [];
if (productionEnvironment) {
  reasons.push("NODE_ENV=production is set, which causes npm to omit devDependencies during install.");
}
if (missing.length > 0) {
  reasons.push(`Missing development dependencies: ${missing.join(", ")}.`);
}

console.error("\nAbleArc Workspace cannot start the development server safely.");
for (const reason of reasons) {
  console.error(`- ${reason}`);
}
console.error(
  "\nReinstall the Workspace development dependencies with NODE_ENV unset or set to development, for example:\n" +
  "  npm install --include=dev\n\n" +
  "Then run npm run dev again. This guard prevents Next.js from attempting a hidden dependency install after reporting that the server is ready.\n"
);
process.exit(1);
