import { CONTENT } from '../../data/content'
import { createRng, nextFloat } from '../rng'
import { nextMorning, stepsPerWeek, timeOfWeek } from '../world/clock'
import { DIFFICULTIES, DIFFICULTY_IDS, empowerBoss, isDifficulty, timeOf } from './difficulty'
import { DIAMOND_CHANCE, GOLDEN_CHANCE, rollTier } from './loot'
import { createRun, runReducer } from './reducer'
import { deserializeRun, serializeRun } from './save'

const reduce = runReducer(CONTENT)

describe('difficulty modes', () => {
  it('Normal starts with 20 health, Hard and Very Hard with 10', () => {
    expect(createRun(1, CONTENT).hero).toMatchObject({ hp: 20, baseHealth: 20 })
    expect(createRun(1, CONTENT, { difficulty: 'hard' }).hero).toMatchObject({ hp: 10, baseHealth: 10 })
    expect(createRun(1, CONTENT, { difficulty: 'veryHard' }).hero).toMatchObject({ hp: 10, baseHealth: 10 })
  })

  it('Normal has the longest days; Very Hard has longer nights', () => {
    const { normal, hard, veryHard } = DIFFICULTIES
    expect(normal.schedule.daySteps).toBeGreaterThan(hard.schedule.daySteps)
    expect(veryHard.schedule.nightSteps).toBeGreaterThan(hard.schedule.nightSteps)
  })

  it('the clock follows the run’s schedule', () => {
    const hard = { ...createRun(1, CONTENT, { difficulty: 'hard' }), step: 40 }
    expect(timeOf(hard).phase).toBe('night')
    expect(timeOf({ ...hard, difficulty: 'normal' }).phase).toBe('day')
    const veryHard = DIFFICULTIES.veryHard.schedule
    expect(timeOfWeek(79, veryHard)).toMatchObject({ phase: 'night', day: 1, stepsLeftInSegment: 1 })
    expect(timeOfWeek(80, veryHard)).toMatchObject({ phase: 'day', day: 2 })
    expect(timeOfWeek(stepsPerWeek(veryHard), veryHard).bossDue).toBe(true)
    expect(nextMorning(45, veryHard)).toBe(80)
  })

  it('Normal finds golden items more often', () => {
    const upgradeOdds = DIAMOND_CHANCE + GOLDEN_CHANCE
    const seed = Array.from({ length: 20_000 }, (_, i) => i + 1).find((s) => {
      const [roll] = nextFloat(createRng(s))
      return roll > upgradeOdds && roll < upgradeOdds * DIFFICULTIES.normal.luck && roll > DIAMOND_CHANCE * DIFFICULTIES.normal.luck
    })
    if (!seed) throw new Error('no seed rolls between the base and boosted odds')
    expect(rollTier(createRng(seed), DIFFICULTIES.hard.luck)[0]).toBe('normal')
    expect(rollTier(createRng(seed), DIFFICULTIES.normal.luck)[0]).toBe('golden')
  })

  it('Very Hard bosses have more health and attack; other modes leave them alone', () => {
    const boss = CONTENT.bosses[0]!
    expect(empowerBoss(boss, 'normal')).toBe(boss)
    expect(empowerBoss(boss, 'hard')).toBe(boss)
    const strong = empowerBoss(boss, 'veryHard')
    expect(strong.stats.maxHp).toBe(Math.ceil(boss.stats.maxHp * 1.25))
    expect(strong.stats.attack).toBe(boss.stats.attack + 1)
    expect(strong.stats.armor).toBe(boss.stats.armor)
  })

  it('a Very Hard boss battle uses the stronger boss', () => {
    const normal = reduce(createRun(1, CONTENT), { type: 'fightBoss' })
    const veryHard = reduce(createRun(1, CONTENT, { difficulty: 'veryHard' }), { type: 'fightBoss' })
    if (normal.screen.kind !== 'battle' || veryHard.screen.kind !== 'battle') throw new Error('expected battles')
    const enemyMax = (s: typeof normal) => (s.screen.kind === 'battle' ? s.screen.battle.result.events[0]?.snapshot.enemy.maxHp : 0)
    expect(enemyMax(veryHard)).toBeGreaterThan(enemyMax(normal) ?? 0)
  })

  it('saves keep the difficulty; saves from before difficulties load as Normal', () => {
    const run = createRun(3, CONTENT, { difficulty: 'veryHard' })
    const loaded = deserializeRun(JSON.parse(JSON.stringify(serializeRun(run))), CONTENT)
    expect(loaded.ok && loaded.state.difficulty).toBe('veryHard')
    const { difficulty: _dropped, ...old } = serializeRun(createRun(3, CONTENT))
    const legacy = deserializeRun(JSON.parse(JSON.stringify(old)), CONTENT)
    expect(legacy.ok && legacy.state.difficulty).toBe('normal')
  })

  it('recognises difficulty ids', () => {
    for (const id of DIFFICULTY_IDS) expect(isDifficulty(id)).toBe(true)
    expect(isDifficulty('nightmare')).toBe(false)
    expect(isDifficulty(null)).toBe(false)
  })
})
