import { HashRouter, Routes, Route } from "react-router-dom";
import { DatasetProvider } from "./store/DatasetContext";
import { Sidebar } from "./components/Sidebar";
import { TopNav } from "./components/TopNav";
import { DashboardPage } from "./pages/DashboardPage";
import { DataSourcesPage } from "./pages/DataSourcesPage";
import { AIChatPage } from "./pages/AIChatPage";
import { DataCleaningPage } from "./pages/DataCleaningPage";
import { DataProfilingPage } from "./pages/DataProfilingPage";
import { VisualizationsPage } from "./pages/VisualizationsPage";
import { SqlExplorerPage } from "./pages/SqlExplorerPage";
import { ForecastingPage } from "./pages/ForecastingPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { ExportPage } from "./pages/ExportPage";
import { SettingsPage } from "./pages/SettingsPage";

function App() {
  return (
    <DatasetProvider>
      <HashRouter>
        <div className="flex min-h-screen bg-bg-base">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <TopNav />
            <main className="flex-1 p-6 overflow-x-hidden">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/sources" element={<DataSourcesPage />} />
                <Route path="/chat" element={<AIChatPage />} />
                <Route path="/cleaning" element={<DataCleaningPage />} />
                <Route path="/profiling" element={<DataProfilingPage />} />
                <Route
                  path="/visualizations"
                  element={<VisualizationsPage />}
                />
                <Route path="/sql" element={<SqlExplorerPage />} />
                <Route path="/forecasting" element={<ForecastingPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/export" element={<ExportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </HashRouter>
    </DatasetProvider>
  );
}

export default App;
