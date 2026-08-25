export type Sex = "m" | "f" | null;

export function ageFrom(
  birthYear: number | null | undefined,
  refYear: number
): number | null {
  if (birthYear == null) return null;
  const age = refYear - birthYear;
  return age >= 10 && age <= 110 ? age : null;
}

export function bmr(
  sex: Sex | undefined,
  age: number | null,
  heightCm: number | null | undefined,
  weightKg: number | null
): number | null {
  if (age == null || heightCm == null || heightCm < 120 || weightKg == null || weightKg <= 0)
    return null;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  if (sex === "m") return Math.round(base + 5);
  if (sex === "f") return Math.round(base - 161);
  return Math.round(base - 78);
}

export function activityFactor(weeklyDays: number): number {
  if (weeklyDays <= 0) return 1.2;
  if (weeklyDays <= 2) return 1.375;
  if (weeklyDays <= 4) return 1.55;
  return 1.725;
}

export function tdee(
  bmrVal: number | null,
  weeklyDays: number
): number | null {
  if (bmrVal == null) return null;
  return Math.round(bmrVal * activityFactor(weeklyDays));
}

export function goalCalories(
  tdeeVal: number | null,
  goal: string | undefined
): number | null {
  if (tdeeVal == null) return null;
  if (goal === "dimagrimento") return tdeeVal - 400;
  if (goal === "massa") return tdeeVal + 300;
  return tdeeVal;
}
