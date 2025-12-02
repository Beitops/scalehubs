import { create } from 'zustand'
import { leadsService, type Lead } from '../services/leadsService'
import { salesService, type VentaRealizada, type RankingVendedor } from '../services/salesService'
import { useAuthStore } from './authStore'
import { platformConverter } from '../utils/platformConverter'
interface DashboardLead {
  id: number
  fecha_entrada: string
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id: number
  empresa_nombre?: string
  estado_temporal?: string
  estado?: string
  plataforma_lead?: string
}

type TimeFilter = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado'
type DateFieldFilter = 'fecha_entrada' | 'fecha_asignacion'

interface DashboardStats {
  totalLeads: number
  leadsCerrados: number
  platformDistribution: Record<string, number>
}

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

interface DashboardState {
  dashboardLeads: DashboardLead[]
  ventas: VentaRealizada[]
  leadsConvertidos: number[]
  rankingVendedores: RankingVendedor[]
  loading: boolean
  error: string | null
  isInitialized: boolean
  timeFilter: TimeFilter
  dateFieldFilter: DateFieldFilter
  selectedEmpresaIds: number[]
  stats: DashboardStats
  adminStats: AdminStats
  adminLeads: AdminLead[]
  adminLeadsPage: number
  adminLeadsTotalCount: number
  customDateRange: { startDate: string; endDate: string } | null
  loadDashboardData: (timeFilter?: TimeFilter, customRange?: { startDate: string; endDate: string }) => Promise<void>
  loadDashboardLeads: () => Promise<void> // Mantener compatibilidad
  loadAdminLeadsPage: (page: number) => Promise<void>
  setTimeFilter: (filter: TimeFilter) => void
  setDateFieldFilter: (field: DateFieldFilter) => void
  setSelectedEmpresaIds: (ids: number[]) => void
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
  dashboardLeads: [],
  ventas: [],
  leadsConvertidos: [],
  rankingVendedores: [],
  loading: false,
  error: null,
  isInitialized: false,
  timeFilter: 'hoy',
  dateFieldFilter: 'fecha_entrada',
  selectedEmpresaIds: [],
  stats: {
    totalLeads: 0,
    leadsCerrados: 0,
    platformDistribution: {}
  },
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
  customDateRange: null,

  setTimeFilter: (filter: TimeFilter) => {
    set({ timeFilter: filter, adminLeadsPage: 1 })
    if (filter !== 'personalizado') {
      get().loadDashboardData(filter)
    }
  },

  setDateFieldFilter: (field: DateFieldFilter) => {
    set({ dateFieldFilter: field, adminLeadsPage: 1 })
    get().loadDashboardData()
  },

  setSelectedEmpresaIds: (ids: number[]) => {
    set({ selectedEmpresaIds: ids, adminLeadsPage: 1 })
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
      let Dleads: Lead[] = []
      let ventas: VentaRealizada[] = []
      let leadsConvertidos: number[] = []
      let rankingVendedores: RankingVendedor[] = []
      
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
          // Coordinador ve todos los leads de su empresa, filtrados por fecha_asignacion
          Dleads = await leadsService.getLeadsInDateRange(startDate, endDate, userEmpresaId, undefined, 'fecha_asignacion')
          ventas = await salesService.getVentasByCompany(userEmpresaId, startDate, endDate)
          leadsConvertidos = await salesService.getLeadsConvertidosConVenta(userEmpresaId, undefined, startDate, endDate)
          rankingVendedores = await salesService.getRankingVendedores(userEmpresaId)
        } else if (user?.rol === 'agente') {
          // Agente solo ve los leads asignados a él, filtrados por fecha_asignacion_usuario
          Dleads = await leadsService.getLeadsInDateRange(startDate, endDate, userEmpresaId, 'activo', 'fecha_asignacion_usuario')
          // Filtrar leads asignados al usuario
          Dleads = Dleads.filter(lead => lead.user_id === user.id)
          ventas = await salesService.getVentasByUser(userEmpresaId, user.id, startDate, endDate)
          leadsConvertidos = await salesService.getLeadsConvertidosConVenta(userEmpresaId, user.id, startDate, endDate)
          rankingVendedores = await salesService.getRankingVendedores(userEmpresaId)
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
      // Convertir a DashboardLead y solo incluir datos necesarios para dashboard
      const dashboardLeads: DashboardLead[] = Dleads.map(lead => ({
        id: lead.id,
        fecha_entrada: lead.fecha_entrada,
        nombre_cliente: lead.nombre_cliente,
        telefono: lead.telefono,
        plataforma: platformConverter(lead.plataforma),
        empresa_id: lead.empresa_id,
        empresa_nombre: lead.empresa_nombre,
        estado_temporal: lead.estado_temporal,
        estado: lead.estado,
        plataforma_lead_id: lead.plataforma_lead_id
      }))


      // Calcular estadísticas
      const totalLeads = dashboardLeads.length
      const leadsCerrados = leadsConvertidos.length

      // Calcular distribución de plataformas
      const platformDistribution = dashboardLeads.reduce((acc, lead) => {
        const platform = lead.plataforma || 'Sin plataforma'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const stats: DashboardStats = {
        totalLeads,
        leadsCerrados,
        platformDistribution
      }

      set({ 
        dashboardLeads, 
        ventas,
        leadsConvertidos,
        rankingVendedores,
        stats,
        timeFilter: filter,
        isInitialized: true, 
        loading: false 
      })
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

  resetInitialized: () => {
    set({ 
      dashboardLeads: [], 
      ventas: [],
      leadsConvertidos: [],
      rankingVendedores: [],
      stats: {
        totalLeads: 0,
        leadsCerrados: 0,
        platformDistribution: {}
      },
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
      customDateRange: null,
      dateFieldFilter: 'fecha_entrada',
      selectedEmpresaIds: [],
      isInitialized: false 
    })
  }
}))
