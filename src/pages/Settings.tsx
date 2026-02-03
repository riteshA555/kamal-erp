import { useState, useEffect } from 'react'
import { getSettings, updateSettings, resetSettings } from '../services/settingsService'
import {
    BusinessProfileSettings,
    InvoiceSettings,
    GSTSettings,
    UserSettings,
    InventorySettings,
    PricingSettings,
    NotificationSettings,
    KarigarSettings,
    CustomerSettings,
    SystemSettings,
    SettingsCategory
} from '../types/settings'
import { Building2, FileText, Receipt, User, Save, RotateCcw, CheckCircle2, Package, DollarSign, Bell, Palette, Users, UserCheck, Settings as SettingsIcon, Upload, Key, Loader2, AlertTriangle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useSettings } from '../components/SettingsContext'
import { t } from '../utils/i18n'
import { factoryReset } from '../services/settingsService'

// Shared styles for form components
const inputStyle = {
    width: '100%',
    padding: '0.6rem 1rem',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s',
}

const primaryBtnStyle = {
    padding: '0.6rem 1.2rem',
    borderRadius: '8px',
    border: 'none',
    background: 'var(--color-primary)',
    color: 'white',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
}

type TabType = 'business' | 'invoice' | 'gst' | 'account' | 'inventory' | 'pricing' | 'notifications' | 'appearance' | 'karigar' | 'customer' | 'system'

export default function Settings() {
    const { refreshSettings, settings: globalSettings } = useSettings()
    const [activeTab, setActiveTab] = useState<TabType>('business')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Settings state
    const [businessProfile, setBusinessProfile] = useState<BusinessProfileSettings | null>(null)
    const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings | null>(null)
    const [gstSettings, setGSTSettings] = useState<GSTSettings | null>(null)
    const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
    const [inventorySettings, setInventorySettings] = useState<InventorySettings | null>(null)
    const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null)
    const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null)
    const [karigarSettings, setKarigarSettings] = useState<KarigarSettings | null>(null)
    const [customerSettings, setCustomerSettings] = useState<CustomerSettings | null>(null)
    const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null)
    const [modifiedCategories, setModifiedCategories] = useState<Set<SettingsCategory>>(new Set())

    useEffect(() => {
        loadSettings()
    }, [])

    const updateCategory = <K extends SettingsCategory>(category: K, settings: any) => {
        setModifiedCategories(prev => new Set(prev).add(category))
        switch (category) {
            case 'business_profile': setBusinessProfile(settings); break
            case 'invoice_settings': setInvoiceSettings(settings); break
            case 'gst_settings': setGSTSettings(settings); break
            case 'user_settings': setUserSettings(settings); break
            case 'inventory_settings': setInventorySettings(settings); break
            case 'pricing_settings': setPricingSettings(settings); break
            case 'notification_settings': setNotificationSettings(settings); break
            case 'karigar_settings': setKarigarSettings(settings); break
            case 'customer_settings': setCustomerSettings(settings); break
            case 'system_settings': setSystemSettings(settings); break
        }
    }

    const loadSettings = async () => {
        setLoading(true)
        try {
            const [business, invoice, gst, user, inventory, pricing, notifications, karigar, customer, system] = await Promise.all([
                getSettings<BusinessProfileSettings>('business_profile'),
                getSettings<InvoiceSettings>('invoice_settings'),
                getSettings<GSTSettings>('gst_settings'),
                getSettings<UserSettings>('user_settings'),
                getSettings<InventorySettings>('inventory_settings'),
                getSettings<PricingSettings>('pricing_settings'),
                getSettings<NotificationSettings>('notification_settings'),
                getSettings<KarigarSettings>('karigar_settings'),
                getSettings<CustomerSettings>('customer_settings'),
                getSettings<SystemSettings>('system_settings')
            ])
            setBusinessProfile(business)
            setInvoiceSettings(invoice)
            setGSTSettings(gst)
            setUserSettings(user)
            setInventorySettings(inventory)
            setPricingSettings(pricing)
            setNotificationSettings(notifications)
            setKarigarSettings(karigar)
            setCustomerSettings(customer)
            setSystemSettings(system)
            setModifiedCategories(new Set())
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (modifiedCategories.size === 0) return

        setSaving(true)
        setSaved(false)
        try {
            const updates: Promise<void>[] = []

            if (modifiedCategories.has('business_profile') && businessProfile) updates.push(updateSettings('business_profile', businessProfile))
            if (modifiedCategories.has('invoice_settings') && invoiceSettings) updates.push(updateSettings('invoice_settings', invoiceSettings))
            if (modifiedCategories.has('gst_settings') && gstSettings) updates.push(updateSettings('gst_settings', gstSettings))
            if (modifiedCategories.has('user_settings') && userSettings) updates.push(updateSettings('user_settings', userSettings))
            if (modifiedCategories.has('inventory_settings') && inventorySettings) updates.push(updateSettings('inventory_settings', inventorySettings))
            if (modifiedCategories.has('pricing_settings') && pricingSettings) updates.push(updateSettings('pricing_settings', pricingSettings))
            if (modifiedCategories.has('notification_settings') && notificationSettings) updates.push(updateSettings('notification_settings', notificationSettings))
            if (modifiedCategories.has('karigar_settings') && karigarSettings) updates.push(updateSettings('karigar_settings', karigarSettings))
            if (modifiedCategories.has('customer_settings') && customerSettings) updates.push(updateSettings('customer_settings', customerSettings))
            if (modifiedCategories.has('system_settings') && systemSettings) updates.push(updateSettings('system_settings', systemSettings))

            await Promise.all(updates)
            await refreshSettings()
            setModifiedCategories(new Set())
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (err: any) {
            alert('Error saving settings: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    const handleFactoryReset = async () => {
        const confirmText = prompt('This will DELETE ALL DATA and YOUR ACCOUNT permanently. Type "PERMANENT DELETE" to confirm:')
        if (confirmText !== 'PERMANENT DELETE') return

        setLoading(true)
        try {
            await factoryReset()
            // RPC should wipe data. Now we sign out.
            await supabase.auth.signOut()
            window.location.href = '/login'
        } catch (err: any) {
            alert('Reset failed: ' + err.message)
            setLoading(false)
        }
    }

    const handleReset = async () => {
        const categoryMapping: Record<string, SettingsCategory> = {
            'business': 'business_profile',
            'invoice': 'invoice_settings',
            'gst': 'gst_settings',
            'account': 'user_settings',
            'inventory': 'inventory_settings',
            'pricing': 'pricing_settings',
            'notifications': 'notification_settings',
            'karigar': 'karigar_settings',
            'customer': 'customer_settings',
            'system': 'system_settings'
        }
        const category = categoryMapping[activeTab]
        if (!category) return

        if (!confirm(`Are you sure you want to reset ${activeTab} settings to default?`)) return

        try {
            await resetSettings(category)
            await loadSettings()
        } catch (err: any) {
            alert('Error resetting settings: ' + err.message)
        }
    }

    const tabs = [
        { id: 'business', label: 'Business Profile', icon: Building2, key: 'business_profile' },
        { id: 'invoice', label: 'Invoice & Billing', icon: FileText, key: 'invoice_billing' },
        { id: 'gst', label: 'GST & Tax', icon: Receipt, key: 'gst_tax' },
        { id: 'inventory', label: 'Inventory & Stock', icon: Package, key: 'inventory_stock' },
        { id: 'pricing', label: 'Pricing & Margins', icon: DollarSign, key: 'pricing_margins' },
        { id: 'notifications', label: 'Notifications', icon: Bell, key: 'notifications' },
        { id: 'karigar', label: 'Karigar Settings', icon: Users, key: 'karigar_settings' },
        { id: 'customer', label: 'Customer & Ledger', icon: UserCheck, key: 'customer_ledger' },
        { id: 'system', label: 'System', icon: SettingsIcon, key: 'system' },
        { id: 'account', label: 'Account & Display', icon: User, key: 'account_display' },
    ]

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>Settings</h1>
                <p style={{ margin: '0.2rem 0 0', color: '#64748b' }}>
                    Configure your ERP system / अपने ERP को कॉन्फ़िगर करें
                </p>
            </div>

            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                borderBottom: '2px solid #f1f5f9',
                marginBottom: '2rem',
                overflowX: 'auto'
            }}>
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '1rem 1.5rem',
                                background: 'none',
                                border: 'none',
                                borderBottom: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                fontWeight: isActive ? 700 : 500,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            <Icon size={20} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* Settings Content */}
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
            }}>
                {activeTab === 'business' && businessProfile && (
                    <BusinessProfileForm settings={businessProfile} onChange={s => updateCategory('business_profile', s)} />
                )}
                {activeTab === 'invoice' && invoiceSettings && (
                    <InvoiceSettingsForm settings={invoiceSettings} onChange={s => updateCategory('invoice_settings', s)} />
                )}
                {activeTab === 'gst' && gstSettings && (
                    <GSTSettingsForm settings={gstSettings} onChange={s => updateCategory('gst_settings', s)} />
                )}
                {activeTab === 'account' && userSettings && (
                    <AccountSettingsForm settings={userSettings} onChange={s => updateCategory('user_settings', s)} />
                )}
                {activeTab === 'inventory' && inventorySettings && (
                    <InventorySettingsForm settings={inventorySettings} onChange={s => updateCategory('inventory_settings', s)} />
                )}
                {activeTab === 'pricing' && pricingSettings && (
                    <PricingSettingsForm settings={pricingSettings} onChange={s => updateCategory('pricing_settings', s)} />
                )}
                {activeTab === 'notifications' && notificationSettings && (
                    <NotificationSettingsForm settings={notificationSettings} onChange={s => updateCategory('notification_settings', s)} />
                )}
                {activeTab === 'karigar' && karigarSettings && (
                    <KarigarSettingsForm settings={karigarSettings} onChange={s => updateCategory('karigar_settings', s)} />
                )}
                {activeTab === 'customer' && customerSettings && (
                    <CustomerSettingsForm settings={customerSettings} onChange={s => updateCategory('customer_settings', s)} />
                )}
                {activeTab === 'system' && systemSettings && (
                    <SystemSettingsForm
                        settings={systemSettings}
                        onChange={s => updateCategory('system_settings', s)}
                        onFactoryReset={handleFactoryReset}
                    />
                )}

                {/* Action Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '1rem',
                    marginTop: '2rem',
                    paddingTop: '2rem',
                    borderTop: '1px solid #f1f5f9'
                }}>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 2rem',
                            background: saved ? 'var(--color-success)' : (modifiedCategories.size > 0 ? 'var(--color-primary)' : '#94a3b8'),
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 700,
                            cursor: (saving || modifiedCategories.size === 0) ? 'not-allowed' : 'pointer',
                            opacity: saving ? 0.6 : 1
                        }}
                    >
                        {saved ? <CheckCircle2 size={18} /> : <Save size={18} />}
                        {saving ? 'Saving...' : saved ? 'Saved!' : `Save Changes ${modifiedCategories.size > 0 ? `(${modifiedCategories.size})` : ''}`}
                    </button>
                    <button
                        onClick={handleReset}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.5rem',
                            background: 'var(--color-bg)',
                            color: 'var(--color-text-secondary)',
                            border: 'none',
                            borderRadius: '10px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <RotateCcw size={18} />
                        Reset to Default
                    </button>
                </div>
            </div>
        </div>
    )
}

// Business Profile Form Component
function BusinessProfileForm({ settings, onChange }: { settings: BusinessProfileSettings, onChange: (s: BusinessProfileSettings) => void }) {
    const update = (field: keyof BusinessProfileSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Business Name" required>
                <input
                    type="text"
                    value={settings.businessName}
                    onChange={e => update('businessName', e.target.value)}
                    placeholder="e.g. Kunal Kishore Puria"
                />
            </FormField>

            <FormField label="GSTIN" help="GST Identification Number">
                <input
                    type="text"
                    value={settings.gstin}
                    onChange={e => update('gstin', e.target.value)}
                    placeholder="e.g. 08XXXXX0000X1Z5"
                    maxLength={15}
                />
            </FormField>

            <FormField label="PAN" help="PAN Card Number">
                <input
                    type="text"
                    value={settings.pan}
                    onChange={e => update('pan', e.target.value.toUpperCase())}
                    placeholder="e.g. ABCDE1234F"
                    maxLength={10}
                />
            </FormField>

            <FormField label="Phone" style={{ gridColumn: '1 / -1' }}>
                <input
                    type="tel"
                    value={settings.phone}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="e.g. +91 9119106093"
                />
            </FormField>

            <FormField label="Email">
                <input
                    type="email"
                    value={settings.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="e.g. business@example.com"
                />
            </FormField>

            <FormField label="Website">
                <input
                    type="url"
                    value={settings.website}
                    onChange={e => update('website', e.target.value)}
                    placeholder="e.g. www.example.com"
                />
            </FormField>

            <FormField label="Business Logo" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        width: '80px', height: '80px',
                        borderRadius: '12px',
                        border: '2px dashed #e2e8f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden', background: '#f8fafc'
                    }}>
                        {settings.logoUrl ? (
                            <img src={settings.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                            <Building2 size={32} color="#94a3b8" />
                        )}
                    </div>
                    <label style={{
                        padding: '0.6rem 1.2rem',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                        <Upload size={16} /> Choose Image
                        <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={async (e) => {
                                const file = e.target.files?.[0]
                                if (!file) return

                                try {
                                    const { data: { user } } = await supabase.auth.getUser()
                                    if (!user) return

                                    const fileExt = file.name.split('.').pop()
                                    const fileName = `${user.id}_${Math.random()}.${fileExt}`
                                    const filePath = `logos/${fileName}`

                                    const { error: uploadError } = await supabase.storage
                                        .from('public') // Assuming a 'public' bucket exists or change to 'business_logos'
                                        .upload(filePath, file)

                                    if (uploadError) throw uploadError

                                    const { data: { publicUrl } } = supabase.storage
                                        .from('public')
                                        .getPublicUrl(filePath)

                                    update('logoUrl', publicUrl)
                                } catch (err: any) {
                                    alert('Logo upload failed: ' + err.message)
                                }
                            }}
                        />
                    </label>
                </div>
            </FormField>

            <FormField label="Address" style={{ gridColumn: '1 / -1' }}>
                <textarea
                    value={settings.address}
                    onChange={e => update('address', e.target.value)}
                    placeholder="Complete business address"
                    rows={2}
                    style={{ resize: 'vertical' }}
                />
            </FormField>

            <FormField label="City">
                <input
                    type="text"
                    value={settings.city}
                    onChange={e => update('city', e.target.value)}
                    placeholder="e.g. Agra"
                />
            </FormField>

            <FormField label="State">
                <input
                    type="text"
                    value={settings.state}
                    onChange={e => update('state', e.target.value)}
                    placeholder="e.g. Uttar Pradesh"
                />
            </FormField>

            <FormField label="Pincode">
                <input
                    type="text"
                    value={settings.pincode}
                    onChange={e => update('pincode', e.target.value)}
                    placeholder="e.g. 282001"
                    maxLength={6}
                />
            </FormField>

            <FormField label="Financial Year Start Month">
                <select
                    value={settings.financialYearStart}
                    onChange={e => update('financialYearStart', Number(e.target.value))}
                >
                    {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, idx) => (
                        <option key={idx} value={idx + 1}>{month}</option>
                    ))}
                </select>
            </FormField>
        </div>
    )
}

// Invoice Settings Form Component
function InvoiceSettingsForm({ settings, onChange }: { settings: InvoiceSettings, onChange: (s: InvoiceSettings) => void }) {
    const update = (field: keyof InvoiceSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Invoice Prefix" help="Appears before invoice number">
                <input
                    type="text"
                    value={settings.invoicePrefix}
                    onChange={e => update('invoicePrefix', e.target.value)}
                    placeholder="e.g. INV-"
                />
            </FormField>

            <FormField label="Starting Invoice Number">
                <input
                    type="number"
                    value={settings.startingNumber}
                    onChange={e => update('startingNumber', Number(e.target.value))}
                    min={1}
                />
            </FormField>

            <FormField label="Payment Terms">
                <select
                    value={settings.paymentTerms}
                    onChange={e => update('paymentTerms', e.target.value)}
                >
                    <option value="Immediate">Immediate</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                </select>
            </FormField>

            <FormField label="Bank Name" style={{ gridColumn: '1 / -1' }}>
                <input
                    type="text"
                    value={settings.bankName}
                    onChange={e => update('bankName', e.target.value)}
                    placeholder="e.g. State Bank of India"
                />
            </FormField>

            <FormField label="Account Number">
                <input
                    type="text"
                    value={settings.accountNumber}
                    onChange={e => update('accountNumber', e.target.value)}
                    placeholder="e.g. 1234567890"
                />
            </FormField>

            <FormField label="IFSC Code">
                <input
                    type="text"
                    value={settings.ifscCode}
                    onChange={e => update('ifscCode', e.target.value.toUpperCase())}
                    placeholder="e.g. SBIN0001234"
                    maxLength={11}
                />
            </FormField>

            <FormField label="Branch Name">
                <input
                    type="text"
                    value={settings.branchName}
                    onChange={e => update('branchName', e.target.value)}
                    placeholder="e.g. Main Branch"
                />
            </FormField>

            <FormField label="Terms & Conditions" style={{ gridColumn: '1 / -1' }}>
                <textarea
                    value={settings.termsAndConditions}
                    onChange={e => update('termsAndConditions', e.target.value)}
                    placeholder="Enter default terms and conditions for invoices"
                    rows={4}
                    style={{ resize: 'vertical' }}
                />
            </FormField>

            <FormField label="Display Options" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.showHsnCode}
                            onChange={e => update('showHsnCode', e.target.checked)}
                        />
                        Show HSN/SAC Code on invoices
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.autoGenerate}
                            onChange={e => update('autoGenerate', e.target.checked)}
                        />
                        Auto-generate invoice on order completion
                    </label>
                </div>
            </FormField>
        </div>
    )
}

// GST Settings Form Component
function GSTSettingsForm({ settings, onChange }: { settings: GSTSettings, onChange: (s: GSTSettings) => void }) {
    const update = (field: keyof GSTSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    const gstOptions = [
        { value: 0, label: '0% (Exempt)' },
        { value: 0.25, label: '0.25%' },
        { value: 3, label: '3% (Silver/Gold)' },
        { value: 5, label: '5% (Job Work)' },
        { value: 12, label: '12%' },
        { value: 18, label: '18%' },
        { value: 28, label: '28%' }
    ]

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="GST Rate: Job Work (Client Material)" help="Standard rate for services (e.g. 5%)">
                <select
                    value={settings.defaultGstRateJobWork}
                    onChange={e => update('defaultGstRateJobWork', Number(e.target.value))}
                >
                    {gstOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </FormField>

            <FormField label="GST Rate: Sale (Own Material)" help="Standard rate for items (e.g. 3%)">
                <select
                    value={settings.defaultGstRateSale}
                    onChange={e => update('defaultGstRateSale', Number(e.target.value))}
                >
                    {gstOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
            </FormField>

            <FormField label="Tax Calculation Method">
                <select
                    value={settings.taxCalculationMethod}
                    onChange={e => update('taxCalculationMethod', e.target.value)}
                >
                    <option value="exclusive">Exclusive (Tax added on top)</option>
                    <option value="inclusive">Inclusive (Tax included in price)</option>
                </select>
            </FormField>

            <FormField label="ITC Opening Balance (₹)" help="Input Tax Credit carried forward">
                <input
                    type="number"
                    value={settings.itcOpeningBalance}
                    onChange={e => update('itcOpeningBalance', Number(e.target.value))}
                    min={0}
                    step={0.01}
                />
            </FormField>

            <FormField label="GST Options" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.enableReverseCharge}
                            onChange={e => update('enableReverseCharge', e.target.checked)}
                        />
                        Enable Reverse Charge Mechanism
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.compositionScheme}
                            onChange={e => update('compositionScheme', e.target.checked)}
                        />
                        Composition Scheme (Flat rate GST)
                    </label>
                </div>
            </FormField>
        </div>
    )
}

// Account Settings Form Component
function AccountSettingsForm({ settings, onChange }: { settings: UserSettings, onChange: (s: UserSettings) => void }) {
    const { settings: globalSettings } = useSettings()
    const update = (field: keyof UserSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Display Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <FormField label={t('theme', globalSettings.language as any)}>
                    <select value={settings.theme} onChange={e => update('theme', e.target.value)}>
                        <option value="light">{t('light_mode', globalSettings.language as any)}</option>
                        <option value="dark">{t('dark_mode', globalSettings.language as any)}</option>
                    </select>
                </FormField>

                <FormField label={t('language', globalSettings.language as any)}>
                    <select value={settings.language} onChange={e => update('language', e.target.value)}>
                        <option value="en">English</option>
                        <option value="hi">हिंदी (Hindi)</option>
                    </select>
                </FormField>

                <FormField label="Date Format">
                    <select value={settings.dateFormat} onChange={e => update('dateFormat', e.target.value)}>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (Indian)</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                    </select>
                </FormField>

                <FormField label="Number Format">
                    <select value={settings.numberFormat} onChange={e => update('numberFormat', e.target.value)}>
                        <option value="indian">Indian (₹1,00,000)</option>
                        <option value="international">International (₹100,000)</option>
                    </select>
                </FormField>
            </div>

            {/* Security Section */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '2rem' }}>
                <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Key size={18} /> Change Password
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', maxWidth: '800px' }}>
                    <FormField label="Current Password">
                        <input type="password" id="curr_pass" placeholder="••••••••" style={inputStyle} />
                    </FormField>
                    <FormField label="New Password">
                        <input type="password" id="new_pass" placeholder="Minimum 6 characters" style={inputStyle} />
                    </FormField>
                    <FormField label="Confirm New Password">
                        <input type="password" id="conf_pass" placeholder="Confirm" style={inputStyle} />
                    </FormField>
                </div>
                <button
                    onClick={async () => {
                        const newP = (document.getElementById('new_pass') as HTMLInputElement).value
                        const confP = (document.getElementById('conf_pass') as HTMLInputElement).value
                        if (!newP || newP.length < 6) return alert('Password must be at least 6 characters')
                        if (newP !== confP) return alert('Passwords do not match')

                        try {
                            const { error } = await supabase.auth.updateUser({ password: newP })
                            if (error) throw error
                            alert('Password updated successfully!')
                                // Clear inputs
                                ; (document.getElementById('new_pass') as HTMLInputElement).value = ""
                                ; (document.getElementById('conf_pass') as HTMLInputElement).value = ""
                                ; (document.getElementById('curr_pass') as HTMLInputElement).value = ""
                        } catch (err: any) {
                            alert('Password update failed: ' + err.message)
                        }
                    }}
                    style={{ ...primaryBtnStyle, marginTop: '1.5rem', background: '#1e293b' }}
                >
                    Update Password
                </button>
            </div>
        </div>
    )
}

// Reusable Form Field Component
function FormField({ label, help, required, children, style }: any) {
    return (
        <div style={style}>
            <label style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: '#475569',
                marginBottom: '0.5rem'
            }}>
                {label}
                {required && <span style={{ color: '#ef4444' }}> *</span>}
                {help && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94a3b8', marginLeft: '0.5rem' }}>({help})</span>}
            </label>
            {children}
        </div>
    )
}

// Inventory Settings Form Component
function InventorySettingsForm({ settings, onChange }: { settings: InventorySettings, onChange: (s: InventorySettings) => void }) {
    const update = (field: keyof InventorySettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Low Stock Threshold" help="Alert when stock falls below this">
                <input
                    type="number"
                    value={settings.lowStockThreshold}
                    onChange={e => update('lowStockThreshold', Number(e.target.value))}
                    min={0}
                    placeholder="e.g. 10"
                />
            </FormField>

            <FormField label="Stock Valuation Method">
                <select
                    value={settings.stockValuationMethod}
                    onChange={e => update('stockValuationMethod', e.target.value)}
                >
                    <option value="FIFO">FIFO (First In, First Out)</option>
                    <option value="LIFO">LIFO (Last In, First Out)</option>
                    <option value="WEIGHTED_AVERAGE">Weighted Average</option>
                </select>
            </FormField>

            <FormField label="Default Unit">
                <select
                    value={settings.defaultUnit}
                    onChange={e => update('defaultUnit', e.target.value)}
                >
                    <option value="Gram">Gram</option>
                    <option value="Kg">Kilogram</option>
                    <option value="Piece">Piece</option>
                    <option value="Set">Set</option>
                </select>
            </FormField>

            <FormField label="Stock Options" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.autoDeductStock}
                            onChange={e => update('autoDeductStock', e.target.checked)}
                        />
                        Auto-deduct stock on order creation
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.allowNegativeStock}
                            onChange={e => update('allowNegativeStock', e.target.checked)}
                        />
                        Allow negative stock (overselling)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.autoCalculateWastage}
                            onChange={e => update('autoCalculateWastage', e.target.checked)}
                        />
                        Auto-calculate wastage percentage
                    </label>
                </div>
            </FormField>
        </div>
    )
}

// Pricing Settings Form Component
function PricingSettingsForm({ settings, onChange }: { settings: PricingSettings, onChange: (s: PricingSettings) => void }) {
    const update = (field: keyof PricingSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Default Profit Margin (%)" help="Applied to new products">
                <input
                    type="number"
                    value={settings.defaultProfitMargin}
                    onChange={e => update('defaultProfitMargin', Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="e.g. 15"
                />
            </FormField>

            <FormField label="Rounding Rule" help="Round prices to nearest">
                <select
                    value={settings.roundingRule}
                    onChange={e => update('roundingRule', Number(e.target.value))}
                >
                    <option value={1}>₹1 (No rounding)</option>
                    <option value={5}>₹5</option>
                    <option value={10}>₹10</option>
                </select>
            </FormField>

            <FormField label="Labour Rate Type">
                <select
                    value={settings.labourRateType}
                    onChange={e => update('labourRateType', e.target.value)}
                >
                    <option value="per_gram">Per Gram</option>
                    <option value="per_piece">Per Piece</option>
                    <option value="fixed">Fixed Amount</option>
                </select>
            </FormField>

            <FormField label="Default Making Charge (%)" help="Applied to new orders">
                <input
                    type="number"
                    value={settings.defaultMakingCharge}
                    onChange={e => update('defaultMakingCharge', Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                    placeholder="e.g. 10"
                />
            </FormField>
        </div>
    )
}

// Notification Settings Form Component
function NotificationSettingsForm({ settings, onChange }: { settings: NotificationSettings, onChange: (s: NotificationSettings) => void }) {
    const update = (field: keyof NotificationSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Email Notifications" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.emailNotifications}
                            onChange={e => update('emailNotifications', e.target.checked)}
                        />
                        Enable email notifications
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.dailySummary}
                            onChange={e => update('dailySummary', e.target.checked)}
                        />
                        Send daily summary email
                    </label>
                </div>
            </FormField>

            <FormField label="Alert Settings" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.dashboardAlerts}
                            onChange={e => update('dashboardAlerts', e.target.checked)}
                        />
                        Show dashboard alerts
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.paymentReminders}
                            onChange={e => update('paymentReminders', e.target.checked)}
                        />
                        Payment reminders for customers
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.expenseAlerts}
                            onChange={e => update('expenseAlerts', e.target.checked)}
                        />
                        High expense alerts
                    </label>
                </div>
            </FormField>

            <FormField label="Communication Channels" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.smsAlerts}
                            onChange={e => update('smsAlerts', e.target.checked)}
                        />
                        SMS alerts (requires SMS gateway)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.whatsappIntegration}
                            onChange={e => update('whatsappIntegration', e.target.checked)}
                        />
                        WhatsApp integration (requires Business API)
                    </label>
                </div>
            </FormField>
        </div>
    )
}

// Karigar Settings Form Component
function KarigarSettingsForm({ settings, onChange }: { settings: KarigarSettings, onChange: (s: KarigarSettings) => void }) {
    const update = (field: keyof KarigarSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Default Rate Type">
                <select
                    value={settings.defaultRateType}
                    onChange={e => update('defaultRateType', e.target.value)}
                >
                    <option value="per_kg">Per Kilogram</option>
                    <option value="per_piece">Per Piece</option>
                    <option value="fixed">Fixed Amount</option>
                </select>
            </FormField>

            <FormField label="Payment Cycle">
                <select
                    value={settings.paymentCycle}
                    onChange={e => update('paymentCycle', e.target.value)}
                >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </FormField>

            <FormField label="Settlement Terms" help="Default payment terms">
                <input
                    type="text"
                    value={settings.settlementTerms}
                    onChange={e => update('settlementTerms', e.target.value)}
                    placeholder="e.g. Net 7"
                />
            </FormField>

            <FormField label="Penalty Percentage (%)" help="For delayed work">
                <input
                    type="number"
                    value={settings.penaltyPercentage}
                    onChange={e => update('penaltyPercentage', Number(e.target.value))}
                    min={0}
                    max={100}
                    step={0.1}
                    disabled={!settings.penaltyForDelay}
                />
            </FormField>

            <FormField label="Karigar Options" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.allowAdvancePayment}
                            onChange={e => update('allowAdvancePayment', e.target.checked)}
                        />
                        Allow advance payment to karigars
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.penaltyForDelay}
                            onChange={e => update('penaltyForDelay', e.target.checked)}
                        />
                        Apply penalty for delayed work
                    </label>
                </div>
            </FormField>
        </div>
    )
}

// Customer Settings Form Component
function CustomerSettingsForm({ settings, onChange }: { settings: CustomerSettings, onChange: (s: CustomerSettings) => void }) {
    const update = (field: keyof CustomerSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Default Credit Limit (₹)" help="For new customers">
                <input
                    type="number"
                    value={settings.defaultCreditLimit}
                    onChange={e => update('defaultCreditLimit', Number(e.target.value))}
                    min={0}
                    step={1000}
                    placeholder="e.g. 100000"
                />
            </FormField>

            <FormField label="Default Payment Terms">
                <select
                    value={settings.defaultPaymentTerms}
                    onChange={e => update('defaultPaymentTerms', e.target.value)}
                >
                    <option value="Immediate">Immediate</option>
                    <option value="Net 7">Net 7 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 60">Net 60 Days</option>
                </select>
            </FormField>

            <FormField label="Interest Rate (% per month)" help="On overdue payments">
                <input
                    type="number"
                    value={settings.interestRate}
                    onChange={e => update('interestRate', Number(e.target.value))}
                    min={0}
                    max={10}
                    step={0.1}
                    disabled={!settings.interestOnOverdue}
                    placeholder="e.g. 1.5"
                />
            </FormField>

            <FormField label="Statement Frequency">
                <select
                    value={settings.statementFrequency}
                    onChange={e => update('statementFrequency', e.target.value)}
                    disabled={!settings.autoSendStatements}
                >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                </select>
            </FormField>

            <FormField label="Customer Options" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.interestOnOverdue}
                            onChange={e => update('interestOnOverdue', e.target.checked)}
                        />
                        Charge interest on overdue payments
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.autoSendStatements}
                            onChange={e => update('autoSendStatements', e.target.checked)}
                        />
                        Auto-send account statements to customers
                    </label>
                </div>
            </FormField>
        </div>
    )
}

// System Settings Form Component
function SystemSettingsForm({ settings, onChange, onFactoryReset }: {
    settings: SystemSettings,
    onChange: (s: SystemSettings) => void,
    onFactoryReset: () => void
}) {
    const update = (field: keyof SystemSettings, value: any) => {
        onChange({ ...settings, [field]: value })
    }

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <FormField label="Performance Mode" help="Balance between speed and detail">
                <select
                    value={settings.performanceMode}
                    onChange={e => update('performanceMode', e.target.value)}
                >
                    <option value="fast">Fast (Minimal details)</option>
                    <option value="balanced">Balanced (Recommended)</option>
                    <option value="detailed">Detailed (Full analytics)</option>
                </select>
            </FormField>

            <FormField label="Auto-Sync Frequency (minutes)" help="Background data sync">
                <input
                    type="number"
                    value={settings.autoSyncFrequency}
                    onChange={e => update('autoSyncFrequency', Number(e.target.value))}
                    min={1}
                    max={60}
                    step={1}
                    placeholder="e.g. 5"
                />
            </FormField>

            <FormField label="System Options" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.enableCache}
                            onChange={e => update('enableCache', e.target.checked)}
                        />
                        Enable caching (Faster loading)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.enableOfflineMode}
                            onChange={e => update('enableOfflineMode', e.target.checked)}
                        />
                        Enable offline mode (Work without internet)
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <input
                            type="checkbox"
                            checked={settings.enableDebugMode}
                            onChange={e => update('enableDebugMode', e.target.checked)}
                        />
                        Enable debug mode (For troubleshooting)
                    </label>
                </div>
            </FormField>

            <div style={{ gridColumn: '1 / -1', marginTop: '2.5rem', padding: '1.75rem', border: '2px dashed #fee2e2', borderRadius: '16px', background: 'var(--color-surface)', borderLeft: '6px solid #dc2626' }}>
                <h4 style={{ color: '#991b1b', marginTop: 0, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.15rem' }}>
                    <AlertTriangle size={24} color="#dc2626" /> Danger Zone: Factory Reset
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    This will permanently delete <strong>ALL business data</strong>, inventory, billing history, settings, and <strong>de-register your account</strong>.
                    The application will return to its original empty state. <strong>This action is irreversible.</strong>
                </p>
                <button
                    onClick={onFactoryReset}
                    style={{
                        padding: '0.85rem 1.75rem',
                        background: '#dc2626',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(220, 38, 38, 0.35)'
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.25)'
                    }}
                >
                    <RotateCcw size={18} /> Wipe Everything & Start Fresh
                </button>
            </div>
        </div>
    )
}

