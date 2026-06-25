
import { describe, expect, it } from "vitest";

describe("frontend test environment", () => {
  it("provides DOM and browser storage", () => {
    const element = document.createElement("div");
    element.textContent = "Decision Study";
    document.body.append(element);

    localStorage.setItem("test-key", "test-value");

    expect(document.body).toHaveTextContent("Decision Study");
    expect(localStorage.getItem("test-key")).toBe("test-value");
  });
});