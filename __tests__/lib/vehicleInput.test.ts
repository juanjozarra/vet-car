import { parseVehicleInput } from '@/lib/vehicleInput'

describe('parseVehicleInput', () => {
  it('parses a fully populated body', () => {
    const result = parseVehicleInput({
      make: ' Honda ',
      model: ' CR-V ',
      year: '2019',
      vin: '1hgbh41jxmn109186',
      plate: 'ab123cd',
      plateState: ' Buenos Aires ',
      nickname: ' La camioneta ',
      mileage: '85000',
    })

    expect(result).toEqual({
      make: 'Honda',
      model: 'CR-V',
      year: 2019,
      vin: '1HGBH41JXMN109186',
      plate: 'AB123CD',
      plateState: 'Buenos Aires',
      nickname: 'La camioneta',
      mileage: 85000,
    })
  })

  it('normalizes omitted optional fields to null', () => {
    const result = parseVehicleInput({ make: 'Honda', model: 'CR-V', year: 2019 })

    expect(result).toEqual({
      make: 'Honda',
      model: 'CR-V',
      year: 2019,
      vin: null,
      plate: null,
      plateState: null,
      nickname: null,
      mileage: null,
    })
  })

  it('rejects a missing make', () => {
    expect(parseVehicleInput({ model: 'CR-V', year: 2019 })).toEqual({
      error: 'Ingresá la marca y el modelo',
    })
  })

  it('rejects a blank make', () => {
    expect(parseVehicleInput({ make: '   ', model: 'CR-V', year: 2019 })).toEqual({
      error: 'Ingresá la marca y el modelo',
    })
  })

  it('rejects a missing model', () => {
    expect(parseVehicleInput({ make: 'Honda', year: 2019 })).toEqual({
      error: 'Ingresá la marca y el modelo',
    })
  })

  // The finding this parser exists to close: parseInt('abc') reached Prisma as
  // NaN and returned a 500.
  it('rejects a non-numeric year instead of passing NaN through', () => {
    expect(parseVehicleInput({ make: 'Honda', model: 'CR-V', year: 'abc' })).toEqual({
      error: 'Ingresá un año válido',
    })
  })

  it('rejects an empty year', () => {
    expect(parseVehicleInput({ make: 'Honda', model: 'CR-V', year: '' })).toEqual({
      error: 'Ingresá un año válido',
    })
  })

  it('rejects a missing year', () => {
    expect(parseVehicleInput({ make: 'Honda', model: 'CR-V' })).toEqual({
      error: 'Ingresá un año válido',
    })
  })

  it('rejects a year before 1900', () => {
    expect(parseVehicleInput({ make: 'Honda', model: 'CR-V', year: 1780 })).toEqual({
      error: 'Ingresá un año válido',
    })
  })

  it('rejects a year beyond next year', () => {
    const tooFar = new Date().getFullYear() + 2
    expect(parseVehicleInput({ make: 'Honda', model: 'CR-V', year: tooFar })).toEqual({
      error: 'Ingresá un año válido',
    })
  })

  it('accepts next year', () => {
    const nextYear = new Date().getFullYear() + 1
    const result = parseVehicleInput({ make: 'Honda', model: 'CR-V', year: nextYear })
    expect(result).toMatchObject({ year: nextYear })
  })

  it('rejects a trailing-garbage year that parseInt would have accepted', () => {
    expect(parseVehicleInput({ make: 'Honda', model: 'CR-V', year: '2019abc' })).toEqual({
      error: 'Ingresá un año válido',
    })
  })

  it('rejects a non-numeric mileage', () => {
    expect(
      parseVehicleInput({ make: 'Honda', model: 'CR-V', year: 2019, mileage: 'muchos' })
    ).toEqual({ error: 'El kilometraje debe ser un número' })
  })

  it('rejects a negative mileage', () => {
    expect(
      parseVehicleInput({ make: 'Honda', model: 'CR-V', year: 2019, mileage: -5 })
    ).toEqual({ error: 'El kilometraje debe ser un número' })
  })

  it('rejects a fractional mileage', () => {
    expect(
      parseVehicleInput({ make: 'Honda', model: 'CR-V', year: 2019, mileage: 1.5 })
    ).toEqual({ error: 'El kilometraje debe ser un número' })
  })

  it('turns an empty mileage into null', () => {
    const result = parseVehicleInput({
      make: 'Honda',
      model: 'CR-V',
      year: 2019,
      mileage: '',
    })
    expect(result).toMatchObject({ mileage: null })
  })

  it('uppercases a lowercase vin so the unique lookup is case-insensitive', () => {
    const result = parseVehicleInput({
      make: 'Honda',
      model: 'CR-V',
      year: 2019,
      vin: ' 1hgbh41jxmn109186 ',
    })
    expect(result).toMatchObject({ vin: '1HGBH41JXMN109186' })
  })

  it('turns a blank vin into null rather than an empty string', () => {
    const result = parseVehicleInput({
      make: 'Honda',
      model: 'CR-V',
      year: 2019,
      vin: '   ',
    })
    expect(result).toMatchObject({ vin: null })
  })
})
