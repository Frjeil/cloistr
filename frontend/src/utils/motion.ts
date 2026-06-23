import type { Transition, Variants } from 'motion/react'

export const fastEase: Transition = { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }
export const medEase: Transition = { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }
export const slowEase: Transition = { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
export const springStiff: Transition = { type: 'spring', stiffness: 300, damping: 25 }
export const springBouncy: Transition = { type: 'spring', stiffness: 200, damping: 15 }

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: medEase },
}

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: medEase },
}

export const fadeUpStagger: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.06, delayChildren: 0.1, ...medEase },
  },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: springStiff },
}

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: medEase },
}

export const counterProps = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1, transition: springBouncy },
}

export function formatCount(_from: number, to: number): string {
  if (to >= 1000) return `${(to / 1000).toFixed(1)}k`
  return String(to)
}
