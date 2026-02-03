import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSettings } from '../services/settingsService'
import { UserSettings, DEFAULT_USER_SETTINGS } from '../types/settings'
import { useAuth } from './AuthProvider'
import { Language } from '../utils/i18n'

interface SettingsContextType {
    settings: UserSettings
    refreshSettings: () => Promise<void>
    loading: boolean
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined)

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth()
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS)
    const [loading, setLoading] = useState(true)

    const applyTheme = (theme: 'light' | 'dark') => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    const refreshSettings = useCallback(async () => {
        if (!user) {
            setSettings(DEFAULT_USER_SETTINGS)
            applyTheme('light')
            setLoading(false)
            return
        }

        try {
            const userSettings = await getSettings<UserSettings>('user_settings')
            setSettings(userSettings)
            applyTheme(userSettings.theme)
        } catch (err) {
            console.error('Failed to load settings:', err)
        } finally {
            setLoading(false)
        }
    }, [user])

    useEffect(() => {
        refreshSettings()
    }, [refreshSettings])

    const value = {
        settings,
        refreshSettings,
        loading
    }

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export const useSettings = () => {
    const context = useContext(SettingsContext)
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider')
    }
    return context
}
