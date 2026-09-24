/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { RangeTrack } from "@/components/analysis/range-track";

test("names a value inside the aesthetic target", () => {
  render(<RangeTrack min={115} max={140} idealMin={120} idealMax={132} value={126} unit="degrees" />);
  expect(screen.getByText(/within target/)).toBeTruthy();
  expect(screen.getAllByText("Outside").length).toBeGreaterThan(0);
  expect(screen.getByText("Target")).toBeTruthy();
});

test("names a value past the harmony range", () => {
  render(<RangeTrack min={0} max={6} idealMin={0} idealMax={2} value={9} unit="percent" />);
  expect(screen.getByText(/outside reference/)).toBeTruthy();
});

test("omits the marker when the measurement could not be calculated", () => {
  const { container } = render(<RangeTrack min={1} max={2} idealMin={1.25} idealMax={1.75} value={null} unit="ratio" />);
  expect(container.querySelector(".border-ink")).toBeNull();
  expect(screen.getByText(/could not be calculated/)).toBeTruthy();
});
