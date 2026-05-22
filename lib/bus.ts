// Lightweight pub-sub so a capture in one card can refresh sibling cards.
type Fn = () => void
let subs: Fn[] = []

export function emitRefresh() {
  subs.forEach((f) => {
    try {
      f()
    } catch {
      /* ignore */
    }
  })
}

export function onRefresh(f: Fn) {
  subs.push(f)
  return () => {
    subs = subs.filter((x) => x !== f)
  }
}
