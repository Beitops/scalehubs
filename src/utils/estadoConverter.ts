/**
 * Convierte un estado_temporal a formato legible
 * Reemplaza guiones bajos por espacios y capitaliza cada palabra
 * Ejemplo: "sin_tratar" → "Sin Tratar"
 */
export const formatEstado = (estado: string | null | undefined): string => {
  if (!estado) return ''
  
  return estado
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

