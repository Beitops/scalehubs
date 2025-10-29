import axios from 'axios'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

interface AssignCallbellResponse {
  success: boolean
  message?: string
  error?: string
}

class CallbellService {
  /**
   * Asigna un lead al sistema Callbell
   * @param leadId - ID del lead a asignar
   * @param profileId - ID del perfil (usuario) al que se asignará el lead
   * @returns Promise con el resultado de la operación
   */
  async assignLeadToCallbell(leadId: number, profileId: string): Promise<AssignCallbellResponse> {
    try {
      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/asignar-callbell`
      
      // Obtener el JWT del usuario actual
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No hay sesión activa')
      }
      
      const response = await axios.post(
        edgeFunctionUrl,
        {
          lead_id: leadId,
          profile_id: profileId,
          asignacion: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      return {
        success: true,
        message: response.data.message || 'Lead asignado en Callbell correctamente'
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error al asignar lead en Callbell'
        
        // Si es 403 o 404, retornamos el error para que se muestre como notificación
        if (status === 403 || status === 404) {
          return {
            success: false,
            error: errorMessage
          }
        }
        
        // Para otros errores, los lanzamos
        throw new Error(errorMessage)
      }
      
      throw error
    }
  }

  /**
   * Desasigna un lead del sistema Callbell
   * @param leadId - ID del lead a desasignar
   * @param profileId - ID del perfil (usuario) al que se asignará el lead
   * @returns Promise con el resultado de la operación
   */
  async unassignLeadFromCallbell(leadId: number, profileId: string | undefined): Promise<AssignCallbellResponse> {
    try {
      const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/asignar-callbell`
      console.log('profileId', profileId)
      // Obtener el JWT del usuario actual
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('No hay sesión activa')
      }
      
      const response = await axios.post(
        edgeFunctionUrl,
        {
          lead_id: leadId,
          profile_id: profileId,
          asignacion: false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      )

      return {
        success: true,
        message: response.data.message || 'Lead desasignado en Callbell correctamente'
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status
        const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Error al desasignar lead en Callbell'
        
        // Si es 403 o 404, retornamos el error para que se muestre como notificación
        if (status === 403 || status === 404) {
          return {
            success: false,
            error: errorMessage
          }
        }
        
        // Para otros errores, los lanzamos
        throw new Error(errorMessage)
      }
      
      throw error
    }
  }
}

export const callbellService = new CallbellService()

