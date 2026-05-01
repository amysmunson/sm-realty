// Handles property features and policies
// Defines the structure of features and policies, normalizes and serializes the data, and provides a function to get display sections for the UI

export const FEATURE_POLICY_GROUPS = {
  features: [
    { key: "appliances", label: "Appliances" },
    { key: "laundry", label: "Laundry" },
    { key: "heatingCooling", label: "Heating and cooling" },
    { key: "parking", label: "Parking" },
    { key: "other", label: "Other" },
  ],
  policies: [
    { key: "depositFee", label: "Deposit fee" },
    { key: "petPolicy", label: "Pet policy" },
    { key: "smokingPolicy", label: "Smoking policy" },
    { key: "ownersInsurance", label: "Owner's insurance" },
    { key: "utilities", label: "Utilities" },
  ],
};

const FEATURE_POLICY_KEYS = Object.values(FEATURE_POLICY_GROUPS).flat().map((item) => item.key);

function normalizeItemList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

export function getEmptyFeaturePolicyData() {
  return FEATURE_POLICY_KEYS.reduce((accumulator, key) => {
    accumulator[key] = [];
    return accumulator;
  }, {});
}

export function normalizeFeaturePolicyData(value) {
  const emptyData = getEmptyFeaturePolicyData();

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyData;
  }

  return FEATURE_POLICY_KEYS.reduce((accumulator, key) => {
    accumulator[key] = normalizeItemList(value[key]);
    return accumulator;
  }, emptyData);
}

export function serializeFeaturePolicyData(value) {
  return normalizeFeaturePolicyData(value);
}

export function getFeaturePolicyDisplaySections(property) {
  const featurePolicyData = normalizeFeaturePolicyData(property?.feature_policy_data);

  return [
    { title: "Appliances", items: featurePolicyData.appliances },
    { title: "Laundry", items: featurePolicyData.laundry },
    { title: "Heating and cooling", items: featurePolicyData.heatingCooling },
    { title: "Parking", items: featurePolicyData.parking },
    { title: "Other", items: featurePolicyData.other },
    { title: "Deposit fee", items: featurePolicyData.depositFee },
    { title: "Pet policy", items: featurePolicyData.petPolicy },
    { title: "Smoking policy", items: featurePolicyData.smokingPolicy },
    { title: "Owner's insurance", items: featurePolicyData.ownersInsurance },
    { title: "Utilities", items: featurePolicyData.utilities },
  ];
}
