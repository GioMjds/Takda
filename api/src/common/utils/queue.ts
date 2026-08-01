import { z } from 'zod';

export const waitTimeStatsSchema = z.object({
  totalServed: z.number().int().nonnegative(),
  totalNoShow: z.number().int().nonnegative(),
  totalCancelled: z.number().int().nonnegative(),
  avgWaitMin: z.number().nonnegative(),
  noShowRate: z.number().min(0).max(1),
});

export type WaitTimeStats = z.infer<typeof waitTimeStatsSchema>;

export function waitMinFor(
  slotStart: Date,
  servingAt: Date | null,
): number | null {
  if (!servingAt) return null;
  const diffMs = servingAt.getTime() - slotStart.getTime();
  return Math.max(0, Math.round(diffMs / 60_000));
}

export function computeWaitStats(
  rows: ReadonlyArray<{
    status: string;
    slotStart: Date;
    servingAt: Date | null;
  }>,
): WaitTimeStats {
  let totalServed = 0;
  let totalNoShow = 0;
  let totalCancelled = 0;
  let waitSum = 0;
  let waitCount = 0;

  for (const r of rows) {
    if (r.status === 'COMPLETED' || r.status === 'SERVING') totalServed += 1;
    if (r.status === 'NO_SHOW') totalNoShow += 1;
    if (r.status === 'CANCELLED') totalCancelled += 1;

    const wait = waitMinFor(r.slotStart, r.servingAt);
    if (wait !== null) {
      waitSum += wait;
      waitCount += 1;
    }
  }

  const resolved = totalServed + totalNoShow;
  return {
    totalServed,
    totalNoShow,
    totalCancelled,
    avgWaitMin: waitCount > 0 ? Math.round((waitSum / waitCount) * 10) / 10 : 0,
    noShowRate: resolved > 0 ? totalNoShow / resolved : 0,
  };
}
