import { db } from "@/lib/db";

export type FeatureKey =
  | "library"
  | "transport"
  | "hostel"
  | "events"
  | "advancedReports"
  | "mobileApps"
  | "aiAnalytics"
  | "gamification"
  | "multiCampus"
  | "multiLanguage";

export type Tier = "BASIC" | "PRO" | "ENTERPRISE";

const defaultTierMatrix: Record<Tier, FeatureKey[]> = {
  BASIC: ["events"],
  PRO: ["library", "transport", "hostel", "events", "advancedReports", "mobileApps"],
  ENTERPRISE: [
    "library",
    "transport",
    "hostel",
    "events",
    "advancedReports",
    "mobileApps",
    "aiAnalytics",
    "gamification",
    "multiCampus",
    "multiLanguage",
  ],
};

export interface SchoolSettings {
  id: string;
  tier: Tier;
  featureFlags?: {
    overrides?: FeatureKey[];
  } | null;
  // Add other fields if needed
}

export async function getSchoolSettings(): Promise<SchoolSettings | null> {
  return db.schoolSettings.findFirst() as Promise<SchoolSettings | null>;
}

export async function isFeatureEnabled(feature: FeatureKey): Promise<boolean> {
  const settings = await getSchoolSettings();
  const tier: Tier = settings?.tier ?? "BASIC";

  const overrides: FeatureKey[] = settings?.featureFlags?.overrides ?? [];

  if (overrides.includes(feature)) return true;

  return defaultTierMatrix[tier].includes(feature);
}
