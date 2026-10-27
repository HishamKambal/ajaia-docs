import { describe, expect, it } from "vitest";
import { ShareBody } from "../validation";

// Regression: the repository normalized emails, but the API schema rejected
// " SARA@ajaia.test " before it got there. Found by the live curl pass.
describe("ShareBody", () => {
  it("trims and lowercases the email before validating", () => {
    expect(ShareBody.parse({ email: "  SARA@Ajaia.test ", role: "viewer" })).toEqual({
      email: "sara@ajaia.test",
      role: "viewer",
    });
  });

  it("rejects malformed emails and unknown roles", () => {
    expect(ShareBody.safeParse({ email: "nope", role: "viewer" }).success).toBe(false);
    expect(ShareBody.safeParse({ email: "a@b.co", role: "admin" }).success).toBe(false);
  });
});
