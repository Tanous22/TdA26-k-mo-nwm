import { ref } from 'vue'

export interface NotificationOptions {
    type: 'success' | 'error' | 'info' | 'warning'
    message: string
    duration?: number
}

interface Notification extends NotificationOptions {
    id: string
}

const notifications = ref<Notification[]>([])

export function useNotifications() {
    const addNotification = (options: NotificationOptions) => {
        const id = Math.random().toString(36).substring(7)
        const notification: Notification = {
            ...options,
            id,
        }

        notifications.value.push(notification)

        // Auto-remove after duration
        if (options.duration !== Infinity) {
            setTimeout(() => {
                removeNotification(id)
            }, options.duration || 3000)
        }

        return id
    }

    const removeNotification = (id: string) => {
        const index = notifications.value.findIndex(n => n.id === id)
        if (index > -1) {
            notifications.value.splice(index, 1)
        }
    }

    const success = (message: string, duration?: number) =>
        addNotification({ type: 'success', message, duration })

    const error = (message: string, duration?: number) =>
        addNotification({ type: 'error', message, duration: duration || 5000 })

    const info = (message: string, duration?: number) =>
        addNotification({ type: 'info', message, duration })

    const warning = (message: string, duration?: number) =>
        addNotification({ type: 'warning', message, duration })

    return {
        notifications,
        addNotification,
        removeNotification,
        success,
        error,
        info,
        warning,
    }
}
