import { create } from 'zustand'
import { leadsService, type Lead } from '../services/leadsService'
import { salesService, type VentaRealizada, type DevolucionResuelta, type RankingVendedor } from '../services/salesService'
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

type TimeFilter = 'hoy' | 'semana' | 'mes' | 'año'

interface DashboardStats {
  totalLeads: number
  leadsDevueltos: number
  leadsCerrados: number
  platformDistribution: Record<string, number>
}

interface DashboardState {
  dashboardLeads: DashboardLead[]
  ventas: VentaRealizada[]
  devolucionesResueltas: DevolucionResuelta[]
  leadsConvertidos: number[]
  rankingVendedores: RankingVendedor[]
  loading: boolean
  error: string | null
  isInitialized: boolean
  timeFilter: TimeFilter
  stats: DashboardStats
  loadDashboardData: (timeFilter?: TimeFilter) => Promise<void>
  loadDashboardLeads: () => Promise<void> // Mantener compatibilidad
  setTimeFilter: (filter: TimeFilter) => void
  resetInitialized: () => void
}

// Función auxiliar para obtener fechas según el filtro de tiempo
const getDateRange = (filter: TimeFilter): { startDate: string; endDate: string } => {
  const now = new Date()
  const endDate = now.toISOString()
  
  switch (filter) {
    case 'hoy':
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      return { startDate: startOfDay.toISOString(), endDate }
    
    case 'semana':
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - 7)
      return { startDate: startOfWeek.toISOString(), endDate }
    
    case 'mes':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { startDate: startOfMonth.toISOString(), endDate }
    
    case 'año':
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      return { startDate: startOfYear.toISOString(), endDate }
    
    default:
      return { startDate: '', endDate: '' }
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboardLeads: [],
  ventas: [],
  devolucionesResueltas: [],
  leadsConvertidos: [],
  rankingVendedores: [],
  loading: false,
  error: null,
  isInitialized: false,
  timeFilter: 'hoy',
  stats: {
    totalLeads: 0,
    leadsDevueltos: 0,
    leadsCerrados: 0,
    platformDistribution: {}
  },

  setTimeFilter: (filter: TimeFilter) => {
    set({ timeFilter: filter })
    get().loadDashboardData(filter)
  },

  loadDashboardData: async (timeFilter?: TimeFilter) => {
    const { user, userEmpresaId } = useAuthStore.getState()

    if (!user) return

    const filter = timeFilter || get().timeFilter
    const { startDate, endDate } = getDateRange(filter)

    set({ loading: true, error: null })
    try {
      let Dleads: Lead[] = []
      let ventas: VentaRealizada[] = []
      let devolucionesResueltas: DevolucionResuelta[] = []
      let leadsConvertidos: number[] = []
      let rankingVendedores: RankingVendedor[] = []
      
      if (user?.rol === 'administrador') {
        // Para administradores, mantener la lógica actual por ahora
        Dleads = await leadsService.getAllLeads()
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user?.rol === 'coordinador') {
          // Coordinador ve todos los leads de su empresa
          Dleads = await leadsService.getLeadsInDateRange(startDate, endDate, userEmpresaId)
          ventas = await salesService.getVentasByCompany(userEmpresaId, startDate, endDate)
          devolucionesResueltas = await salesService.getDevolucionesResueltasByCompany(userEmpresaId, startDate, endDate)
          leadsConvertidos = await salesService.getLeadsConvertidosConVenta(userEmpresaId, undefined, startDate, endDate)
          rankingVendedores = await salesService.getRankingVendedores(userEmpresaId)
        } else if (user?.rol === 'agente') {
          // Agente solo ve los leads asignados a él
          Dleads = await leadsService.getLeadsInDateRange(startDate, endDate, userEmpresaId, 'activo')
          // Filtrar leads asignados al usuario
          Dleads = Dleads.filter(lead => lead.user_id === user.id)
          ventas = await salesService.getVentasByUser(userEmpresaId, user.id, startDate, endDate)
          devolucionesResueltas = await salesService.getDevolucionesResueltasByUser(userEmpresaId, user.id, startDate, endDate)
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
      const leadsDevueltos = devolucionesResueltas.length
      const leadsCerrados = leadsConvertidos.length

      // Calcular distribución de plataformas
      const platformDistribution = dashboardLeads.reduce((acc, lead) => {
        const platform = lead.plataforma || 'Sin plataforma'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      const stats: DashboardStats = {
        totalLeads,
        leadsDevueltos,
        leadsCerrados,
        platformDistribution
      }

      set({ 
        dashboardLeads, 
        ventas,
        devolucionesResueltas,
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

  resetInitialized: () => {
    set({ 
      dashboardLeads: [], 
      ventas: [],
      devolucionesResueltas: [],
      leadsConvertidos: [],
      rankingVendedores: [],
      stats: {
        totalLeads: 0,
        leadsDevueltos: 0,
        leadsCerrados: 0,
        platformDistribution: {}
      },
      isInitialized: false 
    })
  }
}))
