import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import { roleConverter } from '../utils/roleConverter'
import type { FrontendUser } from '../types/database'
import { useLeadsStore } from './leadsStore'

interface AuthState {
    user: FrontendUser | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    userEmpresaId: number | null
    userEmpresaNombre: string
    login: (email: string, password: string) => Promise<void>
    signup: (email: string, password: string, userData: any) => Promise<void>
    logout: () => void
    clearError: () => void
    checkAuth: () => Promise<void>
    getUserEmpresaInfo: () => Promise<{ userEmpresaId: number | null; userEmpresaNombre: string }>
}

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,
                userEmpresaId: null,
                userEmpresaNombre: '',

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
                            // Obtener nombre de la empresa
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
                            // Si no hay empresa_id o hay error, retornar valores por defecto
                            return { userEmpresaId: null, userEmpresaNombre: '' }
                        }
                    } catch (error) {
                        console.error('Error getting user empresa info:', error)
                        // En caso de error, retornar valores por defecto
                        return { userEmpresaId: null, userEmpresaNombre: '' }
                    }
                },

                login: async (email: string, password: string) => {
                    set({ isLoading: true, error: null })

                    try {
                        // Iniciar sesión con Supabase
                        const { data, error } = await supabase.auth.signInWithPassword({
                            email,
                            password
                        })

                        if (error) {
                            throw new Error(error.message)
                        }

                        if (!data.user) {
                            throw new Error('No se pudo autenticar al usuario')
                        }

                        // Obtener el perfil del usuario desde la tabla profiles
                        const { data: profileWithEmpresa, error: profileError } = await supabase
                            .from('profiles')
                            .select(`
                                *,
                                empresas!inner(
                                    id,
                                    nombre,
                                    cif
                                )
                            `)
                            .eq('user_id', data.user.id)
                            .single()

                        if (profileError) {
                            console.error('Error al obtener perfil:', profileError)
                            throw new Error('Perfil de usuario no encontrado')
                        }

                        // Extraer información de la empresa
                        const empresa = profileWithEmpresa.empresas
                        const companyCif = empresa?.cif || ''
                        const userEmpresaId = empresa?.id || null
                        const userEmpresaNombre = empresa?.nombre || ''

                        // Crear objeto de usuario para el frontend
                        const frontendUser: FrontendUser = {
                            id: profileWithEmpresa.user_id,
                            name: profileWithEmpresa.nombre || 'Usuario',
                            email: data.user.email || '',
                            company: companyCif,
                            role: roleConverter.backendToFrontend(profileWithEmpresa.es_admin)
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                            userEmpresaId: userEmpresaId,
                            userEmpresaNombre: userEmpresaNombre
                        })
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al iniciar sesión'
                        })
                    }
                },

                signup: async (email: string, password: string) => {
                    set({ isLoading: true, error: null })

                    try {
                        // Obtener el usuario actual de Supabase (el usuario invitado)
                        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
                        
                        if (userError || !currentUser) {
                            throw new Error('No se pudo obtener la información del usuario')
                        }

                        // Actualizar solo la contraseña del usuario invitado
                        const { error: updateError } = await supabase.auth.updateUser({
                            password: password
                        })

                        if (updateError) {
                            throw new Error(updateError.message)
                        }

                        // Obtener los datos del usuario actualizado
                        const { data: { user: updatedUser }, error: getUserError } = await supabase.auth.getUser()
                        
                        if (getUserError || !updatedUser) {
                            throw new Error('Error al obtener el usuario actualizado')
                        }

                        // Obtener el perfil existente (ya creado por la edge function)
                        const { data: profileWithEmpresa, error: profileError } = await supabase
                            .from('profiles')
                            .select(`
                                *,
                                empresas!inner(
                                    id,
                                    nombre,
                                    cif
                                )
                            `)
                            .eq('user_id', updatedUser.id)
                            .single()

                        if (profileError) {
                            console.error('Error al obtener perfil:', profileError)
                            throw new Error('Perfil de usuario no encontrado')
                        }

                        // Extraer información de la empresa
                        const empresa = profileWithEmpresa.empresas
                        const companyCif = empresa?.cif || ''
                        const userEmpresaId = empresa?.id || null
                        const userEmpresaNombre = empresa?.nombre || ''

                        // Crear objeto de usuario para el store
                        const frontendUser: FrontendUser = {
                            id: updatedUser.id,
                            name: profileWithEmpresa.nombre || 'Usuario',
                            email: email,
                            company: companyCif,
                            role: roleConverter.backendToFrontend(profileWithEmpresa.es_admin)
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null,
                            userEmpresaId: userEmpresaId,
                            userEmpresaNombre: userEmpresaNombre
                        })
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al crear la cuenta'
                        })
                    }
                },

                logout: async () => {
                    try {
                        // Cerrar sesión en Supabase
                        const { error } = await supabase.auth.signOut()
                        
                        if (error) {
                            console.error('Error al cerrar sesión:', error)
                        }
                    } catch (error) {
                        console.error('Error al cerrar sesión:', error)
                    } finally {
                        // Limpiar estado local independientemente del resultado
                        set({
                            user: null,
                            isAuthenticated: false,
                            isLoading: false,
                            error: null,
                            userEmpresaId: null,
                            userEmpresaNombre: ''
                        })
                        useLeadsStore.getState().resetInitialized()
                    }
                },

                clearError: () => {
                    set({ error: null })
                },

                // Función para verificar el estado de autenticación al cargar la app
                checkAuth: async () => {
                    try {
                        const { data: { session } } = await supabase.auth.getSession()
                        
                        if (session?.user) {
                            // Obtener el perfil del usuario y la información de la empresa en una sola consulta
                            const { data: profileWithEmpresa, error: profileError } = await supabase
                                .from('profiles')
                                .select(`
                                    *,
                                    empresas!inner(
                                        id,
                                        nombre,
                                        cif
                                    )
                                `)
                                .eq('user_id', session.user.id)
                                .single()

                            if (profileError) {
                                console.error('Error al obtener perfil:', profileError)
                                // Si no hay perfil, limpiar el estado
                                set({
                                    user: null,
                                    isAuthenticated: false,
                                    isLoading: false
                                })
                                return
                            }

                            // Extraer información de la empresa
                            const empresa = profileWithEmpresa.empresas
                            const companyCif = empresa?.cif || ''
                            const userEmpresaId = empresa?.id || null
                            const userEmpresaNombre = empresa?.nombre || ''

                            console.log(companyCif)

                            // Usar datos del perfil
                            const frontendUser: FrontendUser = {
                                id: profileWithEmpresa.user_id,
                                name: profileWithEmpresa.nombre || 'Usuario',
                                email: session.user.email || '',
                                company: companyCif,
                                role: roleConverter.backendToFrontend(profileWithEmpresa.es_admin)
                            }
                            
                            set({
                                user: frontendUser,
                                isAuthenticated: true,
                                isLoading: false,
                                userEmpresaId: userEmpresaId,
                                userEmpresaNombre: userEmpresaNombre
                            })
                        } else {
                            set({
                                user: null,
                                isAuthenticated: false,
                                isLoading: false
                            })
                        }
                    } catch (error) {
                        console.error('Error checking auth:', error)
                        set({ isLoading: false })
                    }
                }
            }),
            {
                name: 'auth-storage', // name of the item in localStorage
                partialize: (state) => ({
                    user: state.user,
                    isAuthenticated: state.isAuthenticated,
                    userEmpresaId: state.userEmpresaId,
                    userEmpresaNombre: state.userEmpresaNombre
                }), // persist these fields
            }
        ),
        {
            name: 'AuthStore',
        }
    )
)

// Listener para cambios de autenticación de Supabase
