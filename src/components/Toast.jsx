import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function Toast({ toast }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const t = setTimeout(() => setVisible(false), 1600)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <AnimatePresence>
      {visible && toast && (
        <motion.div
          className="toast"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {toast.msg}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
