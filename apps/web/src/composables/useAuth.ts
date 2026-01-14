import { ref } from 'vue'

export interface User {
    id?: number | string;
    name: string;
    email: string; // <-- Toto ti tam chybělo
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