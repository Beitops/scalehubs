import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import type { Lead } from '../services/leadsService'
import { Link } from 'react-router-dom'

const HistorialLeads = () => {
  const [dateFilter, setDateFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  
  const { user, userEmpresaId, userEmpresaNombre } = useAuthStore()
  const {
    loading, 
    error,
    getLeadsInDateRange,
    leads
  } = useLeadsStore()

  // Filtrar leads por estado (devolucion o devuelto)
  const historialLeads = leads.filter(lead => 
    lead.estado === 'devolucion' || lead.estado === 'devuelto'
  )

  const filteredLeads = historialLeads.filter(lead => {
    const matchesDate = !dateFilter || lead.fecha_entrada.startsWith(dateFilter)
    const matchesPhone = !phoneFilter || lead.telefono.includes(phoneFilter)
    const matchesStatus = !statusFilter || lead.estado === statusFilter
    return matchesDate && matchesPhone && matchesStatus
  })

  // Calcular leads en el rango de fechas para exportación
  const [leadsToExport, setLeadsToExport] = useState<Lead[]>([])

  useEffect(() => {
    const fetchLeadsInRange = async () => {
      if (exportDateRange.startDate && exportDateRange.endDate) {
        try {
          const empresaId = user?.rol !== 'administrador' ? userEmpresaId : undefined
          const leadsInRange = await getLeadsInDateRange(
            exportDateRange.startDate, 
            exportDateRange.endDate, 
            empresaId || undefined
          )
          // Filtrar solo los del historial
          const historialInRange = leadsInRange.filter(lead => 
            lead.estado === 'devolucion' || lead.estado === 'devuelto'
          )
          setLeadsToExport(historialInRange)
        } catch (error) {
          console.error('Error fetching leads in date range:', error)
          setLeadsToExport([])
        }
      } else {
        setLeadsToExport([])
      }
    }

    fetchLeadsInRange()
  }, [exportDateRange, getLeadsInDateRange, user?.rol, userEmpresaId])

  const handleExport = () => {
    setShowExportModal(true)
  }

  const handleExportConfirm = () => {
    if (leadsToExport.length === 0) return

    // Crear CSV content
    const headers = ['Fecha', 'Nombre', 'Teléfono', 'Plataforma', 'Estado']
    if (user?.rol === 'administrador') {
      headers.push('Empresa')
    }

    const csvContent = [
      headers.join(','),
      ...leadsToExport.map(lead => {
        const row = [
          new Date(lead.fecha_entrada).toLocaleDateString('es-ES'),
          `"${lead.nombre_cliente}"`,
          lead.telefono,
          lead.plataforma,
          lead.estado || ''
        ]
        if (user?.rol === 'administrador') {
          row.push(`"${lead.empresa_nombre || ''}"`)
        }
        return row.join(',')
      })
    ].join('\n')

    // Crear y descargar archivo
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `historial_leads_${exportDateRange.startDate}_${exportDateRange.endDate}.csv`)
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

  const getStatusBadge = (status: string) => {
    if (status === 'devolucion') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-red-700 bg-red-100">
          Devolución
        </span>
      )
    } else if (status === 'devuelto') {
      return (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-700 bg-green-100">
          Devuelto
        </span>
      )
    }
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-gray-700 bg-gray-100">
        {status || 'N/A'}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando historial...</span>
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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Historial de Leads</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.rol === 'administrador' 
              ? 'Historial completo de todos los leads procesados en el sistema' 
              : `Historial de leads de ${userEmpresaNombre || 'tu empresa'}`
            }
          </p>
          {user?.rol === 'administrador' && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">
                👑 <strong>Modo Administrador:</strong> Visualizando historial completo del sistema
              </p>
            </div>
          )}
        </div>

        {/* Filters and Export */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Filters Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              <div>
                <label htmlFor="statusFilter" className="block text-sm font-medium text-[#373643] mb-2">
                  Filtrar por estado
                </label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="devolucion">Devolución</option>
                  <option value="devuelto">Devuelto</option>
                </select>
              </div>
            </div>
            
            {/* Export Button */}
            <div className="flex justify-end">
              <button
                onClick={handleExport}
                className="w-full sm:w-auto px-6 py-2 bg-[#18cb96] text-white font-medium rounded-lg hover:bg-[#15b885] transition-colors flex items-center justify-center"
              >
                <span className="mr-2">📊</span>
                Exportar Historial
              </button>
            </div>
          </div>
        </div>

        {/* Historial Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Mobile Cards View */}
          <div className="lg:hidden">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p>No hay leads en el historial con los filtros aplicados</p>
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
                        {lead.plataforma_lead}
                      </span>
                      {getStatusBadge(lead.estado_temporal || '')}
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                    {user?.rol === 'administrador' && (
                      <p><span className="font-medium">Empresa:</span> {lead.empresa_nombre || '-'}</p>
                    )}
                  </div>
                </div>
              ))
            )}
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
                    Estado
                  </th>
                  {user?.rol === 'administrador' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Empresa
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={user?.rol === 'administrador' ? 6 : 5} className="px-6 py-8 text-center text-gray-500">
                      No hay leads en el historial con los filtros aplicados
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(lead.estado || '')}
                      </td>
                      {user?.rol === 'administrador' && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                          {lead.empresa_nombre || '-'}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-xs sm:text-sm text-gray-700">
                Mostrando <span className="font-medium">{filteredLeads.length}</span> de <span className="font-medium">{historialLeads.length}</span> leads en historial
                {user?.rol !== 'administrador' && (
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
              <h2 className="text-xl font-bold text-[#373643]">Exportar Historial</h2>
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
    </>
  )
}

export default HistorialLeads
