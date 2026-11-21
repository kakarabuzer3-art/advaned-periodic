import { loadJson } from '../../lib/storage.ts'

export const ONBOARDING_KEY = 'pte:onboarding:v1'

interface Saved { completed: boolean }
const isSaved = (v: unknown): v is Saved => typeof v === 'object' && v !== null && typeof (v as Saved).completed === 'boolean'

export const isOnboardingComplete = (): boolean => loadJson<Saved>(ONBOARDING_KEY, isSaved, { completed: false }).completed
