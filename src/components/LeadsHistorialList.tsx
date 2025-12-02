import type { Lead } from '../services/leadsService'
import { ActionMenu } from './ActionMenu'

interface LeadsHistorialListProps {
  leads: Lead[]
  loading: boolean
  userRole?: string
  onViewDetails: (lead: Lead) => void
  onCancelStatus: (lead: Lead) => void
}

const getStatusBadge = (status: string) => {
  if (status === 'devolucion') {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-blue-700 bg-blue-100">
        Devolución
      </span>
    )
  } else if (status === 'convertido') {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-green-700 bg-green-100">
        Convertido
      </span>
    )
  } else if (status === 'perdido') {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-red-700 bg-red-100">
        Perdido
      </span>
    )
  } else if (status === 'no_valido') {
    return (
      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-orange-700 bg-orange-100">
        No válido
      </span>
    )
  }
  return (
    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-gray-700 bg-gray-100">
      {status || 'N/A'}
    </span>
  )
}

export const LeadsHistorialList = ({
  leads,
  loading,
  userRole,
  onViewDetails,
  onCancelStatus
}: LeadsHistorialListProps) => {
  const getActionMenuItems = (lead: Lead) => [
    {
      label: 'Ver detalles',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      onClick: () => onViewDetails(lead)
    },
    {
      label: 'Cancelar Estado',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: () => onCancelStatus(lead),
      className: 'text-blue-600 hover:bg-blue-50'
    }
  ]

  return (
    <div className={`relative ${leads.length === 0 || loading ? 'min-h-[300px]' : ''}`}>
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#18cb96]/30 border-t-[#18cb96] rounded-full animate-spin"></div>
            <span className="text-sm text-gray-600 font-medium">Cargando leads...</span>
          </div>
        </div>
      )}

      {/* Mobile Cards View */}
      <div className="lg:hidden">
        {leads.length === 0 && !loading ? (
          <div className="py-20 px-8 text-center text-gray-500">
            <p>No hay leads en el historial con los filtros aplicados</p>
          </div>
        ) : (
          leads.map((lead) => (
            <div key={lead.id} className="p-4 border-b border-gray-200 last:border-b-0">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
                <div className="flex items-center gap-2">
                  {getStatusBadge(lead.estado || '')}
                </div>
              </div>
              <div className="space-y-1 text-xs text-gray-600">
                <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
                <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                {userRole === 'administrador' && (
                  <p><span className="font-medium">Empresa:</span> {lead.empresa_nombre || '-'}</p>
                )}
              </div>
              <div className="flex gap-2 mt-3">
                <ActionMenu
                  items={getActionMenuItems(lead)}
                  triggerLabel="Más acciones"
                  size="sm"
                  className="text-xs font-medium"
                />
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
                {userRole === 'coordinador' ? 'Usuario Asignado' : 'Fecha Entrada'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                Teléfono
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                Estado
              </th>
              {userRole === 'administrador' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                  Empresa
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {leads.length === 0 && !loading ? (
              <tr>
                <td colSpan={userRole === 'administrador' ? 6 : 5} className="px-6 py-20 text-center text-gray-500">
                  No hay leads en el historial con los filtros aplicados
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                    {userRole === 'coordinador'
                      ? lead.usuario_nombre || 'Sin asignar'
                      : new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[#373643]">{lead.nombre_cliente}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                    {lead.telefono}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(lead.estado || '')}
                  </td>
                  {userRole === 'administrador' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                      {lead.empresa_nombre || '-'}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <ActionMenu
                      items={getActionMenuItems(lead)}
                      triggerLabel="Más acciones"
                      size="md"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { getStatusBadge }

