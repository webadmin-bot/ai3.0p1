import { CinematicShot, DurationReconciliation, ShotDuration } from '../types/filmStudio';

/**
 * Checks if a target duration in seconds can be partitioned into a sum of 6, 8, and 10 second shots.
 * Returns the recommended shot counts if partitionable.
 */
export function find6810Partition(
  targetSeconds: number,
  maxDuration: ShotDuration = 10
): { dur6: number; dur8: number; dur10: number } | null {
  if (targetSeconds <= 0 || targetSeconds % 2 !== 0) return null;

  const allowed: ShotDuration[] = [10, 8, 6].filter((d) => d <= maxDuration) as ShotDuration[];
  if (allowed.length === 0) return null;

  // Search for the partition with minimum shot count (or balanced)
  let best: { dur6: number; dur8: number; dur10: number } | null = null;
  let minShots = Infinity;

  const max10 = allowed.includes(10) ? Math.floor(targetSeconds / 10) : 0;
  for (let c10 = max10; c10 >= 0; c10--) {
    const remAfter10 = targetSeconds - c10 * 10;
    const max8 = allowed.includes(8) ? Math.floor(remAfter10 / 8) : 0;
    for (let c8 = max8; c8 >= 0; c8--) {
      const remAfter8 = remAfter10 - c8 * 8;
      if (allowed.includes(6) && remAfter8 % 6 === 0) {
        const c6 = remAfter8 / 6;
        const totalShots = c10 + c8 + c6;
        if (totalShots < minShots) {
          minShots = totalShots;
          best = { dur6: c6, dur8: c8, dur10: c10 };
        }
      }
    }
  }

  return best;
}

/**
 * Calculates duration reconciliation for a set of planned shots against a target runtime.
 */
export function calculateDurationReconciliation(
  targetRuntime: number,
  shots: CinematicShot[],
  maxShotDuration: ShotDuration = 10
): DurationReconciliation {
  const plannedRuntime = shots.reduce((acc, shot) => acc + (shot.duration || 0), 0);
  const discrepancy = plannedRuntime - targetRuntime;
  const isOdd = targetRuntime % 2 !== 0;
  const partition = find6810Partition(targetRuntime, maxShotDuration);
  const isPartitionable = partition !== null;

  let explanation = '';
  if (discrepancy === 0) {
    explanation = `Planned shot runtime matches target runtime exactly (${targetRuntime}s).`;
  } else if (isOdd) {
    explanation = `Target runtime of ${targetRuntime}s is odd. Because all allowed shot durations are strictly 6s, 8s, or 10s (all even numbers), an odd target runtime cannot be mathematically reached exactly. Nearest even durations are ${targetRuntime - 1}s or ${targetRuntime + 1}s.`;
  } else if (!isPartitionable) {
    explanation = `Target runtime of ${targetRuntime}s cannot be partitioned into 6s, 8s, or 10s shots under the selected maximum shot duration of ${maxShotDuration}s.`;
  } else {
    explanation = `Planned shots total ${plannedRuntime}s, differing by ${discrepancy > 0 ? '+' : ''}${discrepancy}s from the target runtime of ${targetRuntime}s.`;
  }

  return {
    targetRuntime,
    plannedRuntime,
    discrepancy,
    isPartitionable,
    recommendedShotPlan: partition
      ? {
          dur6Count: partition.dur6,
          dur8Count: partition.dur8,
          dur10Count: partition.dur10,
        }
      : undefined,
    explanation,
  };
}

/**
 * Validates that every individual shot is strictly 6, 8, or 10 seconds and <= maxDuration.
 */
export function validateShotDurations(
  shots: CinematicShot[],
  maxDuration: ShotDuration = 10
): { valid: boolean; invalidShotIds: string[] } {
  const invalidShotIds: string[] = [];
  for (const shot of shots) {
    if (shot.duration !== 6 && shot.duration !== 8 && shot.duration !== 10) {
      invalidShotIds.push(shot.shotId);
    } else if (shot.duration > maxDuration) {
      invalidShotIds.push(shot.shotId);
    }
  }
  return {
    valid: invalidShotIds.length === 0,
    invalidShotIds,
  };
}
