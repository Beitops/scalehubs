import { useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDashboardStore } from '../store/dashboardStore'



const Dashboard = () => {
  const { user, userEmpresaNombre } = useAuthStore()
  const { 
    loading, 
    stats, 
    timeFilter,
    rankingVendedores,
    loadDashboardData, 
    setTimeFilter, 
    isInitialized 
  } = useDashboardStore()

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

      {/* Stats Cards */}
      {shouldShowStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 lg:mb-8">
          {statsCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{stat.title}</p>
                <p className="text-xl sm:text-2xl font-bold text-[#373643] mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 sm:w-12 sm:h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-lg sm:text-xl flex-shrink-0 ml-3`}>
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

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Ranking de Vendedores */}
        {shouldShowStats && (
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
        )}

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
    </div>
  )
}

export default Dashboard 