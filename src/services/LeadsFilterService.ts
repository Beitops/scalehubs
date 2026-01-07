import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lead } from './leadsService'

export interface AssignedUserProfile {
  user_id: string
  nombre: string | null
  email: string | null
  rol: string | null
}

export interface AssignedUserMapEntry {
  nombre: string | null
  email: string | null
  rol: string | null
}

export type AssignedUsersById = Map<string, AssignedUserMapEntry>

export const normalizeForFilter = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const createAssignedUsersById = (assignedUsers: AssignedUserProfile[]): AssignedUsersById => {
  const map: AssignedUsersById = new Map()

  assignedUsers.forEach(userProfile => {
    map.set(userProfile.user_id, {
      nombre: userProfile.nombre,
      email: userProfile.email,
      rol: userProfile.rol
    })
  })

  return map
}

export const fetchAssignedUsers = async (
  supabase: SupabaseClient,
  empresaId: number
): Promise<AssignedUserProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select(
      `
        user_id,
        nombre,
        email,
        es_admin,
        roles:roles!profiles_rol_id_fkey (
          nombre
        )
      `
    )
    .eq('empresa_id', empresaId)
    .eq('es_admin', false)
    .in('roles.id', [2, 3])
    .order('nombre', { ascending: true })

  if (error) {
    throw error
  }

  const profiles = (data || [])
    .filter(profile => Boolean(profile?.user_id))
    .map(profile => {
      const rolesData = profile?.roles as { nombre?: string } | { nombre?: string }[] | null | undefined
      const roleName = Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre

      return {
        user_id: profile.user_id as string,
        nombre: (profile.nombre ?? null) as string | null,
        email: (profile.email ?? null) as string | null,
        rol: roleName ? String(roleName) : null
      }
    }) as AssignedUserProfile[]

  const uniqueProfiles = Array.from(new Map(profiles.map(profile => [profile.user_id, profile])).values())

  uniqueProfiles.sort((a, b) => {
    const nameA = (a.nombre || a.email || '').toLowerCase()
    const nameB = (b.nombre || b.email || '').toLowerCase()
    return nameA.localeCompare(nameB, 'es')
  })

  return uniqueProfiles
}

export interface LeadFilterOptions {
  dateFilter?: string
  phoneFilter?: string
  statusFilter?: string
  empresaFilter?: string
  assignedUserFilter?: string
  assignedUsersById?: AssignedUsersById
  statusGetter?: (lead: Lead) => string | null | undefined
  empresaGetter?: (lead: Lead) => string | null | undefined
  dateFieldGetter?: (lead: Lead) => string | null | undefined
}

export const filterLeads = (leads: Lead[], options: LeadFilterOptions): Lead[] => {
  const {
    dateFilter,
    phoneFilter,
    statusFilter,
    empresaFilter,
    assignedUserFilter,
    assignedUsersById = new Map<string, AssignedUserMapEntry>(),
    statusGetter = (lead: Lead) => lead.estado_temporal,
    empresaGetter = (lead: Lead) => (lead.empresa_id != null ? String(lead.empresa_id) : undefined),
    dateFieldGetter = (lead: Lead) => lead.fecha_entrada
  } = options

  const normalizedAssignedFilter = assignedUserFilter?.trim()
    ? normalizeForFilter(assignedUserFilter.trim())
    : ''

  return leads.filter(lead => {
    const dateValue = dateFieldGetter(lead)
    const matchesDate = !dateFilter || (dateValue || '').startsWith(dateFilter)
    const matchesPhone = !phoneFilter || (lead.telefono || '').includes(phoneFilter)

    const statusValue = statusGetter(lead)
    const matchesStatus = !statusFilter || statusValue === statusFilter

    const empresaValue = empresaGetter(lead)
    const matchesEmpresa = !empresaFilter || (empresaValue ?? '') === empresaFilter

    const matchesAssignedUser = !normalizedAssignedFilter || (() => {
      const userInfo = lead.user_id ? assignedUsersById.get(lead.user_id) : undefined
      const displayName = lead.usuario_nombre || userInfo?.nombre || ''
      const email = userInfo?.email || ''
      const role = userInfo?.rol || ''

      const normalizedDisplayName = displayName ? normalizeForFilter(displayName) : ''
      const normalizedEmail = email ? normalizeForFilter(email) : ''
      const normalizedRole = role ? normalizeForFilter(role) : ''

      return (
        (normalizedDisplayName && normalizedDisplayName.includes(normalizedAssignedFilter)) ||
        (normalizedEmail && normalizedEmail.includes(normalizedAssignedFilter)) ||
        (normalizedRole && normalizedRole.includes(normalizedAssignedFilter))
      )
    })()

    return matchesDate && matchesPhone && matchesStatus && matchesEmpresa && matchesAssignedUser
  })
}
