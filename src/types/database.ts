/**
 * Tipos que representan la estructura real de la base de datos según schema.sql
 */

// Tabla profiles (usuarios)
export interface DatabaseProfile {
  user_id: string // UUID que referencia auth.users(id)
  empresa_id: number | null // Integer que referencia empresas(id)
  nombre: string | null
  email: string | null // Campo email añadido
  fecha_creacion: string,
  rol_id: number | null // ID que referencia roles(id)
  rol?: string // Nombre del rol obtenido desde la tabla roles
}

// Tabla empresas
export interface DatabaseEmpresa {
  id: number
  nombre: string
  email_contacto: string | null
  volumen_diario: number // default 0
  prioridad: number // 1-5, default 3
  activa: boolean // default true
  url_recepcion_leads: string | null
  cif: string // UNIQUE
}

// Tabla leads
export interface DatabaseLead {
  id: number
  nombre_cliente: string
  telefono: string
  campaña_id: number | null
  fecha_entrada: string // timestamp without time zone
  fecha_asignacion: string | null // timestamp without time zone
  empresa_id: number | null
  hub_id: number | null
  plataforma: string | null
  estado_temporal: string | null
}

// Tabla devoluciones
export interface DatabaseDevolucion {
  id: number
  lead_id: number | null
  usuario_id: string | null // UUID que referencia auth.users(id)
  motivo_id: number | null
  comentario_empresa: string | null
  fecha_solicitud: string // timestamp without time zone
  estado: string // default 'pendiente'
  comentario_admin: string | null
  fecha_resolucion: string | null // timestamp without time zone
}

// Tabla campañas
export interface DatabaseCampana {
  id: number
  nombre: string
  plataforma: string | null
}

// Tabla hubs
export interface DatabaseHub {
  id: number
  nombre: string
}

// Tabla motivos_devolucion
export interface DatabaseMotivoDevolucion {
  id: number
  descripcion: string
}

// Tabla logs_leads
export interface DatabaseLogLead {
  id: number
  lead_id: number | null
  usuario_id: string | null // UUID que referencia auth.users(id)
  accion: string
  fecha: string // timestamp without time zone
  detalle: any // jsonb
}

// Tabla devolucion_archivos
export interface DatabaseDevolucionArchivo {
  id: number
  devolucion_id: number | null
  ruta_archivo: string
  nombre_archivo: string | null
  fecha_subida: string // timestamp without time zone
}

// Tablas de relación
export interface DatabaseEmpresaCampana {
  id: number
  empresa_id: number
  campaña_id: number
}

export interface DatabaseEmpresaHub {
  id: number
  empresa_id: number
  hub_id: number
}

/**
 * Tipos para respuestas de la API (formato backend)
 */
export interface ApiUserResponse {
  user_id: string
  empresa_id: number | null
  nombre: string | null
  es_admin: boolean
  fecha_creacion: string
}

export interface ApiEmpresaResponse {
  id: number
  nombre: string
  email_contacto: string | null
  volumen_diario: number
  prioridad: number
  activa: boolean
  url_recepcion_leads: string | null
  cif: string
}

export interface ApiLeadResponse {
  id: number
  nombre_cliente: string
  telefono: string
  campaña_id: number | null
  fecha_entrada: string
  fecha_asignacion: string | null
  empresa_id: number | null
  hub_id: number | null
  plataforma: string | null
  estado_temporal: string | null
}

/**
 * Tipos para el frontend (formato de la aplicación)
 */
export interface FrontendUser {
  id: string // user_id
  nombre: string // nombre
  email: string // se obtiene de auth.users
  empresa: string // CIF de la empresa (se obtiene de empresas.cif)
  rol: string // convertido desde es_admin
}

export interface FrontendEmpresa {
  id: number
  nombre: string
  cif: string
  email_contacto: string | null
  volumen_diario: number
  prioridad: number
  activa: boolean
  url_recepcion_leads: string | null
} 