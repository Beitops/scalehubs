import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDashboardStore } from '../store/dashboardStore'
import { companyService, type Company } from '../services/companyService'



const Dashboard = () => {
  const { user, userEmpresaNombre } = useAuthStore()
  const { 
    loading, 
    stats, 
    adminStats,
    adminLeads,
    adminLeadsPage,
    adminLeadsTotalCount,
    timeFilter,
    dateFieldFilter,
    selectedEmpresaIds,
    customDateRange,
    rankingVendedores,
    loadDashboardData, 
    loadAdminLeadsPage,
    setTimeFilter,
    setDateFieldFilter,
    setSelectedEmpresaIds,
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

  // Usar estadísticas del store
  const { totalLeads, leadsDevueltos, leadsCerrados, platformDistribution } = stats

  // Solo mostrar estadísticas para coordinadores y agentes
  const shouldShowStats = user?.rol === 'coordinador' || user?.rol === 'agente'

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

  // Verificar si es administrador
  const isAdmin = user?.rol === 'administrador'

  // Obtener el ranking según el filtro de tiempo
  const getRankingByFilter = () => {
    switch (timeFilter) {
      case 'hoy':
        return rankingVendedores
          .filter(v => v.ventas_hoy > 0)
          .sort((a, b) => a.rank_hoy - b.rank_hoy)
          .slice(0, 5)
      case 'semana':
        return rankingVendedores
          .filter(v => v.ventas_semana > 0)
          .sort((a, b) => a.rank_semana - b.rank_semana)
          .slice(0, 5)
      case 'mes':
        return rankingVendedores
          .filter(v => v.ventas_mes > 0)
          .sort((a, b) => a.rank_mes - b.rank_mes)
          .slice(0, 5)
      case 'año':
        return rankingVendedores
          .filter(v => v.ventas_anio > 0)
          .sort((a, b) => a.rank_anio - b.rank_anio)
          .slice(0, 5)
      default:
        return []
    }
  }

  const rankingActual = getRankingByFilter()

  // Función para obtener el número de ventas según el filtro
  const getVentasByFilter = (vendedor: typeof rankingVendedores[0]) => {
    switch (timeFilter) {
      case 'hoy':
        return vendedor.ventas_hoy
      case 'semana':
        return vendedor.ventas_semana
      case 'mes':
        return vendedor.ventas_mes
      case 'año':
        return vendedor.ventas_anio
      default:
        return 0
    }
  }

  // Función para obtener el rank según el filtro
  const getRankByFilter = (vendedor: typeof rankingVendedores[0]) => {
    switch (timeFilter) {
      case 'hoy':
        return vendedor.rank_hoy
      case 'semana':
        return vendedor.rank_semana
      case 'mes':
        return vendedor.rank_mes
      case 'año':
        return vendedor.rank_anio
      default:
        return 0
    }
  }
  
  const statsCards = shouldShowStats ? [
    {
      title: 'Total de Leads',
      value: totalLeads.toString(),
      change: '',
      changeType: 'positive' as const,
      icon: '📈',
      color: 'bg-blue-500'
    },
    {
      title: 'Leads Devueltos',
      value: leadsDevueltos.toString(),
      change: '',
      changeType: 'positive' as const,
      icon: '↩️',
      color: 'bg-orange-500'
    },
    {
      title: 'Leads Cerrados',
      value: leadsCerrados.toString(),
      change: '',
      changeType: 'positive' as const,
      icon: '🎯',
      color: 'bg-purple-500'
    }
  ] : []

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
          </div>
        </div>
      )}

      {/* Filtros de tiempo para coordinadores y agentes */}
      {shouldShowStats && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {[
              { key: 'hoy', label: 'Hoy' },
              { key: 'semana', label: 'Semana' },
              { key: 'mes', label: 'Mes' },
              { key: 'año', label: 'Año' }
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTimeFilter(key as 'hoy' | 'semana' | 'mes' | 'año')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeFilter === key
                    ? 'bg-[#18cb96] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-sm text-gray-500">•</span>
              <span className="text-sm font-semibold text-[#373643]">
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

      {/* Stats Cards para Coordinadores y Agentes */}
      {shouldShowStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 lg:mb-8">
          {statsCards.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white rounded-lg shadow-md p-4 sm:p-6 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] hover:border-[#18cb96] border-2 border-transparent cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate group-hover:text-[#18cb96] transition-colors">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-[#373643] mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-lg sm:text-xl flex-shrink-0 ml-3 transition-transform group-hover:scale-110`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-3 sm:mt-4">
              {stat.change && (
                <>
                  <span className={`text-xs sm:text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                    {stat.change}
                  </span>
                  <span className="text-xs sm:text-sm text-gray-500 ml-1">vs período anterior</span>
                </>
              )}
            </div>
          </div>
        ))}
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

      {/* Recent Activity para Coordinadores y Agentes */}
      {shouldShowStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Ranking de Vendedores */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">🏆 Ranking de Vendedores</h2>
            {rankingActual.length > 0 ? (
              <div className="space-y-3">
                {rankingActual.map((vendedor) => {
                  const rank = getRankByFilter(vendedor)
                  const ventas = getVentasByFilter(vendedor)
                  
                  // Medallas para los 3 primeros
                  const getMedal = (position: number) => {
                    switch (position) {
                      case 1:
                        return '🥇'
                      case 2:
                        return '🥈'
                      case 3:
                        return '🥉'
                      default:
                        return `${position}º`
                    }
                  }

                  // Estilos especiales para los 3 primeros
                  const getCardStyle = (position: number) => {
                    switch (position) {
                      case 1:
                        return 'bg-gradient-to-r from-green-50 to-emerald-100 border-2 border-[#18cb96]'
                      case 2:
                        return 'bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-400'
                      case 3:
                        return 'bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-400'
                      default:
                        return 'bg-gray-50'
                    }
                  }

                  return (
                    <div 
                      key={vendedor.user_id} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${getCardStyle(rank)}`}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <div className={`flex items-center justify-center ${rank <= 3 ? 'w-10 h-10 text-2xl' : 'w-8 h-8 text-sm bg-gray-200 rounded-full'}`}>
                          <span className={rank <= 3 ? '' : 'font-semibold text-gray-600'}>
                            {getMedal(rank)}
                          </span>
                        </div>
                        <div className="ml-3 flex-1 min-w-0">
                          <p className={`font-medium text-[#373643] text-sm sm:text-base truncate ${rank === 1 ? 'font-bold' : ''}`}>
                            {vendedor.nombre}
                          </p>
                          <p className="text-xs text-gray-600">
                            {ventas} {ventas === 1 ? 'venta' : 'ventas'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <div className={`px-3 py-1 rounded-full ${rank === 1 ? 'bg-[#18cb96]' : 'bg-blue-500'} text-white`}>
                          <span className="text-sm font-bold">{ventas}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No hay ventas en este período</p>
                <p className="text-xs text-gray-400 mt-1">Cambia el filtro de tiempo para ver más datos</p>
              </div>
            )}
          </div>

          {/* Platform Distribution */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">Distribución por Plataforma</h2>
            {Object.keys(platformDistribution).length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {Object.entries(platformDistribution).map(([platform, count], index) => {
                  const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
                  const colors = ['bg-blue-500', 'bg-[#18cb96]', 'bg-purple-500', 'bg-orange-500', 'bg-red-500']
                  const color = colors[index % colors.length]

                  return (
                    <div key={platform} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`w-3 h-3 sm:w-4 sm:h-4 ${color} rounded-full mr-2 sm:mr-3`}></div>
                        <span className="text-[#373643] text-sm sm:text-base">{platform}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-[#373643] text-sm sm:text-base">{percentage}%</span>
                        <span className="text-xs text-gray-500 ml-1">({count})</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No hay datos de plataformas</p>
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
                          ? 'bg-[#18cb96] bg-opacity-10 border-2 border-[#18cb96]'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          tempSelectedEmpresaIds.includes(empresa.id) ? 'text-white' : 'text-[#373643]'
                        }`}>
                          {empresa.nombre}
                        </p>
                        <p className={`text-xs ${tempSelectedEmpresaIds.includes(empresa.id) ? 'text-white' : 'text-gray-500'} truncate`}>CIF: {empresa.cif}</p>
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
    </div>
  )
}

export default Dashboard 