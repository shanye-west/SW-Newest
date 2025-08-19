import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Tournament {
  id: string;
  name: string;
  date: string;
}

interface TournamentContextValue {
  activeTournament: Tournament | null;
  setActiveTournament: (tournament: Tournament | null) => void;
  clearActiveTournament: () => void;
}

const TournamentContext = createContext<TournamentContextValue | undefined>(undefined);

interface TournamentProviderProps {
  children: ReactNode;
}

export function TournamentProvider({ children }: TournamentProviderProps) {
  const [activeTournament, setActiveTournamentState] = useState<Tournament | null>(null);

  const setActiveTournament = (tournament: Tournament | null) => {
    setActiveTournamentState(tournament);
  };

  const clearActiveTournament = () => {
    setActiveTournamentState(null);
  };

  const value: TournamentContextValue = {
    activeTournament,
    setActiveTournament,
    clearActiveTournament
  };

  return (
    <TournamentContext.Provider value={value}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournamentContext(): TournamentContextValue {
  const context = useContext(TournamentContext);
  if (context === undefined) {
    throw new Error('useTournamentContext must be used within a TournamentProvider');
  }
  return context;
}