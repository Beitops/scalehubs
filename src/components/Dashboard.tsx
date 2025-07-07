const Dashboard = () => {
  // Mock data - in a real app this would come from an API
  const stats = [
    {
      title: 'Leads Recibidos',
      value: '1,247',
      change: '+12%',
      changeType: 'positive',
      icon: '📈',
      color: 'bg-blue-500'
    },
    {
      title: 'Leads Devueltos',
      value: '89',
      change: '-5%',
      changeType: 'negative',
      icon: '⚠️',
      color: 'bg-red-500'
    },
    {
      title: 'Porcentaje Leads Buenos',
      value: '92.8%',
      change: '+2.1%',
      changeType: 'positive',
      icon: '✅',
      color: 'bg-[#18cb96]'
    },
    {
      title: 'Leads Cerrados',
      value: '856',
      change: '+8%',
      changeType: 'positive',
      icon: '🎯',
      color: 'bg-purple-500'
    }
  ]

  const recentLeads = [
    { name: 'María González', phone: '+34 612 345 678', platform: 'Instagram', date: '2024-01-15' },
    { name: 'Carlos Ruiz', phone: '+34 623 456 789', platform: 'Facebook', date: '2024-01-15' },
    { name: 'Ana Martínez', phone: '+34 634 567 890', platform: 'LinkedIn', date: '2024-01-14' },
    { name: 'Luis Pérez', phone: '+34 645 678 901', platform: 'Instagram', date: '2024-01-14' },
  ]

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Dashboard</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Bienvenido a ScaleHubs - Resumen de tu actividad</p>
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
              <span className={`text-xs sm:text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
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
          <div className="space-y-3">
            {recentLeads.map((lead, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#373643] text-sm sm:text-base truncate">{lead.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{lead.phone}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <span className="inline-block px-2 py-1 text-xs font-medium bg-[#18cb96] text-white rounded-full">
                    {lead.platform}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">{lead.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Distribution */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[#373643] mb-4">Distribución por Plataforma</h2>
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500 rounded-full mr-2 sm:mr-3"></div>
                <span className="text-[#373643] text-sm sm:text-base">Instagram</span>
              </div>
              <span className="font-semibold text-[#373643] text-sm sm:text-base">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#18cb96] rounded-full mr-2 sm:mr-3"></div>
                <span className="text-[#373643] text-sm sm:text-base">Facebook</span>
              </div>
              <span className="font-semibold text-[#373643] text-sm sm:text-base">32%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500 rounded-full mr-2 sm:mr-3"></div>
                <span className="text-[#373643] text-sm sm:text-base">LinkedIn</span>
              </div>
              <span className="font-semibold text-[#373643] text-sm sm:text-base">18%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-3 h-3 sm:w-4 sm:h-4 bg-orange-500 rounded-full mr-2 sm:mr-3"></div>
                <span className="text-[#373643] text-sm sm:text-base">Otros</span>
              </div>
              <span className="font-semibold text-[#373643] text-sm sm:text-base">5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 