import { create } from 'zustand'
import { leadsService } from '../services/leadsService'
import { useAuthStore } from './authStore'

type TimeFilter = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado'
type DateFieldFilter = 'fecha_entrada' | 'fecha_asignacion'
type CoordDateFieldFilter = 'fecha_asignacion' | 'fecha_asignacion_usuario'

interface AdminStats {
  totalLeads: number
  leadsConvertidos: number
  leadsPerdidos: number
  leadsSinAsignar: number
  leadsInvalidos: number
  platformDistribution: Record<string, number>
}

interface AdminLead {
  id: number
  nombre_cliente: string
  telefono: string
  fecha_entrada: string
  fecha_asignacion?: string | null
  empresa_id?: number | null
  empresa_nombre?: string
}

interface CoordStats {
  totalLeads: number
  leadsConvertidos: number
  leadsPerdidos: number
  leadsInvalidos: number
}

interface CoordLead {
  id: number
  nombre_cliente: string
  telefono: string
  fecha_asignacion?: string | null
  fecha_asignacion_usuario?: string | null
  user_id?: string | null
  usuario_nombre?: string
}

interface AgentStats {
  totalLeads: number
  leadsConvertidos: number
  leadsPerdidos: number
  leadsInvalidos: number
}

interface AgentLead {
  id: number
  nombre_cliente: string
  telefono: string
  fecha_asignacion_usuario?: string | null
}

interface DashboardState {
  loading: boolean
  error: string | null
  isInitialized: boolean
  timeFilter: TimeFilter
  dateFieldFilter: DateFieldFilter
  coordDateFieldFilter: CoordDateFieldFilter
  selectedEmpresaIds: number[]
  selectedAgentIds: string[]
  adminStats: AdminStats
  adminLeads: AdminLead[]
  adminLeadsPage: number
  adminLeadsTotalCount: number
  coordStats: CoordStats
  coordLeads: CoordLead[]
  coordLeadsPage: number
  coordLeadsTotalCount: number
  agentStats: AgentStats
  agentLeads: AgentLead[]
  agentLeadsPage: number
  agentLeadsTotalCount: number
  customDateRange: { startDate: string; endDate: string } | null
  loadDashboardData: (timeFilter?: TimeFilter, customRange?: { startDate: string; endDate: string }) => Promise<void>
  loadDashboardLeads: () => Promise<void> // Mantener compatibilidad
  loadAdminLeadsPage: (page: number) => Promise<void>
  loadCoordLeadsPage: (page: number) => Promise<void>
  loadAgentLeadsPage: (page: number) => Promise<void>
  setTimeFilter: (filter: TimeFilter) => void
  setDateFieldFilter: (field: DateFieldFilter) => void
  setCoordDateFieldFilter: (field: CoordDateFieldFilter) => void
  setSelectedEmpresaIds: (ids: number[]) => void
  setSelectedAgentIds: (ids: string[]) => void
  setCustomDateRange: (range: { startDate: string; endDate: string }) => void
  resetInitialized: () => void
}

// Función auxiliar para obtener fechas según el filtro de tiempo
const getDateRange = (filter: TimeFilter, customRange?: { startDate: string; endDate: string }): { startDate: string; endDate: string } => {
  const now = new Date()
  // End of day for today
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  const endDate = endOfDay.toISOString()
  
  switch (filter) {
    case 'hoy':
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { startDate: startOfDay.toISOString(), endDate }
    
    case 'semana':
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - 7)
      startOfWeek.setHours(0, 0, 0, 0)
      return { startDate: startOfWeek.toISOString(), endDate }
    
    case 'mes':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: startOfMonth.toISOString(), endDate }
    
    case 'año':
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return { startDate: startOfYear.toISOString(), endDate }
    
    case 'personalizado':
      if (customRange) {
        // For custom range, ensure we include the full end date
        const customStart = new Date(customRange.startDate)
        customStart.setHours(0, 0, 0, 0)
        const customEnd = new Date(customRange.endDate)
        customEnd.setHours(23, 59, 59, 999)
        return { startDate: customStart.toISOString(), endDate: customEnd.toISOString() }
      }
      return { startDate: '', endDate: '' }
    
    default:
      return { startDate: '', endDate: '' }
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  loading: false,
  error: null,
  isInitialized: false,
  timeFilter: 'hoy',
  dateFieldFilter: 'fecha_entrada',
  coordDateFieldFilter: 'fecha_asignacion',
  selectedEmpresaIds: [],
  selectedAgentIds: [],
  adminStats: {
    totalLeads: 0,
    leadsConvertidos: 0,
    leadsPerdidos: 0,
    leadsSinAsignar: 0,
    leadsInvalidos: 0,
    platformDistribution: {}
  },
  adminLeads: [],
  adminLeadsPage: 1,
  adminLeadsTotalCount: 0,
  coordStats: {
    totalLeads: 0,
    leadsConvertidos: 0,
    leadsPerdidos: 0,
    leadsInvalidos: 0
  },
  coordLeads: [],
  coordLeadsPage: 1,
  coordLeadsTotalCount: 0,
  agentStats: {
    totalLeads: 0,
    leadsConvertidos: 0,
    leadsPerdidos: 0,
    leadsInvalidos: 0
  },
  agentLeads: [],
  agentLeadsPage: 1,
  agentLeadsTotalCount: 0,
  customDateRange: null,

  setTimeFilter: (filter: TimeFilter) => {
    set({ timeFilter: filter, adminLeadsPage: 1, coordLeadsPage: 1, agentLeadsPage: 1 })
    if (filter !== 'personalizado') {
      get().loadDashboardData(filter)
    }
  },

  setDateFieldFilter: (field: DateFieldFilter) => {
    set({ dateFieldFilter: field, adminLeadsPage: 1 })
    get().loadDashboardData()
  },

  setCoordDateFieldFilter: (field: CoordDateFieldFilter) => {
    set({ coordDateFieldFilter: field, coordLeadsPage: 1 })
    get().loadDashboardData()
  },

  setSelectedEmpresaIds: (ids: number[]) => {
    set({ selectedEmpresaIds: ids, adminLeadsPage: 1 })
    get().loadDashboardData()
  },

  setSelectedAgentIds: (ids: string[]) => {
    set({ selectedAgentIds: ids, coordLeadsPage: 1 })
    get().loadDashboardData()
  },

  setCustomDateRange: (range: { startDate: string; endDate: string }) => {
    set({ customDateRange: range, timeFilter: 'personalizado', adminLeadsPage: 1 })
    get().loadDashboardData('personalizado', range)
  },

  loadDashboardData: async (timeFilter?: TimeFilter, customRange?: { startDate: string; endDate: string }) => {
    const { user, userEmpresaId } = useAuthStore.getState()

    if (!user) return

    const filter = timeFilter || get().timeFilter
    const dateField = get().dateFieldFilter
    const empresaIds = get().selectedEmpresaIds
    const rangeToUse = customRange || get().customDateRange
    const { startDate, endDate } = getDateRange(filter, rangeToUse || undefined)

    set({ loading: true, error: null })
    try {
      if (user?.rol === 'administrador') {
        // Para administradores, obtener estadísticas con filtro de fecha y empresas
        const empresaIdsToUse = empresaIds.length > 0 ? empresaIds : undefined
        const [adminStats, adminLeadsData] = await Promise.all([
          leadsService.getAdminDashboardStats(startDate, endDate, dateField, empresaIdsToUse),
          leadsService.getAdminDashboardLeads(startDate, endDate, dateField, 1, 10, empresaIdsToUse)
        ])
        
        set({ 
          adminStats,
          adminLeads: adminLeadsData.leads,
          adminLeadsPage: 1,
          adminLeadsTotalCount: adminLeadsData.totalCount,
          timeFilter: filter,
          customDateRange: filter === 'personalizado' ? rangeToUse : null,
          isInitialized: true, 
          loading: false 
        })
        return
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user?.rol === 'coordinador') {
          // Coordinador: vista similar a admin pero con filtros específicos
          const coordDateField = get().coordDateFieldFilter
          const agentIds = get().selectedAgentIds
          const agentIdsToUse = agentIds.length > 0 ? agentIds : undefined
          
          const [coordStats, coordLeadsData] = await Promise.all([
            leadsService.getCoordDashboardStats(startDate, endDate, coordDateField, userEmpresaId, agentIdsToUse),
            leadsService.getCoordDashboardLeads(startDate, endDate, coordDateField, 1, 10, userEmpresaId, agentIdsToUse)
          ])
          
          
          set({ 
            coordStats,
            coordLeads: coordLeadsData.leads,
            coordLeadsPage: 1,
            coordLeadsTotalCount: coordLeadsData.totalCount,
            timeFilter: filter,
            customDateRange: filter === 'personalizado' ? rangeToUse : null,
            isInitialized: true, 
            loading: false 
          })
          return
        } else if (user?.rol === 'agente') {
          // Agente: vista simplificada con solo sus leads asignados, filtrados por fecha_asignacion_usuario
          const [agentStats, agentLeadsData] = await Promise.all([
            leadsService.getAgentDashboardStats(startDate, endDate, userEmpresaId, user.id),
            leadsService.getAgentDashboardLeads(startDate, endDate, 1, 10, userEmpresaId, user.id)
          ])
          
          set({ 
            agentStats,
            agentLeads: agentLeadsData.leads,
            agentLeadsPage: 1,
            agentLeadsTotalCount: agentLeadsData.totalCount,
            timeFilter: filter,
            customDateRange: filter === 'personalizado' ? rangeToUse : null,
            isInitialized: true, 
            loading: false 
          })
          return
        } else {
          // Rol no reconocido, mostrar error
          console.error('❌ Unknown user role:', user.rol)
          throw new Error('Rol de usuario no reconocido. Contacta al administrador.')
        }
      } else {
        // Si el usuario no es admin y no tiene empresa_id, mostrar error
        console.error('❌ User without company assigned:', user)
        throw new Error('Usuario sin empresa asignada. Contacta al administrador.')
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los datos del dashboard',
        loading: false 
      })
    }
  },

  loadDashboardLeads: async () => {
    // Mantener compatibilidad con código existente
    await get().loadDashboardData()
  },

  loadAdminLeadsPage: async (page: number) => {
    const { user } = useAuthStore.getState()
    if (!user || user.rol !== 'administrador') return

    const filter = get().timeFilter
    const dateField = get().dateFieldFilter
    const empresaIds = get().selectedEmpresaIds
    const rangeToUse = get().customDateRange
    const { startDate, endDate } = getDateRange(filter, rangeToUse || undefined)

    try {
      const empresaIdsToUse = empresaIds.length > 0 ? empresaIds : undefined
      const adminLeadsData = await leadsService.getAdminDashboardLeads(startDate, endDate, dateField, page, 10, empresaIdsToUse)
      
      set({ 
        adminLeads: adminLeadsData.leads,
        adminLeadsPage: page,
        adminLeadsTotalCount: adminLeadsData.totalCount
      })
    } catch (error) {
      console.error('Error loading admin leads page:', error)
    }
  },

  loadCoordLeadsPage: async (page: number) => {
    const { user, userEmpresaId } = useAuthStore.getState()
    if (!user || user.rol !== 'coordinador' || !userEmpresaId) return

    const filter = get().timeFilter
    const coordDateField = get().coordDateFieldFilter
    const agentIds = get().selectedAgentIds
    const rangeToUse = get().customDateRange
    const { startDate, endDate } = getDateRange(filter, rangeToUse || undefined)

    try {
      const agentIdsToUse = agentIds.length > 0 ? agentIds : undefined
      const coordLeadsData = await leadsService.getCoordDashboardLeads(startDate, endDate, coordDateField, page, 10, userEmpresaId, agentIdsToUse)
      
      set({ 
        coordLeads: coordLeadsData.leads,
        coordLeadsPage: page,
        coordLeadsTotalCount: coordLeadsData.totalCount
      })
    } catch (error) {
      console.error('Error loading coord leads page:', error)
    }
  },

  loadAgentLeadsPage: async (page: number) => {
    const { user, userEmpresaId } = useAuthStore.getState()
    if (!user || user.rol !== 'agente' || !userEmpresaId) return

    const filter = get().timeFilter
    const rangeToUse = get().customDateRange
    const { startDate, endDate } = getDateRange(filter, rangeToUse || undefined)

    try {
      const agentLeadsData = await leadsService.getAgentDashboardLeads(startDate, endDate, page, 10, userEmpresaId, user.id)
      
      set({ 
        agentLeads: agentLeadsData.leads,
        agentLeadsPage: page,
        agentLeadsTotalCount: agentLeadsData.totalCount
      })
    } catch (error) {
      console.error('Error loading agent leads page:', error)
    }
  },

  resetInitialized: () => {
    set({ 
      adminStats: {
        totalLeads: 0,
        leadsConvertidos: 0,
        leadsPerdidos: 0,
        leadsSinAsignar: 0,
        leadsInvalidos: 0,
        platformDistribution: {}
      },
      adminLeads: [],
      adminLeadsPage: 1,
      adminLeadsTotalCount: 0,
      coordStats: {
        totalLeads: 0,
        leadsConvertidos: 0,
        leadsPerdidos: 0,
        leadsInvalidos: 0
      },
      coordLeads: [],
      coordLeadsPage: 1,
      coordLeadsTotalCount: 0,
      agentStats: {
        totalLeads: 0,
        leadsConvertidos: 0,
        leadsPerdidos: 0,
        leadsInvalidos: 0
      },
      agentLeads: [],
      agentLeadsPage: 1,
      agentLeadsTotalCount: 0,
      customDateRange: null,
      dateFieldFilter: 'fecha_entrada',
      coordDateFieldFilter: 'fecha_asignacion',
      selectedEmpresaIds: [],
      selectedAgentIds: [],
      isInitialized: false 
    })
  }
}))
