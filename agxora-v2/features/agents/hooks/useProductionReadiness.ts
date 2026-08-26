"use client";

import { useEffect, useState } from "react";
import {
  fetchProductionReadinessFromHealth,
  type ClientProductionReadiness,
} from "@/app/lib/production/clientReadiness";

export type ProductionReadinessState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly data: ClientProductionReadiness };

/** Production readiness from /api/health — no server-only env reads. */
export function useProductionReadinessFromHealth(): ProductionReadinessState {
  const [state, setState] = useState<ProductionReadinessState>({
    status: "loading",
  });

  useEffect(() => {
    let cancelled = false;

    void fetchProductionReadinessFromHealth()
      .then((data) => {
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: "error" });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
