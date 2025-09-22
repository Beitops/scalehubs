import { supabase } from '../lib/supabase'
import { platformConverter } from '../utils/platformConverter'
import { useAuthStore } from '../store/authStore'

export interface Lead {
  id: number
  fecha_entrada: string
  nombre_cliente: string
  telefono: string
  plataforma: string
  empresa_id: number
  empresa_nombre?: string
  estado_temporal?: string
  estado?: string
  campaña_id?: number
  hub_id?: number
  plataforma_lead_id?: string
  fecha_asignacion?: string
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
  async getLeadsByCompany(empresaId: number, estado?: string): Promise<Lead[]> {
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
      const { error } = await supabase
        .from('leads')
        .update({ estado_temporal: estadoTemporal })
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

  async returnLead(leadId: number, userId: string): Promise<void> {
    try {
      // Actualizar el estado del lead a 'devolucion'
      const { error: updateError } = await supabase
        .from('leads')
        .update({ estado: 'devolucion' })
        .eq('id', leadId)
        .select()

      if (updateError) {
        console.error('Error updating lead estado:', updateError)
        throw updateError
      }

      // Insertar en tabla devoluciones
      const { error: devolucionError } = await supabase
        .from('devoluciones')
        .insert({
          lead_id: leadId,
          usuario_id: userId,
          estado: 'pendiente'
        })

      if (devolucionError) {
        console.error('Error creating devolucion record:', devolucionError)
        throw devolucionError
      }
    } catch (error) {
      console.error('Error in returnLead:', error)
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

    async getLeadsInDateRange(startDate: string, endDate: string, empresaId?: number, estado?: string): Promise<Lead[]> {
    try {
      let query = supabase
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
          )
        `)
        .gte('fecha_entrada', startDate)
        .lte('fecha_entrada', endDate)
        .order('fecha_entrada', { ascending: false })

      if (empresaId) {
        query = query.eq('empresa_id', empresaId)
      }

      // Filtrar por estado si se especifica
      if (estado) {
        query = query.eq('estado', estado)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching leads in date range:', error)
        throw error
      }

      return (data as any[])?.map(lead => ({
        ...lead,
        empresa_nombre: lead.empresas?.nombre,
        calidad: lead.calidad || 1
      })) || []
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
        plataforma_lead: platformConverter(lead.plataforma || ''),
        calidad: lead.calidad || 1
      })) || []
    } catch (error) {
      console.error('Error in getUnassignedLeadsByCompany:', error)
      throw error
    }
  }

  // Asignar lead a una empresa (para administradores)
  async assignLeadToCompany(leadId: number, empresaId: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ empresa_id: empresaId })
        .eq('id', leadId)

      if (error) {
        console.error('Error assigning lead to company:', error)
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
          fecha_asignacion: new Date().toISOString()
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
          fecha_asignacion: null
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
        fecha_asignacion: null
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
        fecha_asignacion: null
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
}

export const leadsService = new LeadsService() 