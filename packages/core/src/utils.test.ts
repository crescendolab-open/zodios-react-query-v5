// cspell:words mmanuelle
import { describe, expect, it } from "vitest";
import { capitalize } from "./utils";

describe("capitalize", () => {
  it("should be defined", () => {
    expect(capitalize).toBeDefined();
  });

  it("should capitalize the first letter of the string", () => {
    expect(capitalize("anyway")).toEqual("Anyway");
  });

  it("should capitalize the first letter of an utf8 string", () => {
    expect(capitalize("émmanuelle")).toEqual("Émmanuelle");
  });
});
