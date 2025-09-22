import { supabase } from '../lib/supabase'

export interface ArchivoAdjunto {
  id: string
  lead_id: number
  bucket: string
  path: string
  filename: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  created_by: string | null
  url?: string
}

class ArchivosAdjuntosService {
  async getArchivosByLeadId(leadId: number): Promise<ArchivoAdjunto[]> {
    try {
      const { data, error } = await supabase
        .from('archivos_adjuntos')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching archivos adjuntos:', error)
        throw error
      }

      // Filtrar solo imágenes y PDFs
      const filteredData = data?.filter(archivo => {
        const mimeType = archivo.mime_type?.toLowerCase() || ''
        return mimeType.startsWith('image/') || mimeType === 'application/pdf'
      }) || []

      // Generar URLs de Supabase Storage para cada archivo
      const archivosConUrl = await Promise.all(
        filteredData.map(async (archivo) => {
          const { data: urlData } = supabase.storage
            .from(archivo.bucket)
            .getPublicUrl(archivo.path)

          return {
            ...archivo,
            url: urlData.publicUrl
          }
        })
      )

      return archivosConUrl
    } catch (error) {
      console.error('Error in getArchivosByLeadId:', error)
      throw error
    }
  }

  async downloadArchivo(bucket: string, path: string, filename: string): Promise<void> {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path)

      if (error) {
        console.error('Error downloading file:', error)
        throw error
      }

      // Crear URL del blob y descargar
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error in downloadArchivo:', error)
      throw error
    }
  }

  isImage(mimeType: string | null): boolean {
    return mimeType?.startsWith('image/') || false
  }

  isPdf(mimeType: string | null): boolean {
    return mimeType === 'application/pdf'
  }

  getFileIcon(mimeType: string | null): string {
    if (this.isImage(mimeType)) {
      return '🖼️'
    } else if (this.isPdf(mimeType)) {
      return '📄'
    }
    return '📎'
  }
}

export const archivosAdjuntosService = new ArchivosAdjuntosService()
