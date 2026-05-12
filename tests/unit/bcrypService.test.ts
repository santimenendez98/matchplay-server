import {
  hashPassword,
  verifyPassword,
} from "../../src/services/bcrypService";

describe("bcrypService", () => {
  it("hashPassword produces a hash distinct from the plaintext", async () => {
    const hash = await hashPassword("hunter2");
    expect(hash).not.toBe("hunter2");
    expect(hash.length).toBeGreaterThan(20);
  });

  it("verifyPassword returns true for the correct password", async () => {
    const hash = await hashPassword("correct-horse");
    await expect(verifyPassword("correct-horse", hash)).resolves.toBe(true);
  });

  it("verifyPassword returns false for the wrong password", async () => {
    const hash = await hashPassword("correct-horse");
    await expect(verifyPassword("wrong", hash)).resolves.toBe(false);
  });
});
