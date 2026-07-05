import { haversineDistanceKm } from './geo'

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm({ lat: -34.6037, lng: -58.3816 }, { lat: -34.6037, lng: -58.3816 })).toBe(0)
  })

  it('matches the known great-circle distance between Buenos Aires and Córdoba', () => {
    const buenosAires = { lat: -34.6037, lng: -58.3816 }
    const cordoba = { lat: -31.4201, lng: -64.1888 }
    const distance = haversineDistanceKm(buenosAires, cordoba)
    expect(distance).toBeGreaterThan(600)
    expect(distance).toBeLessThan(700)
  })

  it('is symmetric', () => {
    const a = { lat: 10, lng: 10 }
    const b = { lat: 20, lng: -5 }
    expect(haversineDistanceKm(a, b)).toBeCloseTo(haversineDistanceKm(b, a), 10)
  })
})
