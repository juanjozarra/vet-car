import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { Prisma } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { OPEN_WORK_ORDER_STATUSES } from '@/lib/activeRepairs'
import { canAccessVehicleHistory, type SessionUser } from '@/lib/vehicleAccess'
import { parseVehicleInput, type ParsedVehicleInput } from '@/lib/vehicleInput'

// A VIN already tied to a registered owner is refused rather than attached:
// letting a mechanic open a ticket on any car by typing its VIN would turn this
// route into a cross-workshop history leak.
const VIN_BELONGS_TO_OWNER =
  'Ese VIN pertenece a un vehículo registrado. Pedile al dueño que agende un turno para recibirlo.'

// Either an existing row to attach to, or the fields to create one with.
type VehicleTarget = { id: string } | { create: ParsedVehicleInput }

type ResolvedTarget =
  | { ok: true; target: VehicleTarget }
  | { ok: false; response: NextResponse }

// Resolving which vehicle the ticket attaches to is the branchiest part of this
// route, so it lives on its own — same shape as resolveInviteRequest in
// app/api/invites/[token]/shared.ts: either a value, or the response to return.
async function resolveVehicleTarget(
  user: SessionUser,
  vehicleId: unknown,
  vehicle: unknown
): Promise<ResolvedTarget> {
  const fail = (error: string, status: number): ResolvedTarget => ({
    ok: false,
    response: NextResponse.json({ error }, { status }),
  })

  if (vehicleId != null) {
    // Same 404 for "no such vehicle" and "not this workshop's vehicle" — a
    // mechanic must not learn which vehicle ids exist elsewhere.
    if (typeof vehicleId !== 'string' || !(await canAccessVehicleHistory(user, vehicleId))) {
      return fail('Vehículo no encontrado', 404)
    }
    return { ok: true, target: { id: vehicleId } }
  }

  if (typeof vehicle !== 'object' || vehicle === null || Array.isArray(vehicle)) {
    return fail('Datos del vehículo inválidos', 400)
  }

  const parsed = parseVehicleInput(vehicle as Record<string, unknown>)
  if ('error' in parsed) {
    return fail(parsed.error, 400)
  }

  // A VIN the shop has seen before is reused rather than duplicated.
  const existing = parsed.vin
    ? await prisma.vehicle.findUnique({
        where: { vin: parsed.vin },
        select: { id: true, ownerId: true },
      })
    : null

  if (existing?.ownerId != null) {
    return fail(VIN_BELONGS_TO_OWNER, 409)
  }

  return { ok: true, target: existing ? { id: existing.id } : { create: parsed } }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { workshopId } = session.user
  if (session.user.role !== 'MECHANIC' || !workshopId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { vehicleId, vehicle, title, description } = await request.json()

  if (typeof title !== 'string' || title.trim() === '') {
    return NextResponse.json({ error: 'Ingresá un título para la orden' }, { status: 400 })
  }
  // Exactly one of the two vehicle inputs.
  if ((vehicleId == null) === (vehicle == null)) {
    return NextResponse.json(
      { error: 'Enviá un vehículo existente o los datos de uno nuevo' },
      { status: 400 }
    )
  }

  const resolved = await resolveVehicleTarget(session.user, vehicleId, vehicle)
  if (!resolved.ok) return resolved.response
  const { target } = resolved

  // The guard check-in uses, so a walk-in cannot put the same vehicle on the
  // board twice. A vehicle being created here cannot have an open ticket yet.
  if ('id' in target) {
    const openWorkOrder = await prisma.workOrder.findFirst({
      where: {
        vehicleId: target.id,
        status: { in: OPEN_WORK_ORDER_STATUSES },
        mechanic: { workshopId },
      },
      select: { id: true },
    })
    if (openWorkOrder) {
      return NextResponse.json(
        { error: 'Este vehículo ya está en servicio en tu taller' },
        { status: 409 }
      )
    }
  }

  const trimmedDescription =
    typeof description === 'string' && description.trim() !== '' ? description.trim() : null

  try {
    const workOrder = await prisma.$transaction(async tx => {
      const targetVehicleId =
        'id' in target
          ? target.id
          : (await tx.vehicle.create({ data: { ...target.create, ownerId: null } })).id

      return tx.workOrder.create({
        data: {
          title: title.trim(),
          description: trimmedDescription,
          status: 'PENDING',
          vehicleId: targetVehicleId,
          mechanicId: session.user.id,
        },
      })
    })
    return NextResponse.json(workOrder, { status: 201 })
  } catch (err) {
    // Another request registered this VIN between the lookup above and the write.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ error: VIN_BELONGS_TO_OWNER }, { status: 409 })
    }
    throw err
  }
}
