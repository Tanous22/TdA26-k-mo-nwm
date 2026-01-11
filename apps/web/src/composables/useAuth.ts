import { ref } from 'vue'

export interface User {
    name: string
    role: string
}

const user = ref<User | null>(null)

export function useAuth() {
    const login = (userData: User) => {
        user.value = userData
    }

    const logout = () => {
        user.value = null
    }

    const isAuthenticated = () => {
        return user.value !== null
    }

    return {
        user,
        login,
        logout,
        isAuthenticated
    }
}
