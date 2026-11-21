import { elements } from '../../data/index.ts'
import type { ElementRecord } from '../../domain/schema.ts'
import { formatMassShort } from '../../lib/format.ts'
import type { VisualId } from './lessons.ts'

const el = (symbol: string): ElementRecord => {
  const e = elements.find((x) => x.symbol === symbol)
  if (!e) throw new Error(`Unknown element ${symbol}`)
  return e
}

function Tile({ symbol, note }: { symbol: string; note?: string }) {
  const e = el(symbol)
  return (
    <div className="text-center">
      <div
        data-cat={e.category}
        className="mx-auto grid h-24 w-24 place-items-center rounded-lg border-t-4 p-1"
        style={{ borderColor: 'var(--cat, #8da2c4)', background: 'color-mix(in oklab, var(--cat, #8da2c4) 17%, var(--color-panel))' }}
      >
        <span className="block text-xs text-muted">{e.number}</span>
        <span className="block text-3xl font-bold leading-none">{e.symbol}</span>
        <span className="block text-xs">{e.name}</span>
        <span className="block font-mono text-[0.65rem] text-muted">{formatMassShort(e)}</span>
      </div>
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  )
}

function MatterVisual() {
  const solid = Array.from({ length: 16 }, (_, i) => ({ x: 12 + (i % 4) * 14, y: 12 + Math.floor(i / 4) * 14 }))
  const liquid = [[14, 62], [30, 66], [47, 60], [62, 66], [20, 48], [38, 50], [55, 47], [26, 34], [44, 36], [60, 32], [14, 78], [34, 80], [52, 78], [66, 80]]
  const gas = [[12, 14], [58, 20], [34, 40], [18, 62], [62, 56], [44, 76], [10, 82], [66, 84]]
  const box = (title: string, pts: number[][] | { x: number; y: number }[], i: number) => (
    <g key={title} transform={`translate(${i * 96},0)`}>
      <rect x="0" y="0" width="80" height="94" rx="6" fill="none" stroke="currentColor" strokeOpacity="0.4" />
      {pts.map((p, k) => {
        const [x, y] = Array.isArray(p) ? p : [p.x, p.y]
        return <circle key={k} cx={x} cy={y} r="5" fill="#4f93e6" />
      })}
      <text x="40" y="112" textAnchor="middle" fontSize="12" fill="currentColor">{title}</text>
    </g>
  )
  return (
    <svg viewBox="0 0 272 120" className="mx-auto w-full max-w-sm" role="img" aria-hidden="true">
      {box('Solid', solid, 0)}{box('Liquid', liquid, 1)}{box('Gas', gas, 2)}
    </svg>
  )
}

function ElementVisual() {
  return (
    <div className="flex flex-wrap items-start justify-center gap-6">
      <Tile symbol="Au" note="Element: only gold atoms" />
      <div className="text-center">
        <svg viewBox="0 0 110 80" className="h-24 w-32" aria-hidden="true">
          <circle cx="55" cy="26" r="20" fill="#ef6a55" /><text x="55" y="31" textAnchor="middle" fontSize="14" fontWeight="700" fill="#0b121d">O</text>
          <circle cx="24" cy="58" r="12" fill="#a8b7cc" /><text x="24" y="63" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0b121d">H</text>
          <circle cx="86" cy="58" r="12" fill="#a8b7cc" /><text x="86" y="63" textAnchor="middle" fontSize="12" fontWeight="700" fill="#0b121d">H</text>
        </svg>
        <p className="mt-1 text-xs text-muted">Compound: water, H&#8322;O<br />(hydrogen + oxygen)</p>
      </div>
    </div>
  )
}

function AtomVisual() {
  const c = el('C')
  const rings = c.shells.map((n, i) => ({ r: 36 + i * 28, n }))
  const nucleus = Array.from({ length: 12 }, (_, i) => {
    const a = i * 2.4
    const r = 3.2 * Math.sqrt(i + 1)
    return { x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a), proton: i % 2 === 0 }
  })
  return (
    <div className="text-center">
      <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56" aria-hidden="true">
        {rings.map((ring) => (
          <g key={ring.r}>
            <circle cx="100" cy="100" r={ring.r} fill="none" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="3 4" />
            {Array.from({ length: ring.n }, (_, k) => {
              const a = (k / ring.n) * Math.PI * 2 - Math.PI / 2
              return <circle key={k} cx={100 + ring.r * Math.cos(a)} cy={100 + ring.r * Math.sin(a)} r="5" fill="#4f93e6" />
            })}
          </g>
        ))}
        {nucleus.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="4.2" fill={p.proton ? '#ef6a55' : '#a8b7cc'} />)}
      </svg>
      <p className="text-xs text-muted">
        <span className="text-[#ef6a55]">&#9679;</span> proton (6) &nbsp; <span className="text-[#a8b7cc]">&#9679;</span> neutron (6) &nbsp;
        <span className="text-[#4f93e6]">&#9679;</span> electron (2 + 4)
      </p>
      <p className="mt-1 text-xs text-muted">Simplified teaching model of a carbon-12 atom. Not to scale: real electrons do not circle the nucleus like planets.</p>
    </div>
  )
}

function ParticlesVisual() {
  return (
    <table className="mx-auto w-full max-w-md text-sm">
      <caption className="sr-only">The three particles inside an atom</caption>
      <thead>
        <tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="py-1 pr-3">Particle</th><th className="pr-3">Charge</th><th className="pr-3">Where</th><th>Mass</th></tr>
      </thead>
      <tbody>
        <tr className="border-t border-line"><td className="py-1.5 pr-3 font-semibold">Proton</td><td className="pr-3">+1</td><td className="pr-3">Nucleus</td><td>1 u (about)</td></tr>
        <tr className="border-t border-line"><td className="py-1.5 pr-3 font-semibold">Neutron</td><td className="pr-3">0 (none)</td><td className="pr-3">Nucleus</td><td>1 u (about)</td></tr>
        <tr className="border-t border-line"><td className="py-1.5 pr-3 font-semibold">Electron</td><td className="pr-3">&minus;1</td><td className="pr-3">Outside the nucleus</td><td>about 1/1836 u</td></tr>
      </tbody>
    </table>
  )
}

export function MiniTable({ highlight, label }: { highlight: (e: ElementRecord) => boolean; label: string }) {
  const cell = 22
  const main = elements.filter((e) => e.position.row <= 7)
  return (
    <svg viewBox={`0 0 ${18 * cell + 18} ${7 * cell + 18}`} className="mx-auto w-full max-w-lg" role="img" aria-label={label}>
      {Array.from({ length: 18 }, (_, g) => (
        <text key={g} x={18 + g * cell + cell / 2} y="11" textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.7">{g + 1}</text>
      ))}
      {[1, 2, 3, 4, 5, 6, 7].map((p) => (
        <text key={p} x="8" y={18 + (p - 1) * cell + cell / 2 + 3} textAnchor="middle" fontSize="9" fill="currentColor" fillOpacity="0.7">{p}</text>
      ))}
      {main.map((e) => {
        const on = highlight(e)
        return (
          <g key={e.number}>
            <rect x={18 + (e.position.col - 1) * cell + 1} y={18 + (e.position.row - 1) * cell + 1} width={cell - 2} height={cell - 2} rx="3"
              fill={on ? '#f8fafc' : 'currentColor'} fillOpacity={on ? 1 : 0.12} />
            {on && (
              <text x={18 + (e.position.col - 1) * cell + cell / 2} y={18 + (e.position.row - 1) * cell + cell / 2 + 3} textAnchor="middle" fontSize="9" fontWeight="700" fill="#0b121d">{e.symbol}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

export function LessonVisual({ id }: { id: VisualId }) {
  switch (id) {
    case 'matter': return <MatterVisual />
    case 'element': return <ElementVisual />
    case 'atom': return <AtomVisual />
    case 'particles': return <ParticlesVisual />
    case 'atomic-number':
      return (
        <div className="flex flex-wrap items-start justify-center gap-5">
          <Tile symbol="H" note="1 proton" /><Tile symbol="C" note="6 protons" /><Tile symbol="Au" note="79 protons" />
        </div>
      )
    case 'symbols':
      return (
        <div className="flex flex-wrap items-start justify-center gap-5">
          <Tile symbol="Fe" note="Latin: ferrum" /><Tile symbol="Au" note="Latin: aurum" /><Tile symbol="Na" note="Latin: natrium" /><Tile symbol="Pb" note="Latin: plumbum" />
        </div>
      )
    case 'groups': return <MiniTable highlight={(e) => e.group === 18} label="Periodic table with group 18 highlighted" />
    case 'periods': return <MiniTable highlight={(e) => e.period === 2} label="Periodic table with period 2 highlighted" />
  }
}
