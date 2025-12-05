/**
 * Determina el campo de fecha a usar para ordenar/filtrar según el rol del usuario
 */
export type DateFieldType = 'fecha_entrada' | 'fecha_asignacion' | 'fecha_asignacion_usuario'

export const getDateFieldByRole = (userRole?: string): DateFieldType => {
  if (userRole === 'coordinador') {
    return 'fecha_asignacion'
  } else if (userRole === 'agente') {
    return 'fecha_asignacion_usuario'
  }
  return 'fecha_entrada'
}

