import { ReactNode } from 'react'
import TopRail from './TopRail'
import Toaster from './Toaster'

interface ShellProps {
  active: 'home' | 'crm' | 'review'
  children: ReactNode
}

export default function Shell({ active, children }: ShellProps) {
  return (
    <div className="min-h-screen">
      <TopRail active={active} />
      <main className="mx-auto max-w-[1500px] px-3 md:px-6 py-5">{children}</main>
      <Toaster />
    </div>
  )
}
