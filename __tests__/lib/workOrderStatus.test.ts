import {
  WORK_ORDER_PROGRESS_STAGE_ORDER,
  WORK_ORDER_PROGRESS_STAGE_OPTIONS,
  WORK_ORDER_PROGRESS_STAGE_LABELS,
} from '@/lib/workOrderStatus'

describe('work order progress stage order', () => {
  it('is inspect, then wait for parts, then repair', () => {
    expect(WORK_ORDER_PROGRESS_STAGE_ORDER).toEqual(['INSPECTING', 'WAITING_PARTS', 'REPAIRING'])
  })

  it('lists WAITING_PARTS before REPAIRING in the mechanic dropdown', () => {
    const values = WORK_ORDER_PROGRESS_STAGE_OPTIONS.map(o => o.value)
    expect(values.indexOf('WAITING_PARTS')).toBeLessThan(values.indexOf('REPAIRING'))
  })

  it('covers every stage exactly once, with its Spanish label', () => {
    expect(WORK_ORDER_PROGRESS_STAGE_OPTIONS).toHaveLength(
      Object.keys(WORK_ORDER_PROGRESS_STAGE_LABELS).length
    )
    expect(WORK_ORDER_PROGRESS_STAGE_OPTIONS.map(o => o.label)).toEqual([
      'Inspección',
      'Esperando repuestos',
      'Reparando',
    ])
  })
})
