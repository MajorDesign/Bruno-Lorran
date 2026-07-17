import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ModulesPage } from './pages/ModulesPage'
import { StudentsPage } from './pages/StudentsPage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { StudentFormPage } from './pages/StudentFormPage'
import { AgendaPage } from './pages/AgendaPage'
import { AdminsPage } from './pages/AdminsPage'
import { ConfigPage } from './pages/ConfigPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/alunos" element={<StudentsPage />} />
        <Route path="/alunos/novo" element={<StudentFormPage />} />
        <Route path="/alunos/editar/:id" element={<StudentFormPage />} />
        <Route path="/alunos/:id" element={<StudentDetailPage />} />
        <Route path="/modulos" element={<ModulesPage />} />
        <Route path="/administradores" element={<AdminsPage />} />
        <Route path="/configuracoes" element={<ConfigPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
