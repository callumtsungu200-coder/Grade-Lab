/* Shared motion primitives — one easing, short durations, no bounce.
   Everything respects the OS "reduce motion" setting via Framer's
   useReducedMotion (entrances become instant fades, numbers jump). */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import type { Variants } from 'framer-motion'

/** Calm ease-out used across the app. */
export const EASE = [0.22, 1, 0.36, 1] as const

/** Page / view entrance: fade + 10px rise (~450ms); quick fade on exit. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: reduce ? 0.15 : 0.45, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.12, ease: 'easeOut' } }}
    >
      {children}
    </motion.div>
  )
}

export const staggerContainer = (gap = 0.05, delay = 0.02): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

/** Staggered list/grid wrapper. Children should be <StaggerItem>. */
export function Stagger({
  children,
  className,
  gap = 0.05,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  gap?: number
  as?: 'div' | 'ul' | 'section'
}) {
  const Comp = as === 'ul' ? motion.ul : as === 'section' ? motion.section : motion.div
  return (
    <Comp className={className} variants={staggerContainer(gap)} initial="hidden" animate="show">
      {children}
    </Comp>
  )
}

export function StaggerItem({ children, className, as = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'li' }) {
  const Comp = as === 'li' ? motion.li : motion.div
  return (
    <Comp className={className} variants={staggerItem}>
      {children}
    </Comp>
  )
}

/** Counts up from 0 (or the previous value) to `value` with an ease-out. */
export function AnimatedNumber({
  value,
  duration = 0.9,
  format = (n: number) => Math.round(n).toLocaleString(),
}: {
  value: number
  duration?: number
  format?: (n: number) => string
}) {
  const reduce = useReducedMotion()
  const from = useRef(0)
  const [shown, setShown] = useState(reduce ? value : 0)
  useEffect(() => {
    if (reduce) {
      setShown(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setShown(v),
    })
    from.current = value
    return () => controls.stop()
  }, [value, duration, reduce])
  return <>{format(shown)}</>
}
