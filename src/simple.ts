
function generate<T, K extends keyof T>(template: (self: T) => {[k in K]: () => T[K][] | undefined | null | false}): T {
  const current = {} as any
  function go(queue: any): any {
    if (queue.length == 0) {
      return [{...current}]
    }
    const [[key, gen], ...rest] = queue
    return (gen(current) || []).flatMap((x: any) => {
      current[key] = x
      return go(rest)
    })
  }
  const kvs = Object.entries(template(current))
  return go(kvs)
}

function range(lo: number, hi: number): number[] {
  const out = []
  for (let i = lo; i <= hi; i++) {
    out.push(i)
  }
  return out
}

const triples: {a: number, b: number, c: number, _: {}} = generate(self => ({
  a: () => range(1, 18),
  b: () => range(1, self.a),
  c: () => range(1, self.b),
  _: () => (self.a*self.a == self.b*self.b + self.c*self.c) && [{}]
}))
console.log(JSON.stringify(triples, undefined, 2))

