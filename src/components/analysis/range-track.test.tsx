/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { RangeTrack } from "@/components/analysis/range-track";

test("places a marker for a value inside the reference window", () => {
  const { container } = render(<RangeTrack min={0.44} max={0.48} value={0.47} />);
  expect(screen.getByText("reference")).toBeTruthy();
  expect(container.querySelector(".bg-ink")).toBeTruthy();
});

test("omits the marker when the measurement could not be calculated", () => {
  const { container } = render(<RangeTrack min={1} max={2} value={null} />);
  expect(container.querySelector(".bg-ink")).toBeNull();
});
