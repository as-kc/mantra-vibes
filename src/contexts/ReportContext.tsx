import React, { createContext, useContext, useState, ReactNode } from 'react';

type Line = {
  itemId: string | null;
  start: string;
  end: string;
};

type ReportContextType = {
  lines: Line[];
  note: string;
  totalRevenue: string;
  addItemToReport: (itemId: string) => void;
  removeLine: (idx: number) => void;
  setLine: (idx: number, patch: Partial<Line>) => void;
  addLine: () => void;
  setNote: (note: string) => void;
  setTotalRevenue: (revenue: string) => void;
  clearReport: () => void;
  getCurrentReportItems: (items?: Array<{ id: string; name: string }>) => Array<{ id: string; name: string }>;
  hasItem: (itemId: string) => boolean;
};

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const useReport = () => {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
};

type ReportProviderProps = {
  children: ReactNode;
};

export const ReportProvider: React.FC<ReportProviderProps> = ({ children }) => {
  const [lines, setLines] = useState<Line[]>([]);
  const [note, setNoteState] = useState('');
  const [totalRevenue, setTotalRevenueState] = useState('');

  const addItemToReport = (itemId: string) => {
    if (lines.some(l => l.itemId === itemId)) {
      return false; // Item already exists
    }
    setLines(prev => [...prev, { itemId, start: '0', end: '0' }]);
    return true;
  };

  const removeLine = (idx: number) => {
    setLines(prev => prev.filter((_, i) => i !== idx));
  };

  const setLine = (idx: number, patch: Partial<Line>) => {
    setLines(prev => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  };

  const addLine = () => {
    setLines(prev => [...prev, { itemId: null, start: '0', end: '0' }]);
  };

  const setNote = (newNote: string) => {
    setNoteState(newNote);
  };

  const setTotalRevenue = (revenue: string) => {
    setTotalRevenueState(revenue);
  };

  const clearReport = () => {
    setLines([]);
    setNoteState('');
    setTotalRevenueState('');
  };

  const getCurrentReportItems = (items?: Array<{ id: string; name: string }>) => {
    return lines.filter(l => l.itemId).map(l => {
      if (items) {
        const item = items.find(i => i.id === l.itemId);
        return item ? { id: l.itemId!, name: item.name } : { id: l.itemId!, name: l.itemId! };
      }
      return { id: l.itemId!, name: l.itemId! };
    });
  };

  const hasItem = (itemId: string) => {
    return lines.some(l => l.itemId === itemId);
  };

  const value: ReportContextType = {
    lines,
    note,
    totalRevenue,
    addItemToReport,
    removeLine,
    setLine,
    addLine,
    setNote,
    setTotalRevenue,
    clearReport,
    getCurrentReportItems,
    hasItem,
  };

  return (
    <ReportContext.Provider value={value}>
      {children}
    </ReportContext.Provider>
  );
};
