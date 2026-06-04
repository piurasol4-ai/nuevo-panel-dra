/** Opciones del campo «¿Cómo nos conoció?» al registrar pacientes. */
export const REFERRAL_SOURCE_OPTIONS = [
  "Recomendación",
  "Facebook",
  "YouTube",
  "WhatsApp",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "X",
  "Snapchat",
  "Pinterest",
] as const;

export type ReferralSourceOption = (typeof REFERRAL_SOURCE_OPTIONS)[number];

export const REFERRAL_SOURCE_UNSPECIFIED = "Sin especificar";
export const REFERRAL_SOURCE_OTHER = "Otros";

export function isKnownReferralSource(
  value: string,
): value is ReferralSourceOption {
  return (REFERRAL_SOURCE_OPTIONS as readonly string[]).includes(value);
}

export type ReferralStatRow = {
  source: string;
  count: number;
  percent: number;
};

export type ReferralStatsResponse = {
  totalPatients: number;
  withSource: number;
  withoutSource: number;
  breakdown: ReferralStatRow[];
};
