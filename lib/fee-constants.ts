export const FEE_PRICES = {
  REGULAR_TOURIST: 150.0,
  PALAWENO: 100.0,
  STUDENT: 120.0,
  SENIOR_CITIZEN: 120.0,
  PWD: 120.0,
} as const;

export const FEE_VALIDITY_DAYS = 10;
export const FEE_CURRENCY = "PHP";

export const PAYER_TYPE_LABELS: Record<string, string> = {
  REGULAR_TOURIST: "Regular Tourist",
  PALAWENO: "Palaweno / Palawan Resident",
  STUDENT: "Student",
  SENIOR_CITIZEN: "Senior Citizen",
  PWD: "Person with Disability",
};
