// ───────────────────────────── Типы блоков конспекта ─────────────────────────────

export type BlockType =
  | 'header'
  | 'theory'
  | 'python'
  | 'image'
  | 'animation'
  | 'exercise'
  | 'quote'
  | 'divider'

interface BaseBlock { id: string; type: BlockType }

export interface HeaderBlock extends BaseBlock {
  type: 'header'
  content: string
  level: 1 | 2 | 3
}

export interface TheoryBlock extends BaseBlock {
  type: 'theory'
  content: string
  highlight?: boolean
}

export interface PythonBlock extends BaseBlock {
  type: 'python'
  content: string
  title: string
  description: string
}

export interface ImageBlock extends BaseBlock {
  type: 'image'
  src: string
  caption: string
  alt: string
  fit?: 'cover' | 'contain'
  borderRadius?: number
  brightness?: number
  contrast?: number
}

export interface AnimationBlock extends BaseBlock {
  type: 'animation'
  animType: AnimType
  params: Record<string, number | string | boolean>
  caption?: string
}

export interface ExerciseBlock extends BaseBlock {
  type: 'exercise'
  question: string
  answer: string
  explanation: string
  number?: string
}

export interface QuoteBlock extends BaseBlock {
  type: 'quote'
  content: string
  author?: string
}

export interface DividerBlock extends BaseBlock {
  type: 'divider'
  style?: 'plain' | 'fancy' | 'flourish'
}

export type Block =
  | HeaderBlock
  | TheoryBlock
  | PythonBlock
  | ImageBlock
  | AnimationBlock
  | ExerciseBlock
  | QuoteBlock
  | DividerBlock

// ───────────────────────────── Иерархия ─────────────────────────────

export interface Note {
  id: string
  title: string
  blocks: Block[]
  createdAt: number
  updatedAt: number
}

export interface Chapter {
  id: string
  title: string
  notes: Note[]
  createdAt: number
}

export interface Book {
  id: string
  title: string
  author: string
  description: string
  chapters: Chapter[]
  createdAt: number
  updatedAt: number
}

// ───────────────────────────── Реестр блоков ─────────────────────────────

export interface BlockMeta {
  type: BlockType
  label: string
  glyph: string
  hint: string
}

export const BLOCK_REGISTRY: BlockMeta[] = [
  { type: 'header', label: 'Заголовок', glyph: '¶', hint: 'Раздел / подраздел' },
  { type: 'theory', label: 'Текст', glyph: 'A', hint: 'Параграф теории, поддерживает разметку' },
  { type: 'python', label: 'Python', glyph: '{ }', hint: 'Блок исходного кода' },
  { type: 'image', label: 'Изображение', glyph: '◫', hint: 'Иллюстрация с подписью' },
  { type: 'animation', label: 'Визуализация', glyph: '∿', hint: '20 готовых анимаций по матем. и физике' },
  { type: 'exercise', label: 'Задача', glyph: '?', hint: 'Упражнение со скрытым решением' },
  { type: 'quote', label: 'Цитата', glyph: '“', hint: 'Эпиграф или цитата автора' },
  { type: 'divider', label: 'Разделитель', glyph: '✦', hint: 'Орнаментальная черта' },
]

// ───────────────────────────── Анимации (20 шт) ─────────────────────────────

export type AnimType =
  // Математика
  | 'function-derivative'
  | 'linear-transform'
  | 'fourier-series'
  | 'gradient-field'
  | 'complex-power'
  | 'phase-portrait'
  | 'newton-method'
  | 'monte-carlo-integral'
  | 'vector-field-curl'
  | 'least-squares'
  // Физика
  | 'projectile'
  | 'kepler-orbit'
  | 'two-source-interference'
  | 'electric-field'
  | 'rlc-circuit'
  | 'maxwell-distribution'
  | 'slit-diffraction'
  | 'pendulum'
  | 'time-dilation'
  | 'quantum-well'

export type ParamKind = 'number' | 'select' | 'boolean'

export interface ParamSpec {
  key: string
  label: string
  kind: ParamKind
  min?: number
  max?: number
  step?: number
  default: number | string | boolean
  options?: { value: string; label: string }[]
}

export interface AnimMeta {
  type: AnimType
  category: 'math' | 'physics'
  title: string
  description: string
  params: ParamSpec[]
}

// Полный реестр анимаций — порядок параметров определяет UI
export const ANIM_REGISTRY: AnimMeta[] = [
  // ── Математика ────────────────────────────────────────────────────
  {
    type: 'function-derivative',
    category: 'math',
    title: 'Функция и её производная',
    description: 'График f(x) и касательная в выбранной точке',
    params: [
      {
        key: 'fn', label: 'Функция', kind: 'select', default: 'sin', options: [
          { value: 'sin', label: 'sin x' }, { value: 'cos', label: 'cos x' },
          { value: 'pow', label: 'xⁿ' }, { value: 'exp', label: 'eˣ' },
          { value: 'ln', label: 'ln x' }, { value: 'poly', label: 'a·x³+b·x' },
        ]
      },
      { key: 'x0', label: 'Точка касания x₀', kind: 'number', min: -3, max: 3, step: 0.05, default: 0.5 },
      { key: 'a', label: 'Коэф. a', kind: 'number', min: -3, max: 3, step: 0.1, default: 1 },
      { key: 'b', label: 'Коэф. b', kind: 'number', min: -3, max: 3, step: 0.1, default: 1 },
      { key: 'showSecant', label: 'Показать секущую', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'linear-transform',
    category: 'math',
    title: 'Линейное преобразование',
    description: 'Матрица 2×2 деформирует сетку и базисные векторы',
    params: [
      { key: 'm11', label: 'a (строка 1, столбец 1)', kind: 'number', min: -2, max: 2, step: 0.05, default: 1.4 },
      { key: 'm12', label: 'b (строка 1, столбец 2)', kind: 'number', min: -2, max: 2, step: 0.05, default: 0.6 },
      { key: 'm21', label: 'c (строка 2, столбец 1)', kind: 'number', min: -2, max: 2, step: 0.05, default: -0.3 },
      { key: 'm22', label: 'd (строка 2, столбец 2)', kind: 'number', min: -2, max: 2, step: 0.05, default: 1.1 },
      { key: 'showEigen', label: 'Собственные векторы', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'fourier-series',
    category: 'math',
    title: 'Ряд Фурье',
    description: 'Приближение прямоугольного сигнала суммой гармоник',
    params: [
      { key: 'N', label: 'Число гармоник N', kind: 'number', min: 1, max: 50, step: 1, default: 9 },
      {
        key: 'shape', label: 'Целевой сигнал', kind: 'select', default: 'square', options: [
          { value: 'square', label: 'Прямоугольный' },
          { value: 'triangle', label: 'Треугольный' },
          { value: 'sawtooth', label: 'Пила' },
        ]
      },
      { key: 'showTarget', label: 'Показать целевой сигнал', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'gradient-field',
    category: 'math',
    title: 'Градиент скалярного поля',
    description: 'Линии уровня и векторы градиента',
    params: [
      {
        key: 'fn', label: 'Поле', kind: 'select', default: 'paraboloid', options: [
          { value: 'paraboloid', label: 'x² + y²' },
          { value: 'saddle', label: 'x² − y²' },
          { value: 'sincos', label: 'sin x · cos y' },
        ]
      },
      { key: 'density', label: 'Плотность векторов', kind: 'number', min: 6, max: 20, step: 1, default: 12 },
      { key: 'levels', label: 'Кол-во линий уровня', kind: 'number', min: 4, max: 20, step: 1, default: 10 },
    ],
  },
  {
    type: 'complex-power',
    category: 'math',
    title: 'Возведение комплексного числа в степень',
    description: 'Окружность переходит в w = zⁿ',
    params: [
      { key: 'n', label: 'Показатель n', kind: 'number', min: -3, max: 5, step: 0.1, default: 2 },
      { key: 'radius', label: 'Радиус |z|', kind: 'number', min: 0.3, max: 1.6, step: 0.05, default: 1 },
      { key: 'rotate', label: 'Анимировать поворот', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'phase-portrait',
    category: 'math',
    title: 'Фазовый портрет',
    description: 'Поле направлений ẋ = A·x с траекториями',
    params: [
      { key: 'a11', label: 'A₁₁', kind: 'number', min: -2, max: 2, step: 0.05, default: 0.2 },
      { key: 'a12', label: 'A₁₂', kind: 'number', min: -2, max: 2, step: 0.05, default: 1 },
      { key: 'a21', label: 'A₂₁', kind: 'number', min: -2, max: 2, step: 0.05, default: -1 },
      { key: 'a22', label: 'A₂₂', kind: 'number', min: -2, max: 2, step: 0.05, default: -0.2 },
    ],
  },
  {
    type: 'newton-method',
    category: 'math',
    title: 'Метод Ньютона',
    description: 'Лесенка приближений к корню f(x) = 0',
    params: [
      {
        key: 'fn', label: 'Функция', kind: 'select', default: 'cubic', options: [
          { value: 'cubic', label: 'x³ − 2x − 1' },
          { value: 'quad', label: 'x² − 2' },
          { value: 'sin', label: 'sin x' },
        ]
      },
      { key: 'x0', label: 'Стартовая x₀', kind: 'number', min: -3, max: 3, step: 0.05, default: 1.6 },
      { key: 'iters', label: 'Число итераций', kind: 'number', min: 1, max: 12, step: 1, default: 6 },
    ],
  },
  {
    type: 'monte-carlo-integral',
    category: 'math',
    title: 'Метод Монте-Карло',
    description: 'Оценка площади под кривой случайными бросками',
    params: [
      {
        key: 'fn', label: 'Функция', kind: 'select', default: 'bell', options: [
          { value: 'bell', label: 'exp(−x²)' },
          { value: 'sin', label: '|sin x|' },
          { value: 'parab', label: '1 − x²' },
        ]
      },
      { key: 'samples', label: 'Число точек', kind: 'number', min: 50, max: 4000, step: 50, default: 800 },
    ],
  },
  {
    type: 'vector-field-curl',
    category: 'math',
    title: 'Векторное поле и ротор',
    description: 'Линии тока подкрашены модулем ротора',
    params: [
      {
        key: 'kind', label: 'Тип поля', kind: 'select', default: 'vortex', options: [
          { value: 'vortex', label: 'Вихрь (−y, x)' },
          { value: 'sink', label: 'Сток (x, y)' },
          { value: 'shear', label: 'Сдвиг (y, 0)' },
        ]
      },
      { key: 'density', label: 'Плотность', kind: 'number', min: 8, max: 24, step: 1, default: 14 },
    ],
  },
  {
    type: 'least-squares',
    category: 'math',
    title: 'Метод наименьших квадратов',
    description: 'Облако точек, регрессия и сумма квадратов ошибок',
    params: [
      { key: 'noise', label: 'Шум σ', kind: 'number', min: 0, max: 1.5, step: 0.05, default: 0.5 },
      { key: 'degree', label: 'Степень полинома', kind: 'number', min: 1, max: 5, step: 1, default: 1 },
      { key: 'points', label: 'Кол-во точек', kind: 'number', min: 10, max: 80, step: 1, default: 30 },
    ],
  },
  // ── Физика ────────────────────────────────────────────────────────
  {
    type: 'projectile',
    category: 'physics',
    title: 'Бросок под углом к горизонту',
    description: 'Траектория, векторы скорости и ускорения',
    params: [
      { key: 'v0', label: 'Начальная скорость v₀ (м/с)', kind: 'number', min: 5, max: 60, step: 1, default: 25 },
      { key: 'angle', label: 'Угол α (°)', kind: 'number', min: 5, max: 85, step: 1, default: 45 },
      {
        key: 'g', label: 'Гравитация', kind: 'select', default: 'earth', options: [
          { value: 'earth', label: 'Земля (9.8)' }, { value: 'moon', label: 'Луна (1.6)' }, { value: 'mars', label: 'Марс (3.7)' },
        ]
      },
      { key: 'drag', label: 'Сопротивление воздуха', kind: 'number', min: 0, max: 0.05, step: 0.002, default: 0 },
    ],
  },
  {
    type: 'kepler-orbit',
    category: 'physics',
    title: 'Кеплеровская орбита',
    description: 'Орбита спутника, заметаемая площадь',
    params: [
      { key: 'mass', label: 'Масса центра M', kind: 'number', min: 0.5, max: 4, step: 0.05, default: 1.4 },
      { key: 'r0', label: 'Начальное расстояние', kind: 'number', min: 0.4, max: 1.6, step: 0.02, default: 0.9 },
      { key: 'v0', label: 'Начальная скорость v', kind: 'number', min: 0.4, max: 1.6, step: 0.02, default: 1.1 },
      { key: 'showArea', label: 'Заметаемая площадь', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'two-source-interference',
    category: 'physics',
    title: 'Интерференция двух источников',
    description: 'Карта интенсивности волн на поверхности воды',
    params: [
      { key: 'wavelength', label: 'Длина волны λ', kind: 'number', min: 0.05, max: 0.4, step: 0.005, default: 0.16 },
      { key: 'distance', label: 'Расст. между источниками d', kind: 'number', min: 0.1, max: 0.7, step: 0.01, default: 0.4 },
      { key: 'phase', label: 'Разность фаз Δφ', kind: 'number', min: 0, max: 6.28, step: 0.05, default: 0 },
    ],
  },
  {
    type: 'electric-field',
    category: 'physics',
    title: 'Электрическое поле зарядов',
    description: 'Линии E и эквипотенциали для системы точечных зарядов',
    params: [
      { key: 'q1', label: 'Заряд q₁', kind: 'number', min: -3, max: 3, step: 0.1, default: 1 },
      { key: 'q2', label: 'Заряд q₂', kind: 'number', min: -3, max: 3, step: 0.1, default: -1 },
      { key: 'sep', label: 'Расстояние', kind: 'number', min: 0.2, max: 1.4, step: 0.02, default: 0.7 },
      { key: 'showPotential', label: 'Эквипотенциальные линии', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'rlc-circuit',
    category: 'physics',
    title: 'RLC-контур',
    description: 'Осциллограммы тока и напряжения, фазовый портрет',
    params: [
      { key: 'L', label: 'Индуктивность L', kind: 'number', min: 0.1, max: 4, step: 0.05, default: 1 },
      { key: 'C', label: 'Ёмкость C', kind: 'number', min: 0.1, max: 4, step: 0.05, default: 1 },
      { key: 'R', label: 'Сопротивление R', kind: 'number', min: 0, max: 3, step: 0.05, default: 0.3 },
      { key: 'drive', label: 'Внеш. ЭДС', kind: 'number', min: 0, max: 2, step: 0.05, default: 0 },
    ],
  },
  {
    type: 'maxwell-distribution',
    category: 'physics',
    title: 'Распределение Максвелла',
    description: 'Гистограмма скоростей частиц газа vs теория',
    params: [
      { key: 'T', label: 'Температура T (K)', kind: 'number', min: 100, max: 1500, step: 25, default: 300 },
      {
        key: 'gas', label: 'Газ', kind: 'select', default: 'N2', options: [
          { value: 'He', label: 'Гелий (4)' }, { value: 'N2', label: 'Азот (28)' }, { value: 'Xe', label: 'Ксенон (131)' },
        ]
      },
      { key: 'showMarkers', label: 'Отметить v_p, v_avg, v_rms', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'slit-diffraction',
    category: 'physics',
    title: 'Дифракция Фраунгофера',
    description: 'Интенсивность на экране для N щелей',
    params: [
      { key: 'a', label: 'Ширина щели a', kind: 'number', min: 0.5, max: 4, step: 0.05, default: 1.2 },
      { key: 'lam', label: 'Длина волны λ', kind: 'number', min: 0.3, max: 1.5, step: 0.02, default: 0.6 },
      { key: 'N', label: 'Число щелей', kind: 'number', min: 1, max: 8, step: 1, default: 1 },
    ],
  },
  {
    type: 'pendulum',
    category: 'physics',
    title: 'Маятник',
    description: 'Раскачивание и фазовый портрет (угол — скорость)',
    params: [
      { key: 'L', label: 'Длина L (м)', kind: 'number', min: 0.3, max: 3, step: 0.05, default: 1 },
      { key: 'theta0', label: 'Нач. угол θ₀ (°)', kind: 'number', min: 5, max: 170, step: 1, default: 35 },
      { key: 'beta', label: 'Затухание β', kind: 'number', min: 0, max: 0.5, step: 0.005, default: 0.02 },
      { key: 'drive', label: 'Вынуждающая сила', kind: 'number', min: 0, max: 1.5, step: 0.05, default: 0 },
    ],
  },
  {
    type: 'time-dilation',
    category: 'physics',
    title: 'Замедление времени',
    description: 'Световые часы в двух системах отсчёта',
    params: [
      { key: 'beta', label: 'β = v / c', kind: 'number', min: 0, max: 0.99, step: 0.01, default: 0.6 },
      { key: 'showLengthContraction', label: 'Лоренцево сокращение', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'quantum-well',
    category: 'physics',
    title: 'Квантовая яма',
    description: 'Уровни энергии и |ψ|² частицы в яме',
    params: [
      { key: 'L', label: 'Ширина L', kind: 'number', min: 0.4, max: 2, step: 0.05, default: 1 },
      { key: 'U0', label: 'Глубина U₀', kind: 'number', min: 5, max: 100, step: 1, default: 40 },
      { key: 'n', label: 'Уровень n', kind: 'number', min: 1, max: 6, step: 1, default: 1 },
      { key: 'finite', label: 'Конечная яма (туннелирование)', kind: 'boolean', default: true },
    ],
  },
]

export const ANIMS_BY_CATEGORY = {
  math: ANIM_REGISTRY.filter(a => a.category === 'math'),
  physics: ANIM_REGISTRY.filter(a => a.category === 'physics'),
}

export function defaultAnimParams(type: AnimType): Record<string, number | string | boolean> {
  const meta = ANIM_REGISTRY.find(a => a.type === type)
  if (!meta) return {}
  const out: Record<string, number | string | boolean> = {}
  for (const p of meta.params) out[p.key] = p.default
  return out
}
