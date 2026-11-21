import { createContext, useContext } from 'react'

export interface GlossaryApi {
  /** Open the "explain this simply" dialog for a glossary term. */
  open: (id: string) => void
}

export const GlossaryContext = createContext<GlossaryApi>({ open: () => {} })
export const useGlossary = () => useContext(GlossaryContext)
