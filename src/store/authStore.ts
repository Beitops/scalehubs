import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { roleConverter } from '../utils/roleConverter'
import type { DatabaseProfile, FrontendUser, DatabaseEmpresa } from '../types/database'
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
    getUserEmpresaInfo: () => Promise<void>
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
                    if (!user?.id) return



                    try {
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('empresa_id')
                            .eq('user_id', user.id)
                            .single()


                        if (!profileError && profile?.empresa_id) {
                            set({ userEmpresaId: profile.empresa_id })

                            // Obtener nombre de la empresa
                            const { data: empresa, error: empresaError } = await supabase
                                .from('empresas')
                                .select('nombre')
                                .eq('id', profile.empresa_id)
                                .single()


                            if (!empresaError && empresa) {
                                set({ userEmpresaNombre: empresa.nombre })
                            }
                        } else {
                            // Si no hay empresa_id o hay error, establecer valores por defecto
                            set({ userEmpresaId: null, userEmpresaNombre: '' })
                        }
                    } catch (error) {
                        console.error('Error getting user empresa info:', error)
                        // En caso de error, establecer valores por defecto
                        set({ userEmpresaId: null, userEmpresaNombre: '' })
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
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('user_id', data.user.id)
                            .single()

                        if (profileError) {
                            console.error('Error al obtener perfil:', profileError)
                            throw new Error('Perfil de usuario no encontrado')
                        }

                        // Obtener el CIF de la empresa si hay empresa_id
                        let companyCif = ''
                        if (profile.empresa_id) {
                            const { data: empresa, error: empresaError } = await supabase
                                .from('empresas')
                                .select('cif')
                                .eq('id', profile.empresa_id)
                                .single()
                            
                            if (!empresaError && empresa) {
                                companyCif = empresa.cif
                            }
                        }

                        // Crear objeto de usuario para el frontend
                        const frontendUser: FrontendUser = {
                            id: profile.user_id,
                            name: profile.nombre || 'Usuario',
                            email: data.user.email || '',
                            company: companyCif,
                            role: roleConverter.backendToFrontend(profile.es_admin)
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null
                        })

                        // Obtener información de la empresa después del login
                        await get().getUserEmpresaInfo()
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al iniciar sesión'
                        })
                    }
                },

                signup: async (email: string, password: string, userData: any) => {
                    set({ isLoading: true, error: null })

                    try {
                        // Obtener el usuario actual de Supabase (el usuario invitado)
                        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
                        
                        if (userError || !currentUser) {
                            throw new Error('No se pudo obtener la información del usuario')
                        }

                        // Actualizar solo la contraseña del usuario invitado
                        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
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
                        const { data: profile, error: profileError } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('user_id', updatedUser.id)
                            .single()

                        if (profileError) {
                            console.error('Error al obtener perfil:', profileError)
                            throw new Error('Perfil de usuario no encontrado')
                        }

                        // Obtener el CIF de la empresa si hay empresa_id
                        let companyCif = ''
                        if (profile.empresa_id) {
                            const { data: empresa, error: empresaError } = await supabase
                                .from('empresas')
                                .select('cif')
                                .eq('id', profile.empresa_id)
                                .single()
                            
                            if (!empresaError && empresa) {
                                companyCif = empresa.cif
                            }
                        }

                        // Crear objeto de usuario para el store
                        const frontendUser: FrontendUser = {
                            id: updatedUser.id,
                            name: profile.nombre || 'Usuario',
                            email: email,
                            company: companyCif, // Mantener el CIF para el frontend
                            role: roleConverter.backendToFrontend(profile.es_admin)
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null
                        })

                        // Obtener información de la empresa después del signup
                        await get().getUserEmpresaInfo()
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
                            // Obtener el perfil del usuario desde la tabla profiles
                            const { data: profile, error: profileError } = await supabase
                                .from('profiles')
                                .select('*')
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

                            // Obtener el CIF de la empresa si hay empresa_id
                            let companyCif = ''
                            if (profile.empresa_id) {
                                const { data: empresa, error: empresaError } = await supabase
                                    .from('empresas')
                                    .select('cif')
                                    .eq('id', profile.empresa_id)
                                    .single()
                                
                                if (!empresaError && empresa) {
                                    companyCif = empresa.cif
                                }
                            }

                            // Usar datos del perfil
                            const frontendUser: FrontendUser = {
                                id: profile.user_id,
                                name: profile.nombre || 'Usuario',
                                email: session.user.email || '',
                                company: companyCif, // CIF de la empresa
                                role: roleConverter.backendToFrontend(profile.es_admin)
                            }
                            set({
                                user: frontendUser,
                                isAuthenticated: true,
                                isLoading: false
                            })

                            // Obtener información de la empresa después del checkAuth
                            await get().getUserEmpresaInfo()
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
                    isAuthenticated: state.isAuthenticated
                }), // only persist these fields
            }
        ),
        {
            name: 'AuthStore',
        }
    )
)

// Listener para cambios de autenticación de Supabase
