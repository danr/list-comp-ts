interface ListComprehension<A> {
  emit(...values: A[]): void
  lit<B>(...values: B[]): B
  each<B>(values: B[] | (() => B[])): B
  memo<C>(calculate: () => C): C
  // range(begin: number, end?: number): number
}

function range(begin_or_end: number, end?: number): number[] {
  if (end === undefined) {
    end = begin_or_end
    begin_or_end = 0
  }
  const out: number[] = []
  for (let i = begin_or_end; i < end; i++) {
    out.push(i)
  }
  return out
}

class EndOfBranch extends Error {
  constructor() {
    super('EndOfBranch')
  }
}

function list<A>(k: (api: ListComprehension<A>) => undefined | A): A[] {
  const out: A[] = []
  const emit: (...values: A[]) => void = out.push.bind(out)

  let nested = false
  function atomic<Z>(h: () => Z): Z {
    if (nested) {
      throw new Error('Nested invocations to each')
    } else {
      nested = true
      const res = h()
      nested = false
      return res
    }
  }

  let trail: any[][] = []
  let i: number = 0
  function each<B>(calc: B[] | (() => B[])): B {
    if (typeof calc != 'function') {
      return each(() => calc)
    }
    if (trail[i] === undefined) {
      // First visit
      trail[i] = atomic(() =>
        calc()
          .slice()
          .reverse()
      )
    }
    const values = trail[i]
    const N = values.length
    if (N > 0) {
      i++
      return values[N - 1]
    } else {
      throw new EndOfBranch()
    }
  }

  function memo<C>(calculate: () => C): C {
    return each(() => [calculate()])
  }

  function lit<B>(...values: B[]) {
    return each(values)
  }

  const api = {emit, each, memo, lit}

  function decrement(): boolean {
    for (; i >= 0; i--) {
      if (trail[i].length > 0) {
        trail[i].pop()
      }
      if (trail[i].length == 0) {
        trail = trail.slice(0, i)
      } else {
        break
      }
    }
    return i == -1
  }

  while (true) {
    try {
      i = 0
      const a = k(api)
      if (a !== undefined) {
        emit(a)
      }
      i--
      if (decrement()) {
        return out
      }
    } catch (e) {
      if (e.message == 'EndOfBranch') {
        if (decrement()) {
          return out
        }
      } else {
        throw e
      }
    }
  }
}

/*
console.log(
list<Record<string, number>>(d => {
  const x = d.each(range(0,5))
  const y = d.each(d.cache<number[]>(() => (console.log('recalc', {x}), range(0,x))))
  // const y = d.each(range(0,x))
  console.log({x, y})
  const z = x + y
  // const z = d.cache(() => (console.log({x, y}), x * y))
  if (z != 3) {
    return {x, y, z}
  }
})
)
*/
console.log(
  list<any>(d => {
    const xs = range(4).map(i => d.each(range(0, 1 + i)))
    if (xs.reduce((a, b) => a + b, 0) % 2 == 0) {
      return xs
    }
  })
)

console.log(
  list<any>(d => {
    const b = d.lit(true, false)
    const u = b ? d.lit('a', 'b') : d.lit('c', 'd')
    return {b, u}
  })
)

type Dict = Record<string, any>

const config: Dict = {
  python: [2, 3],
  os: ['win', 'linux'],
  lib: [1.16, 1.17],
}

try {
  list(d => d.each(() => [d.each(() => [1, 2])]))
} catch (e) {
  console.log('Expect failure:', e)
}

console.log(
  list<Dict>(d => {
    const setting: Dict = {}
    for (const key in config) {
      setting[key] = d.each(config[key])
      // ^ will get all possible values
    }
    return setting
  })
) /* ==
[ { python: 2, os: 'win', lib: 1.16 },
  { python: 2, os: 'win', lib: 1.17 },
  { python: 2, os: 'linux', lib: 1.16 },
  { python: 2, os: 'linux', lib: 1.17 },
  { python: 3, os: 'win', lib: 1.16 },
  { python: 3, os: 'win', lib: 1.17 },
  { python: 3, os: 'linux', lib: 1.16 },
  { python: 3, os: 'linux', lib: 1.17 } ] */
