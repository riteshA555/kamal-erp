import { getSettings } from './settingsService'
import { NotificationSettings } from '../types/settings'

interface EmailParams {
    to_email: string
    to_name: string
    message: string
    subject?: string
    [key: string]: any
}

export const sendEmail = async (params: EmailParams): Promise<{ success: boolean; message: string }> => {
    try {
        const settings = await getSettings<NotificationSettings>('notification_settings')

        if (!settings || !settings.emailNotifications) {
            console.log('Email notifications disabled.')
            return { success: false, message: 'Email notifications are disabled in settings.' }
        }

        const { emailJsServiceId, emailJsTemplateId, emailJsPublicKey } = settings

        if (!emailJsServiceId || !emailJsTemplateId || !emailJsPublicKey) {
            console.warn('EmailJS not configured. Simulating email send:', params)
            return { success: false, message: 'EmailJS not fully configured. Please check Settings.' }
        }

        const data = {
            service_id: emailJsServiceId,
            template_id: emailJsTemplateId,
            user_id: emailJsPublicKey,
            template_params: {
                ...params,
                // Standardizing some common keys just in case the template expects them
                reply_to: 'contact@sterlingflow.com',
            }
        }

        const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (response.ok) {
            return { success: true, message: 'Email sent successfully!' }
        } else {
            const errorText = await response.text()
            console.error('EmailJS Error:', errorText)
            return { success: false, message: 'Failed to send email: ' + errorText }
        }

    } catch (error: any) {
        console.error('Email Send Exception:', error)
        return { success: false, message: 'Error sending email: ' + error.message }
    }
}
