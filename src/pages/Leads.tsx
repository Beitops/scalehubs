import { useState, useEffect, memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import type { Lead } from '../services/leadsService'
import { leadsService, type ImportLeadData } from '../services/leadsService'
import { ActionMenu } from '../components/ActionMenu'
import { leadSolicitudesService } from '../services/leadSolicitudesService'
import { archivosAdjuntosService, type ArchivoAdjunto } from '../services/archivosAdjuntosService'
import { companyService } from '../services/companyService'
import { callbellService } from '../services/callbellService'
import { supabase } from '../lib/supabase'
import axios from 'axios'
import type { AssignedUserProfile } from '../services/LeadsFilterService'
import {
  createAssignedUsersById,
  fetchAssignedUsers,
  filterLeads
} from '../services/LeadsFilterService'

interface ActionMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
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
        <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
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
        <div className="text-sm font-medium text-[#373643]">{lead.nombre_cliente}</div>
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
  const [dateFilter, setDateFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('')
  const [assignedUserFilter, setAssignedUserFilter] = useState('')
  const [showExportModal, setShowExportModal] = useState(false)
  const [showReturnModal, setShowReturnModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [observations, setObservations] = useState('')
  const [exportDateRange, setExportDateRange] = useState({
    startDate: '',
    endDate: ''
  })
  const [showSolicitudModal, setShowSolicitudModal] = useState(false)
  const [solicitudLoading, setSolicitudLoading] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ show: false, message: '', type: 'info' })
  const [localActiveLeads, setLocalActiveLeads] = useState<Lead[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showArchivosModal, setShowArchivosModal] = useState(false)
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<ArchivoAdjunto[]>([])
  const [archivosLoading, setArchivosLoading] = useState(false)
  const [showImageViewer, setShowImageViewer] = useState(false)
  const [selectedImage, setSelectedImage] = useState<ArchivoAdjunto | null>(null)
  const [archivosCurrentPage, setArchivosCurrentPage] = useState(1)
  const archivosPerPage = 5
  
  // Estados para importación
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMode, setImportMode] = useState<'manual' | 'csv'>('manual')
  const [importLoading, setImportLoading] = useState(false)
  const [companies, setCompanies] = useState<Array<{id: number, nombre: string}>>([])
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [manualFormData, setManualFormData] = useState({
    nombre_cliente: '',
    telefono: '',
    empresa_id: '',
    campaña_id: '',
    hub_id: ''
  })
  const [sendCallbell, setSendCallbell] = useState(false)
  const [campaigns, setCampaigns] = useState<Array<{id: number, nombre: string, meta_plataforma_id: string | null}>>([])
  const [hubs, setHubs] = useState<Array<{id: number, nombre: string}>>([])
  const [assignedUsers, setAssignedUsers] = useState<AssignedUserProfile[]>([])
  
  const { user, userEmpresaId, userEmpresaNombre, userEmpresaConfiguracion } = useAuthStore()
  const {
    loading, 
    error, 
    refreshLeads, 
    updateLeadStatus, 
    updateLeadObservations,
    returnLead,
    getLeadsInDateRange,
    activeLeads,
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

  // Sincronizar estado local con el estado global
  useEffect(() => {
    setLocalActiveLeads(activeLeads)
  }, [activeLeads])

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

  // Cargar empresas cuando se abra el modal de importación o si es administrador
  useEffect(() => {
    if (showImportModal || user?.rol === 'administrador') {
      loadCompanies()
      loadCampaigns()
      loadHubs()
    }
  }, [showImportModal, user?.rol])

  useEffect(() => {
    if (user?.rol === 'coordinador' && userEmpresaId) {
      loadAssignedUsers()
    } else {
      setAssignedUsers([])
    }
  }, [user?.rol, userEmpresaId])

  const assignedUsersById = useMemo(
    () => createAssignedUsersById(assignedUsers),
    [assignedUsers]
  )

  const filteredLeads = useMemo(
    () =>
      filterLeads(localActiveLeads, {
        dateFilter,
        phoneFilter,
        statusFilter,
        empresaFilter,
        assignedUserFilter,
        assignedUsersById,
        statusGetter: (lead: Lead) => lead.estado_temporal
      }),
    [
      localActiveLeads,
      dateFilter,
      phoneFilter,
      statusFilter,
      empresaFilter,
      assignedUserFilter,
      assignedUsersById
    ]
  )

  // Calcular paginación
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [dateFilter, phoneFilter, statusFilter, empresaFilter, assignedUserFilter])

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
          setLeadsToExport(leadsInRange)
        } catch (error) {
          console.error('Error fetching leads in date range:', error)
          setLeadsToExport([])
        }
      } else {
        setLeadsToExport([])
      }
    }

    fetchLeadsInRange()
  }, [exportDateRange])



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
          getStatusDisplayName(lead.estado_temporal || 'sin_tratar')
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
    // Verificar que el lead tenga estado_temporal 'no_valido'
    if (lead.estado_temporal !== 'no_valido') {
      showNotification('Solo se pueden devolver leads con estado "No Válido". Por favor, tipifica el lead como "No Válido" antes de devolverlo.', 'error')
      return
    }
    
    setSelectedLead(lead)
    setShowReturnModal(true)
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
        
        // Recargar leads para actualizar la vista
        await refreshLeads()
      } catch (error) {
        console.error('Error updating observations:', error)
      }
    }
  }

  const getActionMenuItems = (lead: Lead): ActionMenuItem[] => {
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

    // Agregar opción de devolver lead
    items.push({
      label: 'Devolver lead',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m5 14v-5a2 2 0 00-2-2H6a2 2 0 00-2 2v5a2 2 0 002 2h12a2 2 0 002-2z" />
        </svg>
      ),
      onClick: () => handleReturnLead(lead),
      className: 'text-red-600 hover:bg-red-50'
    })

    return items
  }



  const handleConfirmReturn = async () => {
    if (selectedLead && user?.id) {
      // Verificar nuevamente que el lead tenga estado_temporal 'no_valido'
      if (selectedLead.estado_temporal !== 'no_valido') {
        showNotification('Solo se pueden devolver leads con estado "No Válido". Por favor, tipifica el lead como "No Válido" antes de devolverlo.', 'error')
        setShowReturnModal(false)
        setSelectedLead(null)
        return
      }

      try {
        // Usar la función específica para devoluciones
        await returnLead(selectedLead.id, user.id)
        setShowReturnModal(false)
        setSelectedLead(null)
        
        // Recargar leads para actualizar la vista
        await refreshLeads()
        
        // También recargar devoluciones para sincronizar con la página de devoluciones
        const { loadDevoluciones } = useLeadsStore.getState()
        await loadDevoluciones()
        
        showNotification('Lead devuelto correctamente. Aparecerá en la sección de devoluciones.', 'success')
      } catch (error) {
        console.error('Error returning lead:', error)
        showNotification('Error al devolver el lead. Inténtalo de nuevo.', 'error')
      }
    }
  }

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    try {
      // Obtener el lead actual para verificar si ya está asignado
      const currentLead = localActiveLeads.find(lead => lead.id === leadId)
      
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
        // Eliminar el lead de la lista local
        setLocalActiveLeads(prevLeads => 
          prevLeads.filter(lead => lead.id !== leadId)
        )
        showNotification('Lead movido al historial correctamente', 'success')
      } else {
        // Actualizar el estado temporal del lead en la lista local
        setLocalActiveLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { 
                  ...lead, 
                  estado_temporal: newStatus,
                  // Si es coordinador y el lead no estaba asignado, actualizar la asignación localmente
                  ...(user?.rol === 'coordinador' && !currentLead?.user_id ? {
                    user_id: user.id,
                    usuario_nombre: user.nombre || user.email,
                    fecha_asignacion: new Date().toISOString()
                  } : {})
                }
              : lead
          )
        )
        
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
  }

  const handleRehusarLead = async (lead: Lead) => {
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
        setLocalActiveLeads(prevLeads => 
          prevLeads.filter(l => l.id !== lead.id)
        )
        showNotification('Lead rehusado correctamente. Ya no aparece en tu lista.', 'success')
      } else {
        // Si es un coordinador, solo actualizar el estado del lead
        setLocalActiveLeads(prevLeads => 
          prevLeads.map(l => 
            l.id === lead.id 
              ? { ...l, user_id: undefined, usuario_nombre: undefined, fecha_asignacion: undefined }
              : l
          )
        )
        showNotification('Lead rehusado correctamente', 'success')
      }
    } catch (error) {
      console.error('Error rehusing lead:', error)
      showNotification(error instanceof Error ? error.message : 'Error al rehusar el lead', 'error')
    }
  }

  const handleSolicitarLead = async () => {
    if (!user?.id || !userEmpresaId) return

    setSolicitudLoading(true)
    try {
      // Obtener configuración de empresa
      const configuracion = userEmpresaConfiguracion || {
        maxSolicitudesPorAgente: 1,
        solicitudesAutomaticas: false
      }

      // Verificar si el agente puede solicitar más leads
      const puedeSolicitar = await leadSolicitudesService.puedeSolicitarLead(
        user.id, 
        userEmpresaId, 
        configuracion.maxSolicitudesPorAgente
      )

      if (!puedeSolicitar) {
        showNotification(
          `No puedes solicitar más leads. Ya tienes el máximo permitido (${configuracion.maxSolicitudesPorAgente}) con estado 'sin tratar'.`, 
          'error'
        )
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

          // Recargar leads para mostrar el nuevo lead
          await refreshLeads()
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

  // Funciones para importación
  const handleImport = () => {
    setShowImportModal(true)
    setImportMode('manual')
    setManualFormData({ nombre_cliente: '', telefono: '', empresa_id: '', campaña_id: '', hub_id: '' })
    setCsvFile(null)
    setSendCallbell(false)
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

  const loadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campañas')
        .select('id, nombre, meta_plataforma_id')
        .order('nombre')
      
      if (error) {
        console.error('Error loading campaigns:', error)
        return
      }
      
      setCampaigns(data || [])
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const loadHubs = async () => {
    try {
      const { data, error } = await supabase
        .from('hubs')
        .select('id, nombre')
        .order('nombre')
      
      if (error) {
        console.error('Error loading hubs:', error)
        return
      }
      
      setHubs(data || [])
    } catch (error) {
      console.error('Error loading hubs:', error)
    }
  }

  const handleManualFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setManualFormData({
      ...manualFormData,
      [e.target.name]: e.target.value
    })
  }

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
    } else {
      showNotification('Por favor selecciona un archivo CSV válido', 'error')
    }
  }

  const parseCSV = (csvText: string): ImportLeadData[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error('El archivo CSV debe tener al menos una fila de datos')
    }

    // Función para normalizar headers (quitar tildes y convertir a minúsculas)
    const normalizeHeader = (header: string): string => {
      return header
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar tildes y acentos
    }

    // Mapeo de variantes de nombres de columnas
    const headerVariants: Record<string, string> = {
      'nombre': 'nombre_cliente',
      'nombre cliente': 'nombre_cliente',
      'nombre_cliente': 'nombre_cliente',
      'cliente': 'nombre_cliente',
      'nombrecliente': 'nombre_cliente',
      
      'telefono': 'telefono',
      'teléfono': 'telefono',
      'tlf': 'telefono',
      'phone': 'telefono',
      
      'empresa': 'empresa_id',
      'empresa_id': 'empresa_id',
      'id empresa': 'empresa_id',
      'idempresa': 'empresa_id',
      'empresaid': 'empresa_id',
      
      'campaña': 'campaña_id',
      'campana': 'campaña_id',
      'campaña_id': 'campaña_id',
      'campana_id': 'campaña_id',
      'id campaña': 'campaña_id',
      'idcampana': 'campaña_id',
      'campañaid': 'campaña_id',
      
      'plataforma': 'plataforma',
      
      'estado temporal': 'estado_temporal',
      'estado_temporal': 'estado_temporal',
      'estadotemporal': 'estado_temporal',
      
      'estado_general': 'estado',
      'estado': 'estado',
      'estado_lead': 'estado',
      
      'observaciones': 'observaciones',
      'observacion': 'observaciones',
      'comentarios': 'observaciones',
      'comentario': 'observaciones',
      'notas': 'observaciones',
      'nota': 'observaciones',
      
      'calidad': 'calidad'
    }

    const headers = lines[0].split(',').map(h => h.trim())
    const normalizedHeaders = headers.map(h => {
      const normalized = normalizeHeader(h)
      return headerVariants[normalized] || normalized
    })

    // Verificar que estén los headers requeridos (aceptando cualquier variante)
    const hasNombreCliente = normalizedHeaders.some(h => h === 'nombre_cliente')
    const hasTelefono = normalizedHeaders.some(h => h === 'telefono')
    
    if (!hasNombreCliente || !hasTelefono) {
      const missing: string[] = []
      if (!hasNombreCliente) missing.push('nombre/nombre_cliente')
      if (!hasTelefono) missing.push('telefono/teléfono')
      throw new Error(`Faltan las siguientes columnas requeridas: ${missing.join(', ')}`)
    }

    const leads: ImportLeadData[] = []
    const errors: string[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      
      if (values.length !== headers.length) {
        errors.push(`Fila ${i + 1}: Número de columnas incorrecto`)
        continue
      }

      const getColumnValue = (columnName: string): string => {
        const index = normalizedHeaders.indexOf(columnName)
        return index >= 0 ? values[index] || '' : ''
      }

      const lead: ImportLeadData = {
        nombre_cliente: getColumnValue('nombre_cliente'),
        telefono: getColumnValue('telefono'),
        plataforma: getColumnValue('plataforma') || 'ScaleHubs',
        empresa_id: getColumnValue('empresa_id') ? parseInt(getColumnValue('empresa_id')) : undefined,
        campaña_id: getColumnValue('campaña_id') ? parseInt(getColumnValue('campaña_id')) : undefined,
        estado_temporal: getColumnValue('estado_temporal') || 'sin_tratar',
        estado: getColumnValue('estado') || 'activo',
        observaciones: getColumnValue('observaciones') || undefined,
        calidad: getColumnValue('calidad') ? parseInt(getColumnValue('calidad')) : 1
      }

      // Validar campos requeridos
      if (!lead.nombre_cliente) {
        errors.push(`Fila ${i + 1}: Nombre del cliente es requerido`)
        continue
      }
      if (!lead.telefono) {
        errors.push(`Fila ${i + 1}: Teléfono es requerido`)
        continue
      }

      leads.push(lead)
    }

    if (errors.length > 0) {
      throw new Error(`Errores encontrados:\n${errors.join('\n')}`)
    }

    return leads
  }

  // Función para generar un lead_id pseudoaleatorio
  const generateLeadId = (): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 11)
    const phoneHash = manualFormData.telefono.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0)
    }, 0).toString(36)
    return `${timestamp}-${phoneHash}-${random}`
  }

  const handleManualImport = async () => {
    if (!manualFormData.nombre_cliente || !manualFormData.telefono) {
      showNotification('Por favor completa todos los campos requeridos', 'error')
      return
    }

    // Validar campos requeridos si se envía a Callbell
    if (sendCallbell) {
      if (!manualFormData.campaña_id) {
        showNotification('La campaña es requerida cuando se envía mensaje a Callbell', 'error')
        return
      }
      if (!manualFormData.hub_id) {
        showNotification('El hub es requerido cuando se envía mensaje a Callbell', 'error')
        return
      }
    }

    setImportLoading(true)
    try {
      // Si se marcó enviar a Callbell, enviar directamente a la edge function
      if (sendCallbell) {
        // Obtener la campaña seleccionada
        const selectedCampaign = campaigns.find(c => c.id === parseInt(manualFormData.campaña_id))
        const campaignName = selectedCampaign?.nombre || ''
        const metaPlataformaId = selectedCampaign?.meta_plataforma_id

        if (!metaPlataformaId) {
          showNotification('La campaña seleccionada no tiene meta_plataforma_id configurado', 'error')
          setImportLoading(false)
          return
        }

        // Obtener el token de acceso
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          throw new Error('No hay sesión activa')
        }

        // Generar lead_id pseudoaleatorio
        const leadId = generateLeadId()

        // Preparar el payload según la estructura JSON
        const callbellPayload = {
          campaign_id: metaPlataformaId,
          campaign_name: campaignName,
          field_data: {
            name: manualFormData.nombre_cliente,
            phone: manualFormData.telefono
          },
          fecha: new Date().toISOString(),
          platform: 'Scalehubs',
          empresa: manualFormData.empresa_id ? parseInt(manualFormData.empresa_id) : null,
          hub: parseInt(manualFormData.hub_id),
          lead_id: leadId
        }

        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
        const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/insert-lead-callbell`

        // Si hay un error al enviar a Callbell, lanzar el error para que no se cree el lead
        let response: any = null
        try {
          response = await axios.post(
            edgeFunctionUrl,
            callbellPayload,
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              }
            }
          )

          // Verificar si la respuesta tiene un warning (aunque success sea true)
          if (response.data?.warning) {
            const warningMessage = response.data?.message || 'Error al enviar el lead a Callbell'
            throw new Error(warningMessage) // Lanzar error para detener el flujo
          }

          // Solo si la llamada a Callbell es exitosa y sin warnings, mostrar éxito y refrescar
          showNotification('Lead importado y mensaje enviado a Callbell correctamente', 'success')
          setShowImportModal(false)
          await refreshLeads()
        } catch (callbellError) {
          console.error('Error sending to Callbell:', callbellError)
          // Obtener el mensaje de error
          const errorMessage = response?.data?.warning 
            ? response.data?.message || 'Error al enviar el lead a Callbell'
            : axios.isAxiosError(callbellError) 
              ? callbellError.response?.data?.message || callbellError.response?.data?.error || callbellError.message || 'Error al enviar el lead a Callbell'
              : callbellError instanceof Error 
                ? callbellError.message 
                : 'Error al enviar el lead a Callbell'
          showNotification(errorMessage, 'error')
          throw callbellError // Lanzar el error para detener el flujo
        }
      } else {
        // Si no se envía a Callbell, crear el lead normalmente
        const leadData: ImportLeadData = {
          nombre_cliente: manualFormData.nombre_cliente,
          telefono: manualFormData.telefono,
          plataforma: 'ScaleHubs',
          empresa_id: manualFormData.empresa_id ? parseInt(manualFormData.empresa_id) : undefined,
          campaña_id: manualFormData.campaña_id ? parseInt(manualFormData.campaña_id) : undefined,
          hub_id: manualFormData.hub_id ? parseInt(manualFormData.hub_id) : undefined,
          estado_temporal: 'sin_tratar',
          estado: 'activo',
          calidad: 1
        }

        await leadsService.createImportLead(leadData)
        showNotification('Lead importado correctamente', 'success')
        setShowImportModal(false)
        await refreshLeads()
      }
    } catch (error) {
      console.error('Error importing lead:', error)
      // Solo mostrar error si no se mostró ya (para evitar duplicados)
      if (!sendCallbell || (sendCallbell && !axios.isAxiosError(error))) {
        showNotification('Error al importar el lead', 'error')
      }
    } finally {
      setImportLoading(false)
    }
  }

  const handleCsvImport = async () => {
    if (!csvFile) {
      showNotification('Por favor selecciona un archivo CSV', 'error')
      return
    }

    setImportLoading(true)
    try {
      const csvText = await csvFile.text()
      const leadsData = parseCSV(csvText)
      
      const result = await leadsService.importLeadsFromCSV(leadsData, true)
      
      if (result.success) {
        let message = `Se importaron ${result.created} leads correctamente`
        if (result.duplicatePhones.length > 0) {
          message += `. ${result.duplicatePhones.length} leads no se importaron por teléfonos duplicados`
        }
        showNotification(message, 'success')
        setShowImportModal(false)
        await refreshLeads()
      } else {
        showNotification(`Error al importar: ${result.errors.join(', ')}`, 'error')
      }
    } catch (error) {
      console.error('Error importing CSV:', error)
      showNotification(error instanceof Error ? error.message : 'Error al procesar el archivo CSV', 'error')
    } finally {
      setImportLoading(false)
    }
  }

  // Calcular paginación para archivos adjuntos
  const archivosTotalPages = Math.ceil(archivosAdjuntos.length / archivosPerPage)
  const archivosStartIndex = (archivosCurrentPage - 1) * archivosPerPage
  const archivosEndIndex = archivosStartIndex + archivosPerPage
  const paginatedArchivos = archivosAdjuntos.slice(archivosStartIndex, archivosEndIndex)

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

        {/* Filters and Export */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Filters Row */}
            <div className={`grid grid-cols-1 gap-4 ${filtersGridCols}`}>
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
                  <option value="sin_tratar">Sin Tratar</option>
                  <option value="no_contesta">No Contesta</option>
                  <option value="no_valido">No Valido</option>
                  <option value="gestion">En gestión</option>
                  <option value="convertido">Convertido</option>
                  <option value="no_cerrado">No Cerrado</option>
                </select>
              </div>
              {user?.rol === 'coordinador' && (
                <div>
                  <label htmlFor="assignedUserFilter" className="block text-sm font-medium text-[#373643] mb-2">
                    Filtrar por usuario asignado
                  </label>
                  <input
                    type="text"
                    id="assignedUserFilter"
                    placeholder="Buscar por nombre, email o rol..."
                    value={assignedUserFilter}
                    onChange={(e) => setAssignedUserFilter(e.target.value)}
                    list={assignedUsers.length > 0 ? 'assignedUserFilterList' : undefined}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent text-sm"
                  />
                  {assignedUsers.length > 0 && (
                    <datalist id="assignedUserFilterList">
                      {assignedUsers.map(userProfile => {
                        const displayName = userProfile.nombre || userProfile.email || 'Sin nombre'
                        const label = `${displayName}${userProfile.rol ? ` (${userProfile.rol})` : ''}`
                        return (
                          <option
                            key={userProfile.user_id}
                            value={displayName}
                            label={label}
                          />
                        )
                      })}
                    </datalist>
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
            
            {/* Export and Import Buttons */}
            <div className="flex justify-end gap-3">
              {user?.rol === 'administrador' && (
                <button
                  onClick={handleImport}
                  className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <span className="mr-2">📥</span>
                  Importar
                </button>
              )}
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
                Mostrando <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredLeads.length)}</span> de <span className="font-medium">{filteredLeads.length}</span> leads
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
                    <p><strong>Nombre:</strong> {selectedLead.nombre_cliente}</p>
                    <p><strong>Teléfono:</strong> {selectedLead.telefono}</p>
                    <p><strong>Plataforma:</strong> {selectedLead.plataforma}</p>
                    <p><strong>Fecha:</strong> {new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</p>
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
                  <label className="block text-sm font-medium text-[#373643] mb-1">Fecha de Entrada</label>
                  <p className="text-sm text-gray-700">{new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</p>
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

      {/* Import Modal overlay */}
      {showImportModal && (
        <div
          className="fixed inset-0 bg-black/50 z-[9999]"
          onClick={() => setShowImportModal(false)}
        />
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-[#373643]">Importar Leads</h2>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Toggle Buttons */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setImportMode('manual')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    importMode === 'manual'
                      ? 'bg-white text-[#373643] shadow-sm'
                      : 'text-gray-600 hover:text-[#373643]'
                  }`}
                >
                  Importar Manual
                </button>
                <button
                  onClick={() => setImportMode('csv')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    importMode === 'csv'
                      ? 'bg-white text-[#373643] shadow-sm'
                      : 'text-gray-600 hover:text-[#373643]'
                  }`}
                >
                  Importar por CSV
                </button>
              </div>

              {/* Manual Import Form */}
              {importMode === 'manual' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="nombre_cliente" className="block text-sm font-medium text-[#373643] mb-2">
                      Nombre del Cliente *
                    </label>
                    <input
                      type="text"
                      id="nombre_cliente"
                      name="nombre_cliente"
                      value={manualFormData.nombre_cliente}
                      onChange={handleManualFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      placeholder="Ingresa el nombre del cliente"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="telefono" className="block text-sm font-medium text-[#373643] mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      id="telefono"
                      name="telefono"
                      value={manualFormData.telefono}
                      onChange={handleManualFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      placeholder="Ingresa el teléfono"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="empresa_id" className="block text-sm font-medium text-[#373643] mb-2">
                      Empresa (Opcional)
                    </label>
                    <select
                      id="empresa_id"
                      name="empresa_id"
                      value={manualFormData.empresa_id}
                      onChange={handleManualFormChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    >
                      <option value="">Selecciona una empresa</option>
                      {companies.map(company => (
                        <option key={company.id} value={company.id}>
                          {company.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Checkbox para enviar mensaje a Callbell */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="sendCallbell"
                      checked={sendCallbell}
                      onChange={(e) => setSendCallbell(e.target.checked)}
                      className="h-4 w-4 text-[#18cb96] focus:ring-[#18cb96] border-gray-300 rounded"
                    />
                    <label htmlFor="sendCallbell" className="ml-2 block text-sm font-medium text-[#373643]">
                      Enviar mensaje callbell
                    </label>
                  </div>

                  {/* Campos adicionales cuando se marca el checkbox */}
                  {sendCallbell && (
                    <>
                      <div>
                        <label htmlFor="campaña_id" className="block text-sm font-medium text-[#373643] mb-2">
                          Campaña *
                        </label>
                        <select
                          id="campaña_id"
                          name="campaña_id"
                          value={manualFormData.campaña_id}
                          onChange={handleManualFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                          required
                        >
                          <option value="">Selecciona una campaña</option>
                          {campaigns.map(campaign => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor="hub_id" className="block text-sm font-medium text-[#373643] mb-2">
                          Hub *
                        </label>
                        <select
                          id="hub_id"
                          name="hub_id"
                          value={manualFormData.hub_id}
                          onChange={handleManualFormChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                          required
                        >
                          <option value="">Selecciona un hub</option>
                          {hubs.map(hub => (
                            <option key={hub.id} value={hub.id}>
                              {hub.nombre}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Información automática</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Plataforma: ScaleHubs</p>
                      <p>• Estado: Activo</p>
                      <p>• Estado Temporal: Sin Tratar</p>
                      <p>• Calidad: 1</p>
                      <p>• Fecha de entrada: Ahora</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleManualImport}
                      disabled={importLoading}
                      className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {importLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importando...
                        </>
                      ) : (
                        'Importar Lead'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* CSV Import Form */}
              {importMode === 'csv' && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="csvFile" className="block text-sm font-medium text-[#373643] mb-2">
                      Archivo CSV *
                    </label>
                    <input
                      type="file"
                      id="csvFile"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    />
                    {csvFile && (
                      <p className="mt-2 text-sm text-green-600">
                        Archivo seleccionado: {csvFile.name}
                      </p>
                    )}
                  </div>

                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-yellow-800 mb-2">Formato requerido del CSV</h3>
                    <div className="text-sm text-yellow-700 space-y-1">
                      <p><strong>Columnas requeridas:</strong> Nombre/Nombre Cliente/Nombre_Cliente, Teléfono/Teléfono/Telefono</p>
                      <p><strong>Columnas opcionales:</strong> Plataforma, Empresa/Empresa_ID, Campaña/Campaña_ID, Estado Temporal/Estado_Temporal, Estado, Observaciones, Calidad</p>
                      <p><strong>Formato flexible:</strong> Se aceptan tildes, mayúsculas/minúsculas y diferentes variantes de nombres</p>
                      <p><strong>Nota:</strong> Los teléfonos duplicados no se importarán</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Valores por defecto</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Plataforma: ScaleHubs (si no se especifica)</p>
                      <p>• Estado: Activo (si no se especifica)</p>
                      <p>• Estado Temporal: Sin Tratar (si no se especifica)</p>
                      <p>• Calidad: 1 (si no se especifica)</p>
                      <p>• Fecha de entrada: Ahora</p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowImportModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleCsvImport}
                      disabled={importLoading || !csvFile}
                      className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {importLoading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Importando...
                        </>
                      ) : (
                        'Importar CSV'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Leads 