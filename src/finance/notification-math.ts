export type SavingsMilestone = 50 | 75 | 100;

const savingsMilestones: SavingsMilestone[] = [50, 75, 100];

export function crossedSavingsMilestones(previousPercent: number, currentPercent: number): SavingsMilestone[] {
  if (!Number.isFinite(previousPercent) || !Number.isFinite(currentPercent) || previousPercent < 0 || currentPercent < 0 || previousPercent > 100 || currentPercent > 100) {
    throw new Error('Savings goal progress must be between 0 and 100 percent.');
  }
  if (currentPercent <= previousPercent) return [];
  return savingsMilestones.filter(threshold => previousPercent < threshold && currentPercent >= threshold);
}
