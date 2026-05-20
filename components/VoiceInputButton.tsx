import { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  isLoading?: boolean
}

export default function VoiceInputButton({ onTranscript, isLoading }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<any>(null)
  const [supported, setSupported] = useState(true)

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.language = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
      setTranscript('')
    }

    recognition.onresult = (event: any) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          interim += transcriptSegment + ' '
        } else {
          interim += transcriptSegment
        }
      }
      setTranscript(interim)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error)
    }

    recognition.onend = () => {
      setIsListening(false)
      if (transcript.trim()) {
        onTranscript(transcript.trim())
        setTranscript('')
      }
    }

    recognitionRef.current = recognition
  }, [onTranscript])

  const toggleListening = () => {
    if (!recognitionRef.current) return

    if (isListening) {
      recognitionRef.current.stop()
    } else {
      recognitionRef.current.start()
    }
  }

  if (!supported) {
    return (
      <div className="text-gray-500 text-sm">
        Speech recognition not supported in this browser
      </div>
    )
  }

  return (
    <button
      onClick={toggleListening}
      disabled={isLoading}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
        isListening
          ? 'bg-red-600 hover:bg-red-700'
          : 'bg-blue-600 hover:bg-blue-700'
      } text-white disabled:opacity-50`}
      title={isListening ? 'Listening...' : 'Click to start voice input'}
    >
      {isListening ? (
        <>
          <Square size={20} />
          <span>Stop Recording</span>
        </>
      ) : (
        <>
          <Mic size={20} />
          <span>Voice Input</span>
        </>
      )}
    </button>
  )
}
