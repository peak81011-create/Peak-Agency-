import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("export CSV", () => {
  it("échappe les séparateurs, guillemets et formules", () => {
    const csv = toCsv(["a", "b"], [["x;y", 'il a dit "oui"'], ["=SUM(A1)", null]]);
    expect(csv).toBe('﻿a;b\r\n"x;y";"il a dit ""oui"""\r\n\'=SUM(A1);');
  });
});
