import { describe, expect, it } from "vitest";
import { formatTimecode, parseHashtags, parseTimecode } from "./admin-agency";

describe("saisie des clips", () => {
  it("convertit les horodatages", () => {
    expect(parseTimecode("1:05:30")).toBe(3930);
    expect(parseTimecode("05:30")).toBe(330);
    expect(parseTimecode("")).toBeNull();
    expect(formatTimecode(3930)).toBe("1:05:30");
    expect(formatTimecode(330)).toBe("5:30");
  });

  it("nettoie les hashtags", () => {
    expect(parseHashtags("#live, fou-rire #live  twitch")).toEqual(["live", "fourire", "twitch"]);
  });
});
