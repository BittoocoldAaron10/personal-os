import { useEffect, useState } from 'react'
import { subscribeToast, ToastKind } from '@/lib/toast'
import { Check, AlertTriangle } from 'lucide-react'

interface Item {
  id: number
  msg: string
  kind: ToastKind
}

export default function Toaster() {
  const [items, setItems] = useState<Item[]>([])

  useEffect(() => {
    return subscribeToast((id, msg, kind) => {
      setItems((prev) => [...prev, { id, msg, kind }])
      setTimeout(() => {
        setItems((prev) => prev.filter((i) => i.id !== id))
      }, 3600)
    })
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 pointer-events-none">
      {items.map((i) => (
        <div
          key={i.id}
          className="panel fadeup flex items-center gap-2.5 px-3.5 py-2.5 shadow-panel min-w-[220px] max-w-[360px]"
        >
          <span
            className={`grid place-items-center h-5 w-5 rounded-md shrink-0 ${
              i.kind === 'ok' ? 'bg-accent/15 text-accent' : 'bg-hot/15 text-hot'
            }`}
          >
            {i.kind === 'ok' ? <Check size={12} /> : <AlertTriangle size={12} />}
          </span>
          <span className="text-[12.5px] text-ink-dim">{i.msg}</span>
        </div>
      ))}
    </div>
  )
}
