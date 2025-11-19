import { create } from 'zustand'
import { leadsService, type Lead } from '../services/leadsService'
import { salesService, type VentaRealizada, type DevolucionResuelta, type RankingVendedor } from '../services/salesService'
import { useAuthStore } from './authStore'
import { platformConverter } from '../utils/platformConverter'

export interface DashboardLead {
    id: number
    fecha_entrada: string
    nombre_cliente: string
    telefono: string
    plataforma: string
    empresa_id: number
    empresa_nombre?: string
    estado_temporal?: string
    estado?: string
    plataforma_lead_id?: string 
    calidad?: number 
}

// NUEVA INTERFAZ
export interface Company {
    id: number
    nombre: string
}

// CAMBIO 1: Añadir 'personalizado' al tipo TimeFilter
export type TimeFilter = 'hoy' | 'semana' | 'mes' | 'año' | 'personalizado'

export interface DashboardStats {
    totalLeads: number
    leadsDevueltos: number
    leadsCerrados: number
    platformDistribution: Record<string, number>
    leadsInvalidos: number
    leadsSinAsignar: number
    leadsPerdidos: number
    averageQuality: number
}

interface DashboardState {
    dashboardLeads: DashboardLead[]
    ventas: VentaRealizada[]
    devolucionesResueltas: DevolucionResuelta[]
    leadsConvertidos: number[]
    rankingVendedores: RankingVendedor[]
    companies: Company[] // NUEVO ESTADO: Lista de empresas
    selectedCompanyId: number | 'all' | 'none' // NUEVO ESTADO: Filtro seleccionado
    loading: boolean
    error: string | null
    isInitialized: boolean
    timeFilter: TimeFilter
    stats: DashboardStats
    loadDashboardData: (timeFilter?: TimeFilter) => Promise<void>
    loadDashboardDataCustom: (startDate: string, endDate: string) => Promise<void>
    loadDashboardLeads: () => Promise<void>
    setTimeFilter: (filter: TimeFilter) => void
    setCompanyFilter: (companyId: number | 'all' | 'none') => void // NUEVA FUNCIÓN
    loadCompanies: () => Promise<void> // NUEVA FUNCIÓN para cargar empresas
    resetInitialized: () => void
}

// Función auxiliar para obtener fechas según el filtro de tiempo
const getDateRange = (filter: Exclude<TimeFilter, 'personalizado'>): { startDate: string; endDate: string } => {
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

// Función de procesamiento (Extraída para evitar repetición)
const processDashboardData = (Dleads: Lead[], ventas: VentaRealizada[], devolucionesResueltas: DevolucionResuelta[], rankingVendedores: RankingVendedor[]): { dashboardLeads: DashboardLead[], stats: DashboardStats } => {
    
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
        plataforma_lead_id: lead.plataforma_lead_id,
        calidad: lead.calidad
    }))

    // Calcular estadísticas
    const totalLeads = dashboardLeads.length
    const leadsDevueltos = devolucionesResueltas.length
    
    const leadsCerrados = dashboardLeads.filter(lead => 
        lead.estado && lead.estado.toLowerCase().trim() === 'convertido'
    ).length

    const leadsSinAsignar = dashboardLeads.filter(lead => 
        !lead.empresa_id || lead.empresa_id === 0 
    ).length
    
    const leadsInvalidos = dashboardLeads.filter(lead => 
        lead.estado && lead.estado.toLowerCase().trim() === 'no_valido'
    ).length
    
    const leadsPerdidos = dashboardLeads.filter(lead => 
        lead.estado && lead.estado.toLowerCase().trim() === 'perdido'
    ).length

    const platformDistribution = dashboardLeads.reduce((acc, lead) => {
        const platform = lead.plataforma || 'Sin plataforma'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
    }, {} as Record<string, number>)

    const validLeads = dashboardLeads.map(lead => {
        if (lead.calidad && lead.estado !== 'no_valido') {
            return Number(lead.calidad);
        }else {
            return 0;
        }
    })

    const totalQualitySum = validLeads.reduce((sum, calidad) => sum + calidad, 0)

    const averageQuality = validLeads.length > 0
        ? totalQualitySum / validLeads.length 
        : 0

    const stats: DashboardStats = {
        totalLeads,
        leadsDevueltos,
        leadsCerrados,
        platformDistribution,
        leadsInvalidos, 
        leadsSinAsignar,
        leadsPerdidos,
        averageQuality
    }
    
    return { dashboardLeads, stats }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
    dashboardLeads: [],
    ventas: [],
    devolucionesResueltas: [],
    leadsConvertidos: [],
    rankingVendedores: [],
    companies: [], // ESTADO INICIAL: Lista de empresas
    selectedCompanyId: 'all', // ESTADO INICIAL: 'Todos'
    loading: false,
    error: null,
    isInitialized: false,
    timeFilter: 'hoy',
    stats: {
        totalLeads: 0,
        leadsDevueltos: 0,
        leadsCerrados: 0,
        platformDistribution: {},
        leadsInvalidos: 0, 
        leadsSinAsignar: 0,
        leadsPerdidos: 0,
        averageQuality: 0
    },
    
    // ----------------------------------------------------------------------
    // FUNCIONES PARA EL FILTRO DE EMPRESA
    // ----------------------------------------------------------------------
    setCompanyFilter: (companyId: number | 'all' | 'none') => {
        set({ selectedCompanyId: companyId })
        // Dispara la recarga de datos con el filtro de tiempo actual
        get().loadDashboardData() 
    },

    loadCompanies: async () => {
        try {
            // Asume que leadsService.getCompaniesList() ha sido implementado
            const companies = await leadsService.getCompaniesList()
            set({ companies })
        } catch (error) {
            console.error('Error loading companies list:', error)
        }
    },
    // ----------------------------------------------------------------------

    setTimeFilter: (filter: TimeFilter) => {
        set({ timeFilter: filter })
        get().loadDashboardData(filter) 
    },

    loadDashboardData: async (timeFilter?: TimeFilter) => {
        const { user, userEmpresaId } = useAuthStore.getState()
        const { selectedCompanyId, loadCompanies } = get()

        if (!user) return

        // 🚨 PASO 1: Asegurar que la lista de empresas esté cargada (solo para Admin)
        if (get().companies.length === 0 && user?.rol === 'administrador') {
            await loadCompanies()
        }

        // 🚨 PASO 2: Determinar el ID de empresa a usar para la consulta.
        let companyIdToFilter: number | undefined | null
        
        if (user?.rol === 'administrador') {
            // El Admin usa el filtro de la store
            if (selectedCompanyId === 'all') {
                companyIdToFilter = undefined // Global (no se aplica filtro de empresa)
            } else if (selectedCompanyId === 'none') {
                companyIdToFilter = null // Convención para "Sin asignar" (NULL en la DB)
            } else {
                companyIdToFilter = selectedCompanyId as number // Un ID específico
            }
        } else {
            // Coordinador/Agente: siempre ven su propia empresa.
            // ✅ CORRECCIÓN DE TIPO: Usar ?? undefined para convertir null a undefined
            companyIdToFilter = userEmpresaId ?? undefined
        }
        
        const filter = timeFilter || get().timeFilter

        set({ loading: true, error: null })
        try {
            let Dleads: Lead[] = []
            let ventas: VentaRealizada[] = []
            let devolucionesResueltas: DevolucionResuelta[] = []
            let rankingVendedores: RankingVendedor[] = []
            
            if (user?.rol === 'administrador') {
                // Admin ve TODO si el filtro NO es personalizado (carga inicial)
                if (filter !== 'personalizado') { 
                    
                    if (companyIdToFilter === undefined) { 
                         // Si 'Todos' (sin filtro de empresa) y sin filtro de tiempo: carga todos.
                        Dleads = await leadsService.getAllLeads()
                    } else {
                        // Admin filtra por empresa (ID o 0) pero sin filtro de tiempo
                        const startOfTime = '2000-01-01T00:00:00.000Z' 
                        const now = new Date().toISOString()
                        // Usamos la función de rango con un rango amplio y el filtro de empresa
                        Dleads = await leadsService.getLeadsInDateRange(startOfTime, now, companyIdToFilter, undefined)
                    }

                } else {
                    console.warn("Admin called loadDashboardData in 'personalizado' mode. Skipping load. Use loadDashboardDataCustom instead.")
                    set({ loading: false, isInitialized: true, timeFilter: filter })
                    return
                }
            } else if (companyIdToFilter !== undefined) {
                // Lógica para Coordinador y Agente (usa filtros de tiempo)
                const { startDate, endDate } = getDateRange(filter as Exclude<TimeFilter, 'personalizado'>) 
                
                if (user?.rol === 'coordinador') {
                    // Coordinaor: Usa su ID de empresa (companyIdToFilter) y filtros de tiempo
                    Dleads = await leadsService.getLeadsInDateRange(startDate, endDate, companyIdToFilter)
                    ventas = await salesService.getVentasByCompany(companyIdToFilter, startDate, endDate)
                    devolucionesResueltas = await salesService.getDevolucionesResueltasByCompany(companyIdToFilter, startDate, endDate)
                    rankingVendedores = await salesService.getRankingVendedores(companyIdToFilter)
                } else if (user?.rol === 'agente') {
                    // Agente: Usa su ID de empresa (companyIdToFilter), filtros de tiempo y estado 'activo'
                    Dleads = await leadsService.getLeadsInDateRange(startDate, endDate, companyIdToFilter, 'activo')
                    Dleads = Dleads.filter(lead => lead.user_id === user.id)
                    ventas = await salesService.getVentasByUser(companyIdToFilter, user.id, startDate, endDate)
                    devolucionesResueltas = await salesService.getDevolucionesResueltasByUser(companyIdToFilter, user.id, startDate, endDate)
                    rankingVendedores = await salesService.getRankingVendedores(companyIdToFilter)
                } else {
                    console.error('❌ Unknown user role:', user.rol)
                    throw new Error('Rol de usuario no reconocido. Contacta al administrador.')
                }
            } else {
                console.error('❌ User without company assigned:', user)
                throw new Error('Usuario sin empresa asignada. Contacta al administrador.')
            }

            // Procesar datos y calcular estadísticas
            const { dashboardLeads, stats } = processDashboardData(Dleads, ventas, devolucionesResueltas, rankingVendedores)

            set({ 
                dashboardLeads, 
                ventas,
                devolucionesResueltas,
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

    // IMPLEMENTACIÓN MODIFICADA DE loadDashboardDataCustom
    loadDashboardDataCustom: async (startDate: string, endDate: string) => {
        const { user } = useAuthStore.getState()
        const { selectedCompanyId } = get() 

        if (!user || user.rol !== 'administrador') return

        set({ loading: true, error: null })
        try {
            // Lógica de mapeo del filtro de empresa 
            let companyIdToFilter: number | undefined | null;
            if (selectedCompanyId === 'all') {
                companyIdToFilter = undefined // Global (ver todos)
            } else if (selectedCompanyId === 'none') {
                companyIdToFilter = null // Sin asignar (NULL en la DB)
            } else {
                companyIdToFilter = selectedCompanyId as number // ID específico
            }
            
            // Pasamos companyIdToFilter al servicio
            const Dleads: Lead[] = await leadsService.getLeadsInDateRange(startDate, endDate, companyIdToFilter, undefined) 
            
            const ventas: VentaRealizada[] = [] 
            const devolucionesResueltas: DevolucionResuelta[] = []
            const rankingVendedores: RankingVendedor[] = [] 

            // Procesamiento de datos
            const { dashboardLeads, stats } = processDashboardData(Dleads, ventas, devolucionesResueltas, rankingVendedores)

            set({ 
                dashboardLeads, 
                ventas,
                devolucionesResueltas,
                rankingVendedores,
                stats,
                timeFilter: 'personalizado',
                isInitialized: true, 
                loading: false 
            })
        } catch (error) {
            console.error('Error loading custom dashboard data:', error)
            set({ 
                error: error instanceof Error ? error.message : 'Error al cargar los datos del dashboard personalizado',
                loading: false 
            })
        }
    },

    loadDashboardLeads: async () => {
        await get().loadDashboardData()
    },

    resetInitialized: () => {
        set({ 
            dashboardLeads: [], 
            ventas: [],
            devolucionesResueltas: [],
            leadsConvertidos: [],
            rankingVendedores: [],
            companies: [], // También resetear la lista de empresas
            selectedCompanyId: 'all',
            stats: {
                totalLeads: 0,
                leadsDevueltos: 0,
                leadsCerrados: 0,
                platformDistribution: {},
                leadsInvalidos: 0, 
                leadsSinAsignar: 0, 
                leadsPerdidos: 0,
                averageQuality: 0
            },
            isInitialized: false 
        })
    }
}))