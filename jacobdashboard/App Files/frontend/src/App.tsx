import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'

import './App.css'
import { CommandPalette } from './components/CommandPalette'
import { ShellLayout } from './components/ShellLayout'
import { DashboardProvider } from './context/DashboardContext'
import { ThemeProvider } from './context/ThemeContext'
import { ActionsPage } from './pages/ActionsPage'
import { CertificationsPage } from './pages/CertificationsPage'
import { ContractorsPage } from './pages/ContractorsPage'
import { HeatmapPage } from './pages/HeatmapPage'
import { ImportPage } from './pages/ImportPage'
import { OverviewPage } from './pages/OverviewPage'
import { SettingsPage } from './pages/SettingsPage'
import { WorkersPage } from './pages/WorkersPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <DashboardProvider>
            <CommandPalette />
            <ShellLayout>
              <Routes>
                <Route path="/" element={<OverviewPage />} />
                <Route path="/actions" element={<ActionsPage />} />
                <Route path="/contractors" element={<ContractorsPage />} />
                <Route path="/workers" element={<WorkersPage />} />
                <Route path="/certifications" element={<CertificationsPage />} />
                <Route path="/heatmap" element={<HeatmapPage />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ShellLayout>
          </DashboardProvider>
        </BrowserRouter>
      </ThemeProvider>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: { background: '#161b22', border: '1px solid #30363d', color: '#e6edf3' },
        }}
      />
    </QueryClientProvider>
  )
}

export default App
