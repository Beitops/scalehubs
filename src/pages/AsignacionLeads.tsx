import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useLeadsStore } from '../store/leadsStore'
import { companyService, type Company } from '../services/companyService'
import { getUsersByCompany } from '../services/userService'
import type { DatabaseProfile } from '../types/database'
import type { Lead } from '../services/leadsService'
import { leadsService, type ImportLeadData } from '../services/leadsService'
import { leadSolicitudesService, type LeadSolicitud } from '../services/leadSolicitudesService'
import { callbellService } from '../services/callbellService'
import { externalApiService } from '../services/externalApiService'
import { supabase } from '../lib/supabase'
import axios from 'axios'

const AsignacionLeads = () => {
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<DatabaseProfile[]>([])
  const [selectedCompany, setSelectedCompany] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [companyFilter, setCompanyFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [phoneFilter, setPhoneFilter] = useState('')
  const [showSolicitudesModal, setShowSolicitudesModal] = useState(false)
  const [solicitudes, setSolicitudes] = useState<LeadSolicitud[]>([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [processingAction, setProcessingAction] = useState(false)
  const [notification, setNotification] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  }>({ show: false, message: '', type: 'info' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  
  // Bulk selection state (only for admin)
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedLeadsForBulk, setSelectedLeadsForBulk] = useState<Set<number>>(new Set())
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const longPressTriggeredRef = useRef(false)
  
  // Estados para importación
  const [showImportModal, setShowImportModal] = useState(false)
  const [importMode, setImportMode] = useState<'manual' | 'csv'>('manual')
  const [importLoading, setImportLoading] = useState(false)
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

  const { user, userEmpresaId } = useAuthStore()
  const {
    loading,
    error,
    unassignedLeads,
    loadUnassignedLeads,
    loadUnassignedLeadsByCompany,
    assignLeadToCompany,
    assignLeadToAgent,
    refreshLeads
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

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (user?.rol === 'administrador') {
        // Para administradores: cargar leads sin empresa y todas las empresas
        setLoadingCompanies(true)
        try {
          const companiesData = await companyService.getCompanies()
          setCompanies(companiesData.filter(c => c.activa))
          await loadUnassignedLeads()
        } catch (error) {
          console.error('Error loading initial data:', error)
        } finally {
          setLoadingCompanies(false)
        }
      } else if (user?.rol === 'coordinador' && userEmpresaId) {
        // Para coordinadores: cargar leads sin agente de su empresa y usuarios de su empresa
        setLoadingUsers(true)
        try {
          const usersData = await getUsersByCompany(userEmpresaId)
          setUsers(usersData.filter(u => u.rol === 'agente'))
          await loadUnassignedLeadsByCompany(userEmpresaId)
        } catch (error) {
          console.error('Error loading initial data:', error)
        } finally {
          setLoadingUsers(false)
        }
      }
    }

    loadInitialData()
  }, [user, userEmpresaId])

  // Cargar datos adicionales cuando se abra el modal de importación
  useEffect(() => {
    if (showImportModal) {
      loadCampaigns()
      loadHubs()
    }
  }, [showImportModal])



  const handleAssignLead = (lead: Lead) => {
    setSelectedLead(lead)
    setCompanyFilter('')
    setUserFilter('')
    setSelectedCompany(null)
    setSelectedUser(null)
    setShowAssignModal(true)
  }

  // Filter companies based on search
  const filteredCompanies = companies.filter(company =>
    company.nombre.toLowerCase().includes(companyFilter.toLowerCase())
  )

  // Filter users based on search
  const filteredUsers = users.filter(user =>
    user.nombre?.toLowerCase().includes(userFilter.toLowerCase()) ||
    user.email?.toLowerCase().includes(userFilter.toLowerCase())
  )

  // Get selected company name
  const selectedCompanyName = companies.find(c => c.id === selectedCompany)?.nombre || ''

  // Get selected user name
  const selectedUserName = users.find(u => u.user_id === selectedUser)?.nombre || ''

  // Filtrar leads por teléfono
  const filteredLeads = unassignedLeads.filter(lead => {
    if (!phoneFilter.trim()) return true
    return lead.telefono?.toLowerCase().includes(phoneFilter.toLowerCase().trim())
  })

  // Calcular paginación para leads sin asignar filtrados
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLeads = filteredLeads.slice(startIndex, endIndex)

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

  // Resetear página cuando cambien los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [companyFilter, userFilter, phoneFilter])

  // Escape key handler for canceling selection mode
  useEffect(() => {
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectionMode) {
        cancelSelectionMode()
      }
    }
    
    document.addEventListener('keydown', handleEscapeKey)
    return () => document.removeEventListener('keydown', handleEscapeKey)
  }, [isSelectionMode])

  // Long press handlers for bulk selection (admin only)
  const handleLongPressStart = useCallback((lead: Lead) => {
    if (user?.rol !== 'administrador') return
    
    longPressTriggeredRef.current = false
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      setIsSelectionMode(true)
      setSelectedLeadsForBulk(new Set([lead.id]))
    }, 1000) // 1 second long press
  }, [user?.rol])

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const handleLeadClick = useCallback((lead: Lead, e: React.MouseEvent) => {
    // Prevent default behavior if in selection mode
    if (isSelectionMode) {
      e.preventDefault()
      e.stopPropagation()
      
      setSelectedLeadsForBulk(prev => {
        const newSet = new Set(prev)
        if (newSet.has(lead.id)) {
          newSet.delete(lead.id)
        } else {
          newSet.add(lead.id)
        }
        return newSet
      })
      return
    }
    
    // If long press was triggered, don't do anything on click
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false
      return
    }
  }, [isSelectionMode])

  const cancelSelectionMode = useCallback(() => {
    setIsSelectionMode(false)
    setSelectedLeadsForBulk(new Set())
  }, [])

  const handleOpenBulkAssignModal = useCallback(() => {
    if (selectedLeadsForBulk.size === 0) return
    setCompanyFilter('')
    setSelectedCompany(null)
    setShowBulkAssignModal(true)
  }, [selectedLeadsForBulk.size])

  const getSelectedLeadsData = useCallback((): Lead[] => {
    return filteredLeads.filter(lead => selectedLeadsForBulk.has(lead.id))
  }, [filteredLeads, selectedLeadsForBulk])

  const handleConfirmBulkAssignment = async () => {
    if (!selectedCompany || selectedLeadsForBulk.size === 0) {
      showNotification('Por favor selecciona una empresa', 'error')
      return
    }

    setProcessingAction(true)
    try {
      const leadIds = Array.from(selectedLeadsForBulk)
      
      // Buscar la empresa seleccionada para verificar has_api
      const selectedCompanyData = companies.find(c => c.id === selectedCompany)
      
      if (selectedCompanyData?.has_api) {
        // Empresa con API externa: enviar por API
        const result = await externalApiService.sendLeadsToExternalCompany(leadIds)
        
        if (result.success) {
          showNotification(result.message || `${leadIds.length} leads enviados correctamente por API`, 'success')
          refreshLeads()
          setShowBulkAssignModal(false)
          cancelSelectionMode()
          setSelectedCompany(null)
          setCompanyFilter('')
        } else {
          showNotification(result.error || 'Error al enviar los leads por API', 'error')
        }
      } else {
        // Empresa sin API: asignación normal
        await assignLeadToCompany(leadIds, selectedCompany)
        
        refreshLeads()
        setShowBulkAssignModal(false)
        cancelSelectionMode()
        setSelectedCompany(null)
        setCompanyFilter('')
        showNotification(`${leadIds.length} leads asignados correctamente`, 'success')
      }
    } catch (error) {
      console.error('Error assigning leads in bulk:', error)
      showNotification('Error al asignar los leads. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleCompanySelect = (company: Company) => {
    setSelectedCompany(company.id)
  }

  const handleUserSelect = (user: DatabaseProfile) => {
    setSelectedUser(user.user_id)
  }

  const handleLoadSolicitudes = async () => {
    if (!userEmpresaId) return

    setLoadingSolicitudes(true)
    try {
      const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
      setSolicitudes(solicitudesData)
      setShowSolicitudesModal(true)
    } catch (error) {
      console.error('Error loading solicitudes:', error)
      alert('Error al cargar las solicitudes. Inténtalo de nuevo.')
    } finally {
      setLoadingSolicitudes(false)
    }
  }

  const handleAprobarSolicitud = async (solicitudId: number) => {
    if (!userEmpresaId || !user?.id) return

    setProcessingAction(true)
    try {
      // Obtener el lead más reciente sin asignar
      const leadId = await leadSolicitudesService.getLeadMasRecienteSinAsignar(userEmpresaId)
      
      if (!leadId) {
        showNotification('No hay leads disponibles para asignar. La solicitud será rechazada.', 'info')
        await leadSolicitudesService.rechazarSolicitud(solicitudId, user.id)
      } else {
        const result = await leadSolicitudesService.aprobarSolicitud(solicitudId, leadId, user.id)
        
        // Si hay error de Callbell, mostrar notificación amarilla
        if (result.callbellError) {
          showNotification(result.callbellError, 'warning')
        }
      }

      // Recargar solicitudes
      const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
      setSolicitudes(solicitudesData)

      showNotification('Solicitud procesada correctamente.', 'success')
    } catch (error) {
      console.error('Error procesando solicitud:', error)
      showNotification('Error al procesar la solicitud. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleRechazarSolicitud = async (solicitudId: number) => {
    if (!user?.id) return

    setProcessingAction(true)
    try {
      await leadSolicitudesService.rechazarSolicitud(solicitudId, user.id)

      // Recargar solicitudes
      if (userEmpresaId) {
        const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
        setSolicitudes(solicitudesData)
      }

      showNotification('Solicitud rechazada correctamente.', 'success')
    } catch (error) {
      console.error('Error rechazando solicitud:', error)
      showNotification('Error al rechazar la solicitud. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleAprobarTodo = async () => {
    if (!userEmpresaId || !user?.id) return

    setProcessingAction(true)
    try {
      await leadSolicitudesService.aprobarTodasLasSolicitudes(userEmpresaId, user.id)
      
      // Recargar solicitudes
      const solicitudesData = await leadSolicitudesService.getSolicitudesPendientesByEmpresa(userEmpresaId)
      setSolicitudes(solicitudesData)

      showNotification('Todas las solicitudes han sido procesadas.', 'success')
    } catch (error) {
      console.error('Error aprobando todas las solicitudes:', error)
      showNotification('Error al procesar las solicitudes. Inténtalo de nuevo.', 'error')
    } finally {
      setProcessingAction(false)
    }
  }

  const handleConfirmAssignment = async () => {
    if (!selectedLead) return

    try {
      if (user?.rol === 'administrador') {
        // Administrador asigna lead a empresa
        if (!selectedCompany) {
          showNotification('Por favor selecciona una empresa', 'error')
          return
        }
        
        // Buscar la empresa seleccionada para verificar has_api
        const selectedCompanyData = companies.find(c => c.id === selectedCompany)
        
        if (selectedCompanyData?.has_api) {
          // Empresa con API externa: enviar por API
          const result = await externalApiService.sendLeadsToExternalCompany([selectedLead.id])
          
          if (result.success) {
            showNotification(result.message || 'Lead enviado correctamente por API', 'success')
          } else {
            showNotification(result.error || 'Error al enviar el lead por API', 'error')
            return // No continuar si falla el envío por API
          }
        } else {
          // Empresa sin API: asignación normal
          await assignLeadToCompany(selectedLead.id, selectedCompany)
        }
      } else if (user?.rol === 'coordinador') {
        // Coordinador asigna lead a agente
        if (!selectedUser) {
          showNotification('Por favor selecciona un agente', 'error')
          return
        }
        
        // Si el lead pertenece a la empresa 15, intentar asignar en Callbell
        if (selectedLead.empresa_id === 15) {
          const callbellResult = await callbellService.assignLeadToCallbell(selectedLead.id, selectedUser)
          // Si falla con 403 o 404, mostrar notificación amarilla y continuar con asignación normal
          if (!callbellResult.success && callbellResult.error) {
            showNotification(callbellResult.error, 'warning')
          }
        }
        
        await assignLeadToAgent(selectedLead.id, selectedUser)
      }
      refreshLeads()
      setShowAssignModal(false)
      setSelectedLead(null)
      setSelectedCompany(null)
      setSelectedUser(null)
      setCompanyFilter('')
      setUserFilter('')
    } catch (error) {
      console.error('Error assigning lead:', error)
      showNotification('Error al asignar el lead. Inténtalo de nuevo.', 'error')
    }
  }

  const getPageTitle = () => {
    if (user?.rol === 'administrador') {
      return 'Asignación de Leads a Empresas'
    } else if (user?.rol === 'coordinador') {
      return 'Asignación de Leads a Agentes'
    }
    return 'Asignación de Leads'
  }

  const getPageDescription = () => {
    if (user?.rol === 'administrador') {
      return 'Asigna leads sin empresa a diferentes empresas del sistema'
    } else if (user?.rol === 'coordinador') {
      return 'Asigna leads de tu empresa a agentes disponibles'
    }
    return ''
  }

  // Funciones para importación
  const handleImport = () => {
    setShowImportModal(true)
    setImportMode('manual')
    setManualFormData({ nombre_cliente: '', telefono: '', empresa_id: '', campaña_id: '', hub_id: '' })
    setCsvFile(null)
    setSendCallbell(false)
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
      
      'hub': 'hub_id',
      'hub_id': 'hub_id',
      'id hub': 'hub_id',
      'idhub': 'hub_id',
      'hubid': 'hub_id',
      
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
        plataforma: 'scalehubs',
        empresa_id: getColumnValue('empresa_id') ? parseInt(getColumnValue('empresa_id')) : undefined,
        campaña_id: getColumnValue('campaña_id') ? parseInt(getColumnValue('campaña_id')) : undefined,
        hub_id: getColumnValue('hub_id') ? parseInt(getColumnValue('hub_id')) : undefined,
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
          platform: 'scalehubs',
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
          await loadUnassignedLeads()
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
          plataforma: 'scalehubs',
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
        await loadUnassignedLeads()
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
        await loadUnassignedLeads()
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

  if (loading || loadingCompanies || loadingUsers) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#18cb96]"></div>
        <span className="ml-3 text-gray-600">Cargando datos...</span>
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
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[10000] max-w-md w-full mx-4">
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link 
                to="/leads"
                className="text-[#18cb96] hover:text-[#15b885] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#373643]">{getPageTitle()}</h1>
            </div>
            {/* Botón Importar - solo para administradores */}
            {user?.rol === 'administrador' && (
              <button
                onClick={handleImport}
                className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center text-sm"
              >
                <span className="mr-2">📥</span>
                Importar
              </button>
            )}
          </div>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            {getPageDescription()}
          </p>
        </div>

        {/* Solicitudes Button - Solo para coordinadores */}
        {user?.rol === 'coordinador' && (
          <div className="mb-6">
            <button
              onClick={handleLoadSolicitudes}
              disabled={loadingSolicitudes}
              className="px-6 py-2 text-white font-medium rounded-lg transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
              style={{ backgroundColor: '#1e3a8a' }}
            >
              {loadingSolicitudes ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cargando...
                </>
              ) : (
                <>
                  <span className="mr-2">📋</span>
                  Ver Solicitudes
                </>
              )}
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-[#18cb96] rounded-lg flex items-center justify-center">
                <span className="text-2xl text-white">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Leads sin asignar</p>
                <p className="text-2xl font-bold text-[#373643]">
                  {phoneFilter.trim() ? filteredLeads.length : unassignedLeads.length}
                </p>
              </div>
            </div>
          </div>

          {user?.rol === 'administrador' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-2xl text-white">🏢</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Empresas activas</p>
                  <p className="text-2xl font-bold text-[#373643]">{companies.length}</p>
                </div>
              </div>
            </div>
          )}

          {user?.rol === 'coordinador' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-2xl text-white">👥</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Agentes disponibles</p>
                  <p className="text-2xl font-bold text-[#373643]">{users.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Phone Filter */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <label htmlFor="phoneFilter" className="text-sm font-medium text-[#373643] whitespace-nowrap">
                Filtrar por teléfono:
              </label>
              <div className="flex items-center gap-2 flex-1">
                <input
                  id="phoneFilter"
                  type="text"
                  placeholder="Ingresa el número de teléfono..."
                  value={phoneFilter}
                  onChange={(e) => setPhoneFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                />
                {phoneFilter && (
                  <button
                    onClick={() => setPhoneFilter('')}
                    className="px-2 py-2 text-gray-600 hover:text-gray-800 transition-colors flex-shrink-0"
                    title="Limpiar filtro"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bulk Selection Actions - Only for Admin */}
          {user?.rol === 'administrador' && isSelectionMode && (
            <div className="px-4 sm:px-6 py-3 bg-[#18cb96]/10 border-b border-[#18cb96]/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleOpenBulkAssignModal}
                  disabled={selectedLeadsForBulk.size === 0}
                  className="px-4 py-2 bg-[#18cb96] text-white text-sm font-medium rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Asignar Leads Seleccionados ({selectedLeadsForBulk.size})
                </button>
                <button
                  onClick={cancelSelectionMode}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              <span className="text-sm text-gray-600 hidden sm:block">
                Pulsa ESC para cancelar
              </span>
            </div>
          )}

          {paginatedLeads.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-gray-400">
                  {phoneFilter.trim() ? '🔍' : '✅'}
                </span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {phoneFilter.trim() 
                  ? 'No se encontraron leads con ese teléfono'
                  : user?.rol === 'administrador' 
                    ? 'No hay leads sin empresa asignada'
                    : 'No hay leads sin agente asignado'
                }
              </h3>
              <p className="text-gray-600">
                {phoneFilter.trim()
                  ? 'Intenta con otro número de teléfono o limpia el filtro para ver todos los leads'
                  : user?.rol === 'administrador' 
                    ? 'Todos los leads activos ya tienen una empresa asignada'
                    : 'Todos los leads de tu empresa ya tienen un agente asignado'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="lg:hidden">
                {paginatedLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className={`p-4 border-b border-gray-200 last:border-b-0 transition-colors cursor-pointer select-none ${
                      isSelectionMode && selectedLeadsForBulk.has(lead.id) 
                        ? 'bg-[#18cb96]/10 border-l-4 border-l-[#18cb96]' 
                        : ''
                    }`}
                    onMouseDown={() => handleLongPressStart(lead)}
                    onMouseUp={handleLongPressEnd}
                    onMouseLeave={handleLongPressEnd}
                    onTouchStart={() => handleLongPressStart(lead)}
                    onTouchEnd={handleLongPressEnd}
                    onClick={(e) => handleLeadClick(lead, e)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Selection indicator */}
                        {isSelectionMode && (
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selectedLeadsForBulk.has(lead.id) 
                              ? 'bg-[#18cb96] border-[#18cb96]' 
                              : 'border-gray-300'
                          }`}>
                            {selectedLeadsForBulk.has(lead.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        )}
                        {user?.rol !== 'coordinador' && (
                          <span className="inline-flex px-2 py-1 text-[10px] font-semibold rounded-full text-white bg-[#1e3a8a]">
                            {lead.campaña_nombre || 'Sin Campaña'}
                          </span>
                        )}
                        <h3 className="font-medium text-[#373643] text-sm">{lead.nombre_cliente}</h3>
                      </div>
                      <span className="inline-flex items-center justify-center w-8 h-8">
                        <img 
                          src={`/calidadLead/${lead.calidad || 1}.png`} 
                          alt={`Calidad ${lead.calidad || 1}`}
                          className="w-8 h-8 object-contain"
                        />
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      <p><span className="font-medium">Teléfono:</span> {lead.telefono}</p>
                      <p><span className="font-medium">Fecha:</span> {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</p>
                      {user?.rol === 'administrador' && (
                        <p><span className="font-medium">Hub:</span> {lead.hub_nombre || 'Sin Hub'}</p>
                      )}
                    </div>
                    {!isSelectionMode && (
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAssignLead(lead)
                          }}
                          className="flex-1 px-3 py-2 bg-[#18cb96] text-white text-xs font-medium rounded-lg hover:bg-[#15b885] transition-colors"
                        >
                          Asignar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* Selection column header for admin */}
                      {user?.rol === 'administrador' && isSelectionMode && (
                        <th className="px-3 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider w-12">
                          
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Fecha Entrada
                      </th>
                      {user?.rol !== 'coordinador' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                          Campaña
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Calidad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Teléfono
                      </th>
                      
                      {user?.rol === 'administrador' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                          Hub
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-[#373643] uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedLeads.map((lead) => (
                      <tr 
                        key={lead.id} 
                        className={`transition-colors cursor-pointer select-none ${
                          isSelectionMode && selectedLeadsForBulk.has(lead.id) 
                            ? 'bg-[#18cb96]/10' 
                            : 'hover:bg-gray-50'
                        }`}
                        onMouseDown={() => handleLongPressStart(lead)}
                        onMouseUp={handleLongPressEnd}
                        onMouseLeave={handleLongPressEnd}
                        onClick={(e) => handleLeadClick(lead, e)}
                      >
                        {/* Selection checkbox column for admin */}
                        {user?.rol === 'administrador' && isSelectionMode && (
                          <td className="px-3 py-4 whitespace-nowrap">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                              selectedLeadsForBulk.has(lead.id) 
                                ? 'bg-[#18cb96] border-[#18cb96]' 
                                : 'border-gray-300'
                            }`}>
                              {selectedLeadsForBulk.has(lead.id) && (
                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                          {new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}
                        </td>
                        {user?.rol !== 'coordinador' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                            {lead.campaña_nombre || 'Sin Campaña'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center justify-center w-10 h-10">
                            <img 
                              src={`/calidadLead/${lead.calidad || 1}.png`} 
                              alt={`Calidad ${lead.calidad || 1}`}
                              className="w-10 h-10 object-contain"
                            />
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-[#373643]">{lead.nombre_cliente}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-[#373643]">
                          {lead.telefono}
                        </td>
                        
                        {user?.rol === 'administrador' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {lead.hub_nombre || 'Sin Hub'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {!isSelectionMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAssignLead(lead)
                              }}
                              className="px-4 py-2 bg-[#18cb96] text-white text-sm font-medium rounded-lg hover:bg-[#15b885] transition-colors"
                            >
                              Asignar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer */}
              <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="hidden lg:block text-xs sm:text-sm text-gray-700">
                    Mostrando <span className="font-medium">{startIndex + 1}-{Math.min(endIndex, filteredLeads.length)}</span> de <span className="font-medium">{filteredLeads.length}</span> leads sin asignar
                    {phoneFilter.trim() && (
                      <span className="text-gray-500"> (filtrados de {unassignedLeads.length} totales)</span>
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
            </>
          )}
        </div>
      </div>

      {/* Assignment Modal overlay */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowAssignModal(false)}
        />
      )}

      {/* Assignment Modal */}
      {showAssignModal && selectedLead && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">
                {user?.rol === 'administrador' ? 'Asignar Lead a Empresa' : 'Asignar Lead a Agente'}
              </h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Lead Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-[#373643] mb-3">Información del Lead</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                  <div><strong>Nombre:</strong> {selectedLead.nombre_cliente}</div>
                  <div><strong>Teléfono:</strong> {selectedLead.telefono}</div>
                  <div><strong>Plataforma:</strong> {selectedLead.plataforma_lead}</div>
                  <div><strong>Fecha:</strong> {new Date(selectedLead.fecha_entrada).toLocaleDateString('es-ES')}</div>
                </div>
              </div>

              {/* Assignment Options */}
              {user?.rol === 'administrador' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Seleccionar Empresa
                    </label>
                    
                    {/* Company Filter Input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Buscar empresa..."
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      />
                    </div>

                    {/* Selected Company Display */}
                    {selectedCompany && (
                      <div className="mb-3 p-3 bg-[#18cb96]/10 border border-[#18cb96]/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#18cb96]">
                            Empresa seleccionada: {selectedCompanyName}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCompany(null)
                              setCompanyFilter('')
                            }}
                            className="text-[#18cb96] hover:text-[#15b885]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Company List */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          Empresas disponibles ({filteredCompanies.length})
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCompanies.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500 text-center">
                            {companyFilter ? 'No se encontraron empresas con ese nombre' : 'No hay empresas disponibles'}
                          </div>
                        ) : (
                          filteredCompanies.map((company) => (
                            <button
                              key={company.id}
                              onClick={() => handleCompanySelect(company)}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                selectedCompany === company.id 
                                  ? 'bg-[#18cb96]/10 border-l-4 border-l-[#18cb96]' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-[#373643]">{company.nombre}</div>
                                  <div className="text-xs text-gray-500 mt-1">CIF: {company.cif}</div>
                                  {company.has_api && (
                                    <div className="text-xs text-blue-600 mt-1 font-medium">
                                      ✓ Envío por API
                                    </div>
                                  )}
                                </div>
                                {selectedCompany === company.id && (
                                  <div className="w-6 h-6 bg-[#18cb96] rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#373643] mb-2">
                      Seleccionar Agente
                    </label>
                    
                    {/* User Filter Input */}
                    <div className="mb-3">
                      <input
                        type="text"
                        placeholder="Buscar agente por nombre o email..."
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                      />
                    </div>

                    {/* Selected User Display */}
                    {selectedUser && (
                      <div className="mb-3 p-3 bg-[#18cb96]/10 border border-[#18cb96]/20 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-[#18cb96]">
                            Agente seleccionado: {selectedUserName}
                          </span>
                          <button
                            onClick={() => {
                              setSelectedUser(null)
                              setUserFilter('')
                            }}
                            className="text-[#18cb96] hover:text-[#15b885]"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* User List */}
                    <div className="border border-gray-200 rounded-lg">
                      <div className="p-3 border-b border-gray-200 bg-gray-50">
                        <div className="text-sm font-medium text-gray-700">
                          Agentes disponibles ({filteredUsers.length})
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredUsers.length === 0 ? (
                          <div className="p-6 text-sm text-gray-500 text-center">
                            {userFilter ? 'No se encontraron agentes con ese nombre o email' : 'No hay agentes disponibles'}
                          </div>
                        ) : (
                          filteredUsers.map((user) => (
                            <button
                              key={user.user_id}
                              onClick={() => handleUserSelect(user)}
                              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                                selectedUser === user.user_id 
                                  ? 'bg-[#18cb96]/10 border-l-4 border-l-[#18cb96]' 
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-medium text-[#373643]">{user.nombre}</div>
                                  <div className="text-xs text-gray-500 mt-1">{user.email}</div>
                                </div>
                                {selectedUser === user.user_id && (
                                  <div className="w-6 h-6 bg-[#18cb96] rounded-full flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAssignment}
                  disabled={
                    (user?.rol === 'administrador' && !selectedCompany) ||
                    (user?.rol === 'coordinador' && !selectedUser)
                  }
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar Asignación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Solicitudes Modal overlay */}
      {showSolicitudesModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowSolicitudesModal(false)}
        />
      )}

      {/* Solicitudes Modal */}
      {showSolicitudesModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-[#373643]">Solicitudes de Leads Pendientes</h2>
              <button
                onClick={() => setShowSolicitudesModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {solicitudes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl text-gray-400">✅</span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No hay solicitudes pendientes
                    </h3>
                    <p className="text-gray-600">
                      No hay solicitudes de leads pendientes de los agentes de tu empresa.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Botón Aprobar Todo */}
                  <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-start">
                    <button
                      onClick={handleAprobarTodo}
                      disabled={processingAction}
                      className="px-4 py-2 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center hover:opacity-90"
                      style={{ backgroundColor: '#1e3a8a' }}
                    >
                      {processingAction ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </>
                      ) : (
                        <>
                          <span className="mr-2">✅</span>
                          Aprobar Todas las Solicitudes ({solicitudes.length})
                        </>
                      )}
                    </button>
                  </div>

                  {/* Lista de Solicitudes con Scroll */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                      {solicitudes.map((solicitud) => (
                        <div key={solicitud.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-medium text-xs">
                                      {solicitud.solicitante?.nombre?.charAt(0) || 'A'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2">
                                    <h3 className="text-sm font-medium text-[#373643] truncate">
                                      {solicitud.solicitante?.nombre || 'Agente'}
                                    </h3>
                                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-yellow-800 bg-yellow-100">
                                      Pendiente
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 truncate">
                                    {solicitud.solicitante?.email}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(solicitud.fecha_creacion).toLocaleDateString('es-ES')} {new Date(solicitud.fecha_creacion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleAprobarSolicitud(solicitud.id)}
                                disabled={processingAction}
                                className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => handleRechazarSolicitud(solicitud.id)}
                                disabled={processingAction}
                                className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 rounded hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Rechazar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assignment Modal overlay */}
      {showBulkAssignModal && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-51"
          onClick={() => setShowBulkAssignModal(false)}
        />
      )}

      {/* Bulk Assignment Modal */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#373643]">
                Asignar {selectedLeadsForBulk.size} Leads a Empresa
              </h2>
              <button
                onClick={() => setShowBulkAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Selected Leads List */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-[#373643] mb-3">
                  Leads Seleccionados ({selectedLeadsForBulk.size})
                </h3>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Nombre</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Teléfono</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Fecha</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Calidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {getSelectedLeadsData().map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-[#373643] font-medium">{lead.nombre_cliente}</td>
                          <td className="px-3 py-2 text-gray-600">{lead.telefono}</td>
                          <td className="px-3 py-2 text-gray-600">{new Date(lead.fecha_entrada).toLocaleDateString('es-ES')}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{lead.calidad || 1}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Company Selection */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#373643] mb-2">
                    Seleccionar Empresa
                  </label>
                  
                  {/* Company Filter Input */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Buscar empresa..."
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#18cb96] focus:border-transparent"
                    />
                  </div>

                  {/* Selected Company Display */}
                  {selectedCompany && (
                    <div className="mb-3 p-3 bg-[#18cb96]/10 border border-[#18cb96]/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-[#18cb96]">
                          Empresa seleccionada: {selectedCompanyName}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedCompany(null)
                            setCompanyFilter('')
                          }}
                          className="text-[#18cb96] hover:text-[#15b885]"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Company List */}
                  <div className="border border-gray-200 rounded-lg">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <div className="text-sm font-medium text-gray-700">
                        Empresas disponibles ({filteredCompanies.length})
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredCompanies.length === 0 ? (
                        <div className="p-6 text-sm text-gray-500 text-center">
                          {companyFilter ? 'No se encontraron empresas con ese nombre' : 'No hay empresas disponibles'}
                        </div>
                      ) : (
                        filteredCompanies.map((company) => (
                          <button
                            key={company.id}
                            onClick={() => handleCompanySelect(company)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                              selectedCompany === company.id 
                                ? 'bg-[#18cb96]/10 border-l-4 border-l-[#18cb96]' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-[#373643]">{company.nombre}</div>
                                <div className="text-xs text-gray-500 mt-1">CIF: {company.cif}</div>
                              </div>
                              {selectedCompany === company.id && (
                                <div className="w-6 h-6 bg-[#18cb96] rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowBulkAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmBulkAssignment}
                  disabled={!selectedCompany || processingAction}
                  className="flex-1 px-4 py-2 bg-[#18cb96] text-white rounded-lg hover:bg-[#15b885] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingAction ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Asignando...
                    </>
                  ) : (
                    <>
                      Confirmar Asignación ({selectedLeadsForBulk.size} leads)
                    </>
                  )}
                </button>
              </div>
            </div>
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
                      <p>• Plataforma: scalehubs</p>
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
                      <p><strong>Columnas opcionales:</strong> Plataforma, Empresa/Empresa_ID, Campaña/Campaña_ID, Hub/Hub_ID (número entero), Estado Temporal/Estado_Temporal, Estado, Observaciones, Calidad</p>
                      <p><strong>Formato flexible:</strong> Se aceptan tildes, mayúsculas/minúsculas y diferentes variantes de nombres</p>
                      <p><strong>Nota:</strong> Los teléfonos duplicados no se importarán</p>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">Valores por defecto</h3>
                    <div className="text-sm text-blue-700 space-y-1">
                      <p>• Plataforma: scalehubs (siempre se usa este valor)</p>
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

export default AsignacionLeads
