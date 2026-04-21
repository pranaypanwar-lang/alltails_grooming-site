const SERVICE_SLA_RULES = [
  {
    match: /complete pampering/i,
    label: "Complete Pampering",
    durationMinutes: 120,
  },
  {
    match: /signature/i,
    label: "Signature Grooming",
    durationMinutes: 90,
  },
  {
    match: /essential/i,
    label: "Essential Grooming",
    durationMinutes: 60,
  },
] as const;

export function getServiceSlaMinutes(serviceName: string | null | undefined) {
  const matched = SERVICE_SLA_RULES.find((rule) => rule.match.test(serviceName ?? ""));
  return matched?.durationMinutes ?? 90;
}

export function getServiceSlaLabel(serviceName: string | null | undefined) {
  const matched = SERVICE_SLA_RULES.find((rule) => rule.match.test(serviceName ?? ""));
  return matched?.label ?? "Service";
}

export function getServiceSlaSummary(serviceName: string | null | undefined) {
  const durationMinutes = getServiceSlaMinutes(serviceName);
  return {
    durationMinutes,
    label: getServiceSlaLabel(serviceName),
  };
}
