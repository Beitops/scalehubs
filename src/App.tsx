import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Auth from './components/Auth'
import Register from './components/Register'
import Platform from './components/Platform'
import ProtectedRoute from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'
import { useLeadsStore } from './store/leadsStore'

function App() {
  const { checkAuth, isAuthenticated, user } = useAuthStore()
  const { loadInitialLeads } = useLeadsStore()

  useEffect(() => {

  }, [checkAuth])

  // Cargar leads cuando el usuario esté autenticado
  useEffect(() => {
    const checkAuthAndLoadLeads = async () => {
      await checkAuth()
      if (isAuthenticated && user) {
        // Pequeño delay para asegurar que getUserEmpresaInfo haya terminado

        loadInitialLeads()

      }
    }
    checkAuthAndLoadLeads()
  }, [isAuthenticated, loadInitialLeads])

  return (
    <Router>
      <Routes>
        {/* Auth route */}
        <Route path="/auth" element={<Auth />} />

        {/* Set password route (for invited users) */}
        <Route path="/set-password" element={<Register />} />

        {/* Protected platform routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Platform />
            </ProtectedRoute>
          }
        />

        {/* Redirect to auth if no route matches */}
        <Route path="*" element={<Navigate to="/auth" replace />} />
      </Routes>
    </Router>
  )
}

export default App
