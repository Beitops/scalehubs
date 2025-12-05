import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDashboardStore } from '../store/dashboardStore'
import { companyService, type Company } from '../services/companyService'
import { getUsersByCompany } from '../services/userService'
import { leadsService } from '../services/leadsService'
import { formatEstado } from '../utils/estadoConverter'
import type { DatabaseProfile } from '../types/database'

// Tipos para los leads de exportación
interface AdminExportLead {
  id: number
  nombre_cliente: string
  telefono: string
  fecha_entrada: string
  fecha_asignacion?: string | null
  fecha_asignacion_usuario?: string | null
  empresa_nombre?: string
  user_id?: string | null
  usuario_nombre?: string
  hub_nombre?: string
  plataforma?: string
  estado_temporal?: string
  observaciones?: string
  campaña_nombre?: string
}

interface CoordExportLead {
  id: number
  nombre_cliente: string
  telefono: string
  fecha_asignacion?: string | null
  fecha_asignacion_usuario?: string | null
  user_id?: string | null
  usuario_nombre?: string
  estado_temporal?: string
  observaciones?: string
}



const Dashboard = () => {
  const { user, userEmpresaNombre, userEmpresaId } = useAuthStore()
  const { 
    loading, 
    adminStats,
    adminLeads,
    adminLeadsPage,
    adminLeadsTotalCount,
    coordStats,
    coordLeads,
    coordLeadsPage,
    coordLeadsTotalCount,
    agentStats,
    agentLeads,
    agentLeadsPage,
    agentLeadsTotalCount,
    timeFilter,
    dateFieldFilter,
    coordDateFieldFilter,
    selectedEmpresaIds,
    selectedAgentIds,
    customDateRange,
    loadDashboardData, 
    loadAdminLeadsPage,
    loadCoordLeadsPage,
    loadAgentLeadsPage,
    setTimeFilter,
    setDateFieldFilter,
    setCoordDateFieldFilter,
    setSelectedEmpresaIds,
    setSelectedAgentIds,
    setCustomDateRange,
    isInitialized 
  } = useDashboardStore()

  // Estado para el selector de fechas personalizadas
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')

  // Estado para el modal de empresas
  const [showEmpresaModal, setShowEmpresaModal] = useState(false)
  const [empresas, setEmpresas] = useState<Company[]>([])
  const [empresasLoading, setEmpresasLoading] = useState(false)
  const [empresaSearch, setEmpresaSearch] = useState('')
  const [tempSelectedEmpresaIds, setTempSelectedEmpresaIds] = useState<number[]>([])

  // Estado para el modal de agentes (coordinador)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [agents, setAgents] = useState<DatabaseProfile[]>([])
  const [agentsLoading, setAgentsLoading] = useState(false)
  const [agentSearch, setAgentSearch] = useState('')
  const [tempSelectedAgentIds, setTempSelectedAgentIds] = useState<string[]>([])

  // Estado para el modal de exportación
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFilename, setExportFilename] = useState('')
  const [exportLeads, setExportLeads] = useState<AdminExportLead[] | CoordExportLead[]>([])
  const [exportLoading, setExportLoading] = useState(false)

  // Cargar datos del dashboard cuando el componente se monte
  useEffect(() => {
    if (!user) return

    let isReady = true
    const loadData = async () => {
      if (isReady) {
        try {
          await loadDashboardData()
        } catch (error) {
          console.error('Error loading dashboard data:', error)
        }
      }
    }

    loadData()

    return () => {
      isReady = false
    }
  }, [user, loadDashboardData])


  // Obtener el texto del período de tiempo actual
  const getTimeRangeText = () => {
    const now = new Date()
    
    switch (timeFilter) {
      case 'hoy': {
        const day = now.getDate().toString().padStart(2, '0')
        const month = (now.getMonth() + 1).toString().padStart(2, '0')
        const year = now.getFullYear()
        return `${day}/${month}/${year}`
      }
      case 'semana': {
        const endDate = new Date(now)
        const startDate = new Date(now)
        startDate.setDate(now.getDate() - 7)
        
        const startDay = startDate.getDate().toString().padStart(2, '0')
        const startMonth = (startDate.getMonth() + 1).toString().padStart(2, '0')
        const startYear = startDate.getFullYear()
        
        const endDay = endDate.getDate().toString().padStart(2, '0')
        const endMonth = (endDate.getMonth() + 1).toString().padStart(2, '0')
        const endYear = endDate.getFullYear()
        
        return `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`
      }
      case 'mes': {
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
        return monthNames[now.getMonth()]
      }
      case 'año': {
        return now.getFullYear().toString()
      }
      case 'personalizado': {
        if (customDateRange) {
          const start = new Date(customDateRange.startDate)
          const end = new Date(customDateRange.endDate)
          
          const startDay = start.getDate().toString().padStart(2, '0')
          const startMonth = (start.getMonth() + 1).toString().padStart(2, '0')
          const startYear = start.getFullYear()
          
          const endDay = end.getDate().toString().padStart(2, '0')
          const endMonth = (end.getMonth() + 1).toString().padStart(2, '0')
          const endYear = end.getFullYear()
          
          return `${startDay}/${startMonth}/${startYear} - ${endDay}/${endMonth}/${endYear}`
        }
        return 'Selecciona fechas'
      }
      default:
        return ''
    }
  }

  // Manejar la aplicación de fechas personalizadas
  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      setCustomDateRange({ startDate: customStartDate, endDate: customEndDate })
      setShowDatePicker(false)
    }
  }

  // Abrir modal de empresas
  const handleOpenEmpresaModal = async () => {
    setShowEmpresaModal(true)
    setTempSelectedEmpresaIds(selectedEmpresaIds)
    setEmpresaSearch('')
    
    if (empresas.length === 0) {
      setEmpresasLoading(true)
      try {
        const allEmpresas = await companyService.getCompanies()
        // Filtrar solo empresas activas
        setEmpresas(allEmpresas.filter(e => e.activa))
      } catch (error) {
        console.error('Error loading companies:', error)
      } finally {
        setEmpresasLoading(false)
      }
    }
  }

  // Manejar selección de empresa
  const handleToggleEmpresa = (empresaId: number) => {
    setTempSelectedEmpresaIds(prev => 
      prev.includes(empresaId)
        ? prev.filter(id => id !== empresaId)
        : [...prev, empresaId]
    )
  }

  // Aplicar filtro de empresas
  const handleApplyEmpresaFilter = () => {
    setSelectedEmpresaIds(tempSelectedEmpresaIds)
    setShowEmpresaModal(false)
  }

  // Limpiar filtro de empresas
  const handleClearEmpresaFilter = () => {
    setTempSelectedEmpresaIds([])
  }

  // Filtrar empresas por búsqueda
  const filteredEmpresas = empresas.filter(e => 
    e.nombre.toLowerCase().includes(empresaSearch.toLowerCase())
  )

  // Abrir modal de agentes (para coordinador)
  const handleOpenAgentModal = async () => {
    setShowAgentModal(true)
    setTempSelectedAgentIds(selectedAgentIds)
    setAgentSearch('')
    
    if (agents.length === 0 && userEmpresaId) {
      setAgentsLoading(true)
      try {
        const companyUsers = await getUsersByCompany(userEmpresaId)
        // Filtrar solo agentes (rol === 'agente')
        setAgents(companyUsers.filter(u => u.rol === 'agente'))
      } catch (error) {
        console.error('Error loading agents:', error)
      } finally {
        setAgentsLoading(false)
      }
    }
  }

  // Manejar selección de agente
  const handleToggleAgent = (agentId: string) => {
    setTempSelectedAgentIds(prev => 
      prev.includes(agentId)
        ? prev.filter(id => id !== agentId)
        : [...prev, agentId]
    )
  }

  // Aplicar filtro de agentes
  const handleApplyAgentFilter = () => {
    setSelectedAgentIds(tempSelectedAgentIds)
    setShowAgentModal(false)
  }

  // Limpiar filtro de agentes
  const handleClearAgentFilter = () => {
    setTempSelectedAgentIds([])
  }

  // Filtrar agentes por búsqueda
  const filteredAgents = agents.filter(a => 
    (a.nombre?.toLowerCase() || '').includes(agentSearch.toLowerCase()) ||
    (a.email?.toLowerCase() || '').includes(agentSearch.toLowerCase())
  )

  // Función auxiliar para obtener el rango de fechas actual
  const getDateRangeForExport = (): { startDate: string; endDate: string } => {
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const endDate = endOfDay.toISOString()
    
    switch (timeFilter) {
      case 'hoy': {
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        return { startDate: startOfDay.toISOString(), endDate }
      }
      case 'semana': {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - 7)
        startOfWeek.setHours(0, 0, 0, 0)
        return { startDate: startOfWeek.toISOString(), endDate }
      }
      case 'mes': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        return { startDate: startOfMonth.toISOString(), endDate }
      }
      case 'año': {
        const startOfYear = new Date(now.getFullYear(), 0, 1)
        return { startDate: startOfYear.toISOString(), endDate }
      }
      case 'personalizado': {
        if (customDateRange) {
          const customStart = new Date(customDateRange.startDate)
          customStart.setHours(0, 0, 0, 0)
          const customEnd = new Date(customDateRange.endDate)
          customEnd.setHours(23, 59, 59, 999)
          return { startDate: customStart.toISOString(), endDate: customEnd.toISOString() }
        }
        return { startDate: '', endDate: '' }
      }
      default:
        return { startDate: '', endDate: '' }
    }
  }

  // Abrir modal de exportación
  const handleOpenExportModal = async () => {
    setShowExportModal(true)
    setExportFilename('')
    setExportLoading(true)
    
    const { startDate, endDate } = getDateRangeForExport()
    
    try {
      if (isAdmin) {
        const empresaIdsToUse = selectedEmpresaIds.length > 0 ? selectedEmpresaIds : undefined
        const leads = await leadsService.getAdminDashboardLeadsForExport(
          startDate, 
          endDate, 
          dateFieldFilter, 
          empresaIdsToUse
        )
        setExportLeads(leads)
      } else if (isCoord && userEmpresaId) {
        const agentIdsToUse = selectedAgentIds.length > 0 ? selectedAgentIds : undefined
        const leads = await leadsService.getCoordDashboardLeadsForExport(
          startDate, 
          endDate, 
          coordDateFieldFilter, 
          userEmpresaId, 
          agentIdsToUse
        )
        setExportLeads(leads)
      }
    } catch (error) {
      console.error('Error loading leads for export:', error)
      setExportLeads([])
    } finally {
      setExportLoading(false)
    }
  }

  // Formatear fecha para CSV
  const formatDateForCSV = (dateStr: string | null | undefined): string => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Escapar valor para CSV
  const escapeCSV = (value: string | null | undefined, isPhone: boolean = false): string => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    
    // Para teléfonos, usar formato ="valor" para forzar a Excel a tratarlo como texto
    // Esto preserva el signo + y evita que Excel lo interprete como número
    if (isPhone) {
      return `="${str.replace(/"/g, '""')}"`
    }
    
    // Si contiene comas, comillas o saltos de línea, envolver en comillas
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  // Generar y descargar CSV
  const handleExportCSV = () => {
    if (!exportFilename.trim()) return
    
    let csvContent = ''
    const BOM = '\uFEFF' // BOM para Excel reconozca UTF-8
    
    if (isAdmin) {
      // Headers para admin
      const headers = [
        'Nombre',
        'Teléfono',
        'Fecha Entrada',
        'Fecha Asignación',
        'Fecha Asignación Usuario',
        'Empresa',
        'Usuario',
        'Hub',
        'Plataforma',
        'Estado',
        'Observaciones',
        'Campaña'
      ]
      csvContent = headers.join(',') + '\n'
      
      // Datos para admin
      const adminLeadsExport = exportLeads as AdminExportLead[]
      adminLeadsExport.forEach(lead => {
        const row = [
          escapeCSV(lead.nombre_cliente),
          escapeCSV(lead.telefono, true),
          escapeCSV(formatDateForCSV(lead.fecha_entrada)),
          escapeCSV(formatDateForCSV(lead.fecha_asignacion)),
          escapeCSV(formatDateForCSV(lead.fecha_asignacion_usuario)),
          escapeCSV(lead.empresa_nombre || 'Sin Empresa'),
          escapeCSV(lead.usuario_nombre || 'Sin usuario'),
          escapeCSV(lead.hub_nombre || 'Sin Hub'),
          escapeCSV(lead.plataforma || 'Sin plataforma'),
          escapeCSV(formatEstado(lead.estado_temporal) || 'Sin Tratar'),
          escapeCSV(lead.observaciones || ''),
          escapeCSV(lead.campaña_nombre || 'Sin Campaña')
        ]
        csvContent += row.join(',') + '\n'
      })
    } else if (isCoord) {
      // Headers para coordinador
      const headers = [
        'Nombre',
        'Teléfono',
        'Fecha',
        'Fecha Asignación Usuario',
        'Usuario',
        'Estado',
        'Observaciones'
      ]
      csvContent = headers.join(',') + '\n'
      
      // Datos para coordinador
      const coordLeadsExport = exportLeads as CoordExportLead[]
      coordLeadsExport.forEach(lead => {
        const row = [
          escapeCSV(lead.nombre_cliente),
          escapeCSV(lead.telefono, true),
          escapeCSV(formatDateForCSV(lead.fecha_asignacion)),
          escapeCSV(formatDateForCSV(lead.fecha_asignacion_usuario)),
          escapeCSV(lead.usuario_nombre || 'Sin usuario'),
          escapeCSV(formatEstado(lead.estado_temporal) || 'Sin Tratar'),
          escapeCSV(lead.observaciones || '')
        ]
        csvContent += row.join(',') + '\n'
      })
    }
    
    // Crear blob y descargar
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${exportFilename.trim()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // Cerrar modal
    setShowExportModal(false)
    setExportFilename('')
    setExportLeads([])
  }

  // Verificar si es administrador
  const isAdmin = user?.rol === 'administrador'
  
  // Verificar si es coordinador
  const isCoord = user?.rol === 'coordinador'
  
  // Verificar si es agente
  const isAgent = user?.rol === 'agente'
  
  // Cards de estadísticas para administrador
  const adminStatsCards = isAdmin ? [
    {
      title: 'Total Leads',
      value: adminStats.totalLeads.toString(),
      icon: '📊',
      color: 'bg-blue-500'
    },
    {
      title: 'Leads Convertidos',
      value: adminStats.leadsConvertidos.toString(),
      icon: '✅',
      color: 'bg-[#18cb96]'
    },
    {
      title: 'Leads Perdidos',
      value: adminStats.leadsPerdidos.toString(),
      icon: '❌',
      color: 'bg-white'
    },
    {
      title: 'Leads Sin Asignar',
      value: adminStats.leadsSinAsignar.toString(),
      icon: '⏳',
      color: 'bg-amber-500'
    },
    {
      title: 'Leads Inválidos',
      value: adminStats.leadsInvalidos.toString(),
      icon: '⚠️',
      color: 'bg-gray-500'
    }
  ] : []

  // Cards de estadísticas para coordinador (sin "Leads Sin Asignar")
  const coordStatsCards = isCoord ? [
    {
      title: 'Total Leads',
      value: coordStats.totalLeads.toString(),
      icon: '📊',
      color: 'bg-blue-500'
    },
    {
      title: 'Leads Convertidos',
      value: coordStats.leadsConvertidos.toString(),
      icon: '✅',
      color: 'bg-[#18cb96]'
    },
    {
      title: 'Leads Perdidos',
      value: coordStats.leadsPerdidos.toString(),
      icon: '❌',
      color: 'bg-white'
    },
    {
      title: 'Leads Inválidos',
      value: coordStats.leadsInvalidos.toString(),
      icon: '⚠️',
      color: 'bg-gray-500'
    }
  ] : []

  // Cards de estadísticas para agente
  const agentStatsCards = isAgent ? [
    {
      title: 'Total Leads',
      value: agentStats.totalLeads.toString(),
      icon: '📊',
      color: 'bg-blue-500'
    },
    {
      title: 'Leads Convertidos',
      value: agentStats.leadsConvertidos.toString(),
      icon: '✅',
      color: 'bg-[#18cb96]'
    },
    {
      title: 'Leads Perdidos',
      value: agentStats.leadsPerdidos.toString(),
      icon: '❌',
      color: 'bg-white'
    },
    {
      title: 'Leads Inválidos',
      value: agentStats.leadsInvalidos.toString(),
      icon: '⚠️',
      color: 'bg-gray-500'
    }
  ] : []

  if (!isInitialized || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando dashboard...</span>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          {user?.rol === 'administrador'
            ? 'Bienvenido a ScaleHubs - Resumen general del sistema'
            : `Bienvenido a ScaleHubs - Resumen de ${userEmpresaNombre || user?.empresa || 'tu empresa'}`
          }
        </p>
        {user?.rol === 'administrador' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs">
              👑 <strong>Modo Administrador:</strong> Visualizando estadísticas de todo el sistema
            </p>
          </div>
        )}
      </div>

      {/* Filtros de tiempo para administrador */}
      {isAdmin && (
        <div className="mb-4 sm:mb-6 space-y-3">
          {/* Selector de campo de fecha - Primera fila en móvil */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setDateFieldFilter('fecha_entrada')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  dateFieldFilter === 'fecha_entrada'
                    ? 'bg-white text-[#373643] shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Fecha Entrada
              </button>
              <button
                onClick={() => setDateFieldFilter('fecha_asignacion')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  dateFieldFilter === 'fecha_asignacion'
                    ? 'bg-white text-[#373643] shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Fecha Asignación
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-gray-300"></div>

            {/* Período actual - visible en móvil */}
            <div className="flex items-center gap-2 sm:hidden">
              <span className="text-xs text-gray-500">Período:</span>
              <span className="text-xs font-semibold text-[#373643]">
                {getTimeRangeText()}
              </span>
            </div>
          </div>

          {/* Filtros de tiempo - Segunda fila */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mes' },
              { key: 'año', label: 'Año' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key as 'hoy' | 'semana' | 'mes' | 'año')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  timeFilter === key
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            
            {/* Botón de fecha personalizada */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                  timeFilter === 'personalizado'
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>📅</span>
                <span className="hidden xs:inline">Personalizado</span>
              </button>
              
              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-1/2 sm:top-full left-auto sm:left-0 -translate-y-1/2 sm:translate-y-0 sm:mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 sm:min-w-[300px]">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha inicio
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleApplyCustomDates}
                        disabled={!customStartDate || !customEndDate}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#18cb96] rounded-lg hover:bg-[#15b585] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Período - solo visible en desktop */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-semibold text-[#373643]">
                {getTimeRangeText()}
              </span>
            </div>

            {/* Spacer para empujar el botón Empresa a la derecha */}
            <div className="flex-1"></div>

            {/* Botón de filtro por Empresa */}
            <button
              onClick={handleOpenEmpresaModal}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                selectedEmpresaIds.length > 0
                  ? 'bg-[#18cb96] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>🏢</span>
              <span>Empresa</span>
              {selectedEmpresaIds.length > 0 && (
                <span className="bg-white text-[#18cb96] text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {selectedEmpresaIds.length}
                </span>
              )}
            </button>

            {/* Botón de exportar */}
            <button
              onClick={handleOpenExportModal}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 bg-blue-500 text-white hover:bg-blue-600"
            >
              <span>📥</span>
              <span>Exportar</span>
            </button>
          </div>
        </div>
      )}

      {/* Filtros de tiempo para coordinador */}
      {isCoord && (
        <div className="mb-4 sm:mb-6 space-y-3">
          {/* Selector de campo de fecha - Primera fila en móvil */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-lg p-1 w-full sm:w-auto">
              <button
                onClick={() => setCoordDateFieldFilter('fecha_asignacion')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  coordDateFieldFilter === 'fecha_asignacion'
                    ? 'bg-white text-[#373643] shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Fecha Entrada
              </button>
              <button
                onClick={() => setCoordDateFieldFilter('fecha_asignacion_usuario')}
                className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                  coordDateFieldFilter === 'fecha_asignacion_usuario'
                    ? 'bg-white text-[#373643] shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Fecha asignación
              </button>
            </div>

            <div className="hidden sm:block h-6 w-px bg-gray-300"></div>

            {/* Período actual - visible en móvil */}
            <div className="flex items-center gap-2 sm:hidden">
              <span className="text-xs text-gray-500">Período:</span>
              <span className="text-xs font-semibold text-[#373643]">
                {getTimeRangeText()}
              </span>
            </div>
          </div>

          {/* Filtros de tiempo - Segunda fila */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mes' },
              { key: 'año', label: 'Año' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key as 'hoy' | 'semana' | 'mes' | 'año')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  timeFilter === key
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            
            {/* Botón de fecha personalizada */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                  timeFilter === 'personalizado'
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>📅</span>
                <span className="hidden xs:inline">Personalizado</span>
              </button>
              
              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-1/2 sm:top-full left-auto sm:left-0 -translate-y-1/2 sm:translate-y-0 sm:mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 sm:min-w-[300px]">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha inicio
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleApplyCustomDates}
                        disabled={!customStartDate || !customEndDate}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#18cb96] rounded-lg hover:bg-[#15b585] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Período - solo visible en desktop */}
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-semibold text-[#373643]">
                {getTimeRangeText()}
              </span>
            </div>

            {/* Spacer para empujar el botón Agente a la derecha */}
            <div className="flex-1"></div>

            {/* Botón de filtro por Agente */}
            <button
              onClick={handleOpenAgentModal}
              className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                selectedAgentIds.length > 0
                  ? 'bg-[#18cb96] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>👤</span>
              <span>Agente</span>
              {selectedAgentIds.length > 0 && (
                <span className="bg-white text-[#18cb96] text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold">
                  {selectedAgentIds.length}
                </span>
              )}
            </button>

            {/* Botón de exportar */}
            <button
              onClick={handleOpenExportModal}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 bg-blue-500 text-white hover:bg-blue-600"
            >
              <span>📥</span>
              <span>Exportar</span>
            </button>
          </div>
        </div>
      )}

      {/* Filtros de tiempo para agente */}
      {isAgent && (
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mes' },
              { key: 'año', label: 'Año' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key as 'hoy' | 'semana' | 'mes' | 'año')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                  timeFilter === key
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            
            {/* Botón de fecha personalizada */}
            <div className="relative">
              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center gap-1 sm:gap-2 ${
                  timeFilter === 'personalizado'
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>📅</span>
                <span className="hidden xs:inline">Personalizado</span>
              </button>
              
              {/* Date Picker Dropdown */}
              {showDatePicker && (
                <div className="fixed sm:absolute inset-x-4 sm:inset-x-auto top-1/2 sm:top-full left-auto sm:left-0 -translate-y-1/2 sm:translate-y-0 sm:mt-2 p-4 bg-white rounded-lg shadow-lg border border-gray-200 z-50 sm:min-w-[300px]">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha inicio
                      </label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha fin
                      </label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleApplyCustomDates}
                        disabled={!customStartDate || !customEndDate}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#18cb96] rounded-lg hover:bg-[#15b585] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Aplicar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Período */}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-gray-500">•</span>
              <span className="text-xs sm:text-sm font-semibold text-[#373643]">
                {getTimeRangeText()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards para Administrador */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          {adminStatsCards.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg shadow-md p-2.5 sm:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#18cb96] border-2 border-transparent cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600 truncate group-hover:text-[#18cb96] transition-colors">{stat.title}</p>
                  <p className="text-base sm:text-xl font-bold text-[#373643] mt-0.5 sm:mt-1">{stat.value}</p>
                </div>
                <div className={`w-7 h-7 sm:w-10 sm:h-10 ${stat.color} rounded-lg flex items-center justify-center text-white text-sm sm:text-lg flex-shrink-0 ml-2 transition-transform group-hover:scale-110`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards para Coordinador */}
      {isCoord && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          {coordStatsCards.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg shadow-md p-2.5 sm:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#18cb96] border-2 border-transparent cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600 truncate group-hover:text-[#18cb96] transition-colors">{stat.title}</p>
                  <p className="text-base sm:text-xl font-bold text-[#373643] mt-0.5 sm:mt-1">{stat.value}</p>
                </div>
                <div className={`w-7 h-7 sm:w-10 sm:h-10 ${stat.color} rounded-lg flex items-center justify-center text-white text-sm sm:text-lg flex-shrink-0 ml-2 transition-transform group-hover:scale-110`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats Cards para Agente */}
      {isAgent && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          {agentStatsCards.map((stat, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg shadow-md p-2.5 sm:p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#18cb96] border-2 border-transparent cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-xs font-medium text-gray-600 truncate group-hover:text-[#18cb96] transition-colors">{stat.title}</p>
                  <p className="text-base sm:text-xl font-bold text-[#373643] mt-0.5 sm:mt-1">{stat.value}</p>
                </div>
                <div className={`w-7 h-7 sm:w-10 sm:h-10 ${stat.color} rounded-lg flex items-center justify-center text-white text-sm sm:text-lg flex-shrink-0 ml-2 transition-transform group-hover:scale-110`}>
                  {stat.icon}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Panel de Lista de Leads para Agente */}
      {isAgent && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header con gradiente verde */}
          <div className="bg-gradient-to-r from-[#18cb96] to-[#15b585] p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">📋</span>
                <h2 className="text-sm sm:text-lg font-semibold text-white">Mis Leads</h2>
              </div>
              <span className="text-[10px] sm:text-xs text-white/80 bg-white/20 px-2 py-1 rounded-full">
                {agentLeadsTotalCount} leads encontrados
              </span>
            </div>
          </div>
          
          <div className="p-3 sm:p-4">
          {agentLeads.length > 0 ? (
            <>
              {/* Vista móvil - Cards */}
              <div className="sm:hidden max-h-[300px] overflow-y-auto space-y-2">
                {agentLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2.5 border-l-4 border-[#18cb96] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#373643] truncate">
                          {lead.nombre_cliente}
                        </p>
                      </div>
                      <span className="ml-2 px-1.5 py-0.5 bg-[#18cb96]/10 text-[#18cb96] text-[9px] rounded font-medium flex-shrink-0">
                        {lead.telefono}
                      </span>
                    </div>
                    <div className="text-[9px]">
                      <div className="bg-gray-100/50 rounded p-1">
                        <span className="text-gray-400">Fecha asignación:</span>
                        <p className="text-gray-700 font-medium">
                          {lead.fecha_asignacion_usuario ? new Date(lead.fecha_asignacion_usuario).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop - Tabla */}
              <div className="hidden sm:block overflow-x-auto max-h-[350px] overflow-y-auto border border-[#18cb96]/20 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-[#e8faf5] to-[#f0fdf9] sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Teléfono
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Fecha Asignación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {agentLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-[#18cb96]/5 transition-colors group"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-[#373643] font-medium group-hover:text-[#18cb96] transition-colors">
                          {lead.nombre_cliente}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                          {lead.telefono}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                          {lead.fecha_asignacion_usuario ? new Date(lead.fecha_asignacion_usuario).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {agentLeadsTotalCount > 10 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-3 border-t border-[#18cb96]/20">
                  <div className="text-[10px] sm:text-xs text-gray-600 order-2 sm:order-1">
                    <span className="text-[#18cb96] font-semibold">{((agentLeadsPage - 1) * 10) + 1} - {Math.min(agentLeadsPage * 10, agentLeadsTotalCount)}</span>
                    <span className="text-gray-400"> de </span>
                    <span className="text-[#373643] font-medium">{agentLeadsTotalCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => loadAgentLeadsPage(agentLeadsPage - 1)}
                      disabled={agentLeadsPage === 1}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 rounded-lg hover:bg-[#18cb96]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-[#18cb96] rounded-lg">
                      {agentLeadsPage} / {Math.ceil(agentLeadsTotalCount / 10)}
                    </span>
                    <button
                      onClick={() => loadAgentLeadsPage(agentLeadsPage + 1)}
                      disabled={agentLeadsPage >= Math.ceil(agentLeadsTotalCount / 10)}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 rounded-lg hover:bg-[#18cb96]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#18cb96]/10 rounded-full mb-3">
                <span className="text-2xl">📭</span>
              </div>
              <p className="text-gray-600 text-sm font-medium">No hay leads en este período</p>
              <p className="text-xs text-gray-400 mt-1">Cambia el filtro de tiempo para ver más datos</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Panel de Distribución por Plataforma para Administrador */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
          <h2 className="text-sm sm:text-lg font-semibold text-[#373643] mb-3">Distribución por Plataforma</h2>
          {Object.keys(adminStats.platformDistribution).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
              {Object.entries(adminStats.platformDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([platform, count], index) => {
                const percentage = adminStats.totalLeads > 0 ? Math.round((count / adminStats.totalLeads) * 100) : 0
                const colors = ['bg-blue-500', 'bg-[#18cb96]', 'bg-purple-500', 'bg-orange-500', 'bg-red-500', 'bg-indigo-500', 'bg-pink-500', 'bg-teal-500']
                const color = colors[index % colors.length]

                return (
                  <div key={platform} className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center flex-1 min-w-0">
                      <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${color} rounded-full mr-1.5 sm:mr-2 flex-shrink-0`}></div>
                      <span className="text-[#373643] text-[10px] sm:text-xs truncate">{platform}</span>
                    </div>
                    <div className="text-right flex-shrink-0 ml-1">
                      <span className="font-semibold text-[#373643] text-[10px] sm:text-xs">{percentage}%</span>
                      <span className="text-[9px] sm:text-[10px] text-gray-500 ml-0.5">({count})</span>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-xs sm:text-sm">No hay datos de plataformas en este período</p>
          )}
        </div>
      )}

      {/* Panel de Lista de Leads para Coordinador */}
      {isCoord && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4 sm:mb-6">
          {/* Header con gradiente verde */}
          <div className="bg-gradient-to-r from-[#18cb96] to-[#15b585] p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">📋</span>
                <h2 className="text-sm sm:text-lg font-semibold text-white">Listado de Leads</h2>
              </div>
              <span className="text-[10px] sm:text-xs text-white/80 bg-white/20 px-2 py-1 rounded-full">
                {coordLeadsTotalCount} leads encontrados
              </span>
            </div>
          </div>
          
          <div className="p-3 sm:p-4">
          {coordLeads.length > 0 ? (
            <>
              {/* Vista móvil - Cards */}
              <div className="sm:hidden max-h-[300px] overflow-y-auto space-y-2">
                {coordLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2.5 border-l-4 border-[#18cb96] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#373643] truncate">
                          {lead.nombre_cliente}
                        </p>
                        <p className="text-[10px] text-[#18cb96] font-medium truncate">
                          {lead.usuario_nombre || 'Sin asignar'}
                        </p>
                      </div>
                      <span className="ml-2 px-1.5 py-0.5 bg-[#18cb96]/10 text-[#18cb96] text-[9px] rounded font-medium flex-shrink-0">
                        {lead.telefono}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className="bg-gray-100/50 rounded p-1">
                        <span className="text-gray-400">Fecha:</span>
                        <p className="text-gray-700 font-medium">
                          {lead.fecha_asignacion ? new Date(lead.fecha_asignacion).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                      <div className="bg-gray-100/50 rounded p-1">
                        <span className="text-gray-400">F. Agente:</span>
                        <p className="text-gray-700 font-medium">
                          {lead.fecha_asignacion_usuario ? new Date(lead.fecha_asignacion_usuario).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop - Tabla */}
              <div className="hidden sm:block overflow-x-auto max-h-[350px] overflow-y-auto border border-[#18cb96]/20 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-[#e8faf5] to-[#f0fdf9] sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Agente
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Teléfono
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        F. Agente
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {coordLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-[#18cb96]/5 transition-colors group"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-[#373643] font-medium group-hover:text-[#18cb96] transition-colors">
                          {lead.nombre_cliente}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[#18cb96]/10 text-[#18cb96] font-medium">
                            {lead.usuario_nombre || 'Sin asignar'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                          {lead.telefono}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                          {lead.fecha_asignacion ? new Date(lead.fecha_asignacion).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                          {lead.fecha_asignacion_usuario ? new Date(lead.fecha_asignacion_usuario).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {coordLeadsTotalCount > 10 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-3 border-t border-[#18cb96]/20">
                  <div className="text-[10px] sm:text-xs text-gray-600 order-2 sm:order-1">
                    <span className="text-[#18cb96] font-semibold">{((coordLeadsPage - 1) * 10) + 1} - {Math.min(coordLeadsPage * 10, coordLeadsTotalCount)}</span>
                    <span className="text-gray-400"> de </span>
                    <span className="text-[#373643] font-medium">{coordLeadsTotalCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => loadCoordLeadsPage(coordLeadsPage - 1)}
                      disabled={coordLeadsPage === 1}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 rounded-lg hover:bg-[#18cb96]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-[#18cb96] rounded-lg">
                      {coordLeadsPage} / {Math.ceil(coordLeadsTotalCount / 10)}
                    </span>
                    <button
                      onClick={() => loadCoordLeadsPage(coordLeadsPage + 1)}
                      disabled={coordLeadsPage >= Math.ceil(coordLeadsTotalCount / 10)}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 rounded-lg hover:bg-[#18cb96]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#18cb96]/10 rounded-full mb-3">
                <span className="text-2xl">📭</span>
              </div>
              <p className="text-gray-600 text-sm font-medium">No hay leads en este período</p>
              <p className="text-xs text-gray-400 mt-1">Cambia el filtro de tiempo para ver más datos</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Panel de Lista de Leads para Administrador */}
      {isAdmin && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header con gradiente verde */}
          <div className="bg-gradient-to-r from-[#18cb96] to-[#15b585] p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
              <div className="flex items-center gap-2">
                <span className="text-white text-lg">📋</span>
                <h2 className="text-sm sm:text-lg font-semibold text-white">Listado de Leads</h2>
              </div>
              <span className="text-[10px] sm:text-xs text-white/80 bg-white/20 px-2 py-1 rounded-full">
                {adminLeadsTotalCount} leads encontrados
              </span>
            </div>
          </div>
          
          <div className="p-3 sm:p-4">
          {adminLeads.length > 0 ? (
            <>
              {/* Vista móvil - Cards */}
              <div className="sm:hidden max-h-[300px] overflow-y-auto space-y-2">
                {adminLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="bg-gradient-to-r from-gray-50 to-white rounded-lg p-2.5 border-l-4 border-[#18cb96] shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-[#373643] truncate">
                          {lead.nombre_cliente}
                        </p>
                        <p className="text-[10px] text-[#18cb96] font-medium truncate">
                          {lead.empresa_nombre || 'Sin asignar'}
                        </p>
                      </div>
                      <span className="ml-2 px-1.5 py-0.5 bg-[#18cb96]/10 text-[#18cb96] text-[9px] rounded font-medium flex-shrink-0">
                        {lead.telefono}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className="bg-gray-100/50 rounded p-1">
                        <span className="text-gray-400">Entrada:</span>
                        <p className="text-gray-700 font-medium">
                          {lead.fecha_entrada ? new Date(lead.fecha_entrada).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                      <div className="bg-gray-100/50 rounded p-1">
                        <span className="text-gray-400">Asignación:</span>
                        <p className="text-gray-700 font-medium">
                          {lead.fecha_asignacion ? new Date(lead.fecha_asignacion).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          }) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Vista desktop - Tabla */}
              <div className="hidden sm:block overflow-x-auto max-h-[350px] overflow-y-auto border border-[#18cb96]/20 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-[#e8faf5] to-[#f0fdf9] sticky top-0">
                    <tr>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Empresa
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        Teléfono
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        F. Entrada
                      </th>
                      <th scope="col" className="px-3 py-2.5 text-left text-[10px] font-semibold text-[#18cb96] uppercase tracking-wider">
                        F. Asignación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {adminLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className="hover:bg-[#18cb96]/5 transition-colors group"
                      >
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-[#373643] font-medium group-hover:text-[#18cb96] transition-colors">
                          {lead.nombre_cliente}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-[#18cb96]/10 text-[#18cb96] font-medium">
                            {lead.empresa_nombre || 'Sin asignar'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-600 font-mono">
                          {lead.telefono}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                          {lead.fecha_entrada ? new Date(lead.fecha_entrada).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                          {lead.fecha_asignacion ? new Date(lead.fecha_asignacion).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {adminLeadsTotalCount > 10 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mt-3 pt-3 border-t border-[#18cb96]/20">
                  <div className="text-[10px] sm:text-xs text-gray-600 order-2 sm:order-1">
                    <span className="text-[#18cb96] font-semibold">{((adminLeadsPage - 1) * 10) + 1} - {Math.min(adminLeadsPage * 10, adminLeadsTotalCount)}</span>
                    <span className="text-gray-400"> de </span>
                    <span className="text-[#373643] font-medium">{adminLeadsTotalCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 order-1 sm:order-2">
                    <button
                      onClick={() => loadAdminLeadsPage(adminLeadsPage - 1)}
                      disabled={adminLeadsPage === 1}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 rounded-lg hover:bg-[#18cb96]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Anterior
                    </button>
                    <span className="px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-white bg-[#18cb96] rounded-lg">
                      {adminLeadsPage} / {Math.ceil(adminLeadsTotalCount / 10)}
                    </span>
                    <button
                      onClick={() => loadAdminLeadsPage(adminLeadsPage + 1)}
                      disabled={adminLeadsPage >= Math.ceil(adminLeadsTotalCount / 10)}
                      className="px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium text-[#18cb96] bg-[#18cb96]/10 rounded-lg hover:bg-[#18cb96]/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-[#18cb96]/10 rounded-full mb-3">
                <span className="text-2xl">📭</span>
              </div>
              <p className="text-gray-600 text-sm font-medium">No hay leads en este período</p>
              <p className="text-xs text-gray-400 mt-1">Cambia el filtro de tiempo para ver más datos</p>
            </div>
          )}
          </div>
        </div>
      )}

      {/* Modal de selección de empresas */}
      {showEmpresaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header del modal */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#373643]">Filtrar por Empresa</h3>
                <button
                  onClick={() => setShowEmpresaModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Buscador */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={empresaSearch}
                  onChange={(e) => setEmpresaSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Contador de seleccionados */}
              {tempSelectedEmpresaIds.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    {tempSelectedEmpresaIds.length} empresa{tempSelectedEmpresaIds.length !== 1 ? 's' : ''} seleccionada{tempSelectedEmpresaIds.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={handleClearEmpresaFilter}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Limpiar selección
                  </button>
                </div>
              )}
            </div>
            
            {/* Lista de empresas */}
            <div className="flex-1 overflow-y-auto p-2">
              {empresasLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#18cb96]"></div>
                  <span className="ml-2 text-gray-500 text-sm">Cargando empresas...</span>
                </div>
              ) : filteredEmpresas.length > 0 ? (
                <div className="space-y-1">
                  {filteredEmpresas.map((empresa) => (
                    <button
                      key={empresa.id}
                      onClick={() => handleToggleEmpresa(empresa.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                        tempSelectedEmpresaIds.includes(empresa.id)
                          ? 'bg-[#e8faf5] border-2 border-[#18cb96]'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          tempSelectedEmpresaIds.includes(empresa.id) ? 'text-[#18cb96]' : 'text-[#373643]'
                        }`}>
                          {empresa.nombre}
                        </p>
                        <p className={`text-xs truncate ${tempSelectedEmpresaIds.includes(empresa.id) ? 'text-[#15b585]' : 'text-gray-500'}`}>CIF: {empresa.cif}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                        tempSelectedEmpresaIds.includes(empresa.id)
                          ? 'bg-[#18cb96] text-white'
                          : 'bg-gray-200'
                      }`}>
                        {tempSelectedEmpresaIds.includes(empresa.id) && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No se encontraron empresas</p>
                </div>
              )}
            </div>
            
            {/* Footer del modal */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowEmpresaModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyEmpresaFilter}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#18cb96] rounded-lg hover:bg-[#15b585] transition-colors"
              >
                Aplicar filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de selección de agentes (para coordinador) */}
      {showAgentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Header del modal */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#373643]">Filtrar por Agente</h3>
                <button
                  onClick={() => setShowAgentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Buscador */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar agente..."
                  value={agentSearch}
                  onChange={(e) => setAgentSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                />
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              
              {/* Contador de seleccionados */}
              {tempSelectedAgentIds.length > 0 && (
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-gray-500">
                    {tempSelectedAgentIds.length} agente{tempSelectedAgentIds.length !== 1 ? 's' : ''} seleccionado{tempSelectedAgentIds.length !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={handleClearAgentFilter}
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
                  >
                    Limpiar selección
                  </button>
                </div>
              )}
            </div>
            
            {/* Lista de agentes */}
            <div className="flex-1 overflow-y-auto p-2">
              {agentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#18cb96]"></div>
                  <span className="ml-2 text-gray-500 text-sm">Cargando agentes...</span>
                </div>
              ) : filteredAgents.length > 0 ? (
                <div className="space-y-1">
                  {filteredAgents.map((agent) => (
                    <button
                      key={agent.user_id}
                      onClick={() => handleToggleAgent(agent.user_id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors text-left ${
                        tempSelectedAgentIds.includes(agent.user_id)
                          ? 'bg-[#e8faf5] border-2 border-[#18cb96]'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          tempSelectedAgentIds.includes(agent.user_id) ? 'text-[#18cb96]' : 'text-[#373643]'
                        }`}>
                          {agent.nombre || 'Sin nombre'}
                        </p>
                        <p className={`text-xs truncate ${tempSelectedAgentIds.includes(agent.user_id) ? 'text-[#15b585]' : 'text-gray-500'}`}>
                          {agent.email}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                        tempSelectedAgentIds.includes(agent.user_id)
                          ? 'bg-[#18cb96] text-white'
                          : 'bg-gray-200'
                      }`}>
                        {tempSelectedAgentIds.includes(agent.user_id) && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No se encontraron agentes</p>
                </div>
              )}
            </div>
            
            {/* Footer del modal */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAgentModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyAgentFilter}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-[#18cb96] rounded-lg hover:bg-[#15b585] transition-colors"
              >
                Aplicar filtro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de exportación */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
            {/* Header del modal */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-[#373643] flex items-center gap-2">
                  <span>📥</span>
                  Exportar Leads
                </h3>
                <button
                  onClick={() => {
                    setShowExportModal(false)
                    setExportFilename('')
                    setExportLeads([])
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Campo de nombre de archivo */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del archivo <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center">
                  <input
                    type="text"
                    placeholder="Ingresa el nombre del archivo"
                    value={exportFilename}
                    onChange={(e) => setExportFilename(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">
                    .csv
                  </span>
                </div>
              </div>
              
              {/* Contador de leads */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Leads a exportar:</span>
                <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  {exportLeads.length}
                </span>
              </div>
            </div>
            
            {/* Lista de leads */}
            <div className="flex-1 overflow-hidden p-4 min-h-0">
              {exportLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <span className="ml-3 text-gray-500">Cargando leads...</span>
                </div>
              ) : exportLeads.length > 0 ? (
                <div className="h-full max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                          Nombre
                        </th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                          Teléfono
                        </th>
                        {isAdmin && (
                          <>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                              Empresa
                            </th>
                            <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                              Plataforma
                            </th>
                          </>
                        )}
                        {isCoord && (
                          <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                            Usuario
                          </th>
                        )}
                        <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {isAdmin && (exportLeads as AdminExportLead[]).map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-900 truncate max-w-[150px]">
                            {lead.nombre_cliente}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                            {lead.telefono}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[120px]">
                            {lead.empresa_nombre || 'Sin Empresa'}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {lead.plataforma || 'Sin plataforma'}
                          </td>
                            <td className="px-3 py-2 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                lead.estado_temporal === 'convertido' ? 'bg-green-100 text-green-700' :
                                lead.estado_temporal === 'no_cerrado' ? 'bg-red-100 text-red-700' :
                                lead.estado_temporal === 'no_valido' ? 'bg-gray-100 text-gray-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {formatEstado(lead.estado_temporal) || 'Sin Tratar'}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {isCoord && (exportLeads as CoordExportLead[]).map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-xs text-gray-900 truncate max-w-[150px]">
                            {lead.nombre_cliente}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 font-mono">
                            {lead.telefono}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[120px]">
                            {lead.usuario_nombre || 'Sin usuario'}
                          </td>
                            <td className="px-3 py-2 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                lead.estado_temporal === 'convertido' ? 'bg-green-100 text-green-700' :
                                lead.estado_temporal === 'no_cerrado' ? 'bg-red-100 text-red-700' :
                                lead.estado_temporal === 'no_valido' ? 'bg-gray-100 text-gray-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {formatEstado(lead.estado_temporal) || 'Sin Tratar'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <span className="text-3xl">📭</span>
                  </div>
                  <p className="text-gray-600 font-medium">No hay leads para exportar</p>
                  <p className="text-xs text-gray-400 mt-1">Ajusta los filtros para obtener resultados</p>
                </div>
              )}
            </div>
            
            {/* Footer del modal */}
            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setShowExportModal(false)
                  setExportFilename('')
                  setExportLeads([])
                }}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExportCSV}
                disabled={!exportFilename.trim() || exportLeads.length === 0}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span>📥</span>
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard 