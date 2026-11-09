import { describe, it, expect } from "vitest";
import { parseNearToYocto, formatYoctoToNear, isValidNearAmount } from "../src/lib/near/units";

describe("NEAR Currency and Yocto Units Math", () => {
  it("converts integer NEAR to exact 24-decimal yoctoNEAR string", () => {
    const yocto = parseNearToYocto("1");
    expect(yocto).toBe("1000000000000000000000000");
    expect(yocto.length).toBe(25);
  });

  it("converts fractional decimal NEAR accurately without floating point rounding", () => {
    const yocto = parseNearToYocto("5.5");
    expect(yocto).toBe("5500000000000000000000000");

    const smallYocto = parseNearToYocto("0.0001");
    expect(smallYocto).toBe("100000000000000000000");
  });

  it("formats yoctoNEAR string back to decimal NEAR", () => {
    const nearStr = formatYoctoToNear("5500000000000000000000000");
    expect(nearStr).toBe("5.5");

    const zero = formatYoctoToNear("0");
    expect(zero).toBe("0");
  });

  it("validates valid and invalid NEAR amount strings", () => {
    expect(isValidNearAmount("10.5")).toBe(true);
    expect(isValidNearAmount("0.1")).toBe(true);
    expect(isValidNearAmount("0")).toBe(false);
    expect(isValidNearAmount("-5")).toBe(false);
    expect(isValidNearAmount("abc")).toBe(false);
  });
});
