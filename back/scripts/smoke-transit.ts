import dotenv from "dotenv";
import { transitApiInternals } from "../src/modules/transit/transit-api.js";

dotenv.config();

interface Step {
  label: string;
  origin: { lat: number; lng: number };
  expectAlert?: boolean;
  expectArrived?: boolean;
}

const SEOUL_DESTINATION = { lat: 37.566535, lng: 126.977969 };

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected=${String(expected)}, got=${String(actual)}`);
  }
}

function assertGte(actual: number, threshold: number, message: string) {
  if (!(actual >= threshold)) {
    throw new Error(`${message}: expected >= ${threshold}, got ${actual}`);
  }
}

function assertLte(actual: number, threshold: number, message: string) {
  if (!(actual <= threshold)) {
    throw new Error(`${message}: expected <= ${threshold}, got ${actual}`);
  }
}

async function main() {
  const steps: Step[] = [
    {
      label: "5km 출발",
      origin: { lat: 37.611535, lng: 126.977969 }
    },
    {
      label: "3km 접근",
      origin: { lat: 37.593535, lng: 126.977969 }
    },
    {
      label: "1km 접근",
      origin: { lat: 37.575535, lng: 126.977969 }
    },
    {
      label: "350m 접근 (1정거장 전 알림 트리거)",
      origin: { lat: 37.566535 + 0.00315, lng: 126.977969 },
      expectAlert: true
    },
    {
      label: "도착 직전 (60m)",
      origin: { lat: 37.566535 + 0.0005, lng: 126.977969 },
      expectArrived: true
    }
  ];

  let alertSent = false;
  for (const step of steps) {
    const eta = transitApiInternals.deriveFallbackEta({
      mode: "bus",
      routeId: null,
      routeName: "TEST-100",
      origin: step.origin,
      destination: SEOUL_DESTINATION
    });

    console.log(
      `[${step.label}] dist=${eta.distanceMeters}m, stops=${eta.remainingStops}, eta=${eta.etaSeconds}s`
    );

    if (step.label.startsWith("5km")) {
      assertGte(eta.distanceMeters, 4_500, "5km step distance");
    }
    if (step.label.startsWith("도착")) {
      assertLte(eta.distanceMeters, 80, "arrival step distance");
    }

    const shouldAlert = !alertSent && eta.remainingStops <= 1 && eta.distanceMeters > 80;
    const shouldArrive = eta.distanceMeters <= 80;
    if (shouldAlert) {
      alertSent = true;
      console.log(`  → alert dispatched at ${step.label}`);
    }
    if (step.expectAlert) {
      assertEqual(shouldAlert, true, `expected alert at "${step.label}"`);
    }
    if (step.expectArrived) {
      assertEqual(shouldArrive, true, `expected arrival at "${step.label}"`);
    }
  }

  if (!alertSent) {
    throw new Error("alert was not triggered in any simulation step");
  }

  const cacheKey = transitApiInternals.buildCacheKey({
    mode: "bus",
    routeId: "1234",
    routeName: "TEST-100",
    origin: { lat: 37.5665351, lng: 126.9779695 },
    destination: SEOUL_DESTINATION
  });
  if (!cacheKey.startsWith("transit:eta:bus:1234:")) {
    throw new Error(`unexpected cache key: ${cacheKey}`);
  }

  console.log("smoke-transit OK");
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
