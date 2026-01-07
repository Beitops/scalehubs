import externalApiInstance from '../api/externalApiConfig'

export interface SendLeadsResponse {
  success: boolean
  message?: string
  error?: string
}

export const externalApiService = {
  /**
   * Envía leads a una empresa externa vía API
   * @param leadIds - Array de IDs de leads a enviar
   * @returns Promise con la respuesta del servidor
   */
  sendLeadsToExternalCompany: async (leadIds: number[]): Promise<SendLeadsResponse> => {
    try {
      const response = await externalApiInstance.post('/leads/send', leadIds)
      
      if (response.status === 200 || response.status === 201) {
        return {
          success: true,
          message: response.data?.message || 'Leads enviados correctamente'
        }
      }
      
      return {
        success: false,
        error: response.data?.error || 'Error desconocido al enviar los leads'
      }
    } catch (error: any) {
      console.error('Error sending leads to external API:', error)
      
      // Extraer mensaje de error
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error
        || error.message
        || 'Error al enviar los leads a la empresa externa'
      
      return {
        success: false,
        error: errorMessage
      }
    }
  }
}
