import { useEffect, useRef, useState } from 'react'
import { Mic } from 'lucide-react'

interface MicButtonProps {
  onResult: (text: string) => void
  title?: string
  size?: number
}

// Compact voice-input button using the browser's free Web Speech API.
export default function MicButton({ onResult, title, size = 36 }: MicButtonProps) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(true)
  const recRef = useRef<any>(null)
  const finalRef = useRef('')
  const cbRef = useRef(onResult)

  useEffect(() => {
    cbRef.current = onResult
  }, [onResult])

  useEffect(() => {
    const SR =
      (typeof window !== 'undefined' && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) ||
      null
    if (!SR) {
      setSupported(false)
      return
    }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onstart = () => {
      finalRef.current = ''
      setListening(true)
    }
    rec.onresult = (e: any) => {
      let txt = ''
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript
      finalRef.current = txt
    }
    rec.onerror = () => setListening(false)
    rec.onend = () => {
      setListening(false)
      const t = finalRef.current.trim()
      if (t) cbRef.current(t)
    }
    recRef.current = rec
    return () => {
      try {
        rec.abort()
      } catch {
        /* ignore */
      }
    }
  }, [])

  if (!supported) return null

  const toggle = () => {
    const rec = recRef.current
    if (!rec) return
    if (listening) {
      rec.stop()
    } else {
      try {
        rec.start()
      } catch {
        /* already started */
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      title={title || 'Voice input'}
      style={{ height: size, width: size }}
      className={`shrink-0 grid place-items-center rounded-md border transition-colors ${
        listening
          ? 'border-hot/60 bg-hot/10 text-hot'
          : 'border-line text-ink-faint hover:text-ink-dim hover:border-line-bright'
      }`}
    >
      <Mic size={15} className={listening ? 'blink' : ''} />
    </button>
  )
}
