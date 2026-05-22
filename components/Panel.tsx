import { ReactNode } from 'react'

interface PanelProps {
  num?: string
  title: string
  status?: ReactNode
  accessory?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export default function Panel({
  num,
  title,
  status,
  accessory,
  children,
  className = '',
  bodyClassName = '',
}: PanelProps) {
  return (
    <section className={`panel panel-hover shadow-panel flex flex-col ${className}`}>
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-line">
        <div className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase min-w-0">
          {num && <span className="text-accent">{num}</span>}
          <span className="text-ink-faint">//</span>
          <span className="text-ink-dim truncate tracking-[0.18em]">{title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] uppercase tracking-wider text-ink-faint">
          {status}
          {accessory}
        </div>
      </header>
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
