import { fitStage } from './useStageScale'

describe('fitStage', () => {
  it('uses whole-number scales on big screens', () => {
    expect(fitStage(1920, 1080)).toEqual({ scale: 4, portrait: false })
    expect(fitStage(1300, 800)).toEqual({ scale: 2, portrait: false })
  })

  it('fills small screens with a fractional scale', () => {
    expect(fitStage(844, 390).scale).toBeCloseTo(390 / 270)
    expect(fitStage(240, 270).scale).toBe(0.5)
  })

  it('flags narrow portrait screens', () => {
    expect(fitStage(390, 844).portrait).toBe(true)
    expect(fitStage(1080, 1920).portrait).toBe(false)
  })
})
