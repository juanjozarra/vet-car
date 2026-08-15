import { parseOptionalNumber } from './vehicleHistory'

export type ParsedVehicleInput = {
  make: string
  model: string
  year: number
  vin: string | null
  plate: string | null
  plateState: string | null
  nickname: string | null
  mileage: number | null
}

// Trims an optional string field; empty and non-string values become null.
function parseOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export function parseVehicleInput(
  body: Record<string, unknown>
): ParsedVehicleInput | { error: string } {
  const { make, model, year, vin, plate, plateState, nickname, mileage } = body

  const makeValue = parseOptionalString(make)
  const modelValue = parseOptionalString(model)
  if (!makeValue || !modelValue) {
    return { error: 'Ingresá la marca y el modelo' }
  }

  // Number() rather than parseInt(): parseInt('2019abc') silently yields 2019,
  // and parseInt('') yields NaN where an empty year should simply be rejected.
  const yearValue = Number(year)
  if (
    !Number.isInteger(yearValue) ||
    yearValue < 1900 ||
    yearValue > new Date().getFullYear() + 1
  ) {
    return { error: 'Ingresá un año válido' }
  }

  const mileageValue = parseOptionalNumber(mileage)
  if (
    mileageValue === 'invalid' ||
    (mileageValue !== null && (!Number.isInteger(mileageValue) || mileageValue < 0))
  ) {
    return { error: 'El kilometraje debe ser un número' }
  }

  const vinValue = parseOptionalString(vin)
  const plateValue = parseOptionalString(plate)

  return {
    make: makeValue,
    model: modelValue,
    year: yearValue,
    // Uppercased so the @unique VIN lookup behind claiming and walk-in reuse
    // is not defeated by casing.
    vin: vinValue?.toUpperCase() ?? null,
    plate: plateValue?.toUpperCase() ?? null,
    plateState: parseOptionalString(plateState),
    nickname: parseOptionalString(nickname),
    mileage: mileageValue,
  }
}
