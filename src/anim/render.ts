/**
 * Универсальный рендерер 20 анимаций.
 *
 * Все функции получают:
 *   ctx — 2D-контекст canvas
 *   W, H — размеры canvas (CSS-пиксели; учтён DPR)
 *   t — время в секундах с момента запуска
 *   p — параметры (Record<string, number|string|boolean>)
 *
 * Каждая функция самостоятельно очищает фон в стилистике "пергамента".
 *
 * Цветовая палитра привязана к книжному дизайну:
 *   ink     — чернила
 *   accent  — основной акцент (марокканский красный)
 *   leaf    — зелёная травка для контраста
 *   gold    — золото для подсветки
 */

import type { AnimType } from '../types'

const COL = {
  paper: '#f5efe1',
  ink: '#211a12',
  inkSoft: '#4a3e2c',
  faint: '#7d6b4a',
  rule: '#b9a875',
  accent: '#8b3a2f',
  accent2: '#b66a4d',
  gold: '#a07a3c',
  leaf: '#5a6b3a',
  azure: '#3e6a8c',
  panel: '#ede4d0',
}

// ───────────────────────────── helpers ─────────────────────────────

function paperBg(ctx: CanvasRenderingContext2D, W: number, H: number) {
  ctx.fillStyle = COL.paper
  ctx.fillRect(0, 0, W, H)
}

function gridFrame(ctx: CanvasRenderingContext2D, W: number, H: number, pad = 16) {
  ctx.strokeStyle = COL.rule
  ctx.lineWidth = 1
  ctx.strokeRect(pad + 0.5, pad + 0.5, W - 2 * pad - 1, H - 2 * pad - 1)
}

// Преобразование математической координаты (xMin..xMax, yMin..yMax) в пиксели
function makeMap(W: number, H: number, xMin: number, xMax: number, yMin: number, yMax: number, pad = 24) {
  const sx = (W - 2 * pad) / (xMax - xMin)
  const sy = (H - 2 * pad) / (yMax - yMin)
  return {
    x: (x: number) => pad + (x - xMin) * sx,
    y: (y: number) => H - pad - (y - yMin) * sy,
    sx, sy,
  }
}

function drawAxes(ctx: CanvasRenderingContext2D, m: ReturnType<typeof makeMap>, xMin: number, xMax: number, yMin: number, yMax: number) {
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 0.8
  ctx.setLineDash([2, 3])
  // x-axis
  ctx.beginPath(); ctx.moveTo(m.x(xMin), m.y(0)); ctx.lineTo(m.x(xMax), m.y(0)); ctx.stroke()
  // y-axis
  ctx.beginPath(); ctx.moveTo(m.x(0), m.y(yMin)); ctx.lineTo(m.x(0), m.y(yMax)); ctx.stroke()
  ctx.setLineDash([])
}

function num(p: any, k: string, def = 0): number { const v = p?.[k]; return typeof v === 'number' ? v : def }
function str(p: any, k: string, def = ''): string { const v = p?.[k]; return typeof v === 'string' ? v : def }
function bool(p: any, k: string, def = false): boolean { const v = p?.[k]; return typeof v === 'boolean' ? v : def }

function fnEval(name: string, x: number, a = 1, b = 1): number {
  switch (name) {
    case 'sin': return a * Math.sin(b * x)
    case 'cos': return a * Math.cos(b * x)
    case 'pow': return a * Math.pow(x, Math.max(1, Math.round(b * 2)))
    case 'exp': return a * Math.exp(b * x * 0.5)
    case 'ln': return x > 0.01 ? a * Math.log(x) * b : NaN
    case 'poly': return a * x * x * x + b * x
    case 'cubic': return x * x * x - 2 * x - 1
    case 'quad': return x * x - 2
    case 'bell': return Math.exp(-x * x)
    case 'parab': return Math.max(0, 1 - x * x)
  }
  return Math.sin(x)
}

function fnDeriv(name: string, x: number, a = 1, b = 1): number {
  switch (name) {
    case 'sin': return a * b * Math.cos(b * x)
    case 'cos': return -a * b * Math.sin(b * x)
    case 'pow': { const n = Math.max(1, Math.round(b * 2)); return a * n * Math.pow(x, n - 1) }
    case 'exp': return a * 0.5 * b * Math.exp(b * x * 0.5)
    case 'ln': return x > 0.01 ? a * b / x : NaN
    case 'poly': return 3 * a * x * x + b
    case 'cubic': return 3 * x * x - 2
    case 'quad': return 2 * x
  }
  return Math.cos(x)
}

// ───────────────────────────── 1. Функция и производная ─────────────────────────────

function drawFunctionDerivative(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const fn = str(p, 'fn', 'sin')
  const a = num(p, 'a', 1), b = num(p, 'b', 1)
  let x0 = num(p, 'x0', 0.5)
  // лёгкое колебание точки касания для динамики
  x0 += 0.4 * Math.sin(t * 0.6)

  const xMin = -3, xMax = 3, yMin = -3, yMax = 3
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // график
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  let started = false
  for (let xp = 0; xp <= W; xp += 1) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const y = fnEval(fn, x, a, b)
    if (!isFinite(y) || y < yMin - 5 || y > yMax + 5) { started = false; continue }
    const px = m.x(x), py = m.y(y)
    if (!started) { ctx.moveTo(px, py); started = true } else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // касательная в точке x0
  const y0 = fnEval(fn, x0, a, b)
  const k = fnDeriv(fn, x0, a, b)
  if (isFinite(y0) && isFinite(k)) {
    ctx.strokeStyle = COL.leaf
    ctx.lineWidth = 1.5
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    const xa = xMin, xb = xMax
    ctx.moveTo(m.x(xa), m.y(y0 + k * (xa - x0)))
    ctx.lineTo(m.x(xb), m.y(y0 + k * (xb - x0)))
    ctx.stroke()
    ctx.setLineDash([])

    // секущая
    if (bool(p, 'showSecant', true)) {
      const dx = 0.5 + 0.4 * Math.cos(t * 0.6)
      const y1 = fnEval(fn, x0 + dx, a, b)
      if (isFinite(y1)) {
        ctx.strokeStyle = COL.gold
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        const slope = (y1 - y0) / dx
        ctx.moveTo(m.x(xa), m.y(y0 + slope * (xa - x0)))
        ctx.lineTo(m.x(xb), m.y(y0 + slope * (xb - x0)))
        ctx.stroke()
        ctx.setLineDash([])
        // точка x0+dx
        ctx.fillStyle = COL.gold
        ctx.beginPath(); ctx.arc(m.x(x0 + dx), m.y(y1), 3.5, 0, 6.283); ctx.fill()
      }
    }

    // точка x0
    ctx.fillStyle = COL.accent
    ctx.beginPath(); ctx.arc(m.x(x0), m.y(y0), 4.5, 0, 6.283); ctx.fill()
    ctx.strokeStyle = COL.paper
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.arc(m.x(x0), m.y(y0), 4.5, 0, 6.283); ctx.stroke()
  }

  // подпись
  ctx.fillStyle = COL.faint
  ctx.font = '11px JetBrains Mono'
  ctx.fillText(`x₀ = ${x0.toFixed(2)}   f'(x₀) = ${k.toFixed(2)}`, 28, H - 24)
}

// ───────────────────────────── 2. Линейное преобразование ─────────────────────────────

function drawLinearTransform(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  // плавная интерполяция от единичной к заданной матрице (визуально красиво)
  const phase = (Math.sin(t * 0.8) + 1) / 2 // 0..1
  const tgt = [num(p, 'm11', 1), num(p, 'm12', 0), num(p, 'm21', 0), num(p, 'm22', 1)]
  const a = 1 + (tgt[0] - 1) * phase
  const b = 0 + (tgt[1] - 0) * phase
  const c = 0 + (tgt[2] - 0) * phase
  const d = 1 + (tgt[3] - 1) * phase

  const xMin = -3, xMax = 3, yMin = -3, yMax = 3
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)

  // деформированная сетка
  ctx.strokeStyle = COL.rule
  ctx.lineWidth = 0.6
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath()
    for (let j = -30; j <= 30; j++) {
      const x = j / 10, y = i
      const tx = a * x + b * y, ty = c * x + d * y
      const px = m.x(tx), py = m.y(ty)
      if (j === -30) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.beginPath()
    for (let j = -30; j <= 30; j++) {
      const x = i, y = j / 10
      const tx = a * x + b * y, ty = c * x + d * y
      const px = m.x(tx), py = m.y(ty)
      if (j === -30) ctx.moveTo(px, py); else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // векторы î, ĵ (после преобразования)
  const drawVec = (vx: number, vy: number, color: string) => {
    ctx.strokeStyle = color; ctx.fillStyle = color
    ctx.lineWidth = 2.5
    ctx.beginPath(); ctx.moveTo(m.x(0), m.y(0)); ctx.lineTo(m.x(vx), m.y(vy)); ctx.stroke()
    const ang = Math.atan2(m.y(vy) - m.y(0), m.x(vx) - m.x(0))
    ctx.beginPath()
    ctx.moveTo(m.x(vx), m.y(vy))
    ctx.lineTo(m.x(vx) - 9 * Math.cos(ang - 0.4), m.y(vy) - 9 * Math.sin(ang - 0.4))
    ctx.lineTo(m.x(vx) - 9 * Math.cos(ang + 0.4), m.y(vy) - 9 * Math.sin(ang + 0.4))
    ctx.closePath(); ctx.fill()
  }
  drawVec(a, c, COL.accent)        // î
  drawVec(b, d, COL.leaf)          // ĵ

  // определитель
  const det = tgt[0] * tgt[3] - tgt[1] * tgt[2]
  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`det = ${det.toFixed(2)}`, 28, H - 24)

  // собственные векторы (вещественные)
  if (bool(p, 'showEigen', true)) {
    const tr = tgt[0] + tgt[3], dt = det
    const disc = tr * tr - 4 * dt
    if (disc > 0) {
      const l1 = (tr + Math.sqrt(disc)) / 2
      const l2 = (tr - Math.sqrt(disc)) / 2
      const eig = (lam: number) => {
        if (Math.abs(tgt[1]) > 1e-6) return [tgt[1], lam - tgt[0]]
        if (Math.abs(tgt[2]) > 1e-6) return [lam - tgt[3], tgt[2]]
        return [1, 0]
      }
      ctx.strokeStyle = COL.gold
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 3])
      for (const lam of [l1, l2]) {
        const [vx, vy] = eig(lam)
        const len = Math.hypot(vx, vy) || 1
        const nx = vx / len, ny = vy / len
        ctx.beginPath()
        ctx.moveTo(m.x(-3 * nx), m.y(-3 * ny))
        ctx.lineTo(m.x(3 * nx), m.y(3 * ny))
        ctx.stroke()
      }
      ctx.setLineDash([])
    }
  }
}

// ───────────────────────────── 3. Ряд Фурье ─────────────────────────────

function drawFourier(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const N = Math.max(1, Math.round(num(p, 'N', 9)))
  const shape = str(p, 'shape', 'square')
  const xMin = -Math.PI, xMax = Math.PI, yMin = -1.4, yMax = 1.4
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // Целевая функция (фундаментальная T = 2π)
  const target = (x: number) => {
    if (shape === 'square') return x > 0 ? 1 : -1
    if (shape === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(x))
    if (shape === 'sawtooth') return (x / Math.PI)
    return 0
  }

  if (bool(p, 'showTarget', true)) {
    ctx.strokeStyle = COL.rule
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    let started = false
    for (let xp = 0; xp <= W; xp++) {
      const x = xMin + (xp / W) * (xMax - xMin)
      const y = target(x)
      const px = m.x(x), py = m.y(y)
      if (!started) { ctx.moveTo(px, py); started = true } else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Частичная сумма ряда
  const partial = (x: number) => {
    let s = 0
    if (shape === 'square') {
      for (let k = 1; k <= N; k++) {
        const n = 2 * k - 1
        s += (4 / Math.PI) * Math.sin(n * x) / n
      }
    } else if (shape === 'triangle') {
      for (let k = 1; k <= N; k++) {
        const n = 2 * k - 1
        s += (8 / (Math.PI * Math.PI)) * Math.cos(n * x) / (n * n) * (k % 2 === 0 ? -1 : 1)
      }
      // (для треугольника начинаем с косинусной формы)
    } else if (shape === 'sawtooth') {
      for (let n = 1; n <= N; n++) {
        s += (2 / Math.PI) * Math.sin(n * x) / n * (n % 2 === 0 ? -1 : 1)
      }
    }
    return s
  }

  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const y = partial(x)
    const px = m.x(x), py = m.y(y)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`N = ${N} гармоник`, 28, H - 24)
}

// ───────────────────────────── 4. Градиент ─────────────────────────────

function drawGradientField(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const fn = str(p, 'fn', 'paraboloid')
  const density = Math.round(num(p, 'density', 12))
  const levels = Math.round(num(p, 'levels', 10))

  const f = (x: number, y: number) => {
    if (fn === 'paraboloid') return x * x + y * y
    if (fn === 'saddle') return x * x - y * y
    if (fn === 'sincos') return Math.sin(x) * Math.cos(y)
    return 0
  }
  const grad = (x: number, y: number) => {
    if (fn === 'paraboloid') return [2 * x, 2 * y]
    if (fn === 'saddle') return [2 * x, -2 * y]
    if (fn === 'sincos') return [Math.cos(x) * Math.cos(y), -Math.sin(x) * Math.sin(y)]
    return [0, 0]
  }

  const xMin = -2.5, xMax = 2.5, yMin = -2.5, yMax = 2.5
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)

  // изолинии (контурные)
  ctx.strokeStyle = COL.rule
  ctx.lineWidth = 0.7
  let zMin = Infinity, zMax = -Infinity
  for (let i = 0; i < 30; i++) for (let j = 0; j < 30; j++) {
    const x = xMin + (i / 29) * (xMax - xMin)
    const y = yMin + (j / 29) * (yMax - yMin)
    const z = f(x, y)
    if (z < zMin) zMin = z; if (z > zMax) zMax = z
  }
  for (let l = 1; l < levels; l++) {
    const lvl = zMin + (l / levels) * (zMax - zMin)
    // marching через простую сетку
    ctx.beginPath()
    const N = 80
    const dx = (xMax - xMin) / N
    const dy = (yMax - yMin) / N
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const x = xMin + i * dx, y = yMin + j * dy
      const v00 = f(x, y), v10 = f(x + dx, y), v01 = f(x, y + dy)
      // ребро снизу
      if ((v00 - lvl) * (v10 - lvl) < 0) {
        const tInt = (lvl - v00) / (v10 - v00)
        ctx.moveTo(m.x(x + tInt * dx), m.y(y))
        ctx.lineTo(m.x(x + tInt * dx) + 0.5, m.y(y) + 0.5)
      }
      if ((v00 - lvl) * (v01 - lvl) < 0) {
        const tInt = (lvl - v00) / (v01 - v00)
        ctx.moveTo(m.x(x), m.y(y + tInt * dy))
        ctx.lineTo(m.x(x) + 0.5, m.y(y + tInt * dy) + 0.5)
      }
    }
    ctx.stroke()
  }

  // векторы градиента
  ctx.strokeStyle = COL.accent
  ctx.fillStyle = COL.accent
  ctx.lineWidth = 1.2
  for (let i = 0; i < density; i++) for (let j = 0; j < density; j++) {
    const x = xMin + ((i + 0.5) / density) * (xMax - xMin)
    const y = yMin + ((j + 0.5) / density) * (yMax - yMin)
    const [gx, gy] = grad(x, y)
    const mag = Math.hypot(gx, gy) || 1
    const sc = 0.18 / Math.max(0.3, mag)
    const ex = x + gx * sc, ey = y + gy * sc
    ctx.beginPath()
    ctx.moveTo(m.x(x), m.y(y))
    ctx.lineTo(m.x(ex), m.y(ey))
    ctx.stroke()
    const ang = Math.atan2(m.y(ey) - m.y(y), m.x(ex) - m.x(x))
    ctx.beginPath()
    ctx.moveTo(m.x(ex), m.y(ey))
    ctx.lineTo(m.x(ex) - 5 * Math.cos(ang - 0.5), m.y(ey) - 5 * Math.sin(ang - 0.5))
    ctx.lineTo(m.x(ex) - 5 * Math.cos(ang + 0.5), m.y(ey) - 5 * Math.sin(ang + 0.5))
    ctx.closePath(); ctx.fill()
  }
}

// ───────────────────────────── 5. Комплексная степень ─────────────────────────────

function drawComplexPower(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const n = num(p, 'n', 2)
  const r = num(p, 'radius', 1)
  const xMin = -2, xMax = 2, yMin = -2, yMax = 2
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // Исходная окружность
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  for (let i = 0; i <= 100; i++) {
    const a = (i / 100) * 2 * Math.PI
    const px = m.x(r * Math.cos(a)), py = m.y(r * Math.sin(a))
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.setLineDash([])

  // Преобразованная w = z^n
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  const phaseShift = bool(p, 'rotate', true) ? t * 0.3 : 0
  for (let i = 0; i <= 200; i++) {
    const a = (i / 200) * 2 * Math.PI + phaseShift
    const rn = Math.pow(r, n)
    const an = a * n
    const px = m.x(rn * Math.cos(an)), py = m.y(rn * Math.sin(an))
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // движущаяся точка
  const a = (t * 0.5) % (2 * Math.PI)
  const z = [r * Math.cos(a), r * Math.sin(a)]
  const w = [Math.pow(r, n) * Math.cos(a * n), Math.pow(r, n) * Math.sin(a * n)]
  ctx.fillStyle = COL.faint
  ctx.beginPath(); ctx.arc(m.x(z[0]), m.y(z[1]), 4, 0, 6.283); ctx.fill()
  ctx.fillStyle = COL.accent
  ctx.beginPath(); ctx.arc(m.x(w[0]), m.y(w[1]), 5, 0, 6.283); ctx.fill()
  ctx.strokeStyle = COL.accent2
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath(); ctx.moveTo(m.x(z[0]), m.y(z[1])); ctx.lineTo(m.x(w[0]), m.y(w[1])); ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`n = ${n.toFixed(2)}, |z| = ${r.toFixed(2)}`, 28, H - 24)
}

// ───────────────────────────── 6. Фазовый портрет ─────────────────────────────

function drawPhasePortrait(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const A = [num(p, 'a11', 0.2), num(p, 'a12', 1), num(p, 'a21', -1), num(p, 'a22', -0.2)]
  const xMin = -2.5, xMax = 2.5, yMin = -2.5, yMax = 2.5
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // поле направлений
  ctx.strokeStyle = COL.rule
  ctx.lineWidth = 1
  const N = 14
  for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
    const x = xMin + (i / N) * (xMax - xMin)
    const y = yMin + (j / N) * (yMax - yMin)
    const dx = A[0] * x + A[1] * y
    const dy = A[2] * x + A[3] * y
    const mag = Math.hypot(dx, dy) || 1
    const sc = 0.12 / Math.max(0.2, mag)
    ctx.beginPath()
    ctx.moveTo(m.x(x - dx * sc * 0.5), m.y(y - dy * sc * 0.5))
    ctx.lineTo(m.x(x + dx * sc * 0.5), m.y(y + dy * sc * 0.5))
    ctx.stroke()
  }

  // несколько траекторий, движущихся со временем
  const seeds = [[1.5, 0], [-1.5, 0], [0, 1.5], [0, -1.5], [1, 1], [-1, -1], [1.2, -0.8]]
  ctx.lineWidth = 1.6
  for (let s = 0; s < seeds.length; s++) {
    let [x, y] = seeds[s]
    ctx.strokeStyle = s % 2 ? COL.accent : COL.leaf
    ctx.beginPath(); ctx.moveTo(m.x(x), m.y(y))
    const steps = 200
    const dt = 0.04
    for (let i = 0; i < steps; i++) {
      const dx = A[0] * x + A[1] * y
      const dy = A[2] * x + A[3] * y
      x += dx * dt; y += dy * dt
      if (Math.abs(x) > 4 || Math.abs(y) > 4) break
      ctx.lineTo(m.x(x), m.y(y))
    }
    ctx.stroke()
    // движущаяся точка
    const phase = (t * 0.5 + s) % 4
    let cx = seeds[s][0], cy = seeds[s][1]
    for (let i = 0; i < phase * 50; i++) {
      const dx = A[0] * cx + A[1] * cy
      const dy = A[2] * cx + A[3] * cy
      cx += dx * dt; cy += dy * dt
      if (Math.abs(cx) > 4 || Math.abs(cy) > 4) break
    }
    ctx.fillStyle = COL.gold
    ctx.beginPath(); ctx.arc(m.x(cx), m.y(cy), 3.5, 0, 6.283); ctx.fill()
  }

  // тип особой точки
  const tr = A[0] + A[3], det = A[0] * A[3] - A[1] * A[2]
  let kind = 'седло'
  if (det > 0) {
    if (tr * tr - 4 * det >= 0) kind = tr > 0 ? 'неуст. узел' : 'уст. узел'
    else kind = tr === 0 ? 'центр' : (tr > 0 ? 'неуст. фокус' : 'уст. фокус')
  }
  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`tr = ${tr.toFixed(2)}, det = ${det.toFixed(2)} → ${kind}`, 28, H - 24)
}

// ───────────────────────────── 7. Метод Ньютона ─────────────────────────────

function drawNewton(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const fn = str(p, 'fn', 'cubic')
  const x0 = num(p, 'x0', 1.6)
  const itersTarget = Math.round(num(p, 'iters', 6))
  const xMin = -3, xMax = 3, yMin = -4, yMax = 4
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const y = fnEval(fn, x)
    const px = m.x(x), py = m.y(y)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // последовательность приближений
  const visible = Math.floor(((t * 0.7) % (itersTarget + 2)))
  let x = x0
  ctx.lineWidth = 1.4
  for (let i = 0; i < Math.min(visible, itersTarget); i++) {
    const fx = fnEval(fn, x)
    const dfx = fnDeriv(fn, x)
    if (Math.abs(dfx) < 1e-6) break
    const xn = x - fx / dfx
    // вертикаль вниз/вверх к графику
    ctx.strokeStyle = COL.gold
    ctx.beginPath()
    ctx.moveTo(m.x(x), m.y(0))
    ctx.lineTo(m.x(x), m.y(fx))
    ctx.stroke()
    // касательная до пересечения с x-осью
    ctx.strokeStyle = COL.leaf
    ctx.setLineDash([4, 3])
    ctx.beginPath()
    ctx.moveTo(m.x(x), m.y(fx))
    ctx.lineTo(m.x(xn), m.y(0))
    ctx.stroke()
    ctx.setLineDash([])
    // точки
    ctx.fillStyle = COL.accent
    ctx.beginPath(); ctx.arc(m.x(x), m.y(0), 3, 0, 6.283); ctx.fill()
    x = xn
  }
  ctx.fillStyle = COL.gold
  ctx.beginPath(); ctx.arc(m.x(x), m.y(0), 5, 0, 6.283); ctx.fill()

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`x ≈ ${x.toFixed(4)}, итераций: ${Math.min(visible, itersTarget)}`, 28, H - 24)
}

// ───────────────────────────── 8. Монте-Карло ─────────────────────────────

const mcCache = new WeakMap<any, { pts: { x: number; y: number; inside: boolean }[]; samples: number; fn: string }>()
function drawMonteCarlo(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const fn = str(p, 'fn', 'bell')
  const samples = Math.round(num(p, 'samples', 800))
  const xMin = -2, xMax = 2, yMin = -0.2, yMax = 1.4
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // график функции
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const y = fnEval(fn, x)
    const px = m.x(x), py = m.y(Math.max(0, y))
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // кэшируем точки чтобы не пересоздавать каждый кадр
  const cached = mcCache.get(p)
  let pts = cached?.pts
  if (!cached || cached.samples !== samples || cached.fn !== fn) {
    pts = []
    for (let i = 0; i < samples; i++) {
      const x = xMin + Math.random() * (xMax - xMin)
      const y = Math.random() * 1.4
      const fy = Math.max(0, fnEval(fn, x))
      pts.push({ x, y, inside: y < fy })
    }
    mcCache.set(p, { pts, samples, fn })
  }

  // точки появляются постепенно
  const visible = Math.min(samples, Math.floor((t * 200) % (samples * 1.5)))
  let inside = 0
  for (let i = 0; i < visible; i++) {
    const pt = pts![i]
    if (pt.inside) inside++
    ctx.fillStyle = pt.inside ? COL.leaf : COL.faint
    ctx.fillRect(m.x(pt.x) - 1, m.y(pt.y) - 1, 2, 2)
  }
  const area = (inside / Math.max(1, visible)) * (xMax - xMin) * 1.4

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`оценка ≈ ${area.toFixed(4)}, точек: ${visible}`, 28, H - 24)
}

// ───────────────────────────── 9. Векторное поле и ротор ─────────────────────────────

function drawVectorFieldCurl(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const kind = str(p, 'kind', 'vortex')
  const density = Math.round(num(p, 'density', 14))
  const xMin = -2, xMax = 2, yMin = -2, yMax = 2
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  const F = (x: number, y: number) => {
    if (kind === 'vortex') return [-y, x]
    if (kind === 'sink') return [x, y]
    if (kind === 'shear') return [y, 0]
    return [0, 0]
  }
  const curl = (x: number, y: number) => {
    if (kind === 'vortex') return 2
    if (kind === 'sink') return 0
    if (kind === 'shear') return -1
    return 0
  }

  // поток: рисуем линии тока через интегрирование
  ctx.lineWidth = 1
  for (let i = 0; i < density; i++) for (let j = 0; j < density; j++) {
    let x = xMin + ((i + 0.5) / density) * (xMax - xMin)
    let y = yMin + ((j + 0.5) / density) * (yMax - yMin)
    const c = curl(x, y)
    const col = c > 0 ? COL.leaf : (c < 0 ? COL.accent : COL.faint)
    ctx.strokeStyle = col
    ctx.beginPath(); ctx.moveTo(m.x(x), m.y(y))
    const steps = 12
    for (let s = 0; s < steps; s++) {
      const [dx, dy] = F(x, y)
      const mag = Math.hypot(dx, dy) || 1
      x += dx / mag * 0.06; y += dy / mag * 0.06
      ctx.lineTo(m.x(x), m.y(y))
    }
    ctx.stroke()
  }

  // вращающиеся колёсики-тесты
  const wheels = [[1.2, 1.2], [-1.2, -1.2], [0, 0]]
  ctx.lineWidth = 1.5
  for (const [wx, wy] of wheels) {
    const c = curl(wx, wy)
    const angle = c * t * 0.4
    ctx.strokeStyle = COL.gold
    ctx.beginPath(); ctx.arc(m.x(wx), m.y(wy), 14, 0, 6.283); ctx.stroke()
    ctx.strokeStyle = COL.accent
    for (let k = 0; k < 4; k++) {
      const a = angle + (k * Math.PI / 2)
      ctx.beginPath()
      ctx.moveTo(m.x(wx), m.y(wy))
      ctx.lineTo(m.x(wx) + 14 * Math.cos(a) / m.sx * m.sx, m.y(wy) - 14 * Math.sin(a))
      ctx.stroke()
    }
  }
}

// ───────────────────────────── 10. МНК ─────────────────────────────

const lsCache = new WeakMap<any, { xs: number[]; ys: number[]; noise: number; points: number }>()
function drawLeastSquares(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const noise = num(p, 'noise', 0.5)
  const degree = Math.max(1, Math.round(num(p, 'degree', 1)))
  const points = Math.round(num(p, 'points', 30))
  const xMin = -3, xMax = 3, yMin = -3, yMax = 3
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  let cache = lsCache.get(p)
  if (!cache || cache.noise !== noise || cache.points !== points) {
    const xs: number[] = [], ys: number[] = []
    for (let i = 0; i < points; i++) {
      const x = xMin + Math.random() * (xMax - xMin)
      // истинная зависимость: 0.7x + 0.3sin(2x)
      const y = 0.7 * x + 0.3 * Math.sin(2 * x) + (Math.random() - 0.5) * 2 * noise
      xs.push(x); ys.push(y)
    }
    cache = { xs, ys, noise, points }
    lsCache.set(p, cache)
  }

  // Решаем нормальные уравнения: X^T X β = X^T y, где X - матрица Вандермонда
  const N = cache.xs.length
  const D = degree + 1
  const X: number[][] = cache.xs.map(x => Array.from({ length: D }, (_, k) => Math.pow(x, k)))
  const XtX: number[][] = Array.from({ length: D }, () => Array(D).fill(0))
  const Xty: number[] = Array(D).fill(0)
  for (let i = 0; i < N; i++) for (let j = 0; j < D; j++) {
    Xty[j] += X[i][j] * cache.ys[i]
    for (let k = 0; k < D; k++) XtX[j][k] += X[i][j] * X[i][k]
  }
  // Гауссово исключение
  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]])
  for (let i = 0; i < D; i++) {
    let pivot = i
    for (let k = i + 1; k < D; k++) if (Math.abs(aug[k][i]) > Math.abs(aug[pivot][i])) pivot = k
    if (pivot !== i) [aug[i], aug[pivot]] = [aug[pivot], aug[i]]
    const piv = aug[i][i] || 1e-9
    for (let k = i; k <= D; k++) aug[i][k] /= piv
    for (let k = 0; k < D; k++) if (k !== i) {
      const f = aug[k][i]
      for (let l = i; l <= D; l++) aug[k][l] -= f * aug[i][l]
    }
  }
  const beta = aug.map(r => r[D])

  // кривая
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    let y = 0; for (let k = 0; k < D; k++) y += beta[k] * Math.pow(x, k)
    const px = m.x(x), py = m.y(y)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // вертикальные линии ошибок (мерцают)
  let sse = 0
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 0.8
  for (let i = 0; i < N; i++) {
    const x = cache.xs[i], y = cache.ys[i]
    let yh = 0; for (let k = 0; k < D; k++) yh += beta[k] * Math.pow(x, k)
    sse += (y - yh) ** 2
    ctx.beginPath()
    ctx.moveTo(m.x(x), m.y(y))
    ctx.lineTo(m.x(x), m.y(yh))
    ctx.stroke()
  }
  // точки
  ctx.fillStyle = COL.ink
  for (let i = 0; i < N; i++) {
    ctx.beginPath(); ctx.arc(m.x(cache.xs[i]), m.y(cache.ys[i]), 2.4, 0, 6.283); ctx.fill()
  }

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`SSE = ${sse.toFixed(2)},  степень ${degree}`, 28, H - 24)
}

// ───────────────────────────── 11. Бросок под углом ─────────────────────────────

function drawProjectile(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const v0 = num(p, 'v0', 25)
  const angle = num(p, 'angle', 45) * Math.PI / 180
  const gKey = str(p, 'g', 'earth')
  const g = gKey === 'earth' ? 9.8 : (gKey === 'moon' ? 1.6 : 3.7)
  const drag = num(p, 'drag', 0)

  // Симулируем траекторию шагами
  let xMax = 0, yMax = 0
  const traj: { x: number; y: number; vx: number; vy: number }[] = []
  let x = 0, y = 0, vx = v0 * Math.cos(angle), vy = v0 * Math.sin(angle)
  const dt = 0.02
  for (let s = 0; s < 4000; s++) {
    traj.push({ x, y, vx, vy })
    if (s > 0 && y < 0) break
    const v = Math.hypot(vx, vy)
    const dvx = -drag * v * vx
    const dvy = -g - drag * v * vy
    vx += dvx * dt; vy += dvy * dt
    x += vx * dt; y += vy * dt
    if (x > xMax) xMax = x; if (y > yMax) yMax = y
  }

  const xMin = 0, yMin = 0
  const xRange = Math.max(xMax * 1.1, 10), yRange = Math.max(yMax * 1.2, xRange * 0.4)
  const m = makeMap(W, H, xMin, xRange, yMin, yRange)

  // земля
  ctx.fillStyle = COL.panel
  ctx.fillRect(m.x(0), m.y(0), m.x(xRange) - m.x(0), 5)
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(m.x(0), m.y(0)); ctx.lineTo(m.x(xRange), m.y(0)); ctx.stroke()

  // траектория
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  traj.forEach((pt, i) => {
    const px = m.x(pt.x), py = m.y(pt.y)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()
  ctx.setLineDash([])

  // движущееся тело
  const idx = Math.floor((t * 30) % traj.length)
  const pt = traj[idx]
  ctx.fillStyle = COL.accent
  ctx.beginPath(); ctx.arc(m.x(pt.x), m.y(pt.y), 6, 0, 6.283); ctx.fill()

  // векторы скорости и ускорения
  const arrow = (px: number, py: number, dx: number, dy: number, color: string) => {
    ctx.strokeStyle = color; ctx.fillStyle = color
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + dx, py + dy); ctx.stroke()
    const ang = Math.atan2(dy, dx)
    ctx.beginPath()
    ctx.moveTo(px + dx, py + dy)
    ctx.lineTo(px + dx - 7 * Math.cos(ang - 0.4), py + dy - 7 * Math.sin(ang - 0.4))
    ctx.lineTo(px + dx - 7 * Math.cos(ang + 0.4), py + dy - 7 * Math.sin(ang + 0.4))
    ctx.closePath(); ctx.fill()
  }
  const cx = m.x(pt.x), cy = m.y(pt.y)
  arrow(cx, cy, pt.vx * 1.5, -pt.vy * 1.5, COL.leaf)
  arrow(cx, cy, 0, g * 2.5, COL.azure)

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`v₀ = ${v0} м/с,  α = ${(angle * 180 / Math.PI).toFixed(0)}°,  дальность ≈ ${xMax.toFixed(1)} м`, 28, H - 24)
}

// ───────────────────────────── 12. Кеплеровская орбита ─────────────────────────────

const orbitCache = new WeakMap<any, { x: number; y: number; vx: number; vy: number; trail: { x: number; y: number }[] }>()
function drawKepler(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const M = num(p, 'mass', 1.4)
  const r0 = num(p, 'r0', 0.9)
  const v0 = num(p, 'v0', 1.1)
  const xMin = -2, xMax = 2, yMin = -1.5, yMax = 1.5
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)

  // центр масс
  ctx.fillStyle = COL.gold
  ctx.beginPath(); ctx.arc(m.x(0), m.y(0), 10, 0, 6.283); ctx.fill()
  ctx.fillStyle = COL.accent2
  ctx.beginPath(); ctx.arc(m.x(0), m.y(0), 5, 0, 6.283); ctx.fill()

  // интегрируем (RK2-like, простой Эйлер достаточен для демонстрации)
  let st = orbitCache.get(p)
  if (!st) { st = { x: r0, y: 0, vx: 0, vy: v0, trail: [] }; orbitCache.set(p, st) }
  // фиксированный шаг по реальному времени
  const dt = 0.02
  const steps = 2
  for (let s = 0; s < steps; s++) {
    const r = Math.hypot(st.x, st.y) || 0.01
    const ax = -M * st.x / (r * r * r), ay = -M * st.y / (r * r * r)
    st.vx += ax * dt; st.vy += ay * dt
    st.x += st.vx * dt; st.y += st.vy * dt
    st.trail.push({ x: st.x, y: st.y })
    if (st.trail.length > 600) st.trail.shift()
  }

  // след орбиты
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 1
  ctx.beginPath()
  st.trail.forEach((pt, i) => {
    const px = m.x(pt.x), py = m.y(pt.y)
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()

  // заметаемый сектор
  if (bool(p, 'showArea', true) && st.trail.length > 30) {
    const last = st.trail[st.trail.length - 1]
    const prev = st.trail[Math.max(0, st.trail.length - 30)]
    ctx.fillStyle = 'rgba(139, 58, 47, 0.18)'
    ctx.beginPath()
    ctx.moveTo(m.x(0), m.y(0))
    ctx.lineTo(m.x(prev.x), m.y(prev.y))
    ctx.lineTo(m.x(last.x), m.y(last.y))
    ctx.closePath(); ctx.fill()
  }

  // спутник
  ctx.fillStyle = COL.accent
  ctx.beginPath(); ctx.arc(m.x(st.x), m.y(st.y), 5, 0, 6.283); ctx.fill()

  // вектор силы
  const r = Math.hypot(st.x, st.y) || 0.01
  const fx = -st.x / r * 0.25, fy = -st.y / r * 0.25
  ctx.strokeStyle = COL.leaf
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(m.x(st.x), m.y(st.y))
  ctx.lineTo(m.x(st.x + fx), m.y(st.y + fy))
  ctx.stroke()

  // эксцентриситет (грубо: по экстремумам расстояния)
  if (st.trail.length > 100) {
    let rmax = 0, rmin = Infinity
    for (const pt of st.trail) { const rr = Math.hypot(pt.x, pt.y); if (rr > rmax) rmax = rr; if (rr < rmin) rmin = rr }
    const e = (rmax - rmin) / Math.max(0.001, rmax + rmin)
    ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
    ctx.fillText(`e ≈ ${e.toFixed(2)}, M = ${M.toFixed(2)}`, 28, H - 24)
  }
}

// ───────────────────────────── 13. Интерференция двух источников ─────────────────────────────

function drawInterference(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  const lam = num(p, 'wavelength', 0.16)
  const d = num(p, 'distance', 0.4)
  const dphi = num(p, 'phase', 0)

  // Создаём ImageData
  const img = ctx.createImageData(W, H)
  const data = img.data

  const cx = W / 2, cy = H / 2
  const s1x = cx - d * 250, s1y = cy
  const s2x = cx + d * 250, s2y = cy

  for (let y = 0; y < H; y += 2) for (let x = 0; x < W; x += 2) {
    const r1 = Math.hypot(x - s1x, y - s1y) / 250
    const r2 = Math.hypot(x - s2x, y - s2y) / 250
    const phi1 = (r1 / lam) * 2 * Math.PI - t * 2
    const phi2 = (r2 / lam) * 2 * Math.PI - t * 2 + dphi
    const amp = Math.cos(phi1) + Math.cos(phi2)
    const v = (amp + 2) / 4 // 0..1
    // папиросный жёлтый ↔ марокканский красный
    const r = Math.round(245 - v * 80)
    const g = Math.round(239 - v * 130)
    const b = Math.round(225 - v * 180)
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const idx = ((y + dy) * W + (x + dx)) * 4
      data[idx] = r; data[idx + 1] = g; data[idx + 2] = b; data[idx + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)

  // источники
  ctx.fillStyle = COL.ink
  ctx.beginPath(); ctx.arc(s1x, s1y, 4, 0, 6.283); ctx.fill()
  ctx.beginPath(); ctx.arc(s2x, s2y, 4, 0, 6.283); ctx.fill()

  ctx.fillStyle = COL.ink; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`λ = ${lam.toFixed(3)}, d = ${d.toFixed(2)}, Δφ = ${dphi.toFixed(2)}`, 16, H - 14)
}

// ───────────────────────────── 14. Электрическое поле ─────────────────────────────

function drawElectric(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const q1 = num(p, 'q1', 1)
  const q2 = num(p, 'q2', -1)
  const sep = num(p, 'sep', 0.7)
  const xMin = -1.5, xMax = 1.5, yMin = -1, yMax = 1
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)

  const c1 = { x: -sep, y: 0, q: q1 }
  const c2 = { x: sep, y: 0, q: q2 }

  const E = (x: number, y: number) => {
    let ex = 0, ey = 0
    for (const c of [c1, c2]) {
      const dx = x - c.x, dy = y - c.y
      const r2 = dx * dx + dy * dy + 0.001
      const r = Math.sqrt(r2)
      ex += c.q * dx / (r2 * r)
      ey += c.q * dy / (r2 * r)
    }
    return [ex, ey]
  }
  const V = (x: number, y: number) => {
    let v = 0
    for (const c of [c1, c2]) {
      const r = Math.hypot(x - c.x, y - c.y) + 0.05
      v += c.q / r
    }
    return v
  }

  // эквипотенциальные линии (грубо, marching на сетке)
  if (bool(p, 'showPotential', true)) {
    ctx.strokeStyle = COL.rule
    ctx.lineWidth = 0.8
    const N = 80
    const dx = (xMax - xMin) / N, dy = (yMax - yMin) / N
    const levels = [-3, -1.5, -0.7, 0.7, 1.5, 3]
    for (const lvl of levels) {
      ctx.beginPath()
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const x = xMin + i * dx, y = yMin + j * dy
        const v00 = V(x, y), v10 = V(x + dx, y), v01 = V(x, y + dy)
        if ((v00 - lvl) * (v10 - lvl) < 0) {
          const tInt = (lvl - v00) / (v10 - v00)
          const px = m.x(x + tInt * dx), py = m.y(y)
          ctx.moveTo(px, py); ctx.lineTo(px + 0.5, py + 0.5)
        }
        if ((v00 - lvl) * (v01 - lvl) < 0) {
          const tInt = (lvl - v00) / (v01 - v00)
          const px = m.x(x), py = m.y(y + tInt * dy)
          ctx.moveTo(px, py); ctx.lineTo(px + 0.5, py + 0.5)
        }
      }
      ctx.stroke()
    }
  }

  // линии поля (выходящие из + заряда)
  for (const c of [c1, c2]) {
    if (c.q === 0) continue
    const sgn = c.q > 0 ? 1 : -1
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * 2 * Math.PI
      let x = c.x + 0.05 * Math.cos(a), y = c.y + 0.05 * Math.sin(a)
      ctx.strokeStyle = c.q > 0 ? COL.accent : COL.azure
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(m.x(x), m.y(y))
      for (let s = 0; s < 200; s++) {
        const [ex, ey] = E(x, y)
        const mag = Math.hypot(ex, ey) || 1
        x += sgn * ex / mag * 0.02; y += sgn * ey / mag * 0.02
        if (Math.abs(x) > 1.5 || Math.abs(y) > 1) break
        // не заходить в противоположный заряд
        const other = c === c1 ? c2 : c1
        if (Math.hypot(x - other.x, y - other.y) < 0.05) break
        ctx.lineTo(m.x(x), m.y(y))
      }
      ctx.stroke()
    }
  }

  // заряды
  for (const c of [c1, c2]) {
    ctx.fillStyle = c.q > 0 ? COL.accent : COL.azure
    ctx.beginPath(); ctx.arc(m.x(c.x), m.y(c.y), 9, 0, 6.283); ctx.fill()
    ctx.fillStyle = COL.paper; ctx.font = 'bold 14px serif'; ctx.textAlign = 'center'
    ctx.fillText(c.q > 0 ? '+' : '−', m.x(c.x), m.y(c.y) + 5)
    ctx.textAlign = 'left'
  }

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`q₁ = ${q1.toFixed(1)},  q₂ = ${q2.toFixed(1)}`, 16, H - 14)
}

// ───────────────────────────── 15. RLC-контур ─────────────────────────────

const rlcCache = new WeakMap<any, { history: { i: number; q: number }[]; phase: number }>()
function drawRLC(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const L = num(p, 'L', 1)
  const C = num(p, 'C', 1)
  const R = num(p, 'R', 0.3)
  const drive = num(p, 'drive', 0)

  let st = rlcCache.get(p)
  if (!st) { st = { history: [{ i: 0, q: 1 }], phase: 0 }; rlcCache.set(p, st) }
  const dt = 0.02
  const steps = 3
  for (let s = 0; s < steps; s++) {
    const last = st.history[st.history.length - 1]
    let { i, q } = last
    const w = 1.5
    const E = drive * Math.sin(w * st.phase)
    // L*dI/dt + R*I + Q/C = E
    const di = (E - R * i - q / C) / L
    const dq = i
    i += di * dt; q += dq * dt
    st.phase += dt
    st.history.push({ i, q })
    if (st.history.length > 600) st.history.shift()
  }

  // Левая половина: осциллограмма
  const halfW = W / 2 - 6
  const m1 = makeMap(halfW, H, 0, 1, -1.5, 1.5, 16)
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 0, halfW, H); ctx.clip()
  // ось
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(halfW, H / 2); ctx.stroke()

  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 1.6
  ctx.beginPath()
  st.history.forEach((pt, idx) => {
    const x = (idx / st.history.length) * halfW
    const y = H / 2 - pt.i * (H * 0.3)
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.strokeStyle = COL.leaf
  ctx.beginPath()
  st.history.forEach((pt, idx) => {
    const x = (idx / st.history.length) * halfW
    const y = H / 2 - pt.q * (H * 0.3)
    if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
  })
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = COL.accent; ctx.font = '10px JetBrains Mono'
  ctx.fillText('I(t)', 8, 16)
  ctx.fillStyle = COL.leaf
  ctx.fillText('Q(t)', 8, 28)

  // Правая половина: фазовый портрет I-Q
  ctx.save()
  ctx.translate(W / 2 + 6, 0)
  const halfW2 = W / 2 - 6
  const m2 = makeMap(halfW2, H, -1.5, 1.5, -1.5, 1.5, 16)
  drawAxes(ctx, m2, -1.5, 1.5, -1.5, 1.5)
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 1.2
  ctx.beginPath()
  st.history.forEach((pt, idx) => {
    const px = m2.x(pt.q), py = m2.y(pt.i)
    if (idx === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  })
  ctx.stroke()
  // текущая точка
  const last = st.history[st.history.length - 1]
  ctx.fillStyle = COL.gold
  ctx.beginPath(); ctx.arc(m2.x(last.q), m2.y(last.i), 4, 0, 6.283); ctx.fill()
  ctx.fillStyle = COL.faint; ctx.font = '10px JetBrains Mono'
  ctx.fillText('Q', m2.x(1.4), m2.y(0) - 4)
  ctx.fillText('I', m2.x(0) + 4, m2.y(1.4) + 8)
  ctx.restore()

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  const omega = 1 / Math.sqrt(L * C)
  ctx.fillText(`ω₀ = ${omega.toFixed(2)},  R = ${R.toFixed(2)}`, 8, H - 8)
}

// ───────────────────────────── 16. Распределение Максвелла ─────────────────────────────

function drawMaxwell(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const T = num(p, 'T', 300)
  const gas = str(p, 'gas', 'N2')
  const mu = gas === 'He' ? 4 : (gas === 'N2' ? 28 : 131)
  // в условных единицах (для красоты графика)
  const a = Math.sqrt(T / (mu * 50))

  const xMin = 0, xMax = 4, yMin = 0, yMax = 1.4
  const m = makeMap(W, H, xMin, xMax, yMin, yMax, 30)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // теоретическая f(v) = 4πN (m/2πkT)^{3/2} v² exp(-mv²/2kT)
  const f = (v: number) => (4 / Math.sqrt(Math.PI)) * (v * v) / (a * a * a) * Math.exp(-(v * v) / (a * a))

  // "гистограмма" - случайные значения (квазислучайные, чтобы дрожали мягко)
  const bins = 30
  const binW = (xMax - xMin) / bins
  const counts = new Array(bins).fill(0)
  // генерируем фиксированную выборку для воспроизводимости
  for (let i = 0; i < 500; i++) {
    // Box–Muller для скоростей по компонентам
    const u1 = Math.sin(i * 12.9898 + 78.233) * 43758.5453
    const u2 = Math.sin(i * 39.347 + 11.135) * 15731.743
    const u3 = Math.sin(i * 67.811 + 2.871) * 6321.741
    const r1 = u1 - Math.floor(u1), r2 = u2 - Math.floor(u2), r3 = u3 - Math.floor(u3)
    const v1 = a * Math.sqrt(-Math.log(Math.max(0.001, r1))) * Math.cos(2 * Math.PI * r2)
    const v2 = a * Math.sqrt(-Math.log(Math.max(0.001, r2))) * Math.sin(2 * Math.PI * r3)
    const v3 = a * Math.sqrt(-Math.log(Math.max(0.001, r3))) * Math.cos(2 * Math.PI * r1)
    const v = Math.hypot(v1, v2, v3)
    const bin = Math.floor(v / binW)
    if (bin >= 0 && bin < bins) counts[bin]++
  }
  const norm = counts.reduce((s, c) => s + c, 0) * binW || 1
  // флуктуация по времени (легкое дрожание)
  ctx.fillStyle = 'rgba(139, 58, 47, 0.4)'
  for (let i = 0; i < bins; i++) {
    const wob = 1 + 0.05 * Math.sin(t * 1.2 + i * 0.7)
    const v = xMin + (i + 0.5) * binW
    const h = (counts[i] / norm) * wob
    const x = m.x(v - binW * 0.45)
    const y = m.y(h)
    ctx.fillRect(x, y, m.x(v + binW * 0.45) - x, m.y(0) - y)
  }

  // теоретическая кривая
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const v = xMin + (xp / W) * (xMax - xMin)
    const fv = f(v)
    const px = m.x(v), py = m.y(fv)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // характеристические скорости
  if (bool(p, 'showMarkers', true)) {
    const vp = a, vavg = a * Math.sqrt(4 / Math.PI), vrms = a * Math.sqrt(3 / 2)
    const drawMark = (v: number, lbl: string, color: string) => {
      ctx.strokeStyle = color
      ctx.setLineDash([3, 3])
      ctx.beginPath(); ctx.moveTo(m.x(v), m.y(0)); ctx.lineTo(m.x(v), m.y(yMax)); ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = color; ctx.font = '10px JetBrains Mono'
      ctx.fillText(lbl, m.x(v) + 3, m.y(yMax) + 12)
    }
    drawMark(vp, 'vₚ', COL.leaf)
    drawMark(vavg, 'v̄', COL.gold)
    drawMark(vrms, 'vᵣₘₛ', COL.azure)
  }

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`T = ${T} K,  газ: ${gas}`, 30, H - 10)
}

// ───────────────────────────── 17. Дифракция Фраунгофера ─────────────────────────────

function drawDiffraction(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const a = num(p, 'a', 1.2)
  const lam = num(p, 'lam', 0.6)
  const N = Math.round(num(p, 'N', 1))

  const xMin = -8, xMax = 8, yMin = 0, yMax = 1.05
  const m = makeMap(W, H, xMin, xMax, yMin, yMax)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // I(θ) = (sin(πa·sinθ/λ)/(πa·sinθ/λ))² · (sin(Nπd·sinθ/λ)/sin(πd·sinθ/λ))²
  // Используем sinθ ≈ x (положение на экране)
  const d = a * 1.6 // шаг решётки
  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 1.8
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const u = Math.PI * a * x / lam
    const single = u === 0 ? 1 : Math.pow(Math.sin(u) / u, 2)
    let multi = 1
    if (N > 1) {
      const v = Math.PI * d * x / lam
      const denom = Math.sin(v)
      multi = Math.abs(denom) < 0.001 ? N * N : Math.pow(Math.sin(N * v) / denom, 2) / (N * N)
    }
    const I = single * multi
    const px = m.x(x), py = m.y(I)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // огибающая (одна щель)
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 1
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const u = Math.PI * a * x / lam
    const I = u === 0 ? 1 : Math.pow(Math.sin(u) / u, 2)
    const px = m.x(x), py = m.y(I)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`a = ${a}, λ = ${lam}, N = ${N}`, 28, H - 24)
}

// ───────────────────────────── 18. Маятник ─────────────────────────────

const pendCache = new WeakMap<any, { theta: number; omega: number }>()
function drawPendulum(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const L = num(p, 'L', 1)
  const theta0 = num(p, 'theta0', 35) * Math.PI / 180
  const beta = num(p, 'beta', 0.02)
  const drive = num(p, 'drive', 0)

  let st = pendCache.get(p)
  if (!st) { st = { theta: theta0, omega: 0 }; pendCache.set(p, st) }
  const dt = 0.02
  const g = 9.8
  for (let s = 0; s < 3; s++) {
    const tau = -g / L * Math.sin(st.theta) - beta * st.omega + drive * Math.sin(t * 2)
    st.omega += tau * dt
    st.theta += st.omega * dt
  }

  // Левая половина: визуализация маятника
  const cx = W * 0.25, cy = H * 0.2
  const len = Math.min(W * 0.18, H * 0.55)
  const bx = cx + len * Math.sin(st.theta)
  const by = cy + len * Math.cos(st.theta)

  // потолок
  ctx.fillStyle = COL.panel
  ctx.fillRect(W * 0.05, cy - 6, W * 0.4, 4)
  // нить
  ctx.strokeStyle = COL.ink
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(bx, by); ctx.stroke()
  // груз
  ctx.fillStyle = COL.accent
  ctx.beginPath(); ctx.arc(bx, by, 12, 0, 6.283); ctx.fill()
  ctx.strokeStyle = COL.ink
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.arc(bx, by, 12, 0, 6.283); ctx.stroke()

  // Правая половина: фазовый портрет
  ctx.save()
  ctx.translate(W * 0.5, 0)
  const m = makeMap(W * 0.5, H, -Math.PI, Math.PI, -3, 3, 24)
  drawAxes(ctx, m, -Math.PI, Math.PI, -3, 3)
  // маркер текущей точки
  ctx.fillStyle = COL.gold
  let theta = ((st.theta + Math.PI) % (2 * Math.PI)) - Math.PI
  ctx.beginPath(); ctx.arc(m.x(theta), m.y(st.omega), 5, 0, 6.283); ctx.fill()

  // несколько уровней энергии (изолинии E = (1/2)ω² + (g/L)(1−cos θ))
  ctx.strokeStyle = COL.rule
  ctx.lineWidth = 0.7
  const energies = [0.5, 1.5, 2.5, 4, 6, 8]
  for (const E of energies) {
    ctx.beginPath()
    let started = false
    for (let xp = 0; xp <= 200; xp++) {
      const th = -Math.PI + (xp / 200) * 2 * Math.PI
      const term = E - (g / L) * (1 - Math.cos(th))
      if (term < 0) { started = false; continue }
      const om = Math.sqrt(2 * term)
      if (!isFinite(om) || Math.abs(om) > 3) continue
      const px = m.x(th), py = m.y(om)
      if (!started) { ctx.moveTo(px, py); started = true } else ctx.lineTo(px, py)
    }
    ctx.stroke()
    ctx.beginPath()
    started = false
    for (let xp = 0; xp <= 200; xp++) {
      const th = -Math.PI + (xp / 200) * 2 * Math.PI
      const term = E - (g / L) * (1 - Math.cos(th))
      if (term < 0) { started = false; continue }
      const om = -Math.sqrt(2 * term)
      if (!isFinite(om) || Math.abs(om) > 3) continue
      const px = m.x(th), py = m.y(om)
      if (!started) { ctx.moveTo(px, py); started = true } else ctx.lineTo(px, py)
    }
    ctx.stroke()
  }

  ctx.restore()

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`L = ${L}, θ₀ = ${(theta0 * 180 / Math.PI).toFixed(0)}°,  β = ${beta.toFixed(3)}`, 16, H - 8)
}

// ───────────────────────────── 19. Замедление времени ─────────────────────────────

function drawTimeDilation(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const beta = num(p, 'beta', 0.6)
  const gamma = 1 / Math.sqrt(1 - beta * beta)

  // Две системы: верх — покоящаяся, низ — движущаяся
  // Световые часы: фотон туда-обратно между двумя зеркалами

  const drawClock = (cx: number, cy: number, h: number, tickPeriod: number, label: string, lengthScale: number) => {
    const w = 60 * lengthScale
    ctx.strokeStyle = COL.ink
    ctx.lineWidth = 1.5
    // зеркала
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy - h / 2); ctx.lineTo(cx + w / 2, cy - h / 2); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - w / 2, cy + h / 2); ctx.lineTo(cx + w / 2, cy + h / 2); ctx.stroke()
    // фотон
    const phase = (t / tickPeriod) % 1
    const py = cy - h / 2 + (phase < 0.5 ? phase * 2 : 2 - phase * 2) * h
    ctx.fillStyle = COL.gold
    ctx.shadowBlur = 10; ctx.shadowColor = COL.gold
    ctx.beginPath(); ctx.arc(cx, py, 5, 0, 6.283); ctx.fill()
    ctx.shadowBlur = 0
    // подпись
    ctx.fillStyle = COL.ink
    ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'center'
    ctx.fillText(label, cx, cy + h / 2 + 24)
    ctx.textAlign = 'left'
  }

  // Покоящаяся: тик = 1 секунду визуально
  drawClock(W * 0.25, H * 0.5, 80, 1.5, "Часы в покое  τ", 1)

  // Движущаяся: фотон проходит больше пути → тик = γ
  drawClock(W * 0.75, H * 0.5, 80, 1.5 * gamma, `Часы в движении  τ' = γτ`, bool(p, 'showLengthContraction', true) ? 1 / gamma : 1)

  // линейка
  const ly = H - 50
  ctx.strokeStyle = COL.faint
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(W * 0.1, ly); ctx.lineTo(W * 0.9, ly); ctx.stroke()
  for (let i = 0; i <= 10; i++) {
    const x = W * 0.1 + (i / 10) * (W * 0.8)
    ctx.beginPath(); ctx.moveTo(x, ly - 4); ctx.lineTo(x, ly + 4); ctx.stroke()
  }

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`β = v/c = ${beta.toFixed(2)},  γ = ${gamma.toFixed(3)}`, 16, H - 14)
}

// ───────────────────────────── 20. Квантовая яма ─────────────────────────────

function drawQuantumWell(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) {
  paperBg(ctx, W, H)
  const L = num(p, 'L', 1)
  const U0 = num(p, 'U0', 40)
  const n = Math.round(num(p, 'n', 1))
  const finite = bool(p, 'finite', true)

  // Координаты: яма от -L/2 до L/2
  const xMin = -1.6, xMax = 1.6, yMin = -5, yMax = U0 + 5
  const m = makeMap(W, H, xMin, xMax, yMin, yMax, 30)
  drawAxes(ctx, m, xMin, xMax, yMin, yMax)

  // Стены ямы
  ctx.strokeStyle = COL.ink
  ctx.lineWidth = 2
  if (finite) {
    ctx.beginPath()
    ctx.moveTo(m.x(xMin), m.y(U0))
    ctx.lineTo(m.x(-L / 2), m.y(U0))
    ctx.lineTo(m.x(-L / 2), m.y(0))
    ctx.lineTo(m.x(L / 2), m.y(0))
    ctx.lineTo(m.x(L / 2), m.y(U0))
    ctx.lineTo(m.x(xMax), m.y(U0))
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(m.x(-L / 2), m.y(yMax))
    ctx.lineTo(m.x(-L / 2), m.y(0))
    ctx.lineTo(m.x(L / 2), m.y(0))
    ctx.lineTo(m.x(L / 2), m.y(yMax))
    ctx.stroke()
  }

  // Уровни энергии бесконечной ямы: E_n = n²·π²·ℏ²/(2mL²) — в условных единицах
  const Eunit = 5
  for (let k = 1; k <= 6; k++) {
    const E = Eunit * k * k / (L * L)
    if (finite && E > U0) break
    const isCurrent = k === n
    ctx.strokeStyle = isCurrent ? COL.accent : COL.rule
    ctx.lineWidth = isCurrent ? 1.6 : 0.8
    ctx.setLineDash(isCurrent ? [] : [3, 3])
    ctx.beginPath()
    ctx.moveTo(m.x(-L / 2), m.y(E))
    ctx.lineTo(m.x(L / 2), m.y(E))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Текущий уровень и |ψ|²
  const En = Eunit * n * n / (L * L)
  // ψ_n(x) = √(2/L) sin(nπ(x + L/2)/L) внутри ямы; снаружи (для конечной) экспоненциальный спад
  const psi2 = (x: number) => {
    if (x < -L / 2 || x > L / 2) {
      if (!finite) return 0
      const kappa = Math.sqrt(Math.max(0.1, U0 - En)) * 0.6
      const dist = x < -L / 2 ? -L / 2 - x : x - L / 2
      const edge = (2 / L) * Math.pow(Math.sin(n * Math.PI), 2)
      return Math.pow(2 / L, 0.5) * 0.5 * Math.exp(-2 * kappa * dist)
    }
    const v = Math.sin(n * Math.PI * (x + L / 2) / L)
    return (2 / L) * v * v
  }

  ctx.strokeStyle = COL.accent
  ctx.lineWidth = 2
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    const v = psi2(x)
    // нарисуем |ψ|² поднятым на уровень En
    const yPlot = En + v * 8
    const px = m.x(x), py = m.y(yPlot)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()

  // легкая фазовая колеблющаяся ψ
  ctx.strokeStyle = COL.gold
  ctx.lineWidth = 1.2
  ctx.setLineDash([3, 3])
  ctx.beginPath()
  for (let xp = 0; xp <= W; xp++) {
    const x = xMin + (xp / W) * (xMax - xMin)
    let psi = 0
    if (x >= -L / 2 && x <= L / 2) {
      psi = Math.sqrt(2 / L) * Math.sin(n * Math.PI * (x + L / 2) / L) * Math.cos(t * 1.5)
    } else if (finite) {
      const kappa = Math.sqrt(Math.max(0.1, U0 - En)) * 0.6
      const dist = x < -L / 2 ? -L / 2 - x : x - L / 2
      psi = Math.sqrt(2 / L) * 0.7 * Math.exp(-kappa * dist) * Math.cos(t * 1.5)
    }
    const yPlot = En + psi * 4
    const px = m.x(x), py = m.y(yPlot)
    if (xp === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = COL.faint; ctx.font = '11px JetBrains Mono'
  ctx.fillText(`L = ${L},  n = ${n},  Eₙ = ${En.toFixed(2)}${finite ? `, U₀ = ${U0}` : ''}`, 30, H - 10)
}

// ───────────────────────────── Диспетчер ─────────────────────────────

const RENDERERS: Record<AnimType, (ctx: CanvasRenderingContext2D, W: number, H: number, t: number, p: any) => void> = {
  'function-derivative': drawFunctionDerivative,
  'linear-transform': drawLinearTransform,
  'fourier-series': drawFourier,
  'gradient-field': drawGradientField,
  'complex-power': drawComplexPower,
  'phase-portrait': drawPhasePortrait,
  'newton-method': drawNewton,
  'monte-carlo-integral': drawMonteCarlo,
  'vector-field-curl': drawVectorFieldCurl,
  'least-squares': drawLeastSquares,
  'projectile': drawProjectile,
  'kepler-orbit': drawKepler,
  'two-source-interference': drawInterference,
  'electric-field': drawElectric,
  'rlc-circuit': drawRLC,
  'maxwell-distribution': drawMaxwell,
  'slit-diffraction': drawDiffraction,
  'pendulum': drawPendulum,
  'time-dilation': drawTimeDilation,
  'quantum-well': drawQuantumWell,
}

export function renderAnim(type: AnimType, ctx: CanvasRenderingContext2D, W: number, H: number, t: number, params: any) {
  const fn = RENDERERS[type]
  if (fn) fn(ctx, W, H, t, params)
  else paperBg(ctx, W, H)
}
