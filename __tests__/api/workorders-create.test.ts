import { POST } from '@/app/api/workorders/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { canAccessVehicleHistory } from '@/lib/vehicleAccess'

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/vehicleAccess', () => ({ canAccessVehicleHistory: jest.fn() }))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    vehicle: { findUnique: jest.fn(), create: jest.fn() },
    workOrder: { findFirst: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const mechanicSession = {
  user: { id: 'm1', role: 'MECHANIC', workshopId: 'ws1' },
}

const newVehicle = {
  make: 'Honda',
  model: 'CR-V',
  year: '2019',
  vin: '1HGBH41JXMN109186',
}

function workOrderRequest(body: unknown) {
  return new Request('http://localhost/api/workorders', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// The route creates the vehicle and the work order in one transaction; run the
// callback against the same mocked delegates the route would use.
function runTransaction() {
  ;(prisma.$transaction as jest.Mock).mockImplementation(fn =>
    fn({ vehicle: prisma.vehicle, workOrder: prisma.workOrder })
  )
}

describe('POST /api/workorders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue(mechanicSession)
    ;(prisma.workOrder.findFirst as jest.Mock).mockResolvedValue(null)
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.workOrder.create as jest.Mock).mockResolvedValue({ id: 'wo1', status: 'PENDING' })
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(true)
    runTransaction()
  })

  it('returns 401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 for an owner', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'o1', role: 'OWNER', workshopId: null },
    })
    const res = await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 for a mechanic with no workshop', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'm1', role: 'MECHANIC', workshopId: null },
    })
    const res = await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 when the title is missing', async () => {
    const res = await POST(workOrderRequest({ vehicleId: 'v1' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when the title is blank', async () => {
    const res = await POST(workOrderRequest({ vehicleId: 'v1', title: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when both vehicleId and vehicle are sent', async () => {
    const res = await POST(
      workOrderRequest({ vehicleId: 'v1', vehicle: newVehicle, title: 'Frenos' })
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when neither vehicleId nor vehicle is sent', async () => {
    const res = await POST(workOrderRequest({ title: 'Frenos' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 with the parser message for an invalid year', async () => {
    const res = await POST(
      workOrderRequest({ vehicle: { ...newVehicle, year: 'abc' }, title: 'Frenos' })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Ingresá un año válido')
  })

  it('returns 404 for a vehicleId outside the workshop', async () => {
    ;(canAccessVehicleHistory as jest.Mock).mockResolvedValue(false)
    const res = await POST(workOrderRequest({ vehicleId: 'v-elsewhere', title: 'Frenos' }))
    expect(res.status).toBe(404)
    expect(prisma.workOrder.create).not.toHaveBeenCalled()
  })

  it('returns 409 when the vehicle already has an open ticket at this workshop', async () => {
    ;(prisma.workOrder.findFirst as jest.Mock).mockResolvedValue({ id: 'wo-open' })
    const res = await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe('Este vehículo ya está en servicio en tu taller')
  })

  it('scopes the open-ticket guard to this workshop and the open statuses', async () => {
    await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    expect(prisma.workOrder.findFirst).toHaveBeenCalledWith({
      where: {
        vehicleId: 'v1',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        mechanic: { workshopId: 'ws1' },
      },
      select: { id: true },
    })
  })

  it('returns 409 when the VIN belongs to an owned vehicle', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
      id: 'v-owned',
      ownerId: 'someone',
    })
    const res = await POST(workOrderRequest({ vehicle: newVehicle, title: 'Frenos' }))
    expect(res.status).toBe(409)
    expect((await res.json()).error).toBe(
      'Ese VIN pertenece a un vehículo registrado. Pedile al dueño que agende un turno para recibirlo.'
    )
    expect(prisma.vehicle.create).not.toHaveBeenCalled()
  })

  it('reuses an existing unowned vehicle on a VIN match instead of duplicating it', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
      id: 'v-walkin',
      ownerId: null,
    })
    const res = await POST(workOrderRequest({ vehicle: newVehicle, title: 'Frenos' }))

    expect(res.status).toBe(201)
    expect(prisma.vehicle.create).not.toHaveBeenCalled()
    expect(prisma.workOrder.create).toHaveBeenCalledWith({
      data: {
        title: 'Frenos',
        description: null,
        status: 'PENDING',
        vehicleId: 'v-walkin',
        mechanicId: 'm1',
      },
    })
  })

  it('matches the VIN case-insensitively when reusing a vehicle', async () => {
    ;(prisma.vehicle.findUnique as jest.Mock).mockResolvedValue({
      id: 'v-walkin',
      ownerId: null,
    })
    await POST(
      workOrderRequest({
        vehicle: { ...newVehicle, vin: '1hgbh41jxmn109186' },
        title: 'Frenos',
      })
    )
    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith({
      where: { vin: '1HGBH41JXMN109186' },
      select: { id: true, ownerId: true },
    })
  })

  it('creates an ownerless vehicle and its work order on the walk-in happy path', async () => {
    ;(prisma.vehicle.create as jest.Mock).mockResolvedValue({ id: 'v-new' })
    const res = await POST(
      workOrderRequest({ vehicle: newVehicle, title: ' Frenos ', description: ' Ruido ' })
    )

    expect(res.status).toBe(201)
    expect(prisma.vehicle.create).toHaveBeenCalledWith({
      data: {
        make: 'Honda',
        model: 'CR-V',
        year: 2019,
        vin: '1HGBH41JXMN109186',
        plate: null,
        plateState: null,
        nickname: null,
        mileage: null,
        ownerId: null,
      },
    })
    expect(prisma.workOrder.create).toHaveBeenCalledWith({
      data: {
        title: 'Frenos',
        description: 'Ruido',
        status: 'PENDING',
        vehicleId: 'v-new',
        mechanicId: 'm1',
      },
    })
  })

  it('creates a walk-in vehicle with no VIN without looking one up', async () => {
    ;(prisma.vehicle.create as jest.Mock).mockResolvedValue({ id: 'v-new' })
    const res = await POST(
      workOrderRequest({
        vehicle: { make: 'Honda', model: 'CR-V', year: 2019 },
        title: 'Frenos',
      })
    )
    expect(res.status).toBe(201)
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled()
  })

  it('creates the work order against an existing workshop vehicle', async () => {
    const res = await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    expect(res.status).toBe(201)
    expect(prisma.vehicle.create).not.toHaveBeenCalled()
    expect(prisma.workOrder.create).toHaveBeenCalledWith({
      data: {
        title: 'Frenos',
        description: null,
        status: 'PENDING',
        vehicleId: 'v1',
        mechanicId: 'm1',
      },
    })
  })

  // appointmentId is what distinguishes a walk-in from a checked-in turno, so it
  // must stay unset here.
  it('leaves appointmentId unset so the ticket reads as a walk-in', async () => {
    await POST(workOrderRequest({ vehicleId: 'v1', title: 'Frenos' }))
    const { data } = (prisma.workOrder.create as jest.Mock).mock.calls[0][0]
    expect(data).not.toHaveProperty('appointmentId')
  })
})
