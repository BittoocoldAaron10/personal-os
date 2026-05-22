export type ToastKind = 'ok' | 'err'
type Listener = (id: number, msg: string, kind: ToastKind) => void

let listeners: Listener[] = []
let counter = 0

export function toast(msg: string, kind: ToastKind = 'ok') {
  counter += 1
  listeners.forEach((l) => l(counter, msg, kind))
}

export function subscribeToast(l: Listener) {
  listeners.push(l)
  return () => {
    listeners = listeners.filter((x) => x !== l)
  }
}
