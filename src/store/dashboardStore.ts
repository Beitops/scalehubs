import { create } from 'zustand'
import { leadsService, type Lead } from '../services/leadsService'
import { useAuthStore } from './authStore'

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

interface DashboardState {
  dashboardLeads: DashboardLead[]
  loading: boolean
  error: string | null
  isInitialized: boolean
  loadDashboardLeads: () => Promise<void>
  resetInitialized: () => void
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  dashboardLeads: [],
  loading: false,
  error: null,
  isInitialized: false,

  loadDashboardLeads: async () => {
    const { user, userEmpresaId } = useAuthStore.getState()

    if (!user) return
    // Evitar cargar si ya está inicializado
    if (get().isInitialized) return

    set({ loading: true, error: null })
    try {
      let Dleads: Lead[] = []
      
      if (user?.rol === 'administrador') {
        // Administrador ve todos los leads
        Dleads = await leadsService.getAllLeads()
      } else if (userEmpresaId) {
        // Usuario no admin, verificar rol
        if (user?.rol === 'coordinador') {
          // Coordinador ve todos los leads de su empresa
          Dleads = await leadsService.getLeadsByCompany(userEmpresaId)
        } else if (user?.rol === 'agente') {
          // Agente solo ve los leads asignados a él
          Dleads = await leadsService.getLeadsByCompanyAndUser(userEmpresaId, user.id)
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
        plataforma: lead.plataforma,
        empresa_id: lead.empresa_id,
        empresa_nombre: lead.empresa_nombre,
        estado_temporal: lead.estado_temporal,
        estado: lead.estado,
        plataforma_lead: lead.plataforma_lead
      }))

      set({ dashboardLeads, isInitialized: true, loading: false })
    } catch (error) {
      console.error('Error loading dashboard leads:', error)
      set({ 
        error: error instanceof Error ? error.message : 'Error al cargar los datos del dashboard',
        loading: false 
      })
    }
  },

  resetInitialized: () => {
    set({ dashboardLeads: [], isInitialized: false })
  }
}))
