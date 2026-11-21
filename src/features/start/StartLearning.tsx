import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useId, useState } from 'react'
import { saveJson } from '../../lib/storage.ts'
import { Term } from '../learn/Term.tsx'
import { LESSONS } from './lessons.ts'
import { ONBOARDING_KEY, isOnboardingComplete } from './onboardingState.ts'
import { LessonVisual } from './visuals.tsx'

interface Props { onNavigate: (d: 'explore' | 'learn' | 'practice') => void }

export function StartLearning({ onNavigate }: Props) {
  const [completed, setCompleted] = useState(isOnboardingComplete)
  const [step, setStep] = useState(0)
  const [replaying, setReplaying] = useState(false)
  const showLessons = !completed || replaying

  const finish = (go: 'explore' | null) => {
    saveJson(ONBOARDING_KEY, { completed: true })
    setCompleted(true)
    setReplaying(false)
    setStep(0)
    if (go) onNavigate(go)
  }

  if (!showLessons) {
    return (
      <section aria-labelledby="start-h" className="mx-auto max-w-2xl">
        <h2 id="start-h" className="text-2xl font-bold">Start Learning</h2>
        <p className="mt-2 text-muted">You have completed the introduction. Pick what to do next.</p>
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {([['explore', 'Explore Elements', 'Find any of the 118 elements and see its structure and isotopes.'],
             ['learn', 'Learn Chemistry', 'Look up any term in plain English.'],
             ['practice', 'Practice & Test', 'Check what you remember with short quizzes.']] as const).map(([d, title, text]) => (
            <li key={d}>
              <button type="button" onClick={() => onNavigate(d)} className="h-full w-full rounded-xl border border-line bg-panel p-4 text-left hover:bg-panel-2">
                <span className="block font-semibold">{title}</span><span className="mt-1 block text-sm text-muted">{text}</span>
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => { setReplaying(true); setStep(0) }} className="flex h-full w-full items-start gap-2 rounded-xl border border-line bg-panel p-4 text-left hover:bg-panel-2">
              <RotateCcw size={16} aria-hidden="true" className="mt-1 flex-none" />
              <span><span className="block font-semibold">Repeat the introduction</span><span className="mt-1 block text-sm text-muted">Go through the eight short lessons again.</span></span>
            </button>
          </li>
        </ul>
      </section>
    )
  }

  const lesson = LESSONS[step]!
  const last = step === LESSONS.length - 1
  return (
    <section aria-labelledby="lesson-h" className="mx-auto max-w-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted" id="progress-label">Introduction: step {step + 1} of {LESSONS.length}</p>
        <button type="button" onClick={() => finish('explore')} className="text-sm underline">Skip introduction</button>
      </div>
      <div
        role="progressbar" aria-labelledby="progress-label" aria-valuemin={1} aria-valuemax={LESSONS.length} aria-valuenow={step + 1}
        className="mt-2 h-2 overflow-hidden rounded-full bg-panel-2"
      >
        <div className="h-full bg-text transition-[width]" style={{ width: `${((step + 1) / LESSONS.length) * 100}%` }} />
      </div>

      {/* key resets the question state when the lesson changes */}
      <LessonCard key={lesson.id} lesson={lesson} />

      <div className="mt-5 flex items-center justify-between gap-3">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-line bg-panel px-4 hover:bg-panel-2 disabled:cursor-not-allowed disabled:opacity-40">
          <ArrowLeft size={16} aria-hidden="true" /> Previous
        </button>
        {last ? (
          <button type="button" onClick={() => finish('explore')} className="inline-flex h-11 items-center gap-2 rounded-lg bg-text px-4 font-semibold text-ink hover:opacity-90">
            <Check size={16} aria-hidden="true" /> Finish and explore
          </button>
        ) : (
          <button type="button" onClick={() => setStep(step + 1)} className="inline-flex h-11 items-center gap-2 rounded-lg bg-text px-4 font-semibold text-ink hover:opacity-90">
            Next <ArrowRight size={16} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  )
}

function LessonCard({ lesson }: { lesson: (typeof LESSONS)[number] }) {
  const [picked, setPicked] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const name = useId()
  const q = lesson.question
  const correct = picked === q.correctIndex

  return (
    <article className="mt-4 rounded-xl border border-line bg-panel p-5">
      <h2 id="lesson-h" className="text-xl font-bold">{lesson.title}</h2>
      <p className="mt-2 leading-relaxed">{lesson.explanation}</p>
      <p className="mt-3 rounded-md bg-panel-2 p-3 text-sm leading-relaxed"><strong className="font-semibold">Example: </strong>{lesson.example}</p>

      <figure className="my-5" aria-label={lesson.visualAlt}>
        <LessonVisual id={lesson.visual} />
        <figcaption className="sr-only">{lesson.visualAlt}</figcaption>
      </figure>

      <p className="text-sm text-muted">
        Words to know: {lesson.terms.map((t, i) => <span key={t}>{i > 0 && ', '}<Term id={t} /></span>)}
      </p>

      <fieldset className="mt-5 border-t border-line pt-4">
        <legend className="font-semibold">Quick question: {q.prompt}</legend>
        <div className="mt-2 space-y-1.5">
          {q.options.map((o, i) => (
            <label key={o} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line px-3 py-2 hover:bg-panel-2 has-[:checked]:border-text">
              <input type="radio" name={name} checked={picked === i} disabled={checked} onChange={() => setPicked(i)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
        <button type="button" disabled={picked === null || checked} onClick={() => setChecked(true)}
          className="mt-3 h-10 rounded-lg border border-line bg-panel-2 px-4 hover:border-text disabled:cursor-not-allowed disabled:opacity-40">
          Check my answer
        </button>
        {checked && (
          <p role="status" className={`mt-3 rounded-md border p-3 text-sm leading-relaxed ${correct ? 'border-green-400/50 bg-green-400/10' : 'border-warn/50 bg-warn/10'}`}>
            <strong>{correct ? 'Correct. ' : 'Not quite. '}</strong>{correct ? q.right : q.wrong}
          </p>
        )}
      </fieldset>
    </article>
  )
}
