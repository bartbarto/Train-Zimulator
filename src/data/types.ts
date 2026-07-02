/**
 * Data-driven content schemas. All locomotives, routes, consists, signals and
 * weather presets are described by these JSON-serialisable interfaces so that
 * adding content requires no code changes.
 */

export type LocomotivePowerType = 'diesel' | 'electric' | 'steam'

/** Davis rolling/air resistance coefficients: R(N) = A + B*v + C*v^2 (v in m/s). */
export interface ResistanceSpec {
  a: number
  b: number
  c: number
}

export interface AdhesionSpec {
  /** Fraction of total mass carried by driven axles. */
  drivenMassFraction: number
  /** Base wheel/rail friction coefficient in dry conditions. */
  baseFriction: number
}

export interface DieselSpec {
  idleRpm: number
  maxRpm: number
  /** Time constant (s) for the turbocharger to spool up. */
  turboLagSeconds: number
  fuelCapacityLitres: number
  fuelBurnLitresPerHourMax: number
  coolingNominalC: number
  coolingMaxC: number
}

export interface ElectricSpec {
  /** Line voltage in kV (informational; future catenary simulation). */
  lineVoltageKV: number
  /** Traction requires the pantograph to be raised. */
  requiresPantograph: boolean
}

export interface SteamSpec {
  /** Working boiler pressure (bar). */
  boilerPressureBar: number
  /** Pressure maintained at standstill with a lit fire (bar). */
  idlePressureBar: number
  /** Road speed (km/h) where tractive effort has roughly halved. */
  criticalSpeedKmh: number
  waterCapacityLitres: number
  coalCapacityKg: number
  coalBurnKgPerHourMax: number
  waterUseLitresPerHourMax: number
  /** Regulator / chest response lag (seconds). */
  steamLagSeconds: number
  boilerNominalC: number
  boilerMaxC: number
}

export interface BrakeSpec {
  mainReservoirBar: number
  brakePipeBar: number
  maxBrakeCylinderBar: number
  /** Brake force (kN) per bar of brake cylinder pressure. */
  brakeForcePerBarKN: number
  /** Charge/vent rate of the brake pipe (bar/second). */
  pipeChargeRateBar: number
  /** Propagation delay along the train (seconds per metre). */
  propagationSecondsPerMetre: number
}

export interface LocomotiveSpec {
  id: string
  name: string
  type: LocomotivePowerType
  /** Locomotive mass in tonnes. */
  massTonnes: number
  lengthMetres: number
  maxSpeedKmh: number
  /** Number of throttle notches (excluding idle/0). */
  throttleNotches: number
  maxPowerKW: number
  maxTractiveEffortKN: number
  /** Maximum dynamic (rheostatic) braking effort in kN. */
  dynamicBrakeEffortKN: number
  resistance: ResistanceSpec
  adhesion: AdhesionSpec
  brakes: BrakeSpec
  diesel?: DieselSpec
  electric?: ElectricSpec
  steam?: SteamSpec
  /**
   * Trailing consist mass/length. When set (e.g. 0 for a self-contained EMU),
   * overrides the route defaults.
   */
  trailingMassTonnes?: number
  trailingLengthMetres?: number
}

export interface StationSpec {
  id: string
  name: string
  /** Distance along the route in metres. */
  distance: number
  platformLength: number
  /** Length of the valid locomotive stopping zone, centred on `distance`. */
  stopZoneLength?: number
}

export interface SpeedLimitSpec {
  /** Distance along route where this limit begins (metres). */
  distance: number
  limitKmh: number
}

export interface SignalSpec {
  id: string
  distance: number
}

export interface TrackPoint {
  x: number
  y: number
  z: number
}

export interface RouteSpec {
  id: string
  name: string
  /** Control points of the centre-line spline (metres, world space). */
  points: TrackPoint[]
  stations: StationSpec[]
  speedLimits: SpeedLimitSpec[]
  signals: SignalSpec[]
  /** Default consist trailing mass behind the locomotive, in tonnes. */
  trailingMassTonnes: number
  trailingLengthMetres: number
}
