import { Outlet } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'

const LeadsLayout = () => {
  const { user, userEmpresaNombre, userEmpresaId } = useAuthStore()
  const { loadInitialLeads, loadDevoluciones, loadHistorialLeads } = useLeadsStore()

  // Cargar leads cuando el componente se monte
  useEffect(() => {
    if (!user) return

    let isReady = true
    const loadData = async () => {
      if (isReady) {
        try {
          await loadInitialLeads()
          loadDevoluciones()
          // Cargar también el historial para que esté disponible en todas las rutas
          const empresaId = user?.rol !== 'administrador' ? userEmpresaId || undefined : undefined
          await loadHistorialLeads(empresaId)
        } catch (error) {
          console.error('Error loading data:', error)
        }
      }
    }

    loadData()

    return () => {
      isReady = false
    }
  }, [user, loadInitialLeads, loadDevoluciones])

  return (
    <>
      {/* Header */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 lg:pt-8">
        <div className="mb-4 lg:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Gestión de Leads</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.rol === 'administrador' 
              ? 'Administra y visualiza todos los leads del sistema' 
              : `Gestiona los leads de ${userEmpresaNombre || 'tu empresa'}`
            }
          </p>
          {user?.rol === 'administrador' && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">
                👑 <strong>Modo Administrador:</strong> Acceso completo a todos los leads
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Renderizar el contenido de las rutas hijas */}
      <Outlet />
    </>
  )
}

export default LeadsLayout
