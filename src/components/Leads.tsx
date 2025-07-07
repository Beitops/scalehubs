import { useState } from 'react'

interface Lead {
  id: number
  date: string
  name: string
  phone: string
  platform: string
}

const Leads = () => {
  const [dateFilter, setDateFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')

  const leads: Lead[] = [
    { id: 1, date: '2024-01-15', name: 'María González', phone: '+34 612 345 678', platform: 'Instagram' },
    { id: 2, date: '2024-01-15', name: 'Carlos Ruiz', phone: '+34 623 456 789', platform: 'Facebook' },
    { id: 3, date: '2024-01-14', name: 'Ana Martínez', phone: '+34 634 567 890', platform: 'LinkedIn' },
    { id: 4, date: '2024-01-14', name: 'Luis Pérez', phone: '+34 645 678 901', platform: 'Instagram' },
  ]

  const filteredLeads = leads.filter(lead => {
    const matchesDate = !dateFilter || lead.date === dateFilter
    const matchesPhone = !phoneFilter || lead.phone.includes(phoneFilter)
    return matchesDate && matchesPhone
  })

  const handleExport = () => {
    alert('Exportando leads...')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Gestión de Leads</h1>
        <p className="text-gray-600 mt-2 text-sm sm:text-base">Administra y visualiza todos los leads generados en redes sociales</p>
      </div>

      {/* Filters and Export */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
        <div className="flex flex-col gap-4">
          {/* Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>
          
          {/* Export Button */}
          <div className="flex justify-end">
            <button
              onClick={handleExport}
              className="w-full sm:w-auto px-6 py-2 bg-[#18cb96] text-white font-medium rounded-lg hover:bg-[#15b885] transition-colors flex items-center justify-center"
            >
              <span className="mr-2">📊</span>
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Mobile Cards View */}
        <div className="lg:hidden">
          {filteredLeads.map((lead) => (
            <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-[#373643] text-sm">{lead.name}</h3>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                  {lead.platform}
                </span>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Teléfono:</span> {lead.phone}</p>
                <p><span className="font-medium">Fecha:</span> {new Date(lead.date).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="text-[#18cb96] hover:text-[#15b885] text-xs font-medium">
                  Ver
                </button>
                <button className="text-[#18cb96] hover:text-[#15b885] text-xs font-medium">
                  Editar
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
                <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                    {new Date(lead.date).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#373643]">{lead.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                    {lead.phone}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                      {lead.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button className="text-[#18cb96] hover:text-[#15b885] mr-3">
                      Ver
                    </button>
                    <button className="text-[#18cb96] hover:text-[#15b885]">
                      Editar
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
              Mostrando <span className="font-medium">{filteredLeads.length}</span> de <span className="font-medium">{leads.length}</span> leads
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Leads 