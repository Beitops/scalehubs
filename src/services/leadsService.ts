import { supabase } from '../lib/supabase'
import { platformConverter } from '../utils/platformConverter'
import { useAuthStore } from '../store/authStore'
import { getDateFieldByRole, type DateFieldType } from '../utils/dateFieldByRole'

export interface Lead {
  id: number
  fecha_entrada: string
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id: number
  empresa_nombre?: string
  campaña_nombre?: string
  estado_temporal?: string
  estado?: string
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  fecha_asignacion?: string
  fecha_asignacion_usuario?: string
  plataforma_lead?: string
  observaciones?: string
  user_id?: string
  usuario_nombre?: string
  calidad?: number
}


export interface CreateLeadData {
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id: number
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  estado_temporal?: string
}

export interface ImportLeadData {
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id?: number
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  estado_temporal?: string
  estado?: string
  observaciones?: string
  calidad?: number
}

export interface ImportResult {
  success: boolean
  created: number
  errors: string[]
  duplicatePhones: string[]
}

export interface LeadDevolucion extends Lead {
  audio_devolucion?: string
  imagen_devolucion?: string
  motivo?: string
  observaciones_admin?: string
  devolucion_id?: number
}

class LeadsService {
  async getLeadsByCompany(empresaId: number, estado?: string, page?: number, limit?: number): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .order('fecha_entrada', { ascending: false })
      
      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      // Aplicar paginación si se especifica
      if (page && limit) {
        const from = (page - 1) * limit
        const to = from + limit - 1
        query = query.range(from, to)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching leads by company:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        usuario_nombre: lead.profiles?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getLeadsByCompany:', error)
      throw error
    }
  }

  async getLeadsByCompanyAndUser(empresaId: number, userId: string, estado?: string): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('user_id', userId)
        .order('fecha_entrada', { ascending: false })
      
      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query
      if (error) {
        console.error('Error fetching leads by company and user:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        usuario_nombre: lead.profiles?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getLeadsByCompanyAndUser:', error)
      throw error
    }
  }

  async getAllLeads(estado?: string): Promise<Lead[]> {
    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `)
        .order('fecha_entrada', { ascending: false })
      
      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching all leads:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        usuario_nombre: lead.profiles?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getAllLeads:', error)
      throw error
    }
  }

  async updateLeadStatus(leadId: number, estadoTemporal: string): Promise<void> {
    try {
      // Si el estado temporal es 'convertido', 'no_cerrado' o 'no_valido', cambiar también el estado correspondiente
      const updates: any = { estado_temporal: estadoTemporal }
      
      if (estadoTemporal === 'convertido') {
        updates.estado = 'convertido'
      } else if (estadoTemporal === 'no_cerrado') {
        updates.estado = 'perdido'
      } else if (estadoTemporal === 'no_valido') {
        updates.estado = 'no_valido'
      }

      const { error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', leadId)
        .select()

      if (error) {
        console.error('Error updating lead status:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateLeadStatus:', error)
      throw error
    }
  }

  async updateLeadObservations(leadId: number, observaciones: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ observaciones })
        .eq('id', leadId)
        .select()

      if (error) {
        console.error('Error updating lead observations:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in updateLeadObservations:', error)
      throw error
    }
  }

  async createLead(leadData: CreateLeadData): Promise<Lead> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .insert([leadData])
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .single()

      if (error) {
        console.error('Error creating lead:', error)
        throw error
      }

      return {
        ...data,
        empresa_nombre: data.empresas?.nombre
      }
    } catch (error) {
      console.error('Error in createLead:', error)
      throw error
    }
  }

    async getLeadsInDateRange(startDate: string, endDate: string, empresaId?: number, estados?: string | string[], dateField: DateFieldType = 'fecha_entrada'): Promise<Lead[]> {
    try {
      // Obtener todos los leads en el rango de fechas
      let query = supabase
        .from('leads')
        .select(`
          id,
          fecha_entrada,
          fecha_asignacion,
          fecha_asignacion_usuario,
          nombre_cliente,
          telefono,
          plataforma,
          empresa_id,
          estado_temporal,
          estado,
          campaña_id,
          hub_id,
          plataforma_lead_id,
          user_id,
          observaciones,
          calidad,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .gte(dateField, startDate)
        .lte(dateField, endDate)
        .order(dateField, { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      // Filtrar por estado(s) si se especifica
      if (estados) {
        if (Array.isArray(estados)) {
          query = query.in('estado', estados)
        } else {
          query = query.eq('estado', estados)
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching leads in date range:', error)
        throw error
      }

      const leads = (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        calidad: lead.calidad || 1
      })) || []

      // Ordenar todos los leads por el campo de fecha especificado descendente
      leads.sort((a, b) => {
        const dateA = a[dateField] ? new Date(a[dateField]).getTime() : 0
        const dateB = b[dateField] ? new Date(b[dateField]).getTime() : 0
        return dateB - dateA
      })

      return leads
    } catch (error) {
      console.error('Error in getLeadsInDateRange:', error)
      throw error
    }
  }

  // Obtener leads sin empresa asignada (para administradores)
  async getUnassignedLeads(): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          fecha_entrada,
          nombre_cliente,
          telefono,
          plataforma,
          empresa_id,
          estado_temporal,
          estado,
          campaña_id,
          hub_id,
          plataforma_lead_id,
          user_id,
          observaciones,
          calidad,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          campañas!leads_campaña_id_fkey (
            id,
            nombre
          )
        `)
        .is('empresa_id', null)
        .eq('estado', 'activo')
        .order('fecha_entrada', { ascending: false })

      if (error) {
        console.error('Error fetching unassigned leads:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        campaña_nombre: lead.campañas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma || ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getUnassignedLeads:', error)
      throw error
    }
  }

  // Obtener leads de una empresa sin agente asignado (para coordinadores)
  async getUnassignedLeadsByCompany(empresaId: number): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          id,
          fecha_entrada,
          nombre_cliente,
          telefono,
          plataforma,
          empresa_id,
          estado_temporal,
          estado,
          campaña_id,
          hub_id,
          plataforma_lead_id,
          user_id,
          observaciones,
          calidad,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          campañas!leads_campaña_id_fkey (
            id,
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
        .is('user_id', null)
        .eq('estado', 'activo')
        .order('fecha_entrada', { ascending: false })

      if (error) {
        console.error('Error fetching unassigned leads by company:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        campaña_nombre: lead.campañas?.nombre,
        plataforma_lead: platformConverter(lead.plataforma || ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getUnassignedLeadsByCompany:', error)
      throw error
    }
  }

  // Asignar leads a una empresa (para administradores) - soporta uno o múltiples leads
  async assignLeadToCompany(leadIds: number | number[], empresaId: number): Promise<void> {
    try {
      const idsArray = Array.isArray(leadIds) ? leadIds : [leadIds]
      
      if (idsArray.length === 0) return

      const { error } = await supabase
        .from('leads')
        .update({ 
          empresa_id: empresaId,
          fecha_asignacion: new Date().toISOString()
        })
        .in('id', idsArray)

      if (error) {
        console.error('Error assigning leads to company:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in assignLeadToCompany:', error)
      throw error
    }
  }

  // Asignar lead a un agente (para coordinadores)
  async assignLeadToAgent(leadId: number, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          user_id: userId,
          fecha_asignacion_usuario: new Date().toISOString()
        })
        .eq('id', leadId)

      if (error) {
        console.error('Error assigning lead to agent:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in assignLeadToAgent:', error)
      throw error
    }
  }

  // Rehusar lead (quitar asignación de usuario)
  async rehusarLead(leadId: number, currentUserId: string): Promise<void> {
    try {
      // Primero verificar que el lead existe y obtener información del usuario asignado
      const { data: leadData, error: fetchError } = await supabase
        .from('leads')
        .select('user_id')
        .eq('id', leadId)
        .single()

      if (fetchError) {
        console.error('Error fetching lead:', fetchError)
        throw fetchError
      }

      if (!leadData) {
        throw new Error('Lead no encontrado')
      }

      // Si el lead no tiene usuario asignado, no se puede rehusar
      if (!leadData.user_id) {
        throw new Error('Este lead no está asignado a ningún usuario')
      }

      // Si el usuario actual es un agente, verificar que sea el mismo usuario asignado
      const { user } = useAuthStore.getState()
      if (user?.rol === 'agente' && leadData.user_id !== currentUserId) {
        throw new Error('No tienes permisos para rehusar este lead')
      }

      // Quitar la asignación del lead
      const { error } = await supabase
        .from('leads')
        .update({ 
          user_id: null,
          fecha_asignacion_usuario: null
        })
        .eq('id', leadId)

      if (error) {
        console.error('Error rehusing lead:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in rehusarLead:', error)
      throw error
    }
  }

  // Crear lead individual para importación manual
  async createImportLead(leadData: ImportLeadData): Promise<Lead> {
    try {
      const leadToCreate = {
        nombre_cliente: leadData.nombre_cliente,
        telefono: leadData.telefono,
        plataforma: leadData.plataforma || 'ScaleHubs',
        empresa_id: leadData.empresa_id || null,
        campaña_id: leadData.campaña_id || null,
        hub_id: leadData.hub_id || null,
        plataforma_lead_id: leadData.plataforma_lead_id || null,
        estado_temporal: leadData.estado_temporal || 'sin_tratar',
        estado: leadData.estado || 'activo',
        observaciones: leadData.observaciones || null,
        calidad: leadData.calidad || 1,
        fecha_entrada: new Date().toISOString(),
        user_id: null,
        fecha_asignacion: leadData.empresa_id ? new Date().toISOString() : null
      }

      const { data, error } = await supabase
        .from('leads')
        .insert([leadToCreate])
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `)
        .single()

      if (error) {
        console.error('Error creating import lead:', error)
        throw error
      }

      return {
        ...data,
        empresa_nombre: data.empresas?.nombre,
        plataforma_lead: platformConverter(data.plataforma || '')
      }
    } catch (error) {
      console.error('Error in createImportLead:', error)
      throw error
    }
  }

  // Importar leads en lote desde CSV
  async importLeadsFromCSV(leadsData: ImportLeadData[], checkDuplicates: boolean = true): Promise<ImportResult> {
    try {
      const result: ImportResult = {
        success: true,
        created: 0,
        errors: [],
        duplicatePhones: []
      }

      // Verificar teléfonos duplicados si es necesario
      if (checkDuplicates && leadsData.length > 0) {
        const phones = leadsData.map(lead => lead.telefono)
        const { data: existingLeads, error: fetchError } = await supabase
          .from('leads')
          .select('telefono')
          .in('telefono', phones)

        if (fetchError) {
          console.error('Error checking duplicate phones:', fetchError)
          result.errors.push('Error al verificar teléfonos duplicados')
          return result
        }

        const existingPhones = new Set(existingLeads?.map(lead => lead.telefono) || [])
        result.duplicatePhones = phones.filter(phone => existingPhones.has(phone))
      }

      // Filtrar leads que no tienen teléfonos duplicados
      const leadsToCreate = leadsData.filter(lead => 
        !checkDuplicates || !result.duplicatePhones.includes(lead.telefono)
      )

      if (leadsToCreate.length === 0) {
        result.success = false
        result.errors.push('Todos los leads tienen teléfonos duplicados')
        return result
      }

      // Preparar datos para inserción
      const leadsForInsert = leadsToCreate.map(lead => ({
        nombre_cliente: lead.nombre_cliente,
        telefono: lead.telefono,
        plataforma: lead.plataforma || 'ScaleHubs',
        empresa_id: lead.empresa_id || null,
        campaña_id: lead.campaña_id || null,
        hub_id: lead.hub_id || null,
        plataforma_lead_id: lead.plataforma_lead_id || null,
        estado_temporal: lead.estado_temporal || 'sin_tratar',
        estado: lead.estado || 'activo',
        observaciones: lead.observaciones || null,
        calidad: lead.calidad || 1,
        fecha_entrada: new Date().toISOString(),
        user_id: null,
        fecha_asignacion: lead.empresa_id ? new Date().toISOString() : null
      }))

      // Insertar leads en lote
      const { data, error } = await supabase
        .from('leads')
        .insert(leadsForInsert)
        .select('id')

      if (error) {
        console.error('Error importing leads:', error)
        result.success = false
        result.errors.push(`Error al importar leads: ${error.message}`)
        return result
      }

      result.created = data?.length || 0
      return result
    } catch (error) {
      console.error('Error in importLeadsFromCSV:', error)
      return {
        success: false,
        created: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido'],
        duplicatePhones: []
      }
    }
  }

  // Verificar si un teléfono ya existe
  async checkPhoneExists(telefono: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id')
        .eq('telefono', telefono)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking phone:', error)
        throw error
      }

      return !!data
    } catch (error) {
      console.error('Error in checkPhoneExists:', error)
      throw error
    }
  }

  // Obtener conteo de leads en historial
  async getHistorialLeadsCount(empresaId?: number, estado?: string, userId?: string, userRole?: string, phoneFilter?: string): Promise<number> {
    try {
      // Obtener conteo de todos los leads (sin filtrar por estado)
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      if (estado) {
        query = query.eq('estado', estado)
      }

      // Filtrar por teléfono (búsqueda parcial)
      if (phoneFilter && phoneFilter.trim()) {
        query = query.ilike('telefono', `%${phoneFilter.trim()}%`)
      }

      // Filtrar por usuario según el rol
      if (userRole === 'agente' && userId) {
        // Los agentes solo ven leads que les fueron asignados
        query = query.eq('user_id', userId)
      }

      const { count, error } = await query

      if (error) {
        console.error('Error getting historial leads count:', error)
        throw error
      }

      return count || 0
    } catch (error) {
      console.error('Error in getHistorialLeadsCount:', error)
      throw error
    }
  }

  // Obtener leads del historial con paginación
  async getHistorialLeads(empresaId?: number, estado?: string, page: number = 1, limit: number = 10, userId?: string, userRole?: string, phoneFilter?: string): Promise<Lead[]> {
    try {
      // Usar util para determinar el campo de ordenamiento según el rol del usuario
      const orderField = getDateFieldByRole(userRole)

      // Obtener todos los leads (sin filtrar por estado)
      let query = supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `)
        .order(orderField, { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      if (estado) {
        query = query.eq('estado', estado)
      }

      // Filtrar por teléfono (búsqueda parcial)
      if (phoneFilter && phoneFilter.trim()) {
        query = query.ilike('telefono', `%${phoneFilter.trim()}%`)
      }

      // Filtrar por usuario según el rol
      if (userRole === 'agente' && userId) {
        query = query.eq('user_id', userId)
      }

      // Aplicar paginación
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, error } = await query

      if (error) {
        console.error('Error fetching historial leads:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        usuario_nombre: lead.profiles?.nombre,
        plataforma_lead: platformConverter(lead.plataforma|| ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getHistorialLeads:', error)
      throw error
    }
  }

  // Obtener un lead por ID
  async getLeadById(leadId: number): Promise<Lead | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `)
        .eq('id', leadId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No se encontró el lead
          return null
        }
        console.error('Error fetching lead by ID:', error)
        throw error
      }

      return {
        ...data,
        empresa_nombre: data.empresas?.nombre,
        usuario_nombre: data.profiles?.nombre,
        plataforma_lead: platformConverter(data.plataforma || ''),
        calidad: data.calidad || 1
      }
    } catch (error) {
      console.error('Error in getLeadById:', error)
      throw error
    }
  }

  // Cancelar estado de un lead (volverlo a activo)
  async cancelLeadStatus(leadId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ 
          estado: 'activo',
          estado_temporal: 'sin_tratar'
        })
        .eq('id', leadId)
        .select()

      if (error) {
        console.error('Error canceling lead status:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in cancelLeadStatus:', error)
      throw error
    }
  }

  // Obtener estadísticas para el dashboard de administrador
  async getAdminDashboardStats(
    startDate: string, 
    endDate: string, 
    dateField: 'fecha_entrada' | 'fecha_asignacion' = 'fecha_entrada',
    empresaIds?: number[]
  ): Promise<{
    totalLeads: number
    leadsConvertidos: number
    leadsPerdidos: number
    leadsSinAsignar: number
    leadsInvalidos: number
    platformDistribution: Record<string, number>
  }> {
    try {
      // Obtener todos los leads en el rango de fechas
      let query = supabase
        .from('leads')
        .select('id, plataforma, estado, empresa_id')
      
      // Aplicar filtro según el campo de fecha seleccionado
      if (dateField === 'fecha_asignacion') {
        query = query
          .not('fecha_asignacion', 'is', null)
          .gte('fecha_asignacion', startDate)
          .lte('fecha_asignacion', endDate)
      } else {
        query = query
          .gte('fecha_entrada', startDate)
          .lte('fecha_entrada', endDate)
      }

      // Aplicar filtro de empresas si se especifica
      if (empresaIds && empresaIds.length > 0) {
        query = query.in('empresa_id', empresaIds)
      }

      const { data: leads, error } = await query

      if (error) {
        console.error('Error fetching admin dashboard stats:', error)
        throw error
      }

      const allLeads = leads || []

      // Calcular estadísticas
      const totalLeads = allLeads.length
      const leadsConvertidos = allLeads.filter(lead => lead.estado === 'convertido').length
      const leadsPerdidos = allLeads.filter(lead => lead.estado === 'perdido').length
      const leadsSinAsignar = allLeads.filter(lead => lead.empresa_id === null).length
      const leadsInvalidos = allLeads.filter(lead => lead.estado === 'no_valido').length

      // Calcular distribución de plataformas
      const platformDistribution = allLeads.reduce((acc, lead) => {
        const platform = platformConverter(lead.plataforma || '') || 'Sin plataforma'
        acc[platform] = (acc[platform] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        totalLeads,
        leadsConvertidos,
        leadsPerdidos,
        leadsSinAsignar,
        leadsInvalidos,
        platformDistribution
      }
    } catch (error) {
      console.error('Error in getAdminDashboardStats:', error)
      throw error
    }
  }

  // Obtener leads paginados para el dashboard de administrador
  async getAdminDashboardLeads(
    startDate: string, 
    endDate: string, 
    dateField: 'fecha_entrada' | 'fecha_asignacion' = 'fecha_entrada',
    page: number = 1,
    limit: number = 10,
    empresaIds?: number[]
  ): Promise<{ leads: Lead[], totalCount: number }> {
    try {
      // Obtener leads paginados con conteo total en una sola query
      let query = supabase
        .from('leads')
        .select(`
          id,
          nombre_cliente,
          telefono,
          fecha_entrada,
          fecha_asignacion,
          empresa_id,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          )
        `, { count: 'exact' })
      
      if (dateField === 'fecha_asignacion') {
        query = query
          .not('fecha_asignacion', 'is', null)
          .gte('fecha_asignacion', startDate)
          .lte('fecha_asignacion', endDate)
          .order('fecha_asignacion', { ascending: false })
      } else {
        query = query
          .gte('fecha_entrada', startDate)
          .lte('fecha_entrada', endDate)
          .order('fecha_entrada', { ascending: false })
      }

      // Aplicar filtro de empresas si se especifica
      if (empresaIds && empresaIds.length > 0) {
        query = query.in('empresa_id', empresaIds)
      }

      // Aplicar paginación
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching admin dashboard leads:', error)
        throw error
      }

      const leads = (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre || 'Sin asignar'
      })) || []

      return {
        leads,
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error in getAdminDashboardLeads:', error)
      throw error
    }
  }

  // Obtener estadísticas para el dashboard de coordinador
  async getCoordDashboardStats(
    startDate: string, 
    endDate: string, 
    dateField: 'fecha_asignacion' | 'fecha_asignacion_usuario' = 'fecha_asignacion',
    empresaId: number,
    agentIds?: string[]
  ): Promise<{
    totalLeads: number
    leadsConvertidos: number
    leadsPerdidos: number
    leadsInvalidos: number
  }> {
    try {
      // Obtener todos los leads en el rango de fechas para la empresa
      let query = supabase
        .from('leads')
        .select('id, estado, user_id')
        .eq('empresa_id', empresaId)
      
      // Aplicar filtro según el campo de fecha seleccionado
      if (dateField === 'fecha_asignacion_usuario') {
        query = query
          .not('fecha_asignacion_usuario', 'is', null)
          .gte('fecha_asignacion_usuario', startDate)
          .lte('fecha_asignacion_usuario', endDate)
      } else {
        query = query
          .not('fecha_asignacion', 'is', null)
          .gte('fecha_asignacion', startDate)
          .lte('fecha_asignacion', endDate)
      }

      // Aplicar filtro de agentes si se especifica
      if (agentIds && agentIds.length > 0) {
        query = query.in('user_id', agentIds)
      }

      const { data: leads, error } = await query

      if (error) {
        console.error('Error fetching coord dashboard stats:', error)
        throw error
      }

      const allLeads = leads || []

      // Calcular estadísticas
      const totalLeads = allLeads.length
      const leadsConvertidos = allLeads.filter(lead => lead.estado === 'convertido').length
      const leadsPerdidos = allLeads.filter(lead => lead.estado === 'perdido').length
      const leadsInvalidos = allLeads.filter(lead => lead.estado === 'no_valido').length

      return {
        totalLeads,
        leadsConvertidos,
        leadsPerdidos,
        leadsInvalidos
      }
    } catch (error) {
      console.error('Error in getCoordDashboardStats:', error)
      throw error
    }
  }

  // Obtener leads paginados para el dashboard de coordinador
  async getCoordDashboardLeads(
    startDate: string, 
    endDate: string, 
    dateField: 'fecha_asignacion' | 'fecha_asignacion_usuario' = 'fecha_asignacion',
    page: number = 1,
    limit: number = 10,
    empresaId: number,
    agentIds?: string[]
  ): Promise<{ leads: { id: number; nombre_cliente: string; telefono: string; fecha_asignacion?: string | null; fecha_asignacion_usuario?: string | null; user_id?: string | null; usuario_nombre?: string }[], totalCount: number }> {
    try {
      // Obtener leads paginados con conteo total
      let query = supabase
        .from('leads')
        .select(`
          id,
          nombre_cliente,
          telefono,
          fecha_asignacion,
          fecha_asignacion_usuario,
          user_id,
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `, { count: 'exact' })
        .eq('empresa_id', empresaId)
      
      if (dateField === 'fecha_asignacion_usuario') {
        query = query
          .not('fecha_asignacion_usuario', 'is', null)
          .gte('fecha_asignacion_usuario', startDate)
          .lte('fecha_asignacion_usuario', endDate)
          .order('fecha_asignacion_usuario', { ascending: false })
      } else {
        query = query
          .not('fecha_asignacion', 'is', null)
          .gte('fecha_asignacion', startDate)
          .lte('fecha_asignacion', endDate)
          .order('fecha_asignacion', { ascending: false })
      }

      // Aplicar filtro de agentes si se especifica
      if (agentIds && agentIds.length > 0) {
        query = query.in('user_id', agentIds)
      }

      // Aplicar paginación
      const from = (page - 1) * limit
      const to = from + limit - 1
      query = query.range(from, to)

      const { data, count, error } = await query

      if (error) {
        console.error('Error fetching coord dashboard leads:', error)
        throw error
      }

      const leads = (data as any[])?.map(lead => ({
        ...lead,
        usuario_nombre: lead.profiles?.nombre || 'Sin asignar'
      })) || []

      return {
        leads,
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error in getCoordDashboardLeads:', error)
      throw error
    }
  }

  // Obtener estadísticas para el dashboard de agente
  async getAgentDashboardStats(
    startDate: string, 
    endDate: string, 
    empresaId: number,
    userId: string
  ): Promise<{
    totalLeads: number
    leadsConvertidos: number
    leadsPerdidos: number
    leadsInvalidos: number
  }> {
    try {
      // Obtener todos los leads del agente en el rango de fechas
      const { data: leads, error } = await supabase
        .from('leads')
        .select('id, estado')
        .eq('empresa_id', empresaId)
        .eq('user_id', userId)
        .not('fecha_asignacion_usuario', 'is', null)
        .gte('fecha_asignacion_usuario', startDate)
        .lte('fecha_asignacion_usuario', endDate)

      if (error) {
        console.error('Error fetching agent dashboard stats:', error)
        throw error
      }

      const allLeads = leads || []

      // Calcular estadísticas
      const totalLeads = allLeads.length
      const leadsConvertidos = allLeads.filter(lead => lead.estado === 'convertido').length
      const leadsPerdidos = allLeads.filter(lead => lead.estado === 'perdido').length
      const leadsInvalidos = allLeads.filter(lead => lead.estado === 'no_valido').length

      return {
        totalLeads,
        leadsConvertidos,
        leadsPerdidos,
        leadsInvalidos
      }
    } catch (error) {
      console.error('Error in getAgentDashboardStats:', error)
      throw error
    }
  }

  // Obtener leads paginados para el dashboard de agente
  async getAgentDashboardLeads(
    startDate: string, 
    endDate: string, 
    page: number = 1,
    limit: number = 10,
    empresaId: number,
    userId: string
  ): Promise<{ leads: { id: number; nombre_cliente: string; telefono: string; fecha_asignacion_usuario?: string | null }[], totalCount: number }> {
    try {
      // Obtener leads paginados del agente
      const { data, count, error } = await supabase
        .from('leads')
        .select(`
          id,
          nombre_cliente,
          telefono,
          fecha_asignacion_usuario
        `, { count: 'exact' })
        .eq('empresa_id', empresaId)
        .eq('user_id', userId)
        .not('fecha_asignacion_usuario', 'is', null)
        .gte('fecha_asignacion_usuario', startDate)
        .lte('fecha_asignacion_usuario', endDate)
        .order('fecha_asignacion_usuario', { ascending: false })
        .range((page - 1) * limit, page * limit - 1)

      if (error) {
        console.error('Error fetching agent dashboard leads:', error)
        throw error
      }

      return {
        leads: data || [],
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error in getAgentDashboardLeads:', error)
      throw error
    }
  }

  // Exportar TODOS los leads para admin (sin paginación)
  async getAdminDashboardLeadsForExport(
    startDate: string, 
    endDate: string, 
    dateField: 'fecha_entrada' | 'fecha_asignacion' = 'fecha_entrada',
    empresaIds?: number[]
  ): Promise<{
    id: number
    nombre_cliente: string
    telefono: string
    fecha_entrada: string
    fecha_asignacion?: string | null
    fecha_asignacion_usuario?: string | null
    empresa_nombre?: string
    user_id?: string | null
    usuario_nombre?: string
    hub_nombre?: string
    plataforma?: string
    estado_temporal?: string
    observaciones?: string
    campaña_nombre?: string
  }[]> {
    try {
      let query = supabase
        .from('leads')
        .select(`
          id,
          nombre_cliente,
          telefono,
          fecha_entrada,
          fecha_asignacion,
          fecha_asignacion_usuario,
          empresa_id,
          user_id,
          hub_id,
          plataforma,
          estado_temporal,
          observaciones,
          campaña_id,
          empresas!leads_empresa_id_fkey (
            id,
            nombre
          ),
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          ),
          hubs!leads_hub_id_fkey (
            id,
            nombre
          ),
          campañas!leads_campaña_id_fkey (
            id,
            nombre
          )
        `)
      
      if (dateField === 'fecha_asignacion') {
        query = query
          .not('fecha_asignacion', 'is', null)
          .gte('fecha_asignacion', startDate)
          .lte('fecha_asignacion', endDate)
          .order('fecha_asignacion', { ascending: false })
      } else {
        query = query
          .gte('fecha_entrada', startDate)
          .lte('fecha_entrada', endDate)
          .order('fecha_entrada', { ascending: false })
      }

      if (empresaIds && empresaIds.length > 0) {
        query = query.in('empresa_id', empresaIds)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching admin dashboard leads for export:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        id: lead.id,
        nombre_cliente: lead.nombre_cliente,
        telefono: lead.telefono,
        fecha_entrada: lead.fecha_entrada,
        fecha_asignacion: lead.fecha_asignacion,
        fecha_asignacion_usuario: lead.fecha_asignacion_usuario,
        empresa_nombre: lead.empresas?.nombre || 'Sin Empresa',
        user_id: lead.user_id,
        usuario_nombre: lead.profiles?.nombre || 'Sin usuario',
        hub_nombre: lead.hubs?.nombre || 'Sin Hub',
        plataforma: lead.plataforma || 'Sin plataforma',
        estado_temporal: lead.estado_temporal || 'sin_tratar',
        observaciones: lead.observaciones || '',
        campaña_nombre: lead.campañas?.nombre || 'Sin Campaña'
      })) || []
    } catch (error) {
      console.error('Error in getAdminDashboardLeadsForExport:', error)
      throw error
    }
  }

  // Exportar TODOS los leads para coordinador (sin paginación)
  async getCoordDashboardLeadsForExport(
    startDate: string, 
    endDate: string, 
    dateField: 'fecha_asignacion' | 'fecha_asignacion_usuario' = 'fecha_asignacion',
    empresaId: number,
    agentIds?: string[]
  ): Promise<{
    id: number
    nombre_cliente: string
    telefono: string
    fecha_asignacion?: string | null
    fecha_asignacion_usuario?: string | null
    user_id?: string | null
    usuario_nombre?: string
    estado_temporal?: string
    observaciones?: string
  }[]> {
    try {
      let query = supabase
        .from('leads')
        .select(`
          id,
          nombre_cliente,
          telefono,
          fecha_asignacion,
          fecha_asignacion_usuario,
          user_id,
          estado_temporal,
          observaciones,
          profiles!leads_user_id_fkey (
            user_id,
            nombre
          )
        `)
        .eq('empresa_id', empresaId)
      
      if (dateField === 'fecha_asignacion_usuario') {
        query = query
          .not('fecha_asignacion_usuario', 'is', null)
          .gte('fecha_asignacion_usuario', startDate)
          .lte('fecha_asignacion_usuario', endDate)
          .order('fecha_asignacion_usuario', { ascending: false })
      } else {
        query = query
          .not('fecha_asignacion', 'is', null)
          .gte('fecha_asignacion', startDate)
          .lte('fecha_asignacion', endDate)
          .order('fecha_asignacion', { ascending: false })
      }

      if (agentIds && agentIds.length > 0) {
        query = query.in('user_id', agentIds)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching coord dashboard leads for export:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        id: lead.id,
        nombre_cliente: lead.nombre_cliente,
        telefono: lead.telefono,
        fecha_asignacion: lead.fecha_asignacion,
        fecha_asignacion_usuario: lead.fecha_asignacion_usuario,
        user_id: lead.user_id,
        usuario_nombre: lead.profiles?.nombre || 'Sin usuario',
        estado_temporal: lead.estado_temporal || 'sin_tratar',
        observaciones: lead.observaciones || ''
      })) || []
    } catch (error) {
      console.error('Error in getCoordDashboardLeadsForExport:', error)
      throw error
    }
  }
}

export const leadsService = new LeadsService() 