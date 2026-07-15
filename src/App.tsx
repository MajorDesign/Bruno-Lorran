import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { StudentsPage } from './pages/StudentsPage'
import { StudentDetailPage } from './pages/StudentDetailPage'
import { VideosPage } from './pages/VideosPage'

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
        <Route index element={<Navigate to="/alunos" replace />} />
        <Route path="/alunos" element={<StudentsPage />} />
        <Route path="/alunos/:id" element={<StudentDetailPage />} />
        <Route path="/videos" element={<VideosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/alunos" replace />} />
    </Routes>
  )
}
