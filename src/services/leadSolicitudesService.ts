import { supabase } from '../lib/supabase'
import { callbellService } from './callbellService'

export interface LeadSolicitud {
  id: number
  estado: 'pendiente' | 'aprobada' | 'rechazada' | 'cancelada'
  fecha_creacion: string
  solicitante_user_id: string
  fecha_decision: string | null
  receptor_user_id: string | null
  lead_id: number | null
  solicitante?: {
    user_id: string
    nombre: string
    email: string
  }
  lead?: {
    id: number
    nombre_cliente: string
    telefono: string
    plataforma: string
    fecha_entrada: string
  }
}

export interface CreateSolicitudData {
  solicitante_user_id: string
}

class LeadSolicitudesService {
  // Crear una nueva solicitud de lead
  async createSolicitud(solicitudData: CreateSolicitudData): Promise<LeadSolicitud> {
    try {
      const { data, error } = await supabase
        .from('lead_solicitudes')
        .insert([solicitudData])
        .select(`
          *,
          solicitante:profiles!lead_solicitudes_solicitante_user_id_fkey (
            user_id,
            nombre,
            email
          )
        `)
        .single()

      if (error) {
        console.error('Error creating lead solicitud:', error)
        throw error
      }

      return {
        ...data,
        solicitante: data.solicitante
      }
    } catch (error) {
      console.error('Error in createSolicitud:', error)
      throw error
    }
  }

  // Obtener solicitudes pendientes para un coordinador (de su empresa)
  async getSolicitudesPendientesByEmpresa(empresaId: number): Promise<LeadSolicitud[]> {
    try {
      const { data, error } = await supabase
        .from('lead_solicitudes')
        .select(`
          *,
          solicitante:profiles!lead_solicitudes_solicitante_user_id_fkey (
            user_id,
            nombre,
            email,
            empresa_id
          )
        `)
        .eq('estado', 'pendiente')
        .eq('solicitante.empresa_id', empresaId)
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('Error fetching solicitudes pendientes:', error)
        throw error
      }

      return data?.map(solicitud => ({
        ...solicitud,
        solicitante: solicitud.solicitante
      })) || []
    } catch (error) {
      console.error('Error in getSolicitudesPendientesByEmpresa:', error)
      throw error
    }
  }

  // Aprobar una solicitud y asignar un lead
  async aprobarSolicitud(solicitudId: number, leadId: number, coordinadorUserId: string): Promise<{ callbellError?: string }> {
    try {
      // Obtener el solicitante_user_id de la solicitud
      const { data: solicitudData, error: fetchError } = await supabase
        .from('lead_solicitudes')
        .select('solicitante_user_id')
        .eq('id', solicitudId)
        .single()

      if (fetchError) {
        console.error('Error obteniendo datos de la solicitud:', fetchError)
        throw fetchError
      }

      // Obtener información del lead para verificar la empresa
      const { data: leadData, error: leadFetchError } = await supabase
        .from('leads')
        .select('empresa_id')
        .eq('id', leadId)
        .single()

      if (leadFetchError) {
        console.error('Error obteniendo datos del lead:', leadFetchError)
        throw leadFetchError
      }

      let callbellError: string | undefined

      // Si el lead pertenece a la empresa 15, intentar asignar en Callbell
      if (leadData?.empresa_id === 15) {
        try {
          const callbellResult = await callbellService.assignLeadToCallbell(leadId, solicitudData.solicitante_user_id)
          
          // Si falla con 403 o 404, capturar el error para retornarlo
          if (!callbellResult.success && callbellResult.error) {
            callbellError = callbellResult.error
          }
        } catch (error) {
          // Si falla, continuamos con la asignación normal
          console.log('Callbell assignment failed, continuing with normal assignment:', error)
        }
      }

      // Actualizar la solicitud
      const { error: solicitudError } = await supabase
        .from('lead_solicitudes')
        .update({
          estado: 'aprobada',
          fecha_decision: new Date().toISOString(),
          receptor_user_id: coordinadorUserId,
          lead_id: leadId
        })
        .eq('id', solicitudId)

      if (solicitudError) {
        console.error('Error aprobando solicitud:', solicitudError)
        throw solicitudError
      }

      // Asignar el lead al agente
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          user_id: solicitudData.solicitante_user_id,
          fecha_asignacion: new Date().toISOString()
        })
        .eq('id', leadId)

      if (leadError) {
        console.error('Error asignando lead:', leadError)
        throw leadError
      }

      return { callbellError }
    } catch (error) {
      console.error('Error in aprobarSolicitud:', error)
      throw error
    }
  }

  // Obtener el lead más reciente sin asignar de una empresa
  async getLeadMasRecienteSinAsignar(empresaId: number): Promise<number | null> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('id')
        .eq('empresa_id', empresaId)
        .is('user_id', null)
        .eq('estado', 'activo')
        .order('fecha_entrada', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No hay leads disponibles
          return null
        }
        console.error('Error obteniendo lead más reciente:', error)
        throw error
      }

      return data?.id || null
    } catch (error) {
      console.error('Error in getLeadMasRecienteSinAsignar:', error)
      throw error
    }
  }

  // Aprobar todas las solicitudes pendientes de una empresa
  async aprobarTodasLasSolicitudes(empresaId: number, coordinadorUserId: string): Promise<void> {
    try {
      // Obtener todas las solicitudes pendientes
      const solicitudes = await this.getSolicitudesPendientesByEmpresa(empresaId)
      
      for (const solicitud of solicitudes) {
        // Obtener el lead más reciente sin asignar
        const leadId = await this.getLeadMasRecienteSinAsignar(empresaId)
        
        if (leadId) {
          await this.aprobarSolicitud(solicitud.id, leadId, coordinadorUserId)
        } else {
          // Si no hay más leads disponibles, rechazar la solicitud
          await this.rechazarSolicitud(solicitud.id, coordinadorUserId)
        }
      }
    } catch (error) {
      console.error('Error in aprobarTodasLasSolicitudes:', error)
      throw error
    }
  }

  // Rechazar una solicitud
  async rechazarSolicitud(solicitudId: number, coordinadorUserId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('lead_solicitudes')
        .update({
          estado: 'rechazada',
          fecha_decision: new Date().toISOString(),
          receptor_user_id: coordinadorUserId
        })
        .eq('id', solicitudId)

      if (error) {
        console.error('Error rechazando solicitud:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in rechazarSolicitud:', error)
      throw error
    }
  }

  // Obtener solicitudes de un agente específico
  async getSolicitudesByAgente(agenteUserId: string): Promise<LeadSolicitud[]> {
    try {
      const { data, error } = await supabase
        .from('lead_solicitudes')
        .select(`
          *,
          lead:leads!lead_solicitudes_lead_id_fkey (
            id,
            nombre_cliente,
            telefono,
            plataforma,
            fecha_entrada
          )
        `)
        .eq('solicitante_user_id', agenteUserId)
        .order('fecha_creacion', { ascending: false })

      if (error) {
        console.error('Error fetching solicitudes by agente:', error)
        throw error
      }

      return data?.map(solicitud => ({
        ...solicitud,
        lead: solicitud.lead
      })) || []
    } catch (error) {
      console.error('Error in getSolicitudesByAgente:', error)
      throw error
    }
  }

  // Verificar si un agente puede solicitar más leads según la configuración de empresa
  async puedeSolicitarLead(agenteUserId: string, _empresaId: number, maxSolicitudes: number): Promise<boolean> {
    try {
      // Contar leads activos del agente con estado 'sin_tratar'
      const { data: leadsActivos, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('user_id', agenteUserId)
        .eq('estado', 'activo')
        .eq('estado_temporal', 'sin_tratar')

      if (leadsError) {
        console.error('Error checking active leads:', leadsError)
        throw leadsError
      }

      // Contar solicitudes pendientes del agente
      const { data: solicitudesPendientes, error: solicitudesError } = await supabase
        .from('lead_solicitudes')
        .select('id')
        .eq('solicitante_user_id', agenteUserId)
        .eq('estado', 'pendiente')

      if (solicitudesError) {
        console.error('Error checking pending solicitudes:', solicitudesError)
        throw solicitudesError
      }

      const numLeadsSinTratar = leadsActivos?.length || 0
      const numSolicitudesPendientes = solicitudesPendientes?.length || 0
      const total = numLeadsSinTratar + numSolicitudesPendientes

      return total < maxSolicitudes
    } catch (error) {
      console.error('Error in puedeSolicitarLead:', error)
      throw error
    }
  }

  // Asignar lead automáticamente a un agente (para asignación automática)
  async asignarLeadAutomaticamente(agenteUserId: string, empresaId: number): Promise<{ success: boolean; leadId?: number; message: string }> {
    try {
      // Buscar el primer lead disponible
      const { data: leadsDisponibles, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('empresa_id', empresaId)
        .is('user_id', null)
        .eq('estado', 'activo')
        .order('fecha_entrada', { ascending: true })
        .limit(1)

      if (leadsError) {
        console.error('Error fetching available leads:', leadsError)
        throw leadsError
      }

      if (!leadsDisponibles || leadsDisponibles.length === 0) {
        return {
          success: false,
          message: 'No hay leads disponibles para asignar en este momento'
        }
      }

      const leadId = leadsDisponibles[0].id

      // Intentar asignar el lead usando una condición WHERE para evitar race conditions
      const { data: updateResult, error: updateError } = await supabase
        .from('leads')
        .update({
          user_id: agenteUserId,
          fecha_asignacion: new Date().toISOString()
        })
        .eq('id', leadId)
        .is('user_id', null) // Solo actualizar si aún no está asignado
        .select('id')

      if (updateError) {
        console.error('Error assigning lead:', updateError)
        throw updateError
      }

      // Si no se actualizó ninguna fila, significa que otro agente ya lo tomó
      if (!updateResult || updateResult.length === 0) {
        return {
          success: false,
          message: 'El lead ya fue asignado a otro agente. Inténtalo de nuevo.'
        }
      }

      return {
        success: true,
        leadId: leadId,
        message: 'Lead asignado automáticamente'
      }
    } catch (error) {
      console.error('Error in asignarLeadAutomaticamente:', error)
      throw error
    }
  }
}

export const leadSolicitudesService = new LeadSolicitudesService()
