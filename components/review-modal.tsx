'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star } from 'lucide-react'

const SHEET_URL =
  'https://script.google.com/macros/s/AKfycbxcXCkmydt_apvDBg4EcDsJltIkH9K5MCaeuTfLfuthVgH8MMSRpSQc8hXo-NXEc2Hk/exec'

export function ReviewModal({
  open,
  dealerName,
  onClose,
}: {
  open: boolean
  dealerName: string
  onClose: () => void
}) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [review, setReview] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done'>('idle')

  const submit = async () => {
    if (rating === 0) return
    setStatus('sending')
    try {
      await fetch(SHEET_URL, {
        method: 'POST',
        body: JSON.stringify({ rating, review, dealer: dealerName }),
      })
    } catch {}
    setStatus('done')
    setTimeout(() => {
      onClose()
      setRating(0)
      setReview('')
      setStatus('idle')
    }, 1400)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm bg-card border border-border rounded-xl p-6 flex flex-col gap-4"
            initial={{ y: 20, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 20, opacity: 0, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-serif text-xl text-foreground">How's the table?</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Quick feedback for the house</p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === 'done' ? (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center font-serif text-lg text-gold py-4"
              >
                Thanks for the feedback.
              </motion.p>
            ) : (
              <>
                {/* Star rating */}
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(s)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className="h-7 w-7"
                        fill={(hovered || rating) >= s ? '#C9A227' : 'transparent'}
                        stroke={(hovered || rating) >= s ? '#C9A227' : 'currentColor'}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>

                {/* Text review */}
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder="Anything to say about the game? (optional)"
                  rows={3}
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-gold/60 transition-colors"
                />

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-md border border-border text-xs uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Skip
                  </button>
                  <button
                    onClick={submit}
                    disabled={rating === 0 || status === 'sending'}
                    className="flex-1 py-2.5 rounded-md border border-gold text-xs uppercase tracking-[0.15em] text-gold hover:bg-gold hover:text-primary-foreground transition-colors disabled:opacity-30 disabled:pointer-events-none"
                  >
                    {status === 'sending' ? 'Sending…' : 'Submit'}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
