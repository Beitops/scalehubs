import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  // Mostrar loading mientras se verifica la sesión inicial
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#03002b] to-[#05003e] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#18cb96] mx-auto mb-4"></div>
          <p className="text-white/80">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
