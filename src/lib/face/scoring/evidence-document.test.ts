import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { METRICS } from "@/lib/face/metrics";

test("the evidence catalog names every metric", () => {
  const document = readFileSync("docs/measurement-evidence.md", "utf8");
  for (const metric of METRICS) {
    expect(document).toContain(`\`${metric.id}\``);
  }
  expect(document).toContain("PMID 19896961");
  expect(document).toContain("PMID 10825783");
});
