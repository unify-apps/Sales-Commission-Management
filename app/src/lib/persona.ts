import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// The app serves two experiences from one build:
//  • admin  — the comp-admin workspace (Anita Serrano): Organization, Plan Design, etc.
//  • rep    — the individual sales rep (Marcus Lin): Incentives, Graphs, Simulator.
// Which one is shown is driven by the signed-in persona, held here and persisted so a
// reload keeps you in the same seat. In this demo the persona is switched from the
// sidebar identity menu, standing in for logging in as that person.

export type Role = 'admin' | 'rep'

export interface Persona {
  role: Role
  name: string
  subtitle: string
  /** Org profile id backing a rep persona (drives their statement/graphs). */
  profileId?: string
  employeeId?: string
}

export const ADMIN_PERSONA: Persona = {
  role: 'admin',
  name: 'Anita Serrano',
  subtitle: 'Comp Admin',
  employeeId: 'E-10042',
}

export const REP_PERSONA: Persona = {
  role: 'rep',
  name: 'Marcus Lin',
  subtitle: 'Sales Rep · West Enterprise',
  profileId: 'pr-1',
  employeeId: 'E-10041',
}

export const PERSONAS: Record<Role, Persona> = {
  admin: ADMIN_PERSONA,
  rep: REP_PERSONA,
}

interface PersonaState {
  role: Role
  setRole: (role: Role) => void
}

export const usePersonaStore = create<PersonaState>()(
  persist(
    (set) => ({
      role: 'admin',
      setRole: (role) => set({ role }),
    }),
    { name: 'ledger-persona' },
  ),
)

/** Convenience: the full persona object for the active role. */
export function usePersona(): Persona {
  const role = usePersonaStore((s) => s.role)
  return PERSONAS[role]
}
