import { timelineCurrentStep, timelineStepState } from '@/app/(dashboard)/owner/DashboardContent'

describe('timelineCurrentStep', () => {
  it('returns 0 for PENDING', () => {
    expect(timelineCurrentStep('PENDING', null)).toBe(0)
  })

  it('returns 1 for IN_PROGRESS with no progressStage set yet', () => {
    expect(timelineCurrentStep('IN_PROGRESS', null)).toBe(1)
  })

  it('returns 1 for IN_PROGRESS + INSPECTING', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'INSPECTING')).toBe(1)
  })

  it('returns 2 for IN_PROGRESS + REPAIRING', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'REPAIRING')).toBe(2)
  })

  it('returns 3 for IN_PROGRESS + WAITING_PARTS', () => {
    expect(timelineCurrentStep('IN_PROGRESS', 'WAITING_PARTS')).toBe(3)
  })

  it('returns 4 for COMPLETED', () => {
    expect(timelineCurrentStep('COMPLETED', null)).toBe(4)
  })
})

describe('timelineStepState', () => {
  it('marks every step done when status is COMPLETED, including the last one', () => {
    expect(timelineStepState(4, 4, 'COMPLETED')).toBe('done')
    expect(timelineStepState(0, 4, 'COMPLETED')).toBe('done')
  })

  it('marks steps before currentStep as done', () => {
    expect(timelineStepState(0, 2, 'IN_PROGRESS')).toBe('done')
  })

  it('marks the currentStep as current', () => {
    expect(timelineStepState(2, 2, 'IN_PROGRESS')).toBe('current')
  })

  it('marks steps after currentStep as pending', () => {
    expect(timelineStepState(3, 2, 'IN_PROGRESS')).toBe('pending')
  })
})
