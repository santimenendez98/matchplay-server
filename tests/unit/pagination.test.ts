import { parsePagination } from "../../src/services/pagination";

describe("parsePagination", () => {
  it("returns defaults for empty query", () => {
    expect(parsePagination({})).toEqual({ limit: 50, offset: 0 });
  });

  it("clamps limit to MAX_LIMIT (200)", () => {
    expect(parsePagination({ limit: "5000" }).limit).toBe(200);
  });

  it("ignores negative limit", () => {
    expect(parsePagination({ limit: "-5" }).limit).toBe(50);
  });

  it("ignores non-numeric values", () => {
    expect(parsePagination({ limit: "abc", offset: "xyz" })).toEqual({
      limit: 50,
      offset: 0,
    });
  });

  it("floors decimal offsets", () => {
    expect(parsePagination({ offset: "10.7" }).offset).toBe(10);
  });

  it("accepts valid pagination", () => {
    expect(parsePagination({ limit: "25", offset: "100" })).toEqual({
      limit: 25,
      offset: 100,
    });
  });
});
