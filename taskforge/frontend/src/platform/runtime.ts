import { Capacitor } from "@capacitor/core";

export function isNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function currentPlatform(): string {
  try {
    return Capacitor.getPlatform();
  } catch {
    return "web";
  }
}
