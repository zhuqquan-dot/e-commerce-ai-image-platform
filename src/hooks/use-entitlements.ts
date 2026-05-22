"use client";

import { useState, useEffect, useCallback } from "react";

interface FeatureFlags {
  batchEnabled: boolean;
  multiPlatformEnabled: boolean;
  reviewEnabled: boolean;
  exportEnabled: boolean;
}

interface Quotas {
  memberLimit: number;
  clientSpaceLimit: number;
  brandPackLimit: number;
  seriesPackLimit: number;
  projectLimit: number;
  exportLimit: number;
  monthlyCredits: number;
}

interface PlanInfo {
  planName: string;
  monthlyCredits: number;
  fuelCredits: number;
  subscriptionStatus: string;
}

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  batchEnabled: false,
  multiPlatformEnabled: false,
  reviewEnabled: true,
  exportEnabled: true,
};

const DEFAULT_QUOTAS: Quotas = {
  memberLimit: 0,
  clientSpaceLimit: 0,
  brandPackLimit: 0,
  seriesPackLimit: 0,
  projectLimit: 0,
  exportLimit: 0,
  monthlyCredits: 0,
};

const DEFAULT_PLAN_INFO: PlanInfo = {
  planName: "",
  monthlyCredits: 0,
  fuelCredits: 0,
  subscriptionStatus: "",
};

export type { FeatureFlags, Quotas, PlanInfo };

export function useEntitlements(workspaceId: string | undefined) {
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [quotas, setQuotas] = useState<Quotas>(DEFAULT_QUOTAS);
  const [planInfo, setPlanInfo] = useState<PlanInfo>(DEFAULT_PLAN_INFO);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEntitlements = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    setError("");

    try {
      const [entitlementsRes, subscriptionRes, plansRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/entitlements`),
        fetch(`/api/workspaces/${workspaceId}/subscription`),
        fetch("/api/plans"),
      ]);

      if (entitlementsRes.ok) {
        const data = await entitlementsRes.json();
        setFeatureFlags(data.featureFlags ?? DEFAULT_FEATURE_FLAGS);
        setQuotas(data.quotas ?? DEFAULT_QUOTAS);
      }

      if (subscriptionRes.ok) {
        const subData = await subscriptionRes.json();
        const ws = subData.workspace;
        if (ws) {
          setPlanInfo((prev) => ({
            ...prev,
            monthlyCredits: ws.monthlyCredits ?? 0,
            fuelCredits: ws.fuelCredits ?? 0,
            subscriptionStatus: ws.subscriptionStatus ?? "",
          }));

          if (plansRes.ok) {
            const plans = await plansRes.json();
            const plan = Array.isArray(plans)
              ? plans.find((p: { id: string }) => p.id === ws.planId)
              : null;
            if (plan) {
              setPlanInfo((prev) => ({
                ...prev,
                planName: plan.name ?? "",
              }));
            }
          }
        }
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  return { featureFlags, quotas, planInfo, loading, error, refetch: fetchEntitlements };
}
