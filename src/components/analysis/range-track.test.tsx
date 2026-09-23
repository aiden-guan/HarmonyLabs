/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { RangeTrack } from "@/components/analysis/range-track";

test("names a value inside the ideal band as great", () => {
  render(<RangeTrack min={115} max={140} idealMin={120} idealMax={132} value={126} unit="degrees" />);
  expect(screen.getByText(/in the ideal range/)).toBeTruthy();
  expect(screen.getByText("Great")).toBeTruthy();
  expect(screen.getByText("Below usual")).toBeTruthy();
  expect(screen.getByText("Above usual")).toBeTruthy();
});

test("names a value past the usual band by direction", () => {
  render(<RangeTrack min={0} max={6} idealMin={0} idealMax={2} value={9} unit="percent" />);
  expect(screen.getByText(/above the usual range/)).toBeTruthy();
});

test("omits the marker when the measurement could not be calculated", () => {
  const { container } = render(<RangeTrack min={1} max={2} idealMin={1.25} idealMax={1.75} value={null} unit="ratio" />);
  expect(container.querySelector(".border-ink")).toBeNull();
  expect(screen.getByText(/could not be calculated/)).toBeTruthy();
});
