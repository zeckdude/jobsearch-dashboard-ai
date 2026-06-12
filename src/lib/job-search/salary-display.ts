export function formatJobSalaryRange(
  salaryMin: number | null | undefined,
  salaryMax: number | null | undefined,
  currency: string | null | undefined,
): string {
  const code = currency ?? "USD";
  if (!salaryMin && !salaryMax) return "Not listed";

  const format = (amount: number) => `${code} ${amount.toLocaleString("en-US")}`;
  if (salaryMin && salaryMax) {
    return salaryMin === salaryMax ? format(salaryMin) : `${format(salaryMin)} – ${format(salaryMax)}`;
  }
  if (salaryMin) return `${format(salaryMin)}+`;
  return `Up to ${format(salaryMax!)}`;
}
