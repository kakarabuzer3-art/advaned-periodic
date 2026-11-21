import { useId, useMemo, useState } from 'react'
import { Term } from '../learn/Term.tsx'
import { loadProgress, recordQuiz, resetProgress, saveProgress, type GivenAnswer, type Progress } from './progress.ts'
import { DIFFICULTIES, TOPICS, makeQuiz, type Difficulty, type Question, type Topic } from './quizEngine.ts'

interface Settings { difficulty: Difficulty; topics: Topic[]; count: number }
const DEFAULTS: Settings = { difficulty: 'beginner', topics: TOPICS.map((t) => t.id), count: 10 }
const topicLabel = (t: Topic) => TOPICS.find((x) => x.id === t)?.label ?? t
const newSeed = () => Math.floor(Math.random() * 2 ** 31)

type Phase =
  | { name: 'setup' }
  | { name: 'running'; questions: Question[]; index: number; answers: GivenAnswer[] }
  | { name: 'results'; answers: GivenAnswer[] }

export function PracticeScreen() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [phase, setPhase] = useState<Phase>({ name: 'setup' })
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [saveFailed, setSaveFailed] = useState(false)

  const start = (s: Settings) => {
    const questions = makeQuiz({ topics: s.topics, difficulty: s.difficulty, count: s.count, seed: newSeed() })
    if (questions.length === 0) return
    setPhase({ name: 'running', questions, index: 0, answers: [] })
  }

  const finish = (answers: GivenAnswer[]) => {
    const next = recordQuiz(progress, answers, settings.difficulty, new Date())
    setProgress(next)
    setSaveFailed(!saveProgress(next))
    setPhase({ name: 'results', answers })
  }

  return (
    <section aria-labelledby="practice-h" className="mx-auto max-w-3xl">
      <h2 id="practice-h" className="text-2xl font-bold">Practice &amp; Test</h2>
      {phase.name === 'setup' && (
        <Setup settings={settings} onChange={setSettings} onStart={() => start(settings)} progress={progress}
          onReset={() => { resetProgress(); setProgress({ topics: {}, attempts: [] }) }} />
      )}
      {phase.name === 'running' && (
        <Running key={phase.index} question={phase.questions[phase.index] as Question} index={phase.index} total={phase.questions.length}
          onNext={(chosen) => {
            const answers = [...phase.answers, { question: phase.questions[phase.index] as Question, chosen }]
            if (phase.index + 1 >= phase.questions.length) finish(answers)
            else setPhase({ ...phase, index: phase.index + 1, answers })
          }} onQuit={() => setPhase({ name: 'setup' })} />
      )}
      {phase.name === 'results' && (
        <Results answers={phase.answers} saveFailed={saveFailed} onRetry={() => start(settings)} onSetup={() => setPhase({ name: 'setup' })} />
      )}
    </section>
  )
}

function Setup({ settings, onChange, onStart, progress, onReset }: {
  settings: Settings; onChange: (s: Settings) => void; onStart: () => void; progress: Progress; onReset: () => void
}) {
  const id = useId()
  const [confirming, setConfirming] = useState(false)
  const toggle = (t: Topic) => {
    const topics = settings.topics.includes(t) ? settings.topics.filter((x) => x !== t) : [...settings.topics, t]
    onChange({ ...settings, topics })
  }
  const answered = Object.values(progress.topics).reduce((n, t) => n + (t?.answered ?? 0), 0)
  return (
    <div className="mt-2">
      <p className="text-sm text-muted">Short quizzes built from the element data. After every answer you get an explanation, not just a score.</p>
      <fieldset className="mt-5">
        <legend className="font-semibold">Difficulty</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIFFICULTIES.map((d) => (
            <label key={d.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-4 hover:bg-panel-2 has-[:checked]:border-text has-[:checked]:bg-panel-2">
              <input type="radio" name={`${id}-d`} checked={settings.difficulty === d.id} onChange={() => onChange({ ...settings, difficulty: d.id })} />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mt-5">
        <legend className="font-semibold">Topics</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {TOPICS.map((t) => (
            <label key={t.id} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 hover:bg-panel-2 has-[:checked]:border-text">
              <input type="checkbox" checked={settings.topics.includes(t.id)} onChange={() => toggle(t.id)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          Questions
          <select value={settings.count} onChange={(e) => onChange({ ...settings, count: Number(e.target.value) })} className="h-10 rounded-lg border border-line bg-panel px-2">
            {[5, 10, 15].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" onClick={onStart} disabled={settings.topics.length === 0}
          className="h-11 rounded-lg bg-text px-5 font-semibold text-ink hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          Start quiz
        </button>
        {settings.topics.length === 0 && <p role="status" className="text-sm text-warn">Choose at least one topic.</p>}
      </div>

      <div className="mt-8 rounded-xl border border-line bg-panel p-4">
        <h3 className="font-semibold">Your saved progress</h3>
        {answered === 0 ? (
          <p className="mt-1 text-sm text-muted">Nothing yet. Your results are saved on this device only, after you finish a quiz.</p>
        ) : (
          <>
            <table className="mt-2 w-full text-sm">
              <caption className="sr-only">Correct answers by topic, all quizzes</caption>
              <thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="py-1">Topic</th><th>Correct</th><th>Answered</th></tr></thead>
              <tbody>
                {TOPICS.filter((t) => progress.topics[t.id]).map((t) => {
                  const s = progress.topics[t.id]!
                  return <tr key={t.id} className="border-t border-line"><td className="py-1.5">{t.label}</td><td>{s.correct}</td><td>{s.answered}</td></tr>
                })}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">Last {Math.min(5, progress.attempts.length)} quizzes: {progress.attempts.slice(0, 5).map((a) => `${a.correct}/${a.total}`).join(', ')}</p>
            {confirming ? (
              <p className="mt-3 text-sm">
                Delete all saved progress?{' '}
                <button type="button" className="underline" onClick={() => { onReset(); setConfirming(false) }}>Yes, delete</button>{' '}
                <button type="button" className="underline" onClick={() => setConfirming(false)}>Cancel</button>
              </p>
            ) : (
              <button type="button" className="mt-3 text-sm underline" onClick={() => setConfirming(true)}>Reset saved progress</button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Running({ question, index, total, onNext, onQuit }: { question: Question; index: number; total: number; onNext: (chosen: number) => void; onQuit: () => void }) {
  const name = useId()
  const [picked, setPicked] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  const correct = picked === question.correctIndex
  const last = index + 1 === total
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3 text-sm text-muted">
        <p id="q-progress">Question {index + 1} of {total} &middot; {topicLabel(question.topic)}</p>
        <button type="button" onClick={onQuit} className="underline">Quit quiz</button>
      </div>
      <div role="progressbar" aria-labelledby="q-progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} className="mt-2 h-2 overflow-hidden rounded-full bg-panel-2">
        <div className="h-full bg-text" style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>
      <fieldset className="mt-5 rounded-xl border border-line bg-panel p-5">
        <legend className="px-1 text-lg font-semibold">{question.prompt}</legend>
        <div className="mt-2 space-y-1.5">
          {question.options.map((o, i) => (
            <label key={o} className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 hover:bg-panel-2 ${checked && i === question.correctIndex ? 'border-green-400' : checked && i === picked ? 'border-warn' : 'border-line'}`}>
              <input type="radio" name={name} checked={picked === i} disabled={checked} onChange={() => setPicked(i)} />
              <span>{o}</span>
              {checked && i === question.correctIndex && <span className="ml-auto text-xs font-semibold text-green-400">Correct answer</span>}
              {checked && i === picked && i !== question.correctIndex && <span className="ml-auto text-xs font-semibold text-warn">Your answer</span>}
            </label>
          ))}
        </div>
        {!checked ? (
          <button type="button" disabled={picked === null} onClick={() => setChecked(true)}
            className="mt-4 h-11 rounded-lg border border-line bg-panel-2 px-5 hover:border-text disabled:cursor-not-allowed disabled:opacity-40">Check my answer</button>
        ) : (
          <div role="status" className={`mt-4 rounded-md border p-3 text-sm leading-relaxed ${correct ? 'border-green-400/50 bg-green-400/10' : 'border-warn/50 bg-warn/10'}`}>
            <p><strong>{correct ? 'Correct. ' : 'Not quite. '}</strong>{question.explanation}</p>
            {question.termId && <p className="mt-2 text-muted">Explain this simply: <Term id={question.termId} /></p>}
          </div>
        )}
      </fieldset>
      {checked && (
        <button type="button" onClick={() => onNext(picked as number)} className="mt-4 h-11 rounded-lg bg-text px-5 font-semibold text-ink hover:opacity-90">
          {last ? 'See results' : 'Next question'}
        </button>
      )}
    </div>
  )
}

function Results({ answers, saveFailed, onRetry, onSetup }: { answers: GivenAnswer[]; saveFailed: boolean; onRetry: () => void; onSetup: () => void }) {
  const correct = answers.filter((a) => a.chosen === a.question.correctIndex).length
  const pct = Math.round((correct / answers.length) * 100)
  const byTopic = useMemo(() => {
    const m = new Map<Topic, { answered: number; correct: number }>()
    for (const a of answers) {
      const s = m.get(a.question.topic) ?? { answered: 0, correct: 0 }
      m.set(a.question.topic, { answered: s.answered + 1, correct: s.correct + (a.chosen === a.question.correctIndex ? 1 : 0) })
    }
    return [...m.entries()]
  }, [answers])
  const missed = answers.filter((a) => a.chosen !== a.question.correctIndex)
  return (
    <div className="mt-3">
      <p className="text-3xl font-bold" aria-live="polite">{correct} / {answers.length} <span className="text-lg font-normal text-muted">({pct} %)</span></p>
      {saveFailed && <p role="alert" className="mt-2 text-sm text-warn">Your progress could not be saved on this device (storage may be blocked). The results below are still correct.</p>}
      <table className="mt-4 w-full text-sm">
        <caption className="sr-only">Results by topic</caption>
        <thead><tr className="text-left text-xs uppercase tracking-wider text-muted"><th className="py-1">Topic</th><th>Correct</th><th>Questions</th></tr></thead>
        <tbody>{byTopic.map(([t, s]) => <tr key={t} className="border-t border-line"><td className="py-1.5">{topicLabel(t)}</td><td>{s.correct}</td><td>{s.answered}</td></tr>)}</tbody>
      </table>
      {missed.length > 0 ? (
        <div className="mt-6">
          <h3 className="font-semibold">Review what you missed</h3>
          <ul className="mt-2 space-y-3">
            {missed.map((m) => (
              <li key={m.question.id} className="rounded-lg border border-line bg-panel p-3 text-sm leading-relaxed">
                <p className="font-semibold">{m.question.prompt}</p>
                <p className="mt-1">Your answer: {m.question.options[m.chosen]}. Correct answer: <strong>{m.question.options[m.question.correctIndex]}</strong>.</p>
                <p className="mt-1 text-muted">{m.question.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : <p className="mt-4 text-sm text-muted">You got every question right.</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={onRetry} className="h-11 rounded-lg bg-text px-5 font-semibold text-ink hover:opacity-90">Try a new quiz with the same settings</button>
        <button type="button" onClick={onSetup} className="h-11 rounded-lg border border-line bg-panel px-5 hover:bg-panel-2">Change settings</button>
      </div>
    </div>
  )
}
