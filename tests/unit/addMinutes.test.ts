import {
  addOrRemoveMinutresToTime,
  timeToMinutes,
  getCurrentTime,
  getOnlyDate,
  isWithin24Hours,
} from "../../src/services/addMinutes";

describe("addOrRemoveMinutresToTime", () => {
  it("adds minutes that don't roll the hour", () => {
    expect(addOrRemoveMinutresToTime("10:00", "+", 30)).toBe("10:30");
  });

  it("adds minutes that roll into the next hour", () => {
    expect(addOrRemoveMinutresToTime("10:45", "+", 30)).toBe("11:15");
  });

  it("subtracts minutes", () => {
    expect(addOrRemoveMinutresToTime("10:00", "-", 30)).toBe("09:30");
  });

  it("zero-pads single-digit hour/minute output", () => {
    expect(addOrRemoveMinutresToTime("09:05", "+", 0)).toBe("09:05");
  });
});

describe("timeToMinutes", () => {
  it.each([
    ["00:00", 0],
    ["01:30", 90],
    ["12:00", 720],
    ["23:59", 23 * 60 + 59],
  ])("converts %s to %i minutes", (time, expected) => {
    expect(timeToMinutes(time)).toBe(expected);
  });
});

describe("getCurrentTime", () => {
  it("returns an ISO-like Montevideo timestamp", () => {
    const value = getCurrentTime();
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe("getOnlyDate", () => {
  it("returns only the yyyy-MM-dd portion", () => {
    expect(getOnlyDate("2024-05-12T18:30:00Z")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("isWithin24Hours", () => {
  it("returns true for a reservation a few minutes in the past", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    expect(isWithin24Hours(fiveMinutesAgo)).toBe(true);
  });

  it("returns false for a reservation more than 48h in the future", () => {
    const farFuture = new Date(Date.now() + 48 * 60 * 60 * 1000)
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    expect(isWithin24Hours(farFuture)).toBe(false);
  });
});
