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
  return_audio?: string
  return_image?: string
  return_observations?: string
  admin_observations?: string
}

const Devoluciones = () => {
  const [showFinishModal, setShowFinishModal] = useState(false)
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [returnForm, setReturnForm] = useState({
    audio: '',
    image: '',
    observations: ''
  })
  const [adminObservations, setAdminObservations] = useState('')
  const [showAttachments, setShowAttachments] = useState(false)
  const { user } = useAuthStore()
  const { getLeadsByCompany, getAllLeads, updateLeadStatus, updateAdminObservations } = useLeadsStore()

  // Obtener leads en devolución según el rol del usuario
  const getLeadsInDevolucion = (): Lead[] => {
    const allLeads = user?.role === 'admin' ? getAllLeads() : getLeadsByCompany(user?.company || '')
    
    // Filtrar solo leads en devolución
    return allLeads.filter(lead => lead.status === 'devolucion')
  }

  // Obtener leads en tramite de devolución (solo para admin)
  const getLeadsInTramite = (): Lead[] => {
    if (user?.role !== 'admin') return []
    return getAllLeads().filter(lead => lead.status === 'Tramite devolucion')
  }

  const leadsInDevolucion = getLeadsInDevolucion()
  const leadsInTramite = getLeadsInTramite()

  const handleFinishDevolucion = (lead: Lead) => {
    setSelectedLead(lead)
    setShowFinishModal(true)
  }

  const handleProcessDevolucion = (lead: Lead) => {
    setSelectedLead(lead)
    setShowProcessModal(true)
    setAdminObservations('')
    setShowAttachments(false)
  }

  const handleConfirmFinish = () => {
    if (selectedLead) {
      updateLeadStatus(
        selectedLead.id, 
        'Tramite devolucion',
        returnForm.audio,
        returnForm.image,
        returnForm.observations
      )
      setShowFinishModal(false)
      setSelectedLead(null)
      setReturnForm({ audio: '', image: '', observations: '' })
    }
  }

  const handleRejectDevolucion = () => {
    if (selectedLead && adminObservations.trim()) {
      updateLeadStatus(selectedLead.id, 'devolucion')
      updateAdminObservations(selectedLead.id, adminObservations)
      setShowProcessModal(false)
      setSelectedLead(null)
      setAdminObservations('')
    }
  }

  const handleAcceptDevolucion = () => {
    if (selectedLead) {
      updateLeadStatus(selectedLead.id, 'Devuelto')
      if (adminObservations.trim()) {
        updateAdminObservations(selectedLead.id, adminObservations)
      }
      setShowProcessModal(false)
      setSelectedLead(null)
      setAdminObservations('')
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'audio' | 'image') => {
    const file = e.target.files?.[0]
    if (file) {
      setReturnForm(prev => ({
        ...prev,
        [type]: file.name
      }))
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Devoluciones</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.role === 'admin' 
              ? 'Gestiona las devoluciones de leads de todas las empresas' 
              : `Devoluciones pendientes de ${user?.company}`
            }
          </p>
          {user?.role === 'admin' && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-700 text-xs">
                👑 <strong>Modo Administrador:</strong> Visualizando devoluciones de todo el sistema
              </p>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#373643]">Devoluciones Pendientes</h2>
                <p className="text-sm text-gray-600">
                  {leadsInDevolucion.length} lead{leadsInDevolucion.length !== 1 ? 's' : ''} en proceso de devolución
                </p>
              </div>
              <div className="text-3xl font-bold text-red-500">
                {leadsInDevolucion.length}
              </div>
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-[#373643]">En Trámite</h2>
                  <p className="text-sm text-gray-600">
                    {leadsInTramite.length} lead{leadsInTramite.length !== 1 ? 's' : ''} esperando revisión
                  </p>
                </div>
                <div className="text-3xl font-bold text-orange-500">
                  {leadsInTramite.length}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Devoluciones Pendientes Section */}
        {leadsInDevolucion.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#373643]">Devoluciones Pendientes</h2>
            </div>
            
            {/* Mobile Cards View */}
            <div className="lg:hidden">
              {leadsInDevolucion.map((lead) => (
                <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#373643] text-sm">{lead.name}</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-red-400">
                      En Devolución
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Teléfono:</span> {lead.phone}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(lead.date).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Plataforma:</span> {lead.platform}</p>
                    {user?.role === 'admin' && (
                      <p><span className="font-medium">Empresa:</span> {lead.company}</p>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => handleFinishDevolucion(lead)}
                      className="text-green-600 hover:text-green-700 text-xs font-medium transition-colors"
                    >
                      Tramitar Devolución
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
                    {user?.role === 'admin' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Empresa
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leadsInDevolucion.map((lead) => (
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-red-400">
                          En Devolución
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleFinishDevolucion(lead)}
                          className="text-green-600 hover:text-green-700 transition-colors"
                        >
                          Tramitar Devolución
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* En Trámite Section (Admin Only) */}
        {user?.role === 'admin' && leadsInTramite.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-[#373643]">En Trámite de Revisión</h2>
            </div>
            
            {/* Mobile Cards View */}
            <div className="lg:hidden">
              {leadsInTramite.map((lead) => (
                <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-[#373643] text-sm">{lead.name}</h3>
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-orange-400">
                      En Trámite
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-600">
                    <p><span className="font-medium">Teléfono:</span> {lead.phone}</p>
                    <p><span className="font-medium">Fecha:</span> {new Date(lead.date).toLocaleDateString('es-ES')}</p>
                    <p><span className="font-medium">Plataforma:</span> {lead.platform}</p>
                    <p><span className="font-medium">Empresa:</span> {lead.company}</p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button 
                      onClick={() => handleProcessDevolucion(lead)}
                      className="text-blue-600 hover:text-blue-700 text-xs font-medium transition-colors"
                    >
                      Tramitar
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
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Acción
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leadsInTramite.map((lead) => (
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                        {lead.company}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-orange-400">
                          En Trámite
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => handleProcessDevolucion(lead)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          Tramitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {leadsInDevolucion.length === 0 && leadsInTramite.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 text-6xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-[#373643] mb-2">No hay devoluciones pendientes</h3>
            <p className="text-gray-600 text-sm">
              Todos los leads han sido procesados correctamente.
            </p>
          </div>
        )}
      </div>

      {/* Finish Modal overlay */}
      {showFinishModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowFinishModal(false)}
        />
      )}

      {/* Finish Confirmation Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Tramitar Devolución</h2>
              <button
                onClick={() => setShowFinishModal(false)}
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
                  Adjunta las pruebas para tramitar la devolución:
                </p>
                {selectedLead && (
                  <div className="text-xs text-gray-600 mb-3">
                    <p><strong>Nombre:</strong> {selectedLead.name}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.phone}</p>
                    <p><strong>Plataforma:</strong> {selectedLead.platform}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.date).toLocaleDateString('es-ES')}</p>
                  </div>
                )}
              </div>

              {/* File Uploads */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Audio (opcional)
                  </label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleFileChange(e, 'audio')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Imagen (opcional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'image')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Observaciones (opcional)
                  </label>
                  <textarea
                    value={returnForm.observations}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, observations: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    placeholder="Añade observaciones sobre la devolución..."
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmFinish}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Tramitar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Process Modal overlay */}
      {showProcessModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowProcessModal(false)}
        />
      )}

      {/* Process Confirmation Modal */}
      {showProcessModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Tramitar Devolución</h2>
              <button
                onClick={() => setShowProcessModal(false)}
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
                  Revisa la información de la devolución:
                </p>
                {selectedLead && (
                  <div className="text-xs text-gray-600">
                    <p><strong>Nombre:</strong> {selectedLead.name}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.phone}</p>
                    <p><strong>Plataforma:</strong> {selectedLead.platform}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.date).toLocaleDateString('es-ES')}</p>
                    <p><strong>Empresa:</strong> {selectedLead.company}</p>
                    {selectedLead.return_observations && (
                      <p><strong>Observaciones:</strong> {selectedLead.return_observations}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              {selectedLead && (selectedLead.return_audio || selectedLead.return_image) && (
                <div className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => setShowAttachments(!showAttachments)}
                    className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50"
                  >
                    <span className="font-medium text-[#373643]">Ver Archivos Adjuntos</span>
                    <svg 
                      className={`w-5 h-5 transform transition-transform ${showAttachments ? 'rotate-180' : ''}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {showAttachments && (
                    <div className="px-4 pb-4 space-y-3">
                      {selectedLead.return_audio && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium text-[#373643] mb-1">Audio:</p>
                          <p className="text-xs text-gray-600">{selectedLead.return_audio}</p>
                        </div>
                      )}
                      {selectedLead.return_image && (
                        <div className="bg-gray-50 p-3 rounded">
                          <p className="text-sm font-medium text-[#373643] mb-1">Imagen:</p>
                          <p className="text-xs text-gray-600">{selectedLead.return_image}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#373643] mb-2">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={adminObservations}
                  onChange={(e) => setAdminObservations(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                  placeholder="Añade observaciones sobre tu decisión..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectDevolucion}
                  disabled={!adminObservations.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rechazar
                </button>
                <button
                  onClick={handleAcceptDevolucion}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Devoluciones 