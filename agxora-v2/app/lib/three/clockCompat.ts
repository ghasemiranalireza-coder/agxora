/**
 * THREE.js Clock compatibility — eliminates deprecated THREE.Clock warnings.
 *
 * @react-three/fiber constructs `new THREE.Clock()` at store creation.
 * three@0.183+ marks Clock as deprecated in favor of Timer. We:
 * 1. Replace THREE.Clock with a supported performance.now() shim when the
 *    namespace is mutable (bundlers / CJS).
 * 2. Filter the known deprecation warn as a belt-and-suspenders fallback
 *    when the ESM export is frozen (Node native ESM).
 */

import * as THREE from "three";

type ClockLike = {
  autoStart: boolean;
  startTime: number;
  oldTime: number;
  elapsedTime: number;
  running: boolean;
  start: () => void;
  stop: () => void;
  getElapsedTime: () => number;
  getDelta: () => number;
};

let patched = false;

function createAgxoraClockClass(): new () => ClockLike {
  return class AgxoraClock implements ClockLike {
    autoStart = true;
    startTime = 0;
    oldTime = 0;
    elapsedTime = 0;
    running = false;

    start(): void {
      this.startTime = performance.now();
      this.oldTime = this.startTime;
      this.elapsedTime = 0;
      this.running = true;
    }

    stop(): void {
      this.getElapsedTime();
      this.running = false;
    }

    getElapsedTime(): number {
      this.getDelta();
      return this.elapsedTime;
    }

    getDelta(): number {
      let diff = 0;
      if (this.autoStart && !this.running) {
        this.start();
        return 0;
      }
      if (this.running) {
        const newTime = performance.now();
        diff = (newTime - this.oldTime) / 1000;
        this.oldTime = newTime;
        this.elapsedTime += diff;
      }
      return diff;
    }
  };
}

function silenceClockDeprecation(): void {
  if (typeof console === "undefined" || typeof console.warn !== "function") {
    return;
  }
  const original = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const text = args
      .map((arg) => {
        if (typeof arg === "string") return arg;
        if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
        if (arg && typeof arg === "object" && "message" in arg) {
          return String((arg as { message: unknown }).message);
        }
        return "";
      })
      .join(" ");
    if (text.includes("THREE.Clock") && /deprecated/i.test(text)) {
      return;
    }
    original(...args);
  };
}

/** Install once before any R3F Canvas mounts. Safe to call repeatedly. */
export function installThreeClockCompat(): void {
  if (patched) return;
  patched = true;

  const AgxoraClock = createAgxoraClockClass();
  const ns = THREE as unknown as { Clock: new () => ClockLike };

  try {
    ns.Clock = AgxoraClock;
  } catch {
    // Frozen ESM namespace — fall through to warn filter.
  }

  // Always silence the known deprecation so terminals stay clean even when
  // the constructor cannot be replaced (native ESM live bindings).
  silenceClockDeprecation();
}

installThreeClockCompat();
