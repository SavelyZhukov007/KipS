import { useEffect, useRef } from 'react'
import { renderAnim } from './render'
import type { AnimType } from '../types'

interface Props {
  type: AnimType
  params: Record<string, any>
  height?: number
  className?: string
  paused?: boolean
}

export function AnimationCanvas({ type, params, height = 220, className, paused }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf = 0
    const start = performance.now()

    // настройка под DPR
    const setSize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.round(rect.width * dpr)
      canvas.height = Math.round(rect.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    setSize()
    const ro = new ResizeObserver(setSize)
    ro.observe(canvas)

    const loop = (now: number) => {
      const t = (now - start) / 1000
      const W = canvas.width / (window.devicePixelRatio || 1)
      const H = canvas.height / (window.devicePixelRatio || 1)
      renderAnim(type, ctx, W, H, t, params)
      if (!paused) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [type, params, paused])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height, display: 'block', borderRadius: 4 }}
    />
  )
}
