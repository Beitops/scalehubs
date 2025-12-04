import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { FrontendUser } from '../types/database'
import type { Session } from '@supabase/supabase-js'

// Función para resetear todos los stores cuando cambia el usuario
const resetAllStores = async () => {
    // Importar dinámicamente para evitar dependencias circulares
    const { useLeadsStore } = await import('./leadsStore')
    const { useDashboardStore } = await import('./dashboardStore')
    
    useLeadsStore.getState().resetInitialized()
    useDashboardStore.getState().resetInitialized()
}

interface EmpresaConfiguracion {
    maxSolicitudesPorAgente: number
    solicitudesAutomaticas: boolean
    maximoAgentes?: number
    diasExclusividad?: number
    rehusarLeadsAgentes?: boolean
}

interface AuthState {
    user: FrontendUser | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    userEmpresaId: number | null
    userEmpresaNombre: string
    userEmpresaConfiguracion: EmpresaConfiguracion | null
    login: (email: string, password: string) => Promise<void>
    signup: (email: string, password: string) => Promise<void>
    logout: () => void
    clearError: () => void
    checkAuth: (session: Session | null) => Promise<void>
    getUserEmpresaInfo: () => Promise<{ userEmpresaId: number | null; userEmpresaNombre: string }>
    updateEmpresaConfiguracion: (config: EmpresaConfiguracion) => Promise<void>
    getEmpresaConfiguracion: (empresaId: number) => Promise<EmpresaConfiguracion | null>
    updateEmpresaConfiguracionById: (empresaId: number, config: EmpresaConfiguracion) => Promise<void>
    updatePassword: (newPassword: string) => Promise<void>
    getAgentesCountByEmpresa: (empresaId: number) => Promise<number>
    canAddAgente: (empresaId: number) => Promise<{ canAdd: boolean; currentCount: number; maxAgentes: number }>
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                isAuthenticated: false,
                isLoading: true,
                error: null,
                userEmpresaId: null,
                userEmpresaNombre: '',
                userEmpresaConfiguracion: null,

                getUserEmpresaInfo: async () => {
                    const { user } = get()
                    if (!user?.id) return { userEmpresaId: null, userEmpresaNombre: '' }

                    try {
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('empresa_id')
                            .eq('user_id', user.id)
                            .single()

                        if (!profileError && profile?.empresa_id) {
                            const { data: empresa, error: empresaError } = await supabase
                                .from('empresas')
                                .select('nombre')
                                .eq('id', profile.empresa_id)
                                .single()

                            if (!empresaError && empresa) {
                                return { userEmpresaId: profile.empresa_id, userEmpresaNombre: empresa.nombre }
                            } else {
                                return { userEmpresaId: profile.empresa_id, userEmpresaNombre: '' }
                            }
                        } else {
                            return { userEmpresaId: null, userEmpresaNombre: '' }
                        }
                    } catch (error) {
                        console.error('Error getting user empresa info:', error)
                        return { userEmpresaId: null, userEmpresaNombre: '' }
                    }
                },

                login: async (email: string, password: string) => {
                    set({ isLoading: true, error: null })

                    try {
                        const { error } = await supabase.auth.signInWithPassword({
                            email,
                            password
                        })

                        if (error) {
                            throw new Error(error.message)
                        }
                        // onAuthStateChange manejará el resto
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al iniciar sesión'
                        })
                    }
                },

                signup: async (_email: string, password: string) => {
                    set({ isLoading: true, error: null })

                    try {
                        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()

                        if (userError || !currentUser) {
                            throw new Error('No se pudo obtener la información del usuario')
                        }

                        const { error: updateError } = await supabase.auth.updateUser({
                            password: password
                        })

                        if (updateError) {
                            throw new Error(updateError.message)
                        }
                        // onAuthStateChange manejará el resto
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al crear la cuenta'
                        })
                    }
                },

                logout: async () => {
                    try {
                        await supabase.auth.signOut()
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error)
                    } finally {
                        // Resetear todos los stores
                        await resetAllStores()
                        
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                            userEmpresaId: null,
                            userEmpresaNombre: '',
                            userEmpresaConfiguracion: null
                        })
                    }
                },

                clearError: () => {
                    set({ error: null })
                },

                checkAuth: async (session: Session | null) => {
                    // Si no hay sesión, limpiar estado
                    if (!session?.user?.id) {
                        await resetAllStores()
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            userEmpresaId: null,
                            userEmpresaNombre: '',
                            userEmpresaConfiguracion: null
                        })
                        return
                    }

                    // Si ya estamos autenticados con el mismo usuario, no hacer nada
                    const currentUser = get().user
                    if (currentUser?.id === session.user.id && get().isAuthenticated) {
                        set({ isLoading: false })
                        return
                    }

                    // Si hay un usuario diferente, resetear los stores
                    if (currentUser && currentUser.id !== session.user.id) {
                        await resetAllStores()
                    }

                    set({ isLoading: true, error: null })

                    try {
                        const { data: profileWithEmpresa, error: profileError } = await supabase
                            .from('profiles')
                            .select(`
                                *,
                                empresas(
                                    id,
                                    nombre,
                                    cif
                                )
                            `)
                            .eq('user_id', session.user.id)
                            .single()

                        if (profileError) {
                            console.error('Error al obtener perfil:', profileError)
                            set({
                                user: null,
                                isAuthenticated: false,
                                isLoading: false
                            })
                            return
                        }

                        const { data: roles, error: rolesError } = await supabase
                            .from('roles')
                            .select('nombre')
                            .eq('id', profileWithEmpresa.rol_id)
                            .single()

                        if (rolesError || !roles) {
                            console.error('Error al obtener roles:', rolesError)
                            throw new Error('Error al obtener roles')
                        }

                        const empresa = profileWithEmpresa.empresas
                        const companyCif = empresa?.cif || ''
                        const empresaId = empresa?.id || null
                        const empresaNombre = empresa?.nombre || ''

                        let empresaConfiguracion = null
                        if (empresaId) {
                            const { data: configData } = await supabase
                                .from('configuraciones_empresa')
                                .select('configuraciones')
                                .eq('empresa_id', empresaId)
                                .single()

                            if (configData?.configuraciones) {
                                empresaConfiguracion = configData.configuraciones as EmpresaConfiguracion
                            }
                        }

                        const frontendUser: FrontendUser = {
                            id: profileWithEmpresa.user_id,
                            nombre: profileWithEmpresa.nombre || 'Usuario',
                            email: session.user.email || '',
                            empresa: companyCif,
                            rol: roles.nombre
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            userEmpresaId: empresaId,
                            userEmpresaNombre: empresaNombre,
                            userEmpresaConfiguracion: empresaConfiguracion
                        })
                    } catch (error) {
                        console.error('Error checking auth:', error)
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al verificar la autenticación'
                        })
                    }
                },

                updateEmpresaConfiguracion: async (config: EmpresaConfiguracion) => {
                    const { userEmpresaId } = get()
                    if (!userEmpresaId) {
                        throw new Error('No se encontró la empresa del usuario')
                    }

                    try {
                        const configToSave = {
                            ...config,
                            ...(config.maximoAgentes !== undefined && { maximoAgentes: config.maximoAgentes })
                        }

                        const { error } = await supabase
                            .from('configuraciones_empresa')
                            .upsert({
                                empresa_id: userEmpresaId,
                                configuraciones: configToSave,
                                fecha_modificacion: new Date().toISOString()
                            })

                        if (error) {
                            throw new Error(error.message)
                        }

                        set({ userEmpresaConfiguracion: configToSave })
                    } catch (error) {
                        throw error
                    }
                },

                getEmpresaConfiguracion: async (empresaId: number) => {
                    try {
                        const { data: configData, error } = await supabase
                            .from('configuraciones_empresa')
                            .select('configuraciones, dias_exclusividad')
                            .eq('empresa_id', empresaId)
                            .single()

                        if (error) {
                            if (error.code === 'PGRST116') {
                                return {
                                    maxSolicitudesPorAgente: 1,
                                    solicitudesAutomaticas: false,
                                    maximoAgentes: 1,
                                    diasExclusividad: 0,
                                    rehusarLeadsAgentes: false
                                }
                            }
                            throw new Error(error.message)
                        }

                        if (configData?.configuraciones) {
                            const config = configData.configuraciones as EmpresaConfiguracion
                            return {
                                maxSolicitudesPorAgente: config.maxSolicitudesPorAgente || 1,
                                solicitudesAutomaticas: config.solicitudesAutomaticas || false,
                                maximoAgentes: config.maximoAgentes !== undefined ? config.maximoAgentes : 1,
                                diasExclusividad: configData.dias_exclusividad ?? 0,
                                rehusarLeadsAgentes: config.rehusarLeadsAgentes || false
                            }
                        }

                        return {
                            maxSolicitudesPorAgente: 1,
                            solicitudesAutomaticas: false,
                            maximoAgentes: 1,
                            diasExclusividad: 0,
                            rehusarLeadsAgentes: false
                        }
                    } catch (error) {
                        throw error
                    }
                },

                updateEmpresaConfiguracionById: async (empresaId: number, config: EmpresaConfiguracion) => {
                    try {
                        const { diasExclusividad, ...configJSON } = config

                        const { error } = await supabase
                            .from('configuraciones_empresa')
                            .upsert({
                                empresa_id: empresaId,
                                configuraciones: configJSON,
                                dias_exclusividad: diasExclusividad ?? 0,
                                fecha_modificacion: new Date().toISOString()
                            })

                        if (error) {
                            throw new Error(error.message)
                        }
                    } catch (error) {
                        throw error
                    }
                },

                updatePassword: async (newPassword: string) => {
                    try {
                        const { error } = await supabase.auth.updateUser({
                            password: newPassword
                        })

                        if (error) {
                            throw new Error(error.message)
                        }
                    } catch (error) {
                        throw error
                    }
                },

                getAgentesCountByEmpresa: async (empresaId: number) => {
                    try {
                        const { data: rolAgente, error: rolError } = await supabase
                            .from('roles')
                            .select('id')
                            .eq('nombre', 'agente')
                            .single()

                        if (rolError || !rolAgente) {
                            throw new Error('No se pudo obtener el rol de agente')
                        }

                        const { count, error: countError } = await supabase
                            .from('profiles')
                            .select('*', { count: 'exact', head: true })
                            .eq('empresa_id', empresaId)
                            .eq('rol_id', rolAgente.id)

                        if (countError) {
                            throw new Error(countError.message)
                        }

                        return count || 0
                    } catch (error) {
                        throw error
                    }
                },

                canAddAgente: async (empresaId: number) => {
                    try {
                        const { data: configData, error: configError } = await supabase
                            .from('configuraciones_empresa')
                            .select('configuraciones')
                            .eq('empresa_id', empresaId)
                            .single()

                        let maxAgentes = 1

                        if (!configError && configData?.configuraciones) {
                            const config = configData.configuraciones as EmpresaConfiguracion
                            maxAgentes = config.maximoAgentes !== undefined ? config.maximoAgentes : 1
                        }

                        const currentCount = await get().getAgentesCountByEmpresa(empresaId)

                        return {
                            canAdd: currentCount < maxAgentes,
                            currentCount,
                            maxAgentes
                        }
                    } catch (error) {
                        throw error
                    }
                }
            }),
            {
                name: 'auth-storage',
                partialize: (state) => ({
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    userEmpresaId: state.userEmpresaId,
                    userEmpresaNombre: state.userEmpresaNombre,
                    userEmpresaConfiguracion: state.userEmpresaConfiguracion
                    // NO persistimos isLoading, error, ni session
                })
            }
        ),
        {
            name: 'AuthStore',
        }
    )
)
