export const HOUR_MS = 1000 * 60 * 60;

/** Swap requests close this many hours before a task's deadline. */
export const SWAP_CUTOFF_HOURS = 48;

/** The task detail stepper; a status's rank (see statusRank) is how many of these are lit. */
export const STEP_LABELS = ["Assigned", "Seen", "Submitted", "Accepted"] as const;
