import type { Config } from "jest";
import nextJest from "next/jest.js";

// next/jest wires up the Next.js SWC transform, .env loading, and CSS/image
// stubs for us. See node_modules/next/dist/docs and the Next "Testing: Jest" guide.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  // Pure-logic units run in Node; no jsdom needed (async Server Components and
  // anything DOM-bound are covered by Playwright E2E instead).
  testEnvironment: "node",
  testMatch: ["**/__tests__/unit/**/*.test.ts"],
  // Mirror the tsconfig "@/*" path alias; next/jest does not infer it.
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/$1" },
};

export default createJestConfig(config);
