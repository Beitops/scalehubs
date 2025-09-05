import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import { companyService, type Company } from '../services/companyService'
import { getUsersByCompany } from '../services/userService'
import type { DatabaseProfile } from '../types/database'
import type { Lead } from '../services/leadsService'
import { leadSolicitudesService, type LeadSolicitud } from '../services/leadSolicitudesService'

const AsignacionLeads = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<DatabaseProfile[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false)
  const [solicitudes, setSolicitudes] = useState<LeadSolicitud[]>([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({ show: false, message: '', type: 'info' })

  const { user, userEmpresaId } = useAuthStore()
  const {
    loading,
    error,
    unassignedLeads,
    loadUnassignedLeads,
    loadUnassignedLeadsByCompany,
    assignLeadToCompany,
    assignLeadToAgent
  } = useLeadsStore()

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

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (user?.rol === 'administrador') {
        // Para administradores: cargar leads sin empresa y todas las empresas
        setLoadingCompanies(true)
        try {
          const companiesData = await companyService.getCompanies()
          setCompanies(companiesData.filter(c => c.activa))
          await loadUnassignedLeads()
        } catch (error) {
          console.error('Error loading initial data:', error)
        } finally {
          setLoadingCompanies(false)
        }
      } else if (user?.rol === 'coordinador' && userEmpresaId) {
        // Para coordinadores: cargar leads sin agente de su empresa y usuarios de su empresa
        setLoadingUsers(true)
        try {
          const usersData = await getUsersByCompany(userEmpresaId)
          setUsers(usersData.filter(u => u.rol === 'agente'))
          await loadUnassignedLeadsByCompany(userEmpresaId)
        } catch (error) {
          console.error('Error loading initial data:', error)
        } finally {
          setLoadingUsers(false)
        }
      }
    }

    loadInitialData()
  }, [user, userEmpresaId])



  const handleAssignLead = (lead: Lead) => {
    setSelectedLead(lead)
    setCompanyFilter('')
    setUserFilter('')
    setSelectedCompany(null)
    setSelectedUser(null)
    setShowAssignModal(true)
  }

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.nombre.toLowerCase().includes(companyFilter.toLowerCase())
  )

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.nombre?.toLowerCase().includes(userFilter.toLowerCase()) ||
    user.email?.toLowerCase().includes(userFilter.toLowerCase())
  )

  // Get selected company name
  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.nombre || ''

  // Get selected user name
  const selectedUserName = users.find(u => u.user_id === selectedUser)?.nombre || ''

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company.id)
  }

  const handleUserSelect = (user: DatabaseProfile) => {
    setSelectedUser(user.user_id)
  }

  const handleLoadSolicitudes = async () => {
    if (!userEmpresaId) return

    setLoadingSolicitudes(true)
    try {
      const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
      setSolicitudes(solicitudesData)
      setShowSolicitudesModal(true)
    } catch (error) {
      console.error('Error loading solicitudes:', error)
      alert('Error al cargar las solicitudes. Inténtalo de nuevo.')
    } finally {
      setLoadingSolicitudes(false)
    }
  }

  const handleAprobarSolicitud = async (solicitudId: number) => {
    if (!userEmpresaId || !user?.id) return

    setProcessingAction(true)
    try {
      // Obtener el lead más reciente sin asignar
      const leadId = await leadSolicitudesService.getLeadMasRecienteSinAsignar(userEmpresaId)
      
      if (!leadId) {
        showNotification('No hay leads disponibles para asignar. La solicitud será rechazada.', 'info')
        await leadSolicitudesService.rechazarSolicitud(solicitudId, user.id)
      } else {
        await leadSolicitudesService.aprobarSolicitud(solicitudId, leadId, user.id)
      }

      // Recargar solicitudes
      const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
      setSolicitudes(solicitudesData)

      showNotification('Solicitud procesada correctamente.', 'success')
    } catch (error) {
      console.error('Error procesando solicitud:', error)
      showNotification('Error al procesar la solicitud. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRechazarSolicitud = async (solicitudId: number) => {
    if (!user?.id) return

    setProcessingAction(true)
    try {
      await leadSolicitudesService.rechazarSolicitud(solicitudId, user.id)

      // Recargar solicitudes
      if (userEmpresaId) {
        const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
        setSolicitudes(solicitudesData)
      }

      showNotification('Solicitud rechazada correctamente.', 'success')
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      showNotification('Error al rechazar la solicitud. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleAprobarTodo = async () => {
    if (!userEmpresaId || !user?.id) return

    setProcessingAction(true)
    try {
      await leadSolicitudesService.aprobarTodasLasSolicitudes(userEmpresaId, user.id)
      
      // Recargar solicitudes
      const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
      setSolicitudes(solicitudesData)

      showNotification('Todas las solicitudes han sido procesadas.', 'success')
    } catch (error) {
      console.error('Error aprobando todas las solicitudes:', error)
      showNotification('Error al procesar las solicitudes. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleConfirmAssignment = async () => {
    if (!selectedLead) return

    try {
      if (user?.rol === 'administrador') {
        // Administrador asigna lead a empresa
        if (!selectedCompany) {
          showNotification('Por favor selecciona una empresa', 'error')
          return
        }
        await assignLeadToCompany(selectedLead.id, selectedCompany)
      } else if (user?.rol === 'coordinador') {
        // Coordinador asigna lead a agente
        if (!selectedUser) {
          showNotification('Por favor selecciona un agente', 'error')
          return
        }
        await assignLeadToAgent(selectedLead.id, selectedUser)
      }

      setShowAssignModal(false)
      setSelectedLead(null)
      setSelectedCompany(null)
      setSelectedUser(null)
      setCompanyFilter('')
      setUserFilter('')
    } catch (error) {
      console.error('Error assigning lead:', error)
      showNotification('Error al asignar el lead. Inténtalo de nuevo.', 'error')
    }
  }

  const getPageTitle = () => {
    if (user?.rol === 'administrador') {
      return 'Asignación de Leads a Empresas'
    } else if (user?.rol === 'coordinador') {
      return 'Asignación de Leads a Agentes'
    }
    return 'Asignación de Leads'
  }

  const getPageDescription = () => {
    if (user?.rol === 'administrador') {
      return 'Asigna leads sin empresa a diferentes empresas del sistema'
    } else if (user?.rol === 'coordinador') {
      return 'Asigna leads de tu empresa a agentes disponibles'
    }
    return ''
  }

  if (loading || loadingCompanies || loadingUsers) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando datos...</span>
      </div>
    )
  }

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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">{getPageTitle()}</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {getPageDescription()}
          </p>
        </div>

        {/* Solicitudes Button - Solo para coordinadores */}
        {user?.rol === 'coordinador' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#373643] mb-1">Solicitudes de Leads</h3>
                <p className="text-sm text-gray-600">
                  Revisa las solicitudes de leads de los agentes de tu empresa.
                </p>
              </div>
              <button
                onClick={handleLoadSolicitudes}
                disabled={loadingSolicitudes}
                className="px-6 py-2 text-white font-medium rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: '#1e3a8a' }}
              >
                {loadingSolicitudes ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cargando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">📋</span>
                    Ver Solicitudes
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[#18cb96] rounded-lg flex items-center justify-center">
                <span className="text-2xl text-white">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Leads sin asignar</p>
                <p className="text-2xl font-bold text-[#373643]">{unassignedLeads.length}</p>
              </div>
            </div>
          </div>

          {user?.rol === 'administrador' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-2xl text-white">🏢</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Empresas activas</p>
                  <p className="text-2xl font-bold text-[#373643]">{companies.length}</p>
                </div>
              </div>
            </div>
          )}

          {user?.rol === 'coordinador' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-2xl text-white">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Agentes disponibles</p>
                  <p className="text-2xl font-bold text-[#373643]">{users.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {unassignedLeads.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {user?.rol === 'administrador' 
                  ? 'No hay leads sin empresa asignada'
                  : 'No hay leads sin agente asignado'
                }
              </h3>
              <p className="text-gray-600">
                {user?.rol === 'administrador' 
                  ? 'Todos los leads activos ya tienen una empresa asignada'
                  : 'Todos los leads de tu empresa ya tienen un agente asignado'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="lg:hidden">
                {unassignedLeads.map((lead) => (
                  <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                        {lead.plataforma_lead}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
                      <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                      {user?.rol === 'administrador' && (
                        <p><span className="font-medium">Empresa:</span> Sin asignar</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAssignLead(lead)}
                        className="flex-1 px-3 py-2 bg-[#18cb96] text-white text-xs font-medium rounded-lg hover:bg-[#15b885] transition-colors"
                      >
                        Asignar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Fecha Entrada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Teléfono
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Plataforma
                      </th>
                      {user?.rol === 'administrador' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                          Empresa
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {unassignedLeads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                          {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#373643]">{lead.nombre_cliente}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                          {lead.telefono}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                            {lead.plataforma_lead}
                          </span>
                        </td>
                        {user?.rol === 'administrador' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            Sin asignar
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleAssignLead(lead)}
                            className="px-4 py-2 bg-[#18cb96] text-white text-sm font-medium rounded-lg hover:bg-[#15b885] transition-colors"
                          >
                            Asignar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-xs sm:text-sm text-gray-700">
                    Mostrando <span className="font-medium">{unassignedLeads.length}</span> leads sin asignar
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Assignment Modal overlay */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowAssignModal(false)}
        />
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedLead && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">
                {user?.rol === 'administrador' ? 'Asignar Lead a Empresa' : 'Asignar Lead a Agente'}
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Lead Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-[#373643] mb-3">Información del Lead</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div><strong>Nombre:</strong> {selectedLead.nombre_cliente}</div>
                  <div><strong>Teléfono:</strong> {selectedLead.telefono}</div>
                  <div><strong>Plataforma:</strong> {selectedLead.plataforma_lead}</div>
                  <div><strong>Fecha:</strong> {new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</div>
                </div>
              </div>

              {/* Assignment Options */}
              {user?.rol === 'administrador' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Seleccionar Empresa
                    </label>
                    
                    {/* Company Filter Input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Buscar empresa..."
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      />
                    </div>

                    {/* Selected Company Display */}
                    {selectedCompany && (
                      <div className="mb-3 p-3 bg-[#18cb96]/10 border border-[#18cb96]/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#18cb96]">
                            Empresa seleccionada: {selectedCompanyName}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCompany(null)
                              setCompanyFilter('')
                            }}
                            className="text-[#18cb96] hover:text-[#15b885]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Company List */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          Empresas disponibles ({filteredCompanies.length})
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCompanies.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500 text-center">
                            {companyFilter ? 'No se encontraron empresas con ese nombre' : 'No hay empresas disponibles'}
                          </div>
                        ) : (
                          filteredCompanies.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySelect(company)}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                selectedCompany === company.id 
                                  ? 'bg-[#18cb96]/10 border-l-4 border-l-[#18cb96]' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-[#373643]">{company.nombre}</div>
                                  <div className="text-xs text-gray-500 mt-1">CIF: {company.cif}</div>
                                </div>
                                {selectedCompany === company.id && (
                                  <div className="w-6 h-6 bg-[#18cb96] rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Seleccionar Agente
                    </label>
                    
                    {/* User Filter Input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Buscar agente por nombre o email..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      />
                    </div>

                    {/* Selected User Display */}
                    {selectedUser && (
                      <div className="mb-3 p-3 bg-[#18cb96]/10 border border-[#18cb96]/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#18cb96]">
                            Agente seleccionado: {selectedUserName}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedUser(null)
                              setUserFilter('')
                            }}
                            className="text-[#18cb96] hover:text-[#15b885]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* User List */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          Agentes disponibles ({filteredUsers.length})
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500 text-center">
                            {userFilter ? 'No se encontraron agentes con ese nombre o email' : 'No hay agentes disponibles'}
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <button
                              key={user.user_id}
                              onClick={() => handleUserSelect(user)}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                selectedUser === user.user_id 
                                  ? 'bg-[#18cb96]/10 border-l-4 border-l-[#18cb96]' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-[#373643]">{user.nombre}</div>
                                  <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                                </div>
                                {selectedUser === user.user_id && (
                                  <div className="w-6 h-6 bg-[#18cb96] rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={
                    (user?.rol === 'administrador' && !selectedCompany) ||
                    (user?.rol === 'coordinador' && !selectedUser)
                  }
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Asignación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Solicitudes Modal overlay */}
      {showSolicitudesModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowSolicitudesModal(false)}
        />
      )}

      {/* Solicitudes Modal */}
      {showSolicitudesModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">Solicitudes de Leads Pendientes</h2>
              <button
                onClick={() => setShowSolicitudesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {solicitudes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">✅</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay solicitudes pendientes
                    </h3>
                    <p className="text-gray-600">
                      No hay solicitudes de leads pendientes de los agentes de tu empresa.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Botón Aprobar Todo */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-start">
                    <button
                      onClick={handleAprobarTodo}
                      disabled={processingAction}
                      className="px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:opacity-90"
                      style={{ backgroundColor: '#1e3a8a' }}
                    >
                      {processingAction ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✅</span>
                          Aprobar Todas las Solicitudes ({solicitudes.length})
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lista de Solicitudes con Scroll */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                      {solicitudes.map((solicitud) => (
                        <div key={solicitud.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-xs">
                                      {solicitud.solicitante?.nombre?.charAt(0) || 'A'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-sm font-medium text-[#373643] truncate">
                                      {solicitud.solicitante?.nombre || 'Agente'}
                                    </h3>
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-yellow-800 bg-yellow-100">
                                      Pendiente
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">
                                    {solicitud.solicitante?.email}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(solicitud.fecha_creacion).toLocaleDateString('es-ES')} {new Date(solicitud.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleAprobarSolicitud(solicitud.id)}
                                disabled={processingAction}
                                className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleRechazarSolicitud(solicitud.id)}
                                disabled={processingAction}
                                className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AsignacionLeads
