import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'
import { supabase } from '../lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { roleConverter } from '../utils/roleConverter'
import type { DatabaseProfile, FrontendUser, DatabaseEmpresa } from '../types/database'

interface AuthState {
    user: FrontendUser | null
    isAuthenticated: boolean
    isLoading: boolean
    error: string | null
    login: (email: string, password: string) => Promise<void>
    signup: (email: string, password: string, userData: any) => Promise<void>
    logout: () => void
    clearError: () => void
    checkAuth: () => Promise<void>
}

// Usuarios de prueba (formato frontend)
const mockUsers: FrontendUser[] = [
    {
        id: '1',
        name: 'Administrador ScaleHubs',
        email: 'admin@scalehubs.com',
        company: 'B12345678', // CIF de ScaleHubs
        role: 'admin' // Frontend: 'admin' | 'client'
    },
    {
        id: '2',
        name: 'Juan Pérez',
        email: 'juan@empresa1.com',
        company: 'A87654321', // CIF de Empresa 1
        role: 'client' // Frontend: 'admin' | 'client'
    },
    {
        id: '3',
        name: 'María García',
        email: 'maria@empresa2.com',
        company: 'C98765432', // CIF de Empresa 2
        role: 'client' // Frontend: 'admin' | 'client'
    }
]

export const useAuthStore = create<AuthState>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                isAuthenticated: false,
                isLoading: false,
                error: null,

                login: async (email: string, password: string) => {
                    set({ isLoading: true, error: null })

                    try {
                        // Simulate API call
                        await new Promise(resolve => setTimeout(resolve, 1000))

                        // Buscar usuario en la lista de usuarios de prueba
                        const user = mockUsers.find(u => u.email === email)

                        if (user && password === 'password') {
                            set({
                                user,
                                isAuthenticated: true,
                                isLoading: false,
                                error: null
                            })
                        } else {
                            throw new Error('Credenciales inválidas')
                        }
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

                        // Actualizar el usuario invitado con email y contraseña
                        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
                            email: email,
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

                        // Buscar la empresa por CIF para obtener el empresa_id
                        const { data: empresa, error: empresaError } = await supabase
                            .from('empresas')
                            .select('id')
                            .eq('cif', userData.company)
                            .single()

                        if (empresaError) {
                            throw new Error('Empresa no encontrada con el CIF proporcionado')
                        }

                        // Insertar el perfil en la tabla profiles con los datos del formulario
                        const { data: profileData, error: profileError } = await supabase
                            .from('profiles')
                            .insert({
                                user_id: updatedUser.id,
                                nombre: userData.name,
                                empresa_id: empresa.id, // Usar el ID de la empresa, no el CIF
                                es_admin: roleConverter.frontendToBackend(userData.role),
                                fecha_creacion: new Date().toISOString()
                            })

                        if (profileError) {
                            console.error('Error al crear perfil:', profileError)
                            throw new Error('Error al crear el perfil del usuario')
                        }

                        // Crear objeto de usuario para el store
                        const frontendUser: FrontendUser = {
                            id: updatedUser.id,
                            name: userData.name,
                            email: email,
                            company: userData.company, // Mantener el CIF para el frontend
                            role: userData.role || 'client'
                        }

                        set({
                            user: frontendUser,
                            isAuthenticated: true,
                            isLoading: false,
                            error: null
                        })
                    } catch (error) {
                        set({
                            isLoading: false,
                            error: error instanceof Error ? error.message : 'Error al crear la cuenta'
                        })
                    }
                },

                logout: () => {
                    set({
                        user: null,
                        isAuthenticated: false,
                        isLoading: false,
                        error: null
                    })
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
                                // Si no hay perfil, usar datos básicos del usuario
                                const frontendUser: FrontendUser = {
                                    id: session.user.id,
                                    name: session.user.user_metadata?.name || 'Usuario',
                                    email: session.user.email || '',
                                    company: session.user.user_metadata?.company || '',
                                    role: session.user.user_metadata?.role || 'client'
                                }
                                set({
                                    user: frontendUser,
                                    isAuthenticated: true,
                                    isLoading: false
                                })
                            } else {
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
                            }
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
supabase.auth.onAuthStateChange(async (event, session) => {
    const { checkAuth } = useAuthStore.getState()
    
    if (event === 'SIGNED_IN' && session?.user) {
        await checkAuth()
    } else if (event === 'SIGNED_OUT') {
        useAuthStore.setState({
            user: null,
            isAuthenticated: false,
            isLoading: false
        })
    }
})