/** Global physical and engine constants (SI units unless noted). */

export const GRAVITY = 9.80665 // m/s^2

export const KMH_TO_MS = 1 / 3.6
export const MS_TO_KMH = 3.6
export const TONNE_TO_KG = 1000
export const KN_TO_N = 1000
export const KW_TO_W = 1000
export const BAR_TO_PA = 100000
export const PSI_TO_BAR = 0.0689476

/** Fixed simulation timestep (seconds). Physics runs deterministically at this rate. */
export const FIXED_TIMESTEP = 1 / 120

/** Maximum number of fixed steps processed per frame to avoid spiral-of-death. */
export const MAX_STEPS_PER_FRAME = 8

/** Standard atmospheric / brake reservoir reference pressures (bar). */
export const ATMOSPHERIC_BAR = 0
export const MAIN_RESERVOIR_BAR = 9.0
export const BRAKE_PIPE_RELEASE_BAR = 5.0
