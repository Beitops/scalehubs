import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'



const Dashboard = () => {
  console.log('Dashboard')
  const { user, userEmpresaNombre } = useAuthStore()
  const { loading, activeLeads } = useLeadsStore()
  // Calcular estadísticas basadas en los leads reales
  const totalLeads = activeLeads.length
  const leadsThisMonth = activeLeads.filter(lead => {
    const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const leadDate = new Date(lead.fecha_entrada).getTime()
    return new Date(leadDate).getTime() >= hace30Dias.getTime() ? lead : null
  }).length
  const platformDistribution = activeLeads.reduce((acc, lead) => {
    acc[lead.plataforma_lead || ''] = (acc[lead.plataforma_lead || ''] || 0) + 1
    return acc
  }, {} as Record<string, number>)


  const stats = [
    {
      title: 'Total de Leads',
      value: totalLeads.toString(),
      change: `+${leadsThisMonth}`,
      changeType: 'positive' as const,
      icon: '📈',
      color: 'bg-blue-500'
    },
    {
      title: 'Leads este mes',
      value: leadsThisMonth.toString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: '📅',
      color: 'bg-green-500'
    },
    {
      title: user?.role === 'admin' ? 'Porcentaje Leads en Tramite' : 'Porcentaje Leads en Devolución',
      value: `30%`,
      change: '+2.1%',
      changeType: 'positive' as const,
      icon: '✅',
      color: 'bg-[#18cb96]'
    },
    {
      title: 'Leads Cerrados',
      value: Math.floor(totalLeads * 0.7).toString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: '🎯',
      color: 'bg-purple-500'
    }
  ]

  // Obtener leads recientes (últimos 4)
  const recentLeads = activeLeads
    .sort((a, b) => new Date(b.fecha_entrada).getTime() - new Date(a.fecha_entrada).getTime())
    .slice(0, 4)

  if (loading) {
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
          {user?.role === 'admin'
            ? 'Bienvenido a ScaleHubs - Resumen general del sistema'
            : `Bienvenido a ScaleHubs - Resumen de ${userEmpresaNombre || user?.company || 'tu empresa'}`
          }
        </p>
        {user?.role === 'admin' && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-700 text-xs">
              👑 <strong>Modo Administrador:</strong> Visualizando estadísticas de todo el sistema
            </p>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 lg:mb-8">
        {stats.map((stat, index) => (
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
              <span className={`text-xs sm:text-sm font-medium ${stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                }`}>
                {stat.change}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 ml-1">vs mes anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Recent Leads */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">Leads Recientes</h2>
          {recentLeads.length > 0 ? (
            <div className="space-y-3">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#373643] text-sm sm:text-base truncate">{lead.nombre_cliente}</p>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{lead.telefono}</p>
                    {user?.role === 'admin' && (
                      <p className="text-xs text-gray-500 truncate">{lead.empresa_nombre || '-'}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-[#18cb96] text-white rounded-full">
                      {lead.plataforma_lead}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">{new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hay leads recientes</p>
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
                    <span className="font-semibold text-[#373643] text-sm sm:text-base">{percentage}%</span>
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