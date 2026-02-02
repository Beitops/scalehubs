import { useState, useEffect, memo, useMemo, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import type { Lead } from '../services/leadsService'
import { leadsService } from '../services/leadsService'
import { ActionMenu } from '../components/ActionMenu'
import { leadSolicitudesService } from '../services/leadSolicitudesService'
import { archivosAdjuntosService, type ArchivoAdjunto } from '../services/archivosAdjuntosService'
import { companyService } from '../services/companyService'
import { callbellService } from '../services/callbellService'
import { supabase } from '../lib/supabase'
import type { AssignedUserProfile } from '../services/LeadsFilterService'
import { fetchAssignedUsers } from '../services/LeadsFilterService'
import { getDateFieldByRole } from '../utils/dateFieldByRole'

interface ActionMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
}

// Función helper para truncar nombres
const truncateNombre = (nombre: string, maxLength: number = 50) => {
  if (!nombre) return ''
  if (nombre.length <= maxLength) return nombre
  return nombre.substring(0, maxLength) + '...'
}

// Funciones estáticas movidas fuera del componente para evitar recreación en cada render
const getStatusDisplayName = (status: string) => {
  const statusMap: Record<string, string> = {
    'sin_tratar': 'Sin Tratar',
    'no_contesta': 'No Contesta',
    'no_valido': 'No Valido',
    'gestion': 'En gestión',
    'convertido': 'Convertido',
    'no_cerrado': 'No Cerrado',
    'devolucion': 'Devolución'
  }
  return statusMap[status] || status
}

const getStatusTextColor = (status: string) => {
  const colorMap: Record<string, string> = {
    'sin_tratar': 'text-gray-700',
    'no_contesta': 'text-yellow-700',
    'no_valido': 'text-red-700',
    'gestion': 'text-blue-700',
    'convertido': 'text-green-700',
    'no_cerrado': 'text-red-700',
  }
  return colorMap[status] || 'text-gray-700'
}

// Componente optimizado para fila móvil
const LeadMobileCard = memo(({ 
  lead, 
  onStatusChange, 
  getStatusTextColor, 
  getActionMenuItems, 
  user 
}: {
  lead: Lead
  onStatusChange: (leadId: number, newStatus: string) => void
  getStatusTextColor: (status: string) => string
  getActionMenuItems: (lead: Lead) => ActionMenuItem[]
  user: any
}) => {
  return (
    <div className="p-4 border-b border-gray-200 last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-[#373643] text-sm" title={lead.nombre_cliente}>
          {truncateNombre(lead.nombre_cliente)}
        </h3>
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
          {lead.plataforma_lead}
        </span>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        <p className="flex items-center">
          <span className="font-medium">Calidad:</span> 
          <span className="ml-2 inline-flex items-center justify-center w-8 h-8 sm:w-11 sm:h-11">
            <img 
              src={`/calidadLead/${lead.calidad || 1}.png`} 
              alt={`Calidad ${lead.calidad || 1}`}
              className="w-8 h-8 sm:w-11 sm:h-11 object-contain"
            />
          </span>
        </p>
        <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
        {user?.rol === 'coordinador' ? (
          <p><span className="font-medium">Asignado a:</span> {lead.usuario_nombre || 'Sin asignar'}</p>
        ) : (
          <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
        )}
        <p><span className="font-medium">Estado:</span></p>
        <select
          value={lead.estado_temporal || 'sin_tratar'}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className={`w-full px-2 py-1 text-xs border-2 border-[#18cb96] rounded-md focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent bg-white ${getStatusTextColor(lead.estado_temporal || 'sin_tratar')}`}
        >
          <option value="sin_tratar">Sin Tratar</option>
          <option value="no_contesta">No Contesta</option>
          <option value="no_valido">No Valido</option>
          <option value="gestion">En gestión</option>
          <option value="convertido">Convertido</option>
          <option value="no_cerrado">No Cerrado</option>
        </select>
        {user?.rol === 'administrador' && (
          <p><span className="font-medium">Empresa:</span> {lead.empresa_nombre || '-'}</p>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <ActionMenu
          items={getActionMenuItems(lead)}
          triggerLabel={user?.rol === 'administrador' ? 'Acciones' : 'Más acciones'}
          size="sm"
          className="text-xs font-medium"
        />
      </div>
    </div>
  )
})

// Componente optimizado para fila de escritorio
const LeadDesktopRow = memo(({ 
  lead, 
  onStatusChange, 
  getStatusTextColor, 
  getActionMenuItems, 
  user 
}: {
  lead: Lead
  onStatusChange: (leadId: number, newStatus: string) => void
  getStatusTextColor: (status: string) => string
  getActionMenuItems: (lead: Lead) => ActionMenuItem[]
  user: any
}) => {
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
        {user?.rol === 'coordinador' ? (lead.usuario_nombre || 'Sin asignar') : new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center justify-center w-18 h-18">
          <img 
            src={`/calidadLead/${lead.calidad || 1}.png`} 
            alt={`Calidad ${lead.calidad || 1}`}
            className="w-18 h-18 object-contain"
          />
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-medium text-[#373643]" title={lead.nombre_cliente}>
          {truncateNombre(lead.nombre_cliente)}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
        {lead.telefono}
      </td>
      {user?.rol !== 'administrador' && (
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white bg-[#18cb96]">
            {lead.plataforma_lead}
          </span>
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap">
        <select
          value={lead.estado_temporal || 'sin_tratar'}
          onChange={(e) => onStatusChange(lead.id, e.target.value)}
          className={`px-2 py-1 text-xs border-2 border-[#18cb96] rounded-md focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent bg-white ${getStatusTextColor(lead.estado_temporal || 'sin_tratar')}`}
        >
          <option value="sin_tratar">Sin Tratar</option>
          <option value="no_contesta">No Contesta</option>
          <option value="no_valido">No Valido</option>
          <option value="gestion">En gestión</option>
          <option value="convertido">Convertido</option>
          <option value="no_cerrado">No Cerrado</option>
        </select>
      </td>
      {user?.rol === 'administrador' && (
        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
          {lead.empresa_nombre || '-'}
        </td>
      )}
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <ActionMenu
          items={getActionMenuItems(lead)}
          triggerLabel={user?.rol === 'administrador' ? 'Acciones' : 'Más acciones'}
          size="md"
        />
      </td>
    </tr>
  )
})

const Leads = () => {
  // Calcular fechas por defecto (últimos 7 días)
  const getDefaultDateRange = () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 7)
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    }
  }

  const [dateRange, setDateRange] = useState(getDefaultDateRange())
  const [appliedDateRange, setAppliedDateRange] = useState(getDefaultDateRange())
  const [phoneFilter, setPhoneFilter] = useState('')
  const [phoneFilterDebounced, setPhoneFilterDebounced] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')
  const [assignedUserFilter, setAssignedUserFilter] = useState('')
  const [assignedUserId, setAssignedUserId] = useState<string>('')
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [observations, setObservations] = useState('')
  const [showSolicitudModal, setShowSolicitudModal] = useState(false)
  const [solicitudLoading, setSolicitudLoading] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ show: false, message: '', type: 'info' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showArchivosModal, setShowArchivosModal] = useState(false)
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<ArchivoAdjunto[]>([])
  const [archivosLoading, setArchivosLoading] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ArchivoAdjunto | null>(null)
  const [archivosCurrentPage, setArchivosCurrentPage] = useState(1)
  const archivosPerPage = 5
  const [assignedUsers, setAssignedUsers] = useState<AssignedUserProfile[]>([])
  const [companies, setCompanies] = useState<Array<{id: number, nombre: string}>>([])
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [userSearchText, setUserSearchText] = useState('')
  
  const { user, userEmpresaId, userEmpresaNombre, userEmpresaConfiguracion } = useAuthStore()
  const {
    loading,
    error,
    loadActiveLeadsPage,
    updateLeadStatus,
    updateLeadObservations,
    activeLeads,
    activeLeadsTotalCount,
    updateActiveLeadLocally,
    removeActiveLeadLocally,
  } = useLeadsStore()

  // Función para mostrar notificaciones
  const showNotification = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({ show: true, message, type })
  }

  // Auto-ocultar notificación después de 4 segundos
  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification(prev => ({ ...prev, show: false }))
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notification.show])

  // Detectar si es móvil y ajustar items por página
  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1024 // lg breakpoint
      setItemsPerPage(mobile ? 6 : 10)
    }
    checkIsMobile()
    window.addEventListener('resize', checkIsMobile)
    return () => window.removeEventListener('resize', checkIsMobile)
  }, [])

  // Al cambiar el tamaño de página, volver a la primera página
  useEffect(() => {
    setCurrentPage(1)
  }, [itemsPerPage])

  useEffect(() => {
    if (user?.rol === 'coordinador' && userEmpresaId) {
      loadAssignedUsers()
    } else {
      setAssignedUsers([])
    }
  }, [user?.rol, userEmpresaId])

  // Cargar empresas para filtros si es administrador
  useEffect(() => {
    if (user?.rol === 'administrador') {
      loadCompanies()
    }
  }, [user?.rol])

  // Debounce del filtro de teléfono: 1 segundo después de que el usuario deje de escribir
  useEffect(() => {
    const timer = setTimeout(() => {
      setPhoneFilterDebounced(phoneFilter)
    }, 1000)
    return () => clearTimeout(timer)
  }, [phoneFilter])

  // Filtrar usuarios para el dropdown basado en el texto de búsqueda
  const filteredAssignedUsers = useMemo(() => {
    if (!userSearchText.trim()) return assignedUsers
    const searchLower = userSearchText.toLowerCase()
    return assignedUsers.filter(userProfile => {
      const nombre = (userProfile.nombre || '').toLowerCase()
      const email = (userProfile.email || '').toLowerCase()
      const rol = (userProfile.rol || '').toLowerCase()
      return nombre.includes(searchLower) || email.includes(searchLower) || rol.includes(searchLower)
    })
  }, [assignedUsers, userSearchText])

  // Cargar página actual desde el servidor (paginación y filtros en servidor)
  const fetchCurrentPage = useCallback(async () => {
    if (!user) return
    const startDateISO = appliedDateRange.startDate ? `${appliedDateRange.startDate}T00:00:00.000Z` : ''
    const endDateISO = appliedDateRange.endDate ? `${appliedDateRange.endDate}T23:59:59.999Z` : ''
    const dateField = getDateFieldByRole(user?.rol)
    await loadActiveLeadsPage({
      startDate: startDateISO,
      endDate: endDateISO,
      dateField,
      page: currentPage,
      limit: itemsPerPage,
      phoneFilter: phoneFilterDebounced || undefined,
      statusFilter: statusFilter || undefined,
      empresaFilter: empresaFilter || undefined,
      assignedUserId: assignedUserId || undefined
    })
  }, [
    user,
    appliedDateRange.startDate,
    appliedDateRange.endDate,
    currentPage,
    itemsPerPage,
    phoneFilterDebounced,
    statusFilter,
    empresaFilter,
    assignedUserId,
    loadActiveLeadsPage
  ])

  useEffect(() => {
    if (!user) return
    fetchCurrentPage()
  }, [user, fetchCurrentPage])

  // Resetear a página 1 cuando cambien filtros (excepto página)
  useEffect(() => {
    setCurrentPage(1)
  }, [phoneFilterDebounced, statusFilter, empresaFilter, assignedUserId])

  // Al cambiar página, recargar (fetchCurrentPage ya depende de currentPage)
  // - ya cubierto por fetchCurrentPage en el useEffect anterior

  // Paginación calculada desde el total del servidor
  const totalPages = Math.max(1, Math.ceil(activeLeadsTotalCount / itemsPerPage))
  const startIndex = activeLeadsTotalCount === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, activeLeadsTotalCount)

  // Leads mostrados son exactamente la página actual del servidor (sin slice en cliente)
  const paginatedLeads = activeLeads

  // Función para aplicar el filtro de fecha manualmente
  const handleApplyDateFilter = async () => {
    if (!user) return
    setAppliedDateRange({ ...dateRange })
    setCurrentPage(1)
    const startDateISO = dateRange.startDate ? `${dateRange.startDate}T00:00:00.000Z` : ''
    const endDateISO = dateRange.endDate ? `${dateRange.endDate}T23:59:59.999Z` : ''
    const dateField = getDateFieldByRole(user?.rol)
    try {
      await loadActiveLeadsPage({
        startDate: startDateISO,
        endDate: endDateISO,
        dateField,
        page: 1,
        limit: itemsPerPage,
        phoneFilter: phoneFilterDebounced || undefined,
        statusFilter: statusFilter || undefined,
        empresaFilter: empresaFilter || undefined,
        assignedUserId: assignedUserId || undefined
      })
    } catch (error) {
      console.error('Error loading leads with date range:', error)
    }
  }







  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead)
    setObservations(lead.observaciones || '')
    setShowDetailsModal(true)
  }

  const handleUpdateObservations = async () => {
    if (selectedLead) {
      try {
        await updateLeadObservations(selectedLead.id, observations)
        setShowDetailsModal(false)
        setSelectedLead(null)
        setObservations('')
        await fetchCurrentPage()
      } catch (error) {
        console.error('Error updating observations:', error)
      }
    }
  }

  const handleRehusarLead = useCallback(async (lead: Lead) => {
    if (!user?.id) return

    // Si es un agente, verificar que su empresa permita rehusar leads
    if (user?.rol === 'agente' && user.id === lead.user_id) {
      if (!userEmpresaConfiguracion?.rehusarLeadsAgentes) {
        showNotification(
          'Tu empresa no permite que los agentes rehúsen sus propios leads. Contacta con tu coordinador si necesitas ayuda con este lead.',
          'error'
        )
        return
      }
    }

    try {
      // Si el lead pertenece a la empresa 15, desasignarlo en Callbell
      if (lead.empresa_id === 15) {
        const callbellResult = await callbellService.unassignLeadFromCallbell(lead.id, lead.user_id || undefined)
        
        // Si falla con 403 o 404, mostrar notificación amarilla y continuar
        if (!callbellResult.success && callbellResult.error) {
          showNotification(callbellResult.error, 'warning')
        }
      }
      
      await leadsService.rehusarLead(lead.id, user.id)
      
      // Si es un agente rehusando su propio lead, eliminarlo de la lista
      if (user?.rol === 'agente' && user.id === lead.user_id) {
        removeActiveLeadLocally(lead.id)
        showNotification('Lead rehusado correctamente. Ya no aparece en tu lista.', 'success')
        fetchCurrentPage()
      } else {
        // Si es un coordinador, solo actualizar el estado del lead
        updateActiveLeadLocally(lead.id, { 
          user_id: undefined, 
          usuario_nombre: undefined, 
          fecha_asignacion_usuario: undefined 
        })
        showNotification('Lead rehusado correctamente', 'success')
      }
    } catch (error) {
      console.error('Error rehusing lead:', error)
      showNotification(error instanceof Error ? error.message : 'Error al rehusar el lead', 'error')
    }
  }, [user, userEmpresaConfiguracion, updateActiveLeadLocally, removeActiveLeadLocally, showNotification, fetchCurrentPage])

  const getActionMenuItems = useCallback((lead: Lead): ActionMenuItem[] => {
    // Si es administrador, mostrar "Ver detalles" y "Archivos adjuntos"
    if (user?.rol === 'administrador') {
      return [
        {
          label: 'Ver detalles',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          ),
          onClick: () => handleViewDetails(lead)
        },
        {
          label: 'Archivos adjuntos',
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          ),
          onClick: () => handleVerArchivosAdjuntos(lead),
          className: 'text-blue-600 hover:bg-blue-50'
        }
      ]
    }

    // Para coordinadores y agentes
    const items: ActionMenuItem[] = [
      {
        label: 'Ver detalles',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        ),
        onClick: () => handleViewDetails(lead)
      },
      {
        label: 'Archivos adjuntos',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        ),
        onClick: () => handleVerArchivosAdjuntos(lead),
        className: 'text-blue-600 hover:bg-blue-50'
      }
    ]

    // Agregar opción de rehusar lead si el usuario es coordinador o agente
    if (user?.rol === 'coordinador' || user?.rol === 'agente') {
      items.push({
        label: 'Rehusar lead',
        icon: (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
        onClick: () => handleRehusarLead(lead),
        className: 'text-orange-600 hover:bg-orange-50'
      })
    }

    return items
  }, [user?.rol, handleRehusarLead])



  const handleStatusChange = useCallback(async (leadId: number, newStatus: string) => {
    try {
      // Obtener el lead actual para verificar si ya está asignado
      const currentLead = activeLeads.find(lead => lead.id === leadId)
      
      // Si es coordinador, verificar si el lead ya está asignado a otro usuario
      if (user?.rol === 'coordinador' && currentLead?.user_id && currentLead.user_id !== user.id) {
        showNotification(
          `Este lead ya está asignado a ${currentLead.usuario_nombre || 'otro usuario'}. No puedes cambiar su estado.`, 
          'error'
        )
        return
      }

      // Si es coordinador y el lead no está asignado, asignarlo al coordinador
      if (user?.rol === 'coordinador' && !currentLead?.user_id) {
        await leadsService.assignLeadToAgent(leadId, user.id)
      }

      // Actualizar el estado del lead
      await updateLeadStatus(leadId, newStatus)
      
      // Si el estado es 'convertido', 'no_cerrado' o 'no_valido', el lead debe desaparecer de la lista activa
      if (newStatus === 'convertido' || newStatus === 'no_cerrado' || newStatus === 'no_valido') {
        // Eliminar el lead del store global
        removeActiveLeadLocally(leadId)
        showNotification('Lead movido al historial correctamente', 'success')
      } else {
        // Preparar las actualizaciones del lead
        const leadUpdates: Partial<Lead> = {
          estado_temporal: newStatus,
          // Si es coordinador y el lead no estaba asignado, actualizar la asignación localmente
          ...(user?.rol === 'coordinador' && !currentLead?.user_id ? {
            user_id: user.id,
            usuario_nombre: user.nombre || user.email,
            fecha_asignacion_usuario: new Date().toISOString()
          } : {})
        }

        // Actualizar el store global
        updateActiveLeadLocally(leadId, leadUpdates)
        
        // Mostrar notificación de éxito
        if (user?.rol === 'coordinador' && !currentLead?.user_id) {
          showNotification('Lead asignado y estado actualizado correctamente', 'success')
        } else {
          showNotification('Estado del lead actualizado correctamente', 'success')
        }
      }
    } catch (error) {
      console.error('Error updating lead status:', error)
      showNotification('Error al actualizar el estado del lead', 'error')
    }
  }, [activeLeads, user, updateLeadStatus, updateActiveLeadLocally, removeActiveLeadLocally, showNotification])

  const handleSolicitarLead = async () => {
    if (!user?.id || !userEmpresaId) return

    setSolicitudLoading(true)
    try {
      // Obtener configuración de empresa desde la base de datos
      const configuracion = await leadSolicitudesService.getEmpresaConfiguracion(userEmpresaId)

      // Verificar si el agente puede solicitar más leads
      const puedeSolicitarResult = await leadSolicitudesService.puedeSolicitarLead(
        user.id, 
        userEmpresaId, 
        configuracion.maxSolicitudesPorAgente
      )

      if (!puedeSolicitarResult.puedeSolicitar) {
        let mensajeError = ''
        
        if (puedeSolicitarResult.razon === 'leads_sin_tratar') {
          mensajeError = `No puedes solicitar más leads. Ya tienes ${puedeSolicitarResult.numLeadsSinTratar} lead(s) sin tratar (máximo permitido: ${configuracion.maxSolicitudesPorAgente}).`
        } else if (puedeSolicitarResult.razon === 'solicitudes_pendientes') {
          mensajeError = `No puedes solicitar más leads. Ya tienes ${puedeSolicitarResult.numSolicitudesPendientes} solicitud(es) pendiente(s) sin respuesta (máximo permitido: ${configuracion.maxSolicitudesPorAgente}).`
        } else if (puedeSolicitarResult.razon === 'ambos') {
          mensajeError = `No puedes solicitar más leads. Ya tienes ${puedeSolicitarResult.numLeadsSinTratar} lead(s) sin tratar y ${puedeSolicitarResult.numSolicitudesPendientes} solicitud(es) pendiente(s) (máximo permitido: ${configuracion.maxSolicitudesPorAgente}).`
        } else {
          mensajeError = `No puedes solicitar más leads. Ya tienes el máximo permitido (${configuracion.maxSolicitudesPorAgente}).`
        }
        
        showNotification(mensajeError, 'error')
        setSolicitudLoading(false)
        return
      }

      // Si la asignación es automática
      if (configuracion.solicitudesAutomaticas) {
        // 1) Crear solicitud (registro)
        const solicitud = await leadSolicitudesService.createSolicitud({
          solicitante_user_id: user.id
        })

        // 2) Obtener el lead más reciente sin asignar de la empresa
        const leadId = await leadSolicitudesService.getLeadMasRecienteSinAsignar(userEmpresaId)

        if (!leadId) {
          // Si no hay leads, rechazar la solicitud creada y notificar
          await leadSolicitudesService.rechazarSolicitud(solicitud.id, user.id)
          showNotification('No hay leads disponibles para asignar en este momento', 'error')
        } else {
          // 3) Aprobar la solicitud y asignar el lead
          const aprobarResult = await leadSolicitudesService.aprobarSolicitud(solicitud.id, leadId, user.id)

          // Si hay error de Callbell, mostrar notificación amarilla
          if (aprobarResult.callbellError) {
            showNotification(aprobarResult.callbellError, 'warning')
          }

          showNotification('¡Lead asignado automáticamente! Ya tienes un nuevo lead para trabajar.', 'success')
          await fetchCurrentPage()
        }
      } else {
        // Asignación manual - crear solicitud normal
        await leadSolicitudesService.createSolicitud({
          solicitante_user_id: user.id
        })
        showNotification('Solicitud enviada correctamente. El coordinador revisará tu solicitud.', 'success')
      }
      
      setShowSolicitudModal(false)
    } catch (error) {
      console.error('Error creating solicitud:', error)
      showNotification('Error al procesar la solicitud. Inténtalo de nuevo.', 'error')
    } finally {
      setSolicitudLoading(false)
    }
  }

  const handleVerArchivosAdjuntos = async (lead: Lead) => {
    setSelectedLead(lead)
    setArchivosLoading(true)
    setShowArchivosModal(true)
    setArchivosCurrentPage(1)
    
    try {
      const archivos = await archivosAdjuntosService.getArchivosByLeadId(lead.id)
      setArchivosAdjuntos(archivos)
    } catch (error) {
      console.error('Error loading archivos adjuntos:', error)
      showNotification('Error al cargar los archivos adjuntos', 'error')
      setArchivosAdjuntos([])
    } finally {
      setArchivosLoading(false)
    }
  }

  const handleVerImagen = (archivo: ArchivoAdjunto) => {
    setSelectedImage(archivo)
    setShowImageViewer(true)
  }

  const handleAbrirPdf = (archivo: ArchivoAdjunto) => {
    if (archivo.url) {
      window.open(archivo.url, '_blank')
    }
  }

  const handleDescargarArchivo = async (archivo: ArchivoAdjunto) => {
    try {
      await archivosAdjuntosService.downloadArchivo(archivo.bucket, archivo.path, archivo.filename)
      showNotification('Archivo descargado correctamente', 'success')
    } catch (error) {
      console.error('Error downloading file:', error)
      showNotification('Error al descargar el archivo', 'error')
    }
  }

  const handleCerrarImageViewer = () => {
    setShowImageViewer(false)
    setSelectedImage(null)
  }

  const loadAssignedUsers = async () => {
    if (!userEmpresaId) return

    try {
      const profiles = await fetchAssignedUsers(supabase, userEmpresaId)
      setAssignedUsers(profiles)
    } catch (error) {
      console.error('Error loading assigned users:', error)
    }
  }

  const loadCompanies = async () => {
    try {
      const companiesData = await companyService.getCompanies()
      setCompanies(companiesData.map(company => ({ id: company.id, nombre: company.nombre })))
    } catch (error) {
      console.error('Error loading companies:', error)
    }
  }

  // Calcular paginación para archivos adjuntos
  const archivosTotalPages = Math.ceil(archivosAdjuntos.length / archivosPerPage)
  const archivosStartIndex = (archivosCurrentPage - 1) * archivosPerPage
  const archivosEndIndex = archivosStartIndex + archivosPerPage
  const paginatedArchivos = archivosAdjuntos.slice(archivosStartIndex, archivosEndIndex)

  const filtersGridCols =
    user?.rol === 'administrador'
      ? 'sm:grid-cols-2 lg:grid-cols-4'
      : user?.rol === 'coordinador'
        ? 'sm:grid-cols-2 lg:grid-cols-4'
        : 'sm:grid-cols-3'

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando leads...</span>
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
      {/* Notification */}
      {notification.show && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10003] max-w-md w-full mx-4">
          <div className={`rounded-lg shadow-lg p-4 flex items-center justify-between ${
            notification.type === 'success' ? 'bg-green-50 border border-green-200' :
            notification.type === 'error' ? 'bg-red-50 border border-red-200' :
            notification.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
                notification.type === 'success' ? 'bg-green-100' :
                notification.type === 'error' ? 'bg-red-100' :
                notification.type === 'warning' ? 'bg-yellow-100' :
                'bg-blue-100'
              }`}>
                {notification.type === 'success' ? (
                  <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : notification.type === 'error' ? (
                  <svg className="w-3 h-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : notification.type === 'warning' ? (
                  <svg className="w-3 h-3 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <p className={`ml-3 text-sm font-medium ${
                notification.type === 'success' ? 'text-green-800' :
                notification.type === 'error' ? 'text-red-800' :
                notification.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {notification.message}
              </p>
            </div>
            <button
              onClick={() => setNotification(prev => ({ ...prev, show: false }))}
              className={`ml-4 flex-shrink-0 ${
                notification.type === 'success' ? 'text-green-400 hover:text-green-600' :
                notification.type === 'error' ? 'text-red-400 hover:text-red-600' :
                notification.type === 'warning' ? 'text-yellow-400 hover:text-yellow-600' :
                'text-blue-400 hover:text-blue-600'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

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
            <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">Leads Activos</h1>
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {user?.rol === 'administrador' 
              ? 'Administra y visualiza todos los leads generados en redes sociales' 
              : `Leads asignados a ${userEmpresaNombre || user?.empresa || 'tu empresa'}`
            }
          </p>
        </div>

        {/* Solicitar Lead Button - Solo para agentes */}
        {user?.rol === 'agente' && (
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#373643] mb-1">Solicitar Lead</h3>
                <p className="text-sm text-gray-600">
                  ¿Necesitas más leads para trabajar? Solicita leads adicionales a tu coordinador.
                </p>
              </div>
              <button
                onClick={() => setShowSolicitudModal(true)}
                className="px-6 py-2 bg-[#18cb96] text-white font-medium rounded-lg hover:bg-[#15b885] transition-colors flex items-center"
              >
                <span className="mr-2">📝</span>
                Solicitar Lead
              </button>
            </div>
          </div>
        )}

        {/* Filtro de rango de fechas - destacado en verde, arriba en desktop, oculto en móvil */}
        <div className="hidden lg:block bg-gradient-to-r from-[#18cb96]/10 to-[#15b885]/10 border-2 border-[#18cb96] rounded-lg p-4 mb-4">
          {/* Contenido centrado con max-width */}
          <div className="max-w-md mx-auto">
            <label className="text-sm font-semibold text-[#18cb96] mb-3 flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Rango de Fechas
            </label>
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="w-40">
                <label htmlFor="startDate" className="block text-xs font-medium text-[#373643] mb-1 text-center">
                  Desde
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-[#18cb96] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm bg-white"
                />
              </div>
              <div className="w-40">
                <label htmlFor="endDate" className="block text-xs font-medium text-[#373643] mb-1 text-center">
                  Hasta
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-[#18cb96] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm bg-white"
                />
              </div>
              <button
                onClick={handleApplyDateFilter}
                disabled={loading}
                className="px-4 py-2 bg-[#18cb96] text-white font-medium rounded-lg hover:bg-[#15b885] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed self-end"
              >
                {loading ? 'Cargando...' : 'Aplicar'}
              </button>
            </div>
            <div className="mt-2 p-2 bg-[#18cb96]/20 rounded-md">
              <p className="text-xs font-medium text-[#15b885] flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(() => {
                  const start = new Date(appliedDateRange.startDate)
                  const end = new Date(appliedDateRange.endDate)
                  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                  const isLast7Days = daysDiff === 7 && end.toDateString() === new Date().toDateString()
                  return isLast7Days 
                    ? 'Mostrando leads de los últimos 7 días'
                    : `Mostrando leads del ${start.toLocaleDateString('es-ES')} al ${end.toLocaleDateString('es-ES')}`
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Filters and Export */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Filters Row */}
            <div className={`grid grid-cols-1 gap-4 ${filtersGridCols}`}>
                {/* Filtro de rango de fechas - solo visible en móvil */}
                <div className="lg:hidden bg-gradient-to-r from-[#18cb96]/10 to-[#15b885]/10 border-2 border-[#18cb96] rounded-lg p-4">
                  <label className="text-sm font-semibold text-[#18cb96] mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Rango de Fechas
                  </label>
                  <div className="grid grid-cols-2 gap-3 mb-2">
                    <div>
                      <label htmlFor="startDateMobile" className="text-xs font-medium text-[#373643] mb-1">
                        Desde
                      </label>
                      <input
                        type="date"
                        id="startDateMobile"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-[#18cb96] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="endDateMobile" className="text-xs font-medium text-[#373643] mb-1">
                        Hasta
                      </label>
                      <input
                        type="date"
                        id="endDateMobile"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 border-2 border-[#18cb96] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm bg-white"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleApplyDateFilter}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-[#18cb96] text-white font-medium rounded-lg hover:bg-[#15b885] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed mb-2"
                  >
                    {loading ? 'Cargando...' : 'Aplicar'}
                  </button>
                  <div className="mt-2 p-2 bg-[#18cb96]/20 rounded-md">
                    <p className="text-xs font-medium text-[#15b885] flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {(() => {
                        const start = new Date(appliedDateRange.startDate)
                        const end = new Date(appliedDateRange.endDate)
                        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                        const isLast7Days = daysDiff === 7 && end.toDateString() === new Date().toDateString()
                        return isLast7Days 
                          ? 'Mostrando leads de los últimos 7 días'
                          : `Mostrando leads del ${start.toLocaleDateString('es-ES')} al ${end.toLocaleDateString('es-ES')}`
                      })()}
                    </p>
                  </div>
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
                  <option value="sin_tratar">Sin Tratar</option>
                  <option value="no_contesta">No Contesta</option>
                  <option value="no_valido">No Valido</option>
                  <option value="gestion">En gestión</option>
                  <option value="convertido">Convertido</option>
                  <option value="no_cerrado">No Cerrado</option>
                </select>
              </div>
              {user?.rol === 'coordinador' && (
                <div className="relative">
                  <label htmlFor="assignedUserFilter" className="block text-sm font-medium text-[#373643] mb-2">
                    Filtrar por usuario asignado
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="assignedUserFilter"
                      placeholder="Buscar usuario..."
                      value={showUserDropdown ? userSearchText : assignedUserFilter}
                      onChange={(e) => {
                        setUserSearchText(e.target.value)
                        if (!showUserDropdown) setShowUserDropdown(true)
                      }}
                      onFocus={() => {
                        setShowUserDropdown(true)
                        setUserSearchText(assignedUserFilter)
                      }}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className={`w-4 h-4 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {/* Dropdown */}
                  {showUserDropdown && (
                    <>
                      {/* Overlay para cerrar el dropdown al hacer clic fuera */}
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => {
                          setShowUserDropdown(false)
                          setUserSearchText('')
                        }}
                      />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {/* Opción para limpiar filtro */}
                        <button
                          type="button"
                          onClick={() => {
                            setAssignedUserFilter('')
                            setAssignedUserId('')
                            setUserSearchText('')
                            setShowUserDropdown(false)
                          }}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer ${
                            !assignedUserFilter ? 'bg-[#e8faf5] text-[#18cb96] font-medium' : 'text-gray-600'
                          }`}
                        >
                          Todos los usuarios
                        </button>
                        
                        {/* Lista de usuarios */}
                        {filteredAssignedUsers.length > 0 ? (
                          filteredAssignedUsers.map(userProfile => {
                            const displayName = userProfile.nombre || userProfile.email || 'Sin nombre'
                            const isSelected = assignedUserFilter === displayName
                            return (
                              <button
                                type="button"
                                key={userProfile.user_id}
                                onClick={() => {
                                  setAssignedUserFilter(displayName)
                                  setAssignedUserId(userProfile.user_id)
                                  setUserSearchText('')
                                  setShowUserDropdown(false)
                                }}
                                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors cursor-pointer flex items-center justify-between ${
                                  isSelected ? 'bg-[#e8faf5]' : ''
                                }`}
                              >
                                <div className="flex flex-col min-w-0">
                                  <span className={`truncate ${isSelected ? 'text-[#18cb96] font-medium' : 'text-[#373643]'}`}>
                                    {displayName}
                                  </span>
                                  {userProfile.email && userProfile.nombre && (
                                    <span className="text-xs text-gray-400 truncate">{userProfile.email}</span>
                                  )}
                                </div>
                                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                                  userProfile.rol === 'coordinador' 
                                    ? 'bg-purple-100 text-purple-700' 
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {userProfile.rol === 'coordinador' ? 'Coord.' : 'Agente'}
                                </span>
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-500 text-center">
                            No se encontraron usuarios
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
              {user?.rol === 'administrador' && (
                <div>
                  <label htmlFor="empresaFilter" className="block text-sm font-medium text-[#373643] mb-2">
                    Filtrar por empresa
                  </label>
                  <select
                    id="empresaFilter"
                    value={empresaFilter}
                    onChange={(e) => setEmpresaFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  >
                    <option value="">Todas las empresas</option>
                    {companies.map(company => (
                      <option key={company.id} value={company.id}>
                        {company.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Mobile Cards View */}
          <div className="lg:hidden">
            {paginatedLeads.map((lead) => (
              <LeadMobileCard
                key={lead.id}
                lead={lead}
                onStatusChange={handleStatusChange}
                getStatusTextColor={getStatusTextColor}
                getActionMenuItems={getActionMenuItems}
                user={user}
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                    {user?.rol === 'coordinador' ? 'Asignado a' : 'Fecha Entrada'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                    Calidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                    Teléfono
                  </th>
                  {user?.rol !== 'administrador' && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                      Plataforma
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                    Estado
                  </th>
                  {user?.rol === 'administrador' && (
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
                {paginatedLeads.map((lead) => (
                  <LeadDesktopRow
                    key={lead.id}
                    lead={lead}
                    onStatusChange={handleStatusChange}
                    getStatusTextColor={getStatusTextColor}
                    getActionMenuItems={getActionMenuItems}
                    user={user}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="hidden lg:block text-xs sm:text-sm text-gray-700">
                Mostrando <span className="font-medium">{startIndex}-{endIndex}</span> de <span className="font-medium">{activeLeadsTotalCount}</span> leads
                {user?.rol !== 'administrador' && (
                  <span className="ml-2 text-[#18cb96]">(filtrados por empresa)</span>
                )}
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details Modal overlay */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowDetailsModal(false)}
        />
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedLead && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">Detalles del Lead</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Lead Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96] hover:border-[#15b885] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Nombre del Cliente</label>
                  <p className="text-sm text-gray-700">{selectedLead.nombre_cliente}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96] hover:border-[#15b885] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Teléfono</label>
                  <p className="text-sm text-gray-700">{selectedLead.telefono}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96] hover:border-[#15b885] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Plataforma</label>
                  <p className="text-sm text-gray-700">{selectedLead.plataforma_lead}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96] hover:border-[#15b885] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
                  <label className="block text-sm font-medium text-[#373643] mb-1">
                    {user?.rol === 'coordinador' ? 'Fecha de Asignación' : user?.rol === 'agente' ? 'Fecha de Asignación Agente' : 'Fecha de Entrada'}
                  </label>
                  <p className="text-sm text-gray-700">
                    {(() => {
                      const dateField = getDateFieldByRole(user?.rol)
                      const dateValue = selectedLead[dateField]
                      return dateValue ? new Date(dateValue).toLocaleDateString('es-ES') : 'Sin fecha'
                    })()}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96] hover:border-[#15b885] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
                  <label className="block text-sm font-medium text-[#373643] mb-1">Estado Actual</label>
                  <p className="text-sm text-gray-700">{getStatusDisplayName(selectedLead.estado_temporal || 'sin_tratar')}</p>
                </div>
                {user?.rol === 'administrador' && (
                  <div className="bg-gray-50 p-4 rounded-lg border border-[#18cb96] hover:border-[#15b885] hover:shadow-md transition-all duration-200 transform hover:-translate-y-0.5">
                    <label className="block text-sm font-medium text-[#373643] mb-1">Empresa</label>
                    <p className="text-sm text-gray-700">{selectedLead.empresa_nombre || '-'}</p>
                  </div>
                )}
              </div>

              {/* Observations Section */}
              <div>
                <label htmlFor="observations" className="block text-sm font-medium text-[#373643] mb-2">
                  Observaciones
                </label>
                <textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Añade observaciones sobre este lead..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowDetailsModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleUpdateObservations}
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors"
                >
                  Actualizar Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Solicitud Modal overlay */}
      {showSolicitudModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowSolicitudModal(false)}
        />
      )}

      {/* Solicitud Confirmation Modal */}
      {showSolicitudModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">Solicitar Lead</h2>
              <button
                onClick={() => setShowSolicitudModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Información importante
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Al solicitar un lead, tu coordinador recibirá una notificación y podrá asignarte 
                        un lead adicional cuando esté disponible. La solicitud será revisada en breve.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-700">
                  <strong>Agente:</strong> {user?.nombre || user?.email}<br />
                  <strong>Empresa:</strong> {userEmpresaNombre || 'No asignada'}<br />
                  <strong>Fecha:</strong> {new Date().toLocaleDateString('es-ES')}
                </p>
                {userEmpresaConfiguracion && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <strong>Configuración de empresa:</strong><br />
                      • Máximo de leads simultáneos: {userEmpresaConfiguracion.maxSolicitudesPorAgente}<br />
                      • Asignación: {userEmpresaConfiguracion.solicitudesAutomaticas ? 'Automática' : 'Manual'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSolicitudModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSolicitarLead}
                  disabled={solicitudLoading}
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {solicitudLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Enviando...
                    </>
                  ) : (
                    'Confirmar Solicitud'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Archivos Adjuntos Modal overlay */}
      {showArchivosModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999]"
          onClick={() => setShowArchivosModal(false)}
        />
      )}

      {/* Archivos Adjuntos Modal */}
      {showArchivosModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between mb-6 p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">
                Archivos Adjuntos - {selectedLead?.nombre_cliente}
              </h2>
              <button
                onClick={() => setShowArchivosModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {archivosLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
                  <span className="ml-3 text-gray-600">Cargando archivos...</span>
                </div>
              ) : archivosAdjuntos.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No hay archivos adjuntos</h3>
                  <p className="mt-1 text-sm text-gray-500">Este lead no tiene archivos adjuntos.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-semibold text-[#373643] mb-3">Archivos Adjuntos</h3>
                  {/* Grid de archivos */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    {paginatedArchivos.map((archivo) => (
                      <div
                        key={archivo.id}
                        className="relative group cursor-pointer"
                        onClick={() => {
                          if (archivosAdjuntosService.isImage(archivo.mime_type)) {
                            handleVerImagen(archivo)
                          } else if (archivosAdjuntosService.isPdf(archivo.mime_type)) {
                            handleAbrirPdf(archivo)
                          }
                        }}
                      >
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-[#18cb96] hover:border-[#15b885] hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1 relative">
                          {archivosAdjuntosService.isImage(archivo.mime_type) ? (
                            <img
                              src={archivo.url}
                              alt={archivo.filename}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.style.display = 'none'
                                target.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                              {archivosAdjuntosService.getFileIcon(archivo.mime_type)}
                            </div>
                          )}
                          
                          {/* Fallback para imágenes que no cargan */}
                          {archivosAdjuntosService.isImage(archivo.mime_type) && (
                            <div className="hidden w-full h-full items-center justify-center text-4xl">
                              {archivosAdjuntosService.getFileIcon(archivo.mime_type)}
                            </div>
                          )}
                          
                          {/* Overlay con acciones - solo cubre el contenido interno */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDescargarArchivo(archivo)
                                }}
                                className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                                title="Descargar"
                              >
                                <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                              {archivosAdjuntosService.isImage(archivo.mime_type) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleVerImagen(archivo)
                                  }}
                                  className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                                  title="Ver imagen"
                                >
                                  <svg className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    ))}
                  </div>

                  {/* Paginación */}
                  {archivosTotalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="text-sm text-gray-700">
                        Mostrando {archivosStartIndex + 1}-{Math.min(archivosEndIndex, archivosAdjuntos.length)} de {archivosAdjuntos.length} archivos
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setArchivosCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={archivosCurrentPage === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        
                        <span className="text-sm text-gray-700">
                          Página {archivosCurrentPage} de {archivosTotalPages}
                        </span>
                        
                        <button
                          onClick={() => setArchivosCurrentPage(prev => Math.min(prev + 1, archivosTotalPages))}
                          disabled={archivosCurrentPage === archivosTotalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Viewer Modal overlay */}
      {showImageViewer && (
        <div
          className="fixed inset-0 bg-black/50 z-[10001]"
          onClick={handleCerrarImageViewer}
        />
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && selectedImage && (
        <div className="fixed inset-0 flex items-center justify-center z-[10002] p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            {/* Botón de cerrar */}
            <button
              onClick={handleCerrarImageViewer}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Botón de descargar */}
            <button
              onClick={() => handleDescargarArchivo(selectedImage)}
              className="absolute top-4 right-16 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-colors"
              title="Descargar imagen"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>

            {/* Imagen */}
            <img
              src={selectedImage.url}
              alt={selectedImage.filename}
              className="w-full h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

    </>
  )
}

export default Leads 