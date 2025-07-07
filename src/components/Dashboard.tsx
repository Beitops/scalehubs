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
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#373643]">Dashboard</h1>
        <p className="text-gray-600 mt-2">Bienvenido a ScaleHubs - Resumen de tu actividad</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-[#373643] mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-sm font-medium ${
                stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.change}
              </span>
              <span className="text-sm text-gray-500 ml-1">vs mes anterior</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Leads */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#373643] mb-4">Leads Recientes</h2>
          <div className="space-y-3">
            {recentLeads.map((lead, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-[#373643]">{lead.name}</p>
                  <p className="text-sm text-gray-600">{lead.phone}</p>
                </div>
                <div className="text-right">
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-[#373643] mb-4">Distribución por Plataforma</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-[#373643]">Instagram</span>
              </div>
              <span className="font-semibold text-[#373643]">45%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-[#18cb96] rounded-full mr-3"></div>
                <span className="text-[#373643]">Facebook</span>
              </div>
              <span className="font-semibold text-[#373643]">32%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-500 rounded-full mr-3"></div>
                <span className="text-[#373643]">LinkedIn</span>
              </div>
              <span className="font-semibold text-[#373643]">18%</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-orange-500 rounded-full mr-3"></div>
                <span className="text-[#373643]">Otros</span>
              </div>
              <span className="font-semibold text-[#373643]">5%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 