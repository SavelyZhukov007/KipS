export type BlockType =
  | 'header'
  | 'theory'
  | 'python'
  | 'image'
  | 'animation'
  | 'exercise'
  | 'quote'
  | 'divider'
  | 'diagram'
  | 'flowchart'
  | 'table'
  | 'formula'
  | 'checklist'

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
  language?: string
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
  difficulty?: 'easy' | 'medium' | 'hard'
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

export interface DiagramBlock extends BaseBlock {
  type: 'diagram'
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  caption?: string
  layout?: 'force' | 'hierarchical' | 'circular'
}

export interface DiagramNode {
  id: string
  label: string
  x: number
  y: number
  color?: string
  shape?: 'rect' | 'circle' | 'diamond' | 'cylinder'
  description?: string
}

export interface DiagramEdge {
  id: string
  from: string
  to: string
  label?: string
  style?: 'solid' | 'dashed' | 'dotted'
  arrow?: 'forward' | 'backward' | 'both' | 'none'
}

export interface FlowchartBlock extends BaseBlock {
  type: 'flowchart'
  nodes: FlowchartNode[]
  edges: FlowchartEdge[]
  caption?: string
  direction?: 'TB' | 'LR'
}

export interface FlowchartNode {
  id: string
  label: string
  shape: 'start' | 'end' | 'process' | 'decision' | 'io' | 'subroutine'
  x?: number
  y?: number
  note?: string
}

export interface FlowchartEdge {
  id: string
  from: string
  to: string
  label?: string
  condition?: 'yes' | 'no'
}

export interface TableBlock extends BaseBlock {
  type: 'table'
  caption?: string
  headers: string[]
  rows: string[][]
  striped?: boolean
}

export interface FormulaBlock extends BaseBlock {
  type: 'formula'
  latex: string
  caption?: string
  inline?: boolean
}

export interface ChecklistBlock extends BaseBlock {
  type: 'checklist'
  title?: string
  items: { id: string; text: string; checked: boolean }[]
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
  | DiagramBlock
  | FlowchartBlock
  | TableBlock
  | FormulaBlock
  | ChecklistBlock

export interface Note {
  id: string
  title: string
  blocks: Block[]
  createdAt: number
  updatedAt: number
  tags?: string[]
  subject?: string
  color?: string
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
  subject?: string
  tags?: string[]
  coverColor?: string
}

export interface BlockMeta {
  type: BlockType
  label: string
  glyph: string
  hint: string
  group?: string
}

export const BLOCK_REGISTRY: BlockMeta[] = [
  { type: 'header', label: 'Заголовок', glyph: '¶', hint: 'Раздел / подраздел', group: 'text' },
  { type: 'theory', label: 'Текст', glyph: 'A', hint: 'Параграф теории', group: 'text' },
  { type: 'python', label: 'Код', glyph: '{}', hint: 'Блок исходного кода (Python, JS, SQL…)', group: 'code' },
  { type: 'formula', label: 'Формула', glyph: '∑', hint: 'LaTeX-формула', group: 'text' },
  { type: 'image', label: 'Изображение', glyph: '◫', hint: 'Иллюстрация с подписью', group: 'media' },
  { type: 'animation', label: 'Визуализация', glyph: '∿', hint: '20 анимаций по матем. и физике', group: 'media' },
  { type: 'diagram', label: 'Диаграмма', glyph: '◈', hint: 'Интерактивный граф / схема связей', group: 'diagram' },
  { type: 'flowchart', label: 'Блок-схема', glyph: '⬡', hint: 'Логическая блок-схема алгоритма', group: 'diagram' },
  { type: 'table', label: 'Таблица', glyph: '⊞', hint: 'Таблица с заголовками', group: 'text' },
  { type: 'exercise', label: 'Задача', glyph: '?', hint: 'Упражнение со скрытым решением', group: 'interactive' },
  { type: 'checklist', label: 'Чеклист', glyph: '✓', hint: 'Список задач / требований', group: 'interactive' },
  { type: 'quote', label: 'Цитата', glyph: '"', hint: 'Эпиграф или цитата', group: 'text' },
  { type: 'divider', label: 'Разделитель', glyph: '✦', hint: 'Орнаментальная черта', group: 'text' },
]

export type AnimType =
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
  | 'sorting-bubble'
  | 'sorting-merge'
  | 'binary-search'
  | 'linked-list'
  | 'binary-tree'
  | 'hash-table'
  | 'network-packet'
  | 'encryption-xor'
  | 'rsa-demo'
  | 'osi-layers'

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
  category: 'math' | 'physics' | 'algorithms' | 'networks' | 'security'
  title: string
  description: string
  params: ParamSpec[]
  subject?: string
}

export const ANIM_REGISTRY: AnimMeta[] = [
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
      { key: 'm11', label: 'a', kind: 'number', min: -2, max: 2, step: 0.05, default: 1.4 },
      { key: 'm12', label: 'b', kind: 'number', min: -2, max: 2, step: 0.05, default: 0.6 },
      { key: 'm21', label: 'c', kind: 'number', min: -2, max: 2, step: 0.05, default: -0.3 },
      { key: 'm22', label: 'd', kind: 'number', min: -2, max: 2, step: 0.05, default: 1.1 },
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
        key: 'shape', label: 'Сигнал', kind: 'select', default: 'square', options: [
          { value: 'square', label: 'Прямоугольный' },
          { value: 'triangle', label: 'Треугольный' },
          { value: 'sawtooth', label: 'Пила' },
        ]
      },
      { key: 'showTarget', label: 'Целевой сигнал', kind: 'boolean', default: true },
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
      { key: 'density', label: 'Плотность', kind: 'number', min: 6, max: 20, step: 1, default: 12 },
      { key: 'levels', label: 'Линии уровня', kind: 'number', min: 4, max: 20, step: 1, default: 10 },
    ],
  },
  {
    type: 'complex-power',
    category: 'math',
    title: 'Комплексная степень',
    description: 'Окружность переходит в w = zⁿ',
    params: [
      { key: 'n', label: 'Показатель n', kind: 'number', min: -3, max: 5, step: 0.1, default: 2 },
      { key: 'radius', label: 'Радиус |z|', kind: 'number', min: 0.3, max: 1.6, step: 0.05, default: 1 },
      { key: 'rotate', label: 'Анимировать', kind: 'boolean', default: true },
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
      { key: 'x0', label: 'Старт x₀', kind: 'number', min: -3, max: 3, step: 0.05, default: 1.6 },
      { key: 'iters', label: 'Итераций', kind: 'number', min: 1, max: 12, step: 1, default: 6 },
    ],
  },
  {
    type: 'monte-carlo-integral',
    category: 'math',
    title: 'Метод Монте-Карло',
    description: 'Оценка площади случайными бросками',
    params: [
      {
        key: 'fn', label: 'Функция', kind: 'select', default: 'bell', options: [
          { value: 'bell', label: 'exp(−x²)' },
          { value: 'sin', label: '|sin x|' },
          { value: 'parab', label: '1 − x²' },
        ]
      },
      { key: 'samples', label: 'Точек', kind: 'number', min: 50, max: 4000, step: 50, default: 800 },
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
    description: 'Облако точек, регрессия и ошибки',
    params: [
      { key: 'noise', label: 'Шум σ', kind: 'number', min: 0, max: 1.5, step: 0.05, default: 0.5 },
      { key: 'degree', label: 'Степень', kind: 'number', min: 1, max: 5, step: 1, default: 1 },
      { key: 'points', label: 'Точек', kind: 'number', min: 10, max: 80, step: 1, default: 30 },
    ],
  },
  {
    type: 'projectile',
    category: 'physics',
    title: 'Бросок под углом',
    description: 'Траектория, векторы скорости и ускорения',
    params: [
      { key: 'v0', label: 'Скорость v₀ (м/с)', kind: 'number', min: 5, max: 60, step: 1, default: 25 },
      { key: 'angle', label: 'Угол α (°)', kind: 'number', min: 5, max: 85, step: 1, default: 45 },
      {
        key: 'g', label: 'Гравитация', kind: 'select', default: 'earth', options: [
          { value: 'earth', label: 'Земля (9.8)' }, { value: 'moon', label: 'Луна (1.6)' }, { value: 'mars', label: 'Марс (3.7)' },
        ]
      },
      { key: 'drag', label: 'Сопр. воздуха', kind: 'number', min: 0, max: 0.05, step: 0.002, default: 0 },
    ],
  },
  {
    type: 'kepler-orbit',
    category: 'physics',
    title: 'Кеплеровская орбита',
    description: 'Орбита спутника, заметаемая площадь',
    params: [
      { key: 'mass', label: 'Масса M', kind: 'number', min: 0.5, max: 4, step: 0.05, default: 1.4 },
      { key: 'r0', label: 'Расстояние', kind: 'number', min: 0.4, max: 1.6, step: 0.02, default: 0.9 },
      { key: 'v0', label: 'Скорость v', kind: 'number', min: 0.4, max: 1.6, step: 0.02, default: 1.1 },
      { key: 'showArea', label: 'Площадь', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'two-source-interference',
    category: 'physics',
    title: 'Интерференция волн',
    description: 'Карта интенсивности двух источников',
    params: [
      { key: 'wavelength', label: 'Длина волны λ', kind: 'number', min: 0.05, max: 0.4, step: 0.005, default: 0.16 },
      { key: 'distance', label: 'Расст. d', kind: 'number', min: 0.1, max: 0.7, step: 0.01, default: 0.4 },
      { key: 'phase', label: 'Разн. фаз', kind: 'number', min: 0, max: 6.28, step: 0.05, default: 0 },
    ],
  },
  {
    type: 'electric-field',
    category: 'physics',
    title: 'Электрическое поле',
    description: 'Линии E и эквипотенциали',
    params: [
      { key: 'q1', label: 'Заряд q₁', kind: 'number', min: -3, max: 3, step: 0.1, default: 1 },
      { key: 'q2', label: 'Заряд q₂', kind: 'number', min: -3, max: 3, step: 0.1, default: -1 },
      { key: 'sep', label: 'Расстояние', kind: 'number', min: 0.2, max: 1.4, step: 0.02, default: 0.7 },
      { key: 'showPotential', label: 'Эквипотенциали', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'rlc-circuit',
    category: 'physics',
    title: 'RLC-контур',
    description: 'Осциллограммы тока и напряжения',
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
    description: 'Скорости частиц газа',
    params: [
      { key: 'T', label: 'Температура T (K)', kind: 'number', min: 100, max: 1500, step: 25, default: 300 },
      {
        key: 'gas', label: 'Газ', kind: 'select', default: 'N2', options: [
          { value: 'He', label: 'Гелий (4)' }, { value: 'N2', label: 'Азот (28)' }, { value: 'Xe', label: 'Ксенон (131)' },
        ]
      },
      { key: 'showMarkers', label: 'Маркеры v_p, v_avg', kind: 'boolean', default: true },
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
    description: 'Раскачивание и фазовый портрет',
    params: [
      { key: 'L', label: 'Длина L (м)', kind: 'number', min: 0.3, max: 3, step: 0.05, default: 1 },
      { key: 'theta0', label: 'Угол θ₀ (°)', kind: 'number', min: 5, max: 170, step: 1, default: 35 },
      { key: 'beta', label: 'Затухание β', kind: 'number', min: 0, max: 0.5, step: 0.005, default: 0.02 },
      { key: 'drive', label: 'Вынужд. сила', kind: 'number', min: 0, max: 1.5, step: 0.05, default: 0 },
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
    description: 'Уровни энергии и |ψ|²',
    params: [
      { key: 'L', label: 'Ширина L', kind: 'number', min: 0.4, max: 2, step: 0.05, default: 1 },
      { key: 'U0', label: 'Глубина U₀', kind: 'number', min: 5, max: 100, step: 1, default: 40 },
      { key: 'n', label: 'Уровень n', kind: 'number', min: 1, max: 6, step: 1, default: 1 },
      { key: 'finite', label: 'Конечная яма', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'sorting-bubble',
    category: 'algorithms',
    title: 'Сортировка пузырьком',
    description: 'Пошаговая визуализация bubble sort',
    subject: '09.02.07',
    params: [
      { key: 'size', label: 'Размер массива', kind: 'number', min: 5, max: 20, step: 1, default: 10 },
      { key: 'speed', label: 'Скорость', kind: 'number', min: 1, max: 10, step: 1, default: 5 },
    ],
  },
  {
    type: 'sorting-merge',
    category: 'algorithms',
    title: 'Сортировка слиянием',
    description: 'Визуализация merge sort с деревом рекурсии',
    subject: '09.02.07',
    params: [
      { key: 'size', label: 'Размер', kind: 'number', min: 4, max: 16, step: 1, default: 8 },
      { key: 'speed', label: 'Скорость', kind: 'number', min: 1, max: 10, step: 1, default: 5 },
    ],
  },
  {
    type: 'binary-search',
    category: 'algorithms',
    title: 'Бинарный поиск',
    description: 'Визуализация поиска с сужением диапазона',
    subject: '09.02.07',
    params: [
      { key: 'size', label: 'Размер', kind: 'number', min: 8, max: 30, step: 1, default: 16 },
      { key: 'target', label: 'Ищем', kind: 'number', min: 1, max: 30, step: 1, default: 7 },
    ],
  },
  {
    type: 'linked-list',
    category: 'algorithms',
    title: 'Связный список',
    description: 'Операции insert/delete/traverse',
    subject: '09.02.07',
    params: [
      { key: 'size', label: 'Элементов', kind: 'number', min: 3, max: 8, step: 1, default: 5 },
      { key: 'doubly', label: 'Двусвязный', kind: 'boolean', default: false },
    ],
  },
  {
    type: 'binary-tree',
    category: 'algorithms',
    title: 'Бинарное дерево поиска',
    description: 'Вставка, удаление, обходы',
    subject: '09.02.07',
    params: [
      { key: 'values', label: 'Ключей', kind: 'number', min: 4, max: 12, step: 1, default: 7 },
      { key: 'balanced', label: 'AVL-балансировка', kind: 'boolean', default: false },
    ],
  },
  {
    type: 'hash-table',
    category: 'algorithms',
    title: 'Хэш-таблица',
    description: 'Коллизии и методы разрешения',
    subject: '09.02.07',
    params: [
      { key: 'size', label: 'Размер таблицы', kind: 'number', min: 5, max: 15, step: 1, default: 8 },
      {
        key: 'method', label: 'Метод', kind: 'select', default: 'chain', options: [
          { value: 'chain', label: 'Цепочки' },
          { value: 'open', label: 'Открытая адресация' },
        ]
      },
    ],
  },
  {
    type: 'network-packet',
    category: 'networks',
    title: 'Маршрутизация пакета',
    description: 'Путь пакета через узлы сети',
    subject: '10.02.05',
    params: [
      { key: 'nodes', label: 'Узлов', kind: 'number', min: 4, max: 10, step: 1, default: 6 },
      {
        key: 'protocol', label: 'Протокол', kind: 'select', default: 'tcp', options: [
          { value: 'tcp', label: 'TCP' }, { value: 'udp', label: 'UDP' },
        ]
      },
    ],
  },
  {
    type: 'encryption-xor',
    category: 'security',
    title: 'XOR-шифрование',
    description: 'Побитовое шифрование XOR с ключом',
    subject: '10.02.05',
    params: [
      { key: 'bits', label: 'Бит в блоке', kind: 'number', min: 4, max: 8, step: 1, default: 8 },
      { key: 'animate', label: 'Анимировать', kind: 'boolean', default: true },
    ],
  },
  {
    type: 'rsa-demo',
    category: 'security',
    title: 'RSA: шифрование',
    description: 'Демонстрация алгоритма RSA (малые числа)',
    subject: '10.02.05',
    params: [
      {
        key: 'p', label: 'Простое p', kind: 'select', default: '5', options: [
          { value: '3', label: '3' }, { value: '5', label: '5' },
          { value: '7', label: '7' }, { value: '11', label: '11' },
        ]
      },
      {
        key: 'q', label: 'Простое q', kind: 'select', default: '11', options: [
          { value: '7', label: '7' }, { value: '11', label: '11' },
          { value: '13', label: '13' }, { value: '17', label: '17' },
        ]
      },
    ],
  },
  {
    type: 'osi-layers',
    category: 'networks',
    title: 'Модель OSI',
    description: 'Инкапсуляция данных по уровням',
    subject: '10.02.05',
    params: [
      {
        key: 'direction', label: 'Направление', kind: 'select', default: 'down', options: [
          { value: 'down', label: 'Отправка (вниз)' }, { value: 'up', label: 'Приём (вверх)' },
        ]
      },
      {
        key: 'protocol', label: 'Протокол', kind: 'select', default: 'http', options: [
          { value: 'http', label: 'HTTP' }, { value: 'smtp', label: 'SMTP' }, { value: 'ftp', label: 'FTP' },
        ]
      },
    ],
  },
]

export const ANIMS_BY_CATEGORY = {
  math: ANIM_REGISTRY.filter(a => a.category === 'math'),
  physics: ANIM_REGISTRY.filter(a => a.category === 'physics'),
  algorithms: ANIM_REGISTRY.filter(a => a.category === 'algorithms'),
  networks: ANIM_REGISTRY.filter(a => a.category === 'networks'),
  security: ANIM_REGISTRY.filter(a => a.category === 'security'),
}

export function defaultAnimParams(type: AnimType): Record<string, number | string | boolean> {
  const meta = ANIM_REGISTRY.find(a => a.type === type)
  if (!meta) return {}
  const out: Record<string, number | string | boolean> = {}
  for (const p of meta.params) out[p.key] = p.default
  return out
}