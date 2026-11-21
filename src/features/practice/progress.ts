import { loadJson, removeKey, saveJson } from '../../lib/storage.ts'
import type { Difficulty, Question, Topic } from './quizEngine.ts'

export const PROGRESS_KEY = 'pte:progress:v1'

export interface TopicStat { answered: number; correct: number }
export interface Attempt { date: string; difficulty: Difficulty; total: number; correct: number }
export interface Progress { topics: Partial<Record<Topic, TopicStat>>; attempts: Attempt[] }

export const EMPTY_PROGRESS: Progress = { topics: {}, attempts: [] }

function isProgress(v: unknown): v is Progress {
  if (typeof v !== 'object' || v === null) return false
  const p = v as Progress
  if (typeof p.topics !== 'object' || p.topics === null || !Array.isArray(p.attempts)) return false
  return Object.values(p.topics).every((t) => t && Number.isInteger(t.answered) && Number.isInteger(t.correct) && t.correct <= t.answered)
    && p.attempts.every((a) => typeof a.date === 'string' && Number.isInteger(a.total) && Number.isInteger(a.correct) && a.correct <= a.total)
}

export const loadProgress = (): Progress => loadJson(PROGRESS_KEY, isProgress, EMPTY_PROGRESS)
export const saveProgress = (p: Progress): boolean => saveJson(PROGRESS_KEY, p)
export const resetProgress = (): void => removeKey(PROGRESS_KEY)

export interface GivenAnswer { question: Question; chosen: number }

/** Pure: fold one finished quiz into saved progress. Only real answers are counted. */
export function recordQuiz(prev: Progress, answers: readonly GivenAnswer[], difficulty: Difficulty, now: Date): Progress {
  const topics: Progress['topics'] = { ...prev.topics }
  let correct = 0
  for (const { question, chosen } of answers) {
    const stat = topics[question.topic] ?? { answered: 0, correct: 0 }
    const ok = chosen === question.correctIndex
    if (ok) correct++
    topics[question.topic] = { answered: stat.answered + 1, correct: stat.correct + (ok ? 1 : 0) }
  }
  if (answers.length === 0) return prev
  const attempts = [{ date: now.toISOString(), difficulty, total: answers.length, correct }, ...prev.attempts].slice(0, 20)
  return { topics, attempts }
}
