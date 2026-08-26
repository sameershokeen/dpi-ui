/**
 * Web Vibration API utility for mobile tactile haptic feedback.
 */
export type HapticType = "tap" | "selection" | "success" | "warning" | "error";

export function triggerHaptic(type: HapticType = "tap") {
  if (typeof window === "undefined" || !("navigator" in window) || !navigator.vibrate) {
    return;
  }

  try {
    switch (type) {
      case "tap":
        navigator.vibrate(8);
        break;
      case "selection":
        navigator.vibrate(12);
        break;
      case "success":
        navigator.vibrate([15, 40, 20]);
        break;
      case "warning":
        navigator.vibrate([25, 50, 25]);
        break;
      case "error":
        navigator.vibrate([40, 60, 40, 60, 40]);
        break;
    }
  } catch {
    // Ignore environments where vibration is blocked or unsupported
  }
}
