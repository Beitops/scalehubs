import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'

interface Lead {
  id: number
  date: string
  name: string
  phone: string
  platform: string
  company: string
  status: string
}

const Leads = () => {
  const [dateFilter, setDateFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const { user } = useAuthStore()
  const { getLeadsByCompany, getAllLeads, updateLeadStatus } = useLeadsStore()

  // Obtener leads según el rol del usuario
  const getLeads = (): Lead[] => {
    const allLeads = user?.role === 'admin' ? getAllLeads() : getLeadsByCompany(user?.company || '')
    
    // Filtrar leads que no estén en devolución
    return allLeads.filter(lead => lead.status !== 'devolucion')
  }

  const leads = getLeads()

  const filteredLeads = leads.filter(lead => {
    const matchesDate = !dateFilter || lead.date === dateFilter
    const matchesPhone = !phoneFilter || lead.phone.includes(phoneFilter)
    return matchesDate && matchesPhone
  })

  // Calcular leads en el rango de fechas para exportación
  const getLeadsInDateRange = () => {
    if (!exportDateRange.startDate || !exportDateRange.endDate) return []
    
    return leads.filter(lead => {
      const leadDate = new Date(lead.date)
      const startDate = new Date(exportDateRange.startDate)
      const endDate = new Date(exportDateRange.endDate)
      
      // Incluir ambos días especificados
      return leadDate >= startDate && leadDate <= endDate
    })
  }

  const leadsToExport = getLeadsInDateRange()

  const handleExport = () => {
    setShowExportModal(true)
  }

  const handleExportConfirm = () => {
    if (leadsToExport.length === 0) return

    // Crear CSV content
    const headers = ['Fecha', 'Nombre', 'Teléfono', 'Plataforma']
    if (user?.role === 'admin') {
      headers.push('Empresa')
    }

    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => {
        const row = [
          lead.date,
          `"${lead.name}"`,
          lead.phone,
          lead.platform
        ]
        if (user?.role === 'admin') {
          row.push(`"${lead.company}"`)
        }
        return row.join(',')
      })
    ].join('\n')

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `leads_${exportDateRange.startDate}_${exportDateRange.endDate}.csv`)
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

  const handleReturnLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowReturnModal(true)
  }

  const handleConfirmReturn = () => {
    if (selectedLead) {
      updateLeadStatus(selectedLead.id, 'devolucion')
      setShowReturnModal(false)
      setSelectedLead(null)
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Gestión de Leads</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.role === 'admin' 
              ? 'Administra y visualiza todos los leads generados en redes sociales' 
              : `Leads asignados a ${user?.company}`
            }
          </p>
          {user?.role === 'admin' && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">
                👑 <strong>Modo Administrador:</strong> Visualizando todos los leads del sistema
              </p>
            </div>
          )}
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
                  {user?.role === 'admin' && (
                    <p><span className="font-medium">Empresa:</span> {lead.company}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  {user?.role !== 'admin' && (
                    <button 
                      onClick={() => handleReturnLead(lead)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                    >
                      Devolver
                    </button>
                  )}
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
                  {user?.role === 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Empresa
                    </th>
                  )}
                  {user?.role !== 'admin' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Devoluciones
                    </th>
                  )}
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
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {lead.company}
                      </td>
                    )}
                    {user?.role !== 'admin' && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleReturnLead(lead)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                        >
                          Devolver
                        </button>
                      </td>
                    )}
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
                {user?.role === 'client' && (
                  <span className="ml-2 text-[#18cb96]">(filtrados por empresa)</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
              <h2 className="text-xl font-bold text-[#373643]">Exportar Leads</h2>
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

      {/* Return Modal overlay */}
      {showReturnModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowReturnModal(false)}
        />
      )}

      {/* Return Confirmation Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Confirmar Devolución</h2>
              <button
                onClick={() => setShowReturnModal(false)}
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
                  ¿Estás seguro de que quieres devolver este lead?
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                  <p className="text-yellow-800 text-xs">
                    ⚠️ <strong>Importante:</strong> Después de confirmar, deberás ir a la sección "Devoluciones" para finalizar el trámite de devolución.
                  </p>
                </div>
                {selectedLead && (
                  <div className="text-xs text-gray-600 mt-3">
                    <p><strong>Nombre:</strong> {selectedLead.name}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.phone}</p>
                    <p><strong>Plataforma:</strong> {selectedLead.platform}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.date).toLocaleDateString('es-ES')}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReturn}
                  className="flex-1 px-4 py-2 bg-red-400 text-white rounded-lg hover:bg-red-500 transition-colors"
                >
                  Confirmar Devolución
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Leads 