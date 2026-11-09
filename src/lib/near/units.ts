/**
 * NEAR Token safe integer conversions.
 * 1 NEAR = 10^24 yoctoNEAR.
 * NEVER use floating point numbers for currency calculations.
 */

export const YOCTO_PER_NEAR = BigInt("1000000000000000000000000"); // 10^24

/**
 * Parses a decimal string (e.g. "1.5") into an exact integer yoctoNEAR string.
 */
export function parseNearToYocto(nearAmountStr: string): string {
  const cleanStr = nearAmountStr.trim();
  if (!/^\d+(\.\d+)?$/.test(cleanStr)) {
    throw new Error(`Invalid NEAR amount format: ${nearAmountStr}`);
  }

  const [whole, fraction = ""] = cleanStr.split(".");
  const paddedFraction = fraction.padEnd(24, "0").slice(0, 24);

  const wholeYocto = BigInt(whole) * YOCTO_PER_NEAR;
  const fractionYocto = BigInt(paddedFraction);

  return (wholeYocto + fractionYocto).toString();
}

/**
 * Formats an integer yoctoNEAR string into a readable decimal string.
 */
export function formatYoctoToNear(yoctoStr: string, maxDecimals: number = 4): string {
  if (!yoctoStr || yoctoStr === "0") return "0";
  const yocto = BigInt(yoctoStr);
  const whole = yocto / YOCTO_PER_NEAR;
  const remainder = yocto % YOCTO_PER_NEAR;

  if (remainder === BigInt(0)) {
    return whole.toString();
  }

  const fractionStr = remainder.toString().padStart(24, "0");
  const trimmed = fractionStr.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole.toString();
}

/**
 * Validates whether an amount string is a positive, non-zero valid NEAR number.
 */
export function isValidNearAmount(amountStr: string): boolean {
  if (!amountStr || typeof amountStr !== "string") return false;
  try {
    const yocto = parseNearToYocto(amountStr);
    return BigInt(yocto) > BigInt(0);
  } catch {
    return false;
  }
}
