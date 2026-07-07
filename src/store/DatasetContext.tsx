import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  Dataset,
  DataRow,
  DatasetProfile,
  CleaningHistory,
  AIStatus,
} from "../types";
import { profileDataset } from "../lib/analysis";

interface DatasetContextValue {
  dataset: Dataset | null;
  aiStatus: AIStatus;
  cleaningHistory: CleaningHistory[];
  setAIStatus: (s: AIStatus) => void;
  loadDataset: (
    name: string,
    fileName: string,
    fileType: string,
    rows: DataRow[],
    columns: string[],
    sheetNames?: string[],
  ) => void;
  updateRows: (rows: DataRow[]) => void;
  switchSheet: (rows: DataRow[], columns: string[], sheetName: string) => void;
  reprofile: () => void;
  addCleaningHistory: (h: CleaningHistory) => void;
  clearDataset: () => void;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [aiStatus, setAIStatus] = useState<AIStatus>({
    state: "idle",
    label: "No dataset loaded",
  });
  const [cleaningHistory, setCleaningHistory] = useState<CleaningHistory[]>([]);

  const loadDataset = useCallback(
    (
      name: string,
      fileName: string,
      fileType: string,
      rows: DataRow[],
      columns: string[],
      sheetNames?: string[],
    ) => {
      setAIStatus({ state: "profiling", label: "Profiling dataset..." });
      const profile = profileDataset(rows, columns);
      const ds: Dataset = {
        id: `ds-${Date.now()}`,
        name,
        fileName,
        fileType,
        uploadedAt: Date.now(),
        rows,
        columns,
        sheetNames,
        activeSheet: sheetNames?.[0],
        profile,
      };
      setDataset(ds);
      setAIStatus({ state: "ready", label: "Ready" });
    },
    [],
  );

  const updateRows = useCallback((rows: DataRow[]) => {
    setDataset((prev) => {
      if (!prev) return prev;
      const profile = profileDataset(rows, prev.columns);
      return { ...prev, rows, profile };
    });
  }, []);

  const switchSheet = useCallback(
    (rows: DataRow[], columns: string[], sheetName: string) => {
      setDataset((prev) => {
        if (!prev) return prev;
        const profile = profileDataset(rows, columns);
        return { ...prev, rows, columns, activeSheet: sheetName, profile };
      });
    },
    [],
  );

  const reprofile = useCallback(() => {
    setDataset((prev) => {
      if (!prev) return prev;
      const profile = profileDataset(prev.rows, prev.columns);
      return { ...prev, profile };
    });
  }, []);

  const addCleaningHistory = useCallback((h: CleaningHistory) => {
    setCleaningHistory((prev) => [h, ...prev].slice(0, 50));
  }, []);

  const clearDataset = useCallback(() => {
    setDataset(null);
    setCleaningHistory([]);
    setAIStatus({ state: "idle", label: "No dataset loaded" });
  }, []);

  return (
    <DatasetContext.Provider
      value={{
        dataset,
        aiStatus,
        cleaningHistory,
        setAIStatus,
        loadDataset,
        updateRows,
        switchSheet,
        reprofile,
        addCleaningHistory,
        clearDataset,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error("useDataset must be used within DatasetProvider");
  return ctx;
}
