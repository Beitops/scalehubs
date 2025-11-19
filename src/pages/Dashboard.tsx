import { useEffect, memo, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDashboardStore, type Company } from '../store/dashboardStore'
import { type DashboardStats, type DashboardLead, type TimeFilter } from '../store/dashboardStore'


// ----------------------------------------------------
// Helper para formatear fechas a YYYY-MM-DD para el input type="date"
// ----------------------------------------------------
const formatDateInput = (date: Date): string => {
  const d = new Date(date)
  const month = '' + (d.getMonth() + 1)
  const day = '' + d.getDate()
  const year = d.getFullYear()

  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-')
}

// Helper para convertir una fecha de input (YYYY-MM-DD) a ISO string
const toISOString = (dateString: string): string => {
    if (!dateString) return ''
    const date = new Date(dateString + 'T00:00:00.000Z')
    return date.toISOString()
}


// ----------------------------------------------------
// Componente: StatsCard (Las "pestañas visuales" de métricas)
// ----------------------------------------------------
interface StatsCardProps {
  title: string
  value: number | string
  description?: string
  color: string
}

const StatsCard = memo(({ title, value, description, color }: StatsCardProps) => (
  <div
    className="stats-card bg-white p-6 rounded-xl shadow-lg"
    style={{ ['--accent' as any]: color }}
  >
    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
    <p className="mt-1 text-3xl font-bold text-[#373643]">{value}</p>
    {description && <p className="mt-2 text-sm text-gray-400">{description}</p>}
  </div>
))

// ----------------------------------------------------
// Componente: PlatformDistributionCard
// ----------------------------------------------------
const PlatformDistributionCard = memo(({ stats }: { stats: DashboardStats }) => {
  const { totalLeads, platformDistribution } = stats
  
  const colors = ['bg-blue-500', 'bg-[#18cb96]', 'bg-purple-500', 'bg-orange-500', 'bg-red-500']

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 h-full platform-card">
      <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">Distribución por Plataforma</h2>
      {Object.keys(platformDistribution).length > 0 ? (
        <div className="space-y-3 sm:space-y-4">
          {Object.entries(platformDistribution).map(([platform, count], index) => {
            const percentage = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0
            const colorClass = colors[index % colors.length]

            return (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 sm:w-4 sm:h-4 ${colorClass} rounded-full mr-2 sm:mr-3`}></div>
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
  )
})

// ----------------------------------------------------
// NUEVO Componente: CompanyFilterDropdown
// ----------------------------------------------------
const CompanyFilterDropdown = memo(({ companies, selectedCompanyId, setCompanyFilter }: {
    companies: Company[]
    selectedCompanyId: number | 'all' | 'none'
    setCompanyFilter: (companyId: number | 'all' | 'none') => void
}) => {
    
    // Función para manejar el cambio en el select
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value
        let filterValue: number | 'all' | 'none' = 'all'
        
        if (value === 'all') {
            filterValue = 'all'
        } else if (value === 'none') {
            filterValue = 'none'
        } else {
            // Convertir el ID de string a número
            filterValue = parseInt(value, 10)
        }
        
        setCompanyFilter(filterValue)
    }

    return (
        <div className="relative inline-block text-left">
             <label htmlFor="company-filter" className="sr-only">Filtrar por Empresa</label>
             <select
                id="company-filter"
                // El valor debe ser string para el elemento <select>
                value={selectedCompanyId === 'all' || selectedCompanyId === 'none' ? selectedCompanyId : String(selectedCompanyId)}
                onChange={handleChange}
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <option value="all">Todos</option>
                <option value="none">Sin asignar</option>
                <option disabled>---</option>
                {companies.map(company => (
                    // El valor del option es el ID de la empresa
                    <option key={company.id} value={company.id}>{company.nombre}</option>
                ))}
            </select>
        </div>
    )
})

// ----------------------------------------------------
// Componente: LeadsLista (Admin-only)
// ----------------------------------------------------
const LeadsLista = memo(({ leads }: { leads: DashboardLead[] }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5 // Mantenemos la lista corta para un dashboard

  // Filtrar leads para paginación (si es necesario, aunque 'leads' ya son todos los leads)
  const totalPages = Math.ceil(leads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeads = leads.slice(startIndex, endIndex)

  return (
    <div className="leads-list-card bg-white rounded-lg shadow-md p-4 sm:p-6 h-full border border-[#e6f9ef] hover:border-[#18cb96] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
      <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">Leads Lista</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">Nombre</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">Teléfono</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">Empresa</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedLeads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#373643]">{lead.nombre_cliente}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.telefono}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lead.empresa_nombre || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Paginación */}
      {totalPages > 1 && (
        <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-xs sm:text-sm text-gray-700">
            Mostrando {startIndex + 1}-{Math.min(endIndex, leads.length)} de {leads.length} leads
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-sm text-gray-700">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  )
})

const Dashboard = () => {
  const { user, userEmpresaNombre } = useAuthStore()
  const {
    loading,
    stats,
    timeFilter,
    rankingVendedores,
    loadDashboardData,
    setTimeFilter,
    isInitialized,
    selectedCompanyId, 
    setCompanyFilter,    
    companies,
    dashboardLeads,
    loadDashboardDataCustom // 1) Importar nueva función
  } = useDashboardStore()

// 2) Estado para el filtro personalizado
  const [customStartDate, setCustomStartDate] = useState<string>(formatDateInput(new Date()))
  const [customEndDate, setCustomEndDate] = useState<string>(formatDateInput(new Date()))
  const [isCustomFilterActive, setIsCustomFilterActive] = useState(false)


  // Cargar datos del dashboard cuando el componente se monte
  useEffect(() => {
    if (!user) return

    let isReady = true
    const loadData = async () => {
      if (isReady && !isInitialized) {
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
  }, [user, loadDashboardData, isInitialized])


  // 3) Función para aplicar el filtro personalizado
  const applyCustomFilter = () => {
    const start = toISOString(customStartDate)
    const end = toISOString(customEndDate)
    
    if (start && end && start <= end) {
      loadDashboardDataCustom(start, end) 
    } else {
      alert('Por favor, selecciona un rango de fechas válido.')
    }
  }

  const handleCustomFilterClick = () => {
    if (isCustomFilterActive) {
      applyCustomFilter()
    } else {
      setIsCustomFilterActive(true)
    }
  }

  const handleTimeFilterClickAdmin = (filter: TimeFilter) => {
    setIsCustomFilterActive(false) // Desactiva el modo personalizado
    setTimeFilter(filter) // Usa la función existente del store
  }


  // Usar estadísticas del store
  const {
    totalLeads,
    leadsDevueltos,
    leadsCerrados,
    platformDistribution,
    leadsInvalidos,
    leadsSinAsignar,
    leadsPerdidos, 
    averageQuality
  } = stats

  // Lógica de visibilidad
  const shouldShowStats = user?.rol === 'coordinador' || user?.rol === 'agente'
  const isAdmin = user?.rol === 'administrador'


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
      default:
        return ''
    }
  }

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
  
  // Definición de las 5 tarjetas de leads (Visibles solo si isAdmin es true)
  const leadCards = [
    { title: 'Leads (Total)', value: totalLeads.toLocaleString(), color: '#18cb96', description: 'Total de leads de la plataforma' },
    { title: 'Leads Cerrados', value: leadsCerrados.toLocaleString(), color: '#3b82f6', description: 'Leads convertidos y cerrados correctamente' },
    { title: 'Leads Perdidos', value: leadsPerdidos.toLocaleString(), color: '#ef4444', description: 'Leads rechazados o ya inútiles' },
    { title: 'Leads Sin Asignar', value: leadsSinAsignar ? leadsSinAsignar.toLocaleString() : '0', color: '#f59e0b', description: 'Leads que están sin asignar' },
    { title: 'Leads Inválidos', value: leadsInvalidos ? leadsInvalidos.toLocaleString() : '0', color: '#6366f1', description: 'Son los leads falsos' },
  ]

  if (!isInitialized || loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando dashboard...</span>
      </div>
    )
  }

  // --------------------------------------------------------------------------------
  // RETORNO PARA ADMINISTRADOR
  // --------------------------------------------------------------------------------
  if (isAdmin) {
    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6 lg:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Dashboard</h1>
                <p className="text-gray-600 mt-2 text-sm sm:text-base">
                    👑 <strong>Modo Administrador:</strong> Visualizando resumen general de Leads.
                </p>
            </div>
            
            {/* Sección de filtros principal del Admin */}
            {/* Usamos flex para poner el filtro de fecha y el filtro de empresa uno al lado del otro */}
            <div className="flex flex-col md:flex-row gap-6 mb-6"> 
                
                {/* 1. Bloque de filtros por fecha (Columna Izquierda) */}
                <div className="flex-1">
                    {/* Título de fecha */}
                    <h2 className="text-lg font-semibold text-[#373643] mb-3">Filtro de Leads por Fecha</h2>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        
                        {/* Filtros predefinidos para Admin (Botones Hoy, Semana, Mes, Año) */}
                        {[
                          { key: 'hoy', label: 'Hoy' },
                          { key: 'semana', label: 'Semana' },
                          { key: 'mes', label: 'Mes' },
                          { key: 'año', label: 'Año' }
                        ].map(({ key, label }) => (
                          <button
                            key={key}
                            onClick={() => handleTimeFilterClickAdmin(key as TimeFilter)} 
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              timeFilter === key && !isCustomFilterActive 
                                ? 'bg-blue-600 text-white' 
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        
                        {/* Botón de filtro personalizado */}
                        <button
                          onClick={handleCustomFilterClick}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isCustomFilterActive || timeFilter === 'personalizado'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Personalizado
                        </button>
                        
                        {/* Indicador de Rango Actual */}
                        <div className="flex items-center gap-2 ml-2">
                          <span className="text-sm text-gray-500">•</span>
                          <span className="text-sm font-semibold text-[#373643]">
                            {isCustomFilterActive || timeFilter === 'personalizado' ? `${customStartDate} al ${customEndDate}` : 'Filtro Actual'}
                          </span>
                        </div>
                    </div>
                
                    {/* Controles de Fecha Personalizada (Date Pickers) */}
                    {(isCustomFilterActive || timeFilter === 'personalizado') && (
                        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50 flex flex-wrap items-center gap-4 animate-slideIn">
                            <label className="text-sm font-medium text-gray-700">Desde:</label>
                            <input
                                type="date"
                                value={customStartDate}
                                onChange={(e) => setCustomStartDate(e.target.value)}
                                className="p-2 border border-gray-300 rounded-md text-sm"
                            />
                            
                            <label className="text-sm font-medium text-gray-700">Hasta:</label>
                            <input
                                type="date"
                                value={customEndDate}
                                onChange={(e) => setCustomEndDate(e.target.value)}
                                className="p-2 border border-gray-300 rounded-md text-sm"
                            />
                            
                            <button
                                onClick={applyCustomFilter}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                            >
                                Aplicar Filtro
                            </button>
                        </div>
                    )}
                </div>

                {/* 2. Bloque de filtro por empresa (Columna Derecha) */}
                <div className="w-full md:w-64"> 
                    {/* Título de empresa */}
                    <h2 className="text-lg font-semibold text-[#373643] mb-3">Filtro de Empresa</h2> 
                    <CompanyFilterDropdown
                        companies={companies}
                        selectedCompanyId={selectedCompanyId}
                        setCompanyFilter={setCompanyFilter}
                    />
                </div>
            </div>

            {/* Sección superior: 5 Tarjetas de Estadísticas para administrador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 lg:mb-8">
                {leadCards.map((card, index) => (
                    <StatsCard key={index} {...card} />
                ))}
            </div>

            {/* Sección Inferior: Calidad Media y Distribución por Plataforma (Admin) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 stats-panel"> 

              {/* Columna Izquierda: Calidad Media */}
              <div className="space-y-8"> 
                  <StatsCard
                      title="Calidad Media"
                      value={averageQuality.toFixed(2)} 
                      description="Media de leads (1, 2, 3), excluyendo no_válidos"
                      color="#FFC107"
                  />
              </div>

              {/* Columna Derecha: Distribución por Plataforma */}
              <div className="lg:col-span-1 pl-6"> 
                <PlatformDistributionCard stats={stats} />
              </div>
          </div>

              {/* [MODIFICACIÓN 5: Nueva sección inferior para la lista de leads] */}
              <div className="grid grid-cols-1 mt-6">
                <LeadsLista leads={dashboardLeads} />
              </div>
        </div>
    )
  }

  // --------------------------------------------------------------------------------
  // RETORNO PARA COORDINADOR Y AGENTE
  // --------------------------------------------------------------------------------
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">
          {`Bienvenido a ScaleHubs - Resumen de ${userEmpresaNombre || user?.empresa || 'tu empresa'}`}
        </p>
      </div>

      {/* Filtros de tiempo (Solo visible para coordinadores y agentes) */}
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
                onClick={() => setTimeFilter(key as any)}
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

      {/* SECCIÓN INFERIOR: Ranking y Distribución (Layout de 3 columnas) */}
      {/* Este bloque solo se muestra para coordinadores/agentes, sin las 5 tarjetas nuevas */}
      {shouldShowStats && (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8`}>
          
          {/* Columna Izquierda (Ranking de Vendedores - 2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">🏆 Ranking de Vendedores</h2>
              {rankingActual.length > 0 ? (
                <div className="space-y-3">
                  {rankingActual.map((vendedor) => {
                    const rank = getRankByFilter(vendedor)
                    const ventas = getVentasByFilter(vendedor)
                    
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
          </div>
          
          {/* Columna Derecha: Distribución por Plataforma */}
              <div className="lg:col-span-1"> {/* Se puede omitir el lg:col-span-1 si es la segunda columna de un grid-cols-2 */}
                  <PlatformDistributionCard stats={stats} />
              </div>

        </div>
      )}
    </div>
  )
}

export default Dashboard