import { useState, useEffect, useMemo } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import type { Lead } from '../services/leadsService'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { AssignedUserProfile } from '../services/LeadsFilterService'
import {
  createAssignedUsersById,
  fetchAssignedUsers,
  filterLeads
} from '../services/LeadsFilterService'
import { LeadsHistorialList, getStatusBadge } from '../components/LeadsHistorialList'
import { platformConverter } from '../utils/platformConverter'
import { getDateFieldByRole } from '../utils/dateFieldByRole'

const HistorialLeads = () => {
  const [dateFilter, setDateFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [debouncedPhoneFilter, setDebouncedPhoneFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })
  const [assignedUserFilter, setAssignedUserFilter] = useState('')
  const [assignedUsers, setAssignedUsers] = useState<AssignedUserProfile[]>([])
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedLeadDetails, setSelectedLeadDetails] = useState<Lead | null>(null)
  
  const { user, userEmpresaId, userEmpresaNombre } = useAuthStore()
  const {
    loading, 
    error,
    getLeadsInDateRange,
    leadsHistorial,
    loadHistorialLeads,
    historialTotalCount,
    historialCurrentPage,
    historialTotalPages,
    cancelLeadStatus,
    refreshLeads
  } = useLeadsStore()

  // Debounce para el filtro de teléfono (esperar 500ms después de que el usuario deje de escribir)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPhoneFilter(phoneFilter)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [phoneFilter])

  // Cargar historial al entrar a la página
  useEffect(() => {
    const empresaId = user?.rol !== 'administrador' ? (userEmpresaId || undefined) : undefined
    if (user) {
      loadHistorialLeads(empresaId, statusFilter, currentPage, itemsPerPage, debouncedPhoneFilter || undefined)
    }
  }, [user, userEmpresaId, loadHistorialLeads, statusFilter, currentPage, itemsPerPage, debouncedPhoneFilter])

  const assignedUsersById = useMemo(
    () => createAssignedUsersById(assignedUsers),
    [assignedUsers]
  )

  // Filtrar solo por fecha y usuario asignado en el cliente (estado y teléfono se filtran en el servidor)
  const filteredLeads = useMemo(
    () =>
      filterLeads(leadsHistorial, {
        dateFilter,
        assignedUserFilter,
        assignedUsersById,
        statusGetter: (lead: Lead) => lead.estado
      }),
    [
      leadsHistorial,
      dateFilter,
      assignedUserFilter,
      assignedUsersById
    ]
  )

  // Detectar si es móvil y ajustar items por página
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setItemsPerPage(mobile ? 6 : 10)
    }
    
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter, debouncedPhoneFilter, statusFilter, assignedUserFilter])

  // Sincronizar currentPage con el store
  useEffect(() => {
    setCurrentPage(historialCurrentPage)
  }, [historialCurrentPage])

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ show: true, message, type })
  }

  // Auto-ocultar notificación después de 4 segundos
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notification.show])

  // Calcular leads en el rango de fechas para exportación
  const [leadsToExport, setLeadsToExport] = useState<Lead[]>([])

  useEffect(() => {
    const fetchLeadsInRange = async () => {
      if (exportDateRange.startDate && exportDateRange.endDate) {
        try {
          const empresaId = user?.rol !== 'administrador' ? userEmpresaId : undefined
          // Cargar todos los leads con una sola llamada usando array de estados
          const allLeads = await getLeadsInDateRange(
            exportDateRange.startDate, 
            exportDateRange.endDate, 
            empresaId || undefined,
            ['activo', 'perdido', 'convertido', 'no_valido']
          )
          setLeadsToExport(allLeads)
        } catch (error) {
          console.error('Error fetching leads in date range:', error)
          setLeadsToExport([])
        }
      } else {
        setLeadsToExport([])
      }
    }

    fetchLeadsInRange()
  }, [exportDateRange, getLeadsInDateRange, user?.rol, userEmpresaId])

  const handleExport = () => {
    setShowExportModal(true)
  }

  const handleExportConfirm = () => {
    if (leadsToExport.length === 0) return

    // Crear CSV content
    const headers = ['Fecha', 'Nombre', 'Teléfono', 'Plataforma', 'Estado']
    if (user?.rol === 'administrador') {
      headers.push('Empresa')
    }

    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => {
        const row = [
          new Date(lead.fecha_entrada).toLocaleDateString('es-ES'),
          `"${lead.nombre_cliente}"`,
          lead.telefono,
          lead.plataforma,
          lead.estado || ''
        ]
        if (user?.rol === 'administrador') {
          row.push(`"${lead.empresa_nombre || ''}"`)
        }
        return row.join(',')
      })
    ].join('\n')

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historial_leads_${exportDateRange.startDate}_${exportDateRange.endDate}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Cerrar modal
    setShowExportModal(false)
    setExportDateRange({ startDate: '', endDate: '' })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setExportDateRange({
      ...exportDateRange,
      [e.target.name]: e.target.value
    })
  }

  const handleViewDetails = (lead: Lead) => {
    setSelectedLeadDetails(lead)
    setShowDetailsModal(true)
  }

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false)
    setSelectedLeadDetails(null)
  }

  // Función para manejar cancelar estado
  const handleCancelStatus = (lead: Lead) => {
    setSelectedLead(lead)
    setShowCancelModal(true)
  }

  // Función para confirmar cancelación de estado
  const handleConfirmCancelStatus = async () => {
    if (!selectedLead) return

    try {
      // Llamar a la función del store para cancelar el estado
      await cancelLeadStatus(selectedLead.id)
      
      // Cerrar modal
      setShowCancelModal(false)
      setSelectedLead(null)
      
      // Mostrar notificación de éxito
      showNotification('Estado del lead cancelado correctamente. El lead volverá a estar activo.', 'success')
      
      // Recargar historial
      const empresaId = user?.rol !== 'administrador' ? (userEmpresaId || undefined) : undefined
      loadHistorialLeads(empresaId, statusFilter, currentPage, itemsPerPage, debouncedPhoneFilter || undefined)
      
      // Refrescar leads activos para que esté disponible en Leads.tsx
      await refreshLeads()
    } catch (error) {
      console.error('Error canceling lead status:', error)
      showNotification('Error al cancelar el estado del lead', 'error')
    }
  }

  useEffect(() => {
    const loadAssignedUsers = async () => {
      if (!userEmpresaId) return

      try {
        const profiles = await fetchAssignedUsers(supabase, userEmpresaId)
        setAssignedUsers(profiles)
      } catch (error) {
        console.error('Error loading assigned users:', error)
      }
    }

    if (user?.rol === 'coordinador' && userEmpresaId) {
      loadAssignedUsers()
    } else {
      setAssignedUsers([])
    }
  }, [user?.rol, userEmpresaId])

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10000] max-w-md w-full mx-4">
          <div className={`rounded-lg shadow-lg p-4 flex items-center justify-between ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100' :
                notification.type === 'error' ? 'bg-red-100' :
                'bg-blue-100'
              }`}>
                {notification.type === 'success' ? (
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : notification.type === 'error' ? (
                  <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className={`ml-3 text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className={`ml-4 flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-400 hover:text-green-600' :
                notification.type === 'error' ? 'text-red-400 hover:text-red-600' :
                'text-blue-400 hover:text-blue-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Link 
              to="/leads"
              className="text-[#18cb96] hover:text-[#15b885] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Historial de Leads</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.rol === 'administrador' 
              ? 'Historial completo de todos los leads procesados en el sistema' 
              : `Historial de leads de ${userEmpresaNombre || 'tu empresa'}`
            }
          </p>

        </div>

        {/* Filters and Export */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Filters Row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="dateFilter" className="block text-sm font-medium text-[#373643] mb-2">
                  Filtrar por fecha
                </label>
                <input
                  type="date"
                  id="dateFilter"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label htmlFor="phoneFilter" className="block text-sm font-medium text-[#373643] mb-2">
                  Filtrar por teléfono
                </label>
                <input
                  type="text"
                  id="phoneFilter"
                  placeholder="Buscar por número..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-[#373643] mb-2">
                  Filtrar por estado
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="activo">Activo</option>
                  <option value="convertido">Convertido</option>
                  <option value="perdido">Perdido</option>
                  <option value="no_valido">No válido</option>
                </select>
              </div>
              {user?.rol === 'coordinador' && (
                <div>
                  <label htmlFor="assignedUserFilter" className="block text-sm font-medium text-[#373643] mb-2">
                    Filtrar por usuario asignado
                  </label>
                  <input
                    type="text"
                    id="assignedUserFilter"
                    placeholder="Buscar por nombre, email o rol..."
                    value={assignedUserFilter}
                    onChange={(e) => setAssignedUserFilter(e.target.value)}
                    list={assignedUsers.length > 0 ? 'historialAssignedUserFilterList' : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  />
                  {assignedUsers.length > 0 && (
                    <datalist id="historialAssignedUserFilterList">
                      {assignedUsers.map(userProfile => {
                        const displayName = userProfile.nombre || userProfile.email || 'Sin nombre'
                        const label = `${displayName}${userProfile.rol ? ` (${userProfile.rol})` : ''}`
                        return (
                          <option
                            key={userProfile.user_id}
                            value={displayName}
                            label={label}
                          />
                        )
                      })}
                    </datalist>
                  )}
                </div>
              )}
            </div>
            
            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="w-full sm:w-auto px-6 py-2 bg-[#18cb96] text-white font-medium rounded-lg hover:bg-[#15b885] transition-colors flex items-center justify-center"
              >
                <span className="mr-2">📊</span>
                Exportar Historial
              </button>
            </div>
          </div>
        </div>

        {/* Historial Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Leads List Component with integrated loading */}
          <LeadsHistorialList
            leads={filteredLeads}
            loading={loading}
            userRole={user?.rol}
            onViewDetails={handleViewDetails}
            onCancelStatus={handleCancelStatus}
          />

          {/* Table Footer */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="hidden lg:block text-xs sm:text-sm text-gray-700">
                Mostrando <span className="font-medium">{filteredLeads.length}</span> de <span className="font-medium">{historialTotalCount}</span> leads en historial
                {user?.rol !== 'administrador' && (
                  <span className="ml-2 text-[#18cb96]">(filtrados por empresa)</span>
                )}
              </div>
              
              {/* Paginación */}
              {historialTotalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      const newPage = Math.max(currentPage - 1, 1)
                      setCurrentPage(newPage)
                      const empresaId = user?.rol !== 'administrador' ? (userEmpresaId || undefined) : undefined
                      loadHistorialLeads(empresaId, statusFilter, newPage, itemsPerPage, debouncedPhoneFilter || undefined)
                    }}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {historialTotalPages}
                  </span>
                  
                  <button
                    onClick={() => {
                      const newPage = Math.min(currentPage + 1, historialTotalPages)
                      setCurrentPage(newPage)
                      const empresaId = user?.rol !== 'administrador' ? (userEmpresaId || undefined) : undefined
                      loadHistorialLeads(empresaId, statusFilter, newPage, itemsPerPage, debouncedPhoneFilter || undefined)
                    }}
                    disabled={currentPage === historialTotalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal overlay */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-[10001]"
          onClick={handleCloseDetailsModal}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLeadDetails && (
        <div className="fixed inset-0 flex items-center justify-center z-[10002] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">Detalles del Lead</h2>
              <button
                onClick={handleCloseDetailsModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Nombre del Cliente</label>
                  <p className="text-sm text-gray-700">{selectedLeadDetails.nombre_cliente}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Teléfono</label>
                  <p className="text-sm text-gray-700">{selectedLeadDetails.telefono}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Plataforma</label>
                  <p className="text-sm text-gray-700">{selectedLeadDetails.plataforma ? platformConverter(selectedLeadDetails.plataforma) : 'Sin plataforma'}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                  <label className="block text-sm font-medium text-[#373643] mb-1">
                    {user?.rol === 'coordinador' ? 'Fecha de Asignación' : user?.rol === 'agente' ? 'Fecha de Asignación Agente' : 'Fecha de Entrada'}
                  </label>
                  <p className="text-sm text-gray-700">
                    {(() => {
                      const dateField = getDateFieldByRole(user?.rol)
                      const dateValue = selectedLeadDetails[dateField]
                      return dateValue ? new Date(dateValue).toLocaleDateString('es-ES') : 'Sin fecha'
                    })()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Estado</label>
                  <div className="mt-1">{getStatusBadge(selectedLeadDetails.estado_temporal || '')}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Usuario Asignado</label>
                  <p className="text-sm text-gray-700">{selectedLeadDetails.usuario_nombre || 'Sin asignar'}</p>
                </div>
                {user?.rol === 'administrador' && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96]">
                    <label className="block text-sm font-medium text-[#373643] mb-1">Empresa</label>
                    <p className="text-sm text-gray-700">{selectedLeadDetails.empresa_nombre || '-'}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-[#373643] mb-2">Observaciones</label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-700">
                  {selectedLeadDetails.observaciones || 'Sin observaciones'}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={handleCloseDetailsModal}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal overlay */}
      {showExportModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowExportModal(false)}
        />
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Exportar Historial</h2>
              <button
                onClick={() => setShowExportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Range Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-[#373643] mb-2">
                    Fecha inicio
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={exportDateRange.startDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-[#373643] mb-2">
                    Fecha fin
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={exportDateRange.endDate}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>
              </div>

              {/* Leads Count Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#373643]">Leads a exportar:</span>
                  <span className="text-lg font-bold text-[#18cb96]">{leadsToExport.length}</span>
                </div>
                {leadsToExport.length > 0 && (
                  <p className="text-xs text-gray-600 mt-1">
                    Desde {new Date(exportDateRange.startDate).toLocaleDateString('es-ES')} hasta {new Date(exportDateRange.endDate).toLocaleDateString('es-ES')}
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportConfirm}
                  disabled={leadsToExport.length === 0}
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Exportar ({leadsToExport.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Status Modal overlay */}
      {showCancelModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowCancelModal(false)}
        />
      )}

      {/* Cancel Status Modal */}
      {showCancelModal && selectedLead && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Cancelar Estado</h2>
              <button
                onClick={() => setShowCancelModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-[#373643] mb-2">
                  ¿Estás seguro de que quieres cancelar el estado de este lead?
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                  <p className="text-blue-800 text-xs">
                    ℹ️ <strong>Información:</strong> Al cancelar el estado, el lead volverá a estar activo y disponible para ser procesado nuevamente.
                  </p>
                </div>
                {selectedLead && (
                  <div className="text-xs text-gray-600 mt-3">
                    <p><strong>Nombre:</strong> {selectedLead.nombre_cliente}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.telefono}</p>
                    <p><strong>Estado actual:</strong> {getStatusBadge(selectedLead.estado_temporal || '')}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  No hacer nada
                </button>
                <button
                  onClick={handleConfirmCancelStatus}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Cancelar Estado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default HistorialLeads
