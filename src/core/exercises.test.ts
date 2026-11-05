import { describe, expect, it } from "vitest";
import { ANGLES, EXERCISES } from "./exercises";

// D-014 supports one lift from one view. Extra entries or tagline fields would
// advertise measurements the app does not make.
describe("supported lift and view metadata", () => {
  it("describes only the bench press, by name and accent", () => {
    expect(EXERCISES).toEqual({ bench: { id: "bench", name: "Bench Press", accent: "#f472b6" } });
  });

  it("describes only the side view, by name", () => {
    expect(ANGLES).toEqual({ side: { id: "side", name: "Side" } });
  });
});
