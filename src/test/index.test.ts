// import { vitest, expect, describe, it, beforeEach } from "vitest";
// import * as fs from "node:fs";
// import * as promises from "node:fs/promises";

// vitest.mock("fs", () => {
//   const fs = vitest.importActual("node:fs");
//   const promises = vitest.importActual("node:fs/promises");
//   return {
//     ...fs,
//     promises: {
//       ...promises,
//       readFile: vitest.fn(promises["readFile"]),
//       access: vitest.fn(promises["access"]),
//     },
//     accessSync: vitest.fn(fs["accessSync"]),
//     readFileSync: vitest.fn(fs["readFileSync"]),
//   };
// });

// beforeEach(() => {
//   vitest.clearAllMocks();
// });

// describe("initGlobalConfig", () => {
//   it("should be correct", () => {
//     expect(1).toEqual(1);
//   });
// });
