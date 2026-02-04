import { useState, useMemo, useCallback } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthProvider'
import { useSettings } from '../features/settings/SettingsContext'
import { t } from '../shared/utils/i18n'
import { Menu, X, LayoutDashboard, ShoppingCart, Settings, LogOut, Wallet, BarChart3, BookOpen, Users, Receipt, LineChart, Book, Package, User, ChevronDown, Truck } from 'lucide-react'

// Import preloadable components
import { PreloadableComponent } from '../shared/utils/lazyWithPreload'

// Component map for preloading
const componentMap: Record<string, PreloadableComponent<any>> = {}

// This will be populated by App.tsx exports
export const registerPreloadableComponents = (components: Record<string, PreloadableComponent<any>>) => {
    Object.assign(componentMap, components)
}

const NAV_ITEMS_DATA = [
    { name: 'Dashboard', key: 'dashboard', path: '/', icon: LayoutDashboard, preloadKey: 'Dashboard' },
    { name: 'Orders', key: 'orders', path: '/orders', icon: ShoppingCart, preloadKey: 'OrderList' },
    { name: 'Expenses', key: 'expenses', path: '/expenses', icon: Wallet, preloadKey: 'ExpenseManager' },
    { name: 'Accounting', key: 'accounting', path: '/accounting', icon: BarChart3, preloadKey: 'AccountingDashboard' },
    { name: 'Customer Ledger', key: 'ledger', path: '/ledger', icon: BookOpen, preloadKey: 'LedgerStatement' },
    { name: 'Vendor Master', key: 'vendors', path: '/vendors', icon: Truck, preloadKey: 'VendorMaster' },
    { name: 'Karigar Master', key: 'karigar', path: '/karigar', icon: Users, preloadKey: 'KarigarMaster' },
    { name: 'Karigar Settlement', key: 'settlement', path: '/settlement', icon: Wallet, preloadKey: 'KarigarSettlement' },
    { name: 'GST Module', key: 'gst_module', path: '/gst-reports', icon: Receipt, preloadKey: 'GSTReports' },
    { name: 'Silver Rates', key: 'silver_rates', path: '/rates', icon: LineChart, preloadKey: 'SilverRateManager' },
    { name: 'Business Catalog', key: 'catalog', path: '/catalog', icon: Book, preloadKey: 'UnifiedCatalog' },
    { name: 'Stock Management', key: 'stock', path: '/stock', icon: Package, preloadKey: 'StockManagement' },
    { name: 'Settings', key: 'settings', path: '/settings', icon: Settings, preloadKey: 'Settings' },
]

export default function Layout() {
    const { signOut, user } = useAuth()
    const { settings } = useSettings()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
    const location = useLocation()

    // Use useCallback for handlers to keep reference stable
    const toggleSidebar = useCallback(() => setSidebarOpen(prev => !prev), [])
    const closeSidebar = useCallback(() => setSidebarOpen(false), [])
    const toggleProfileDropdown = useCallback(() => setProfileDropdownOpen(prev => !prev), [])

    // Preload component on hover
    const handlePreload = useCallback((preloadKey?: string) => {
        if (preloadKey && componentMap[preloadKey]) {
            componentMap[preloadKey].preload().catch(() => {
                // Silently fail if preload doesn't work
            })
        }
    }, [])

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40 }}
                    onClick={closeSidebar}
                />
            )}

            {/* Sidebar */}
            <aside style={{
                width: '220px',
                background: 'var(--color-surface)',
                borderRight: '1px solid var(--color-border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: 0,
                zIndex: 50,
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s ease-in-out',
            }} className="sidebar-desktop">

                <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', minHeight: '90px' }}>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', height: '80px' }}>
                        <img src="/logo.png" alt="Nexora Digital" style={{ height: '140px', width: 'auto', objectFit: 'contain', transform: 'scale(1.5)', marginTop: '5px' }} />
                    </div>
                    <button onClick={closeSidebar} style={{ background: 'transparent', padding: '0.25rem', color: 'var(--color-text)', display: 'block', marginLeft: 'auto' }} className="mobile-only-close">
                        <X size={20} />
                    </button>
                </div>

                <nav style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {NAV_ITEMS_DATA.map((item) => {
                            const Icon = item.icon
                            const isActive = location.pathname === item.path
                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={closeSidebar}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.75rem',
                                            padding: '0.75rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            textDecoration: 'none',
                                            color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                            background: isActive ? 'var(--color-primary-pale)' : 'transparent',
                                            fontWeight: isActive ? 600 : 500,
                                            fontSize: 'var(--text-sm)',
                                            transition: 'all var(--transition-base)',
                                            border: isActive ? '1px solid var(--color-primary-light)' : '1px solid transparent',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'var(--color-bg)'
                                                e.currentTarget.style.color = 'var(--color-text-primary)'
                                            }
                                            // Preload component on hover
                                            handlePreload(item.preloadKey)
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'transparent'
                                                e.currentTarget.style.color = 'var(--color-text-secondary)'
                                            }
                                        }}
                                    >
                                        <Icon size={20} />
                                        {t(item.key as any, settings.language as any)}
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>
                </nav>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', marginLeft: 0 }} className="main-content">
                <header style={{
                    height: '64px',
                    borderBottom: '1px solid var(--color-border)',
                    background: 'var(--color-surface)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 1.5rem',
                    position: 'sticky',
                    top: 0,
                    zIndex: 30
                }}>
                    <button
                        onClick={toggleSidebar}
                        style={{ background: 'transparent', padding: 0, color: 'var(--color-text)', marginRight: '1rem' }}
                        className="mobile-menu-trigger"
                    >
                        <Menu size={24} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minHeight: '64px' }}>
                        <div style={{ height: '50px', width: '80px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="mobile-header-logo">
                            <img src="/logo.png" alt="Nexora Digital" style={{ height: '80px', width: 'auto', objectFit: 'contain', transform: 'scale(1.4)' }} />
                        </div>
                        <h3 style={{ margin: 0 }}>
                            {t(NAV_ITEMS_DATA.find(i => i.path === location.pathname)?.key as any || 'dashboard', settings.language as any)}
                        </h3>
                    </div>

                    {/* Profile Dropdown */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={toggleProfileDropdown}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: 'var(--color-surface)',
                                border: '1.5px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                color: 'var(--color-text-primary)',
                                fontWeight: 500,
                                fontSize: 'var(--text-sm)',
                                transition: 'all var(--transition-base)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-primary)'
                                e.currentTarget.style.boxShadow = 'var(--shadow-green)'
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--color-border)'
                                e.currentTarget.style.boxShadow = 'none'
                            }}
                        >
                            <User size={20} />
                            <span style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user?.email?.split('@')[0] || 'Profile'}
                            </span>
                            <ChevronDown size={16} style={{ transform: profileDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform var(--transition-base)' }} />
                        </button>

                        {profileDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                top: '110%',
                                right: 0,
                                background: 'var(--color-surface)',
                                borderRadius: 'var(--radius-lg)',
                                boxShadow: 'var(--shadow-lg)',
                                border: '1px solid var(--color-border)',
                                zIndex: 100,
                                minWidth: '240px',
                                overflow: 'hidden',
                                padding: '0.5rem'
                            }}>
                                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--color-border-light)' }}>
                                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Signed in as</div>
                                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user?.email}
                                    </div>
                                </div>
                                <button
                                    onClick={signOut}
                                    style={{
                                        width: '100%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem 1rem',
                                        background: 'transparent',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        color: 'var(--color-error)',
                                        fontWeight: 500,
                                        fontSize: 'var(--text-sm)',
                                        textAlign: 'left',
                                        transition: 'all var(--transition-base)',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'var(--color-error-light)'
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent'
                                    }}
                                >
                                    <LogOut size={18} />
                                    {t('sign_out', settings.language as any)}
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
                    <Outlet />
                </div>
            </main>

            {/* Inject Media Queries for Responsiveness */}
            <style>{`
        /* Desktop: Sidebar always visible */
        @media (min-width: 768px) {
           aside {
               transform: translateX(0) !important;
               position: fixed !important; 
           }
           .mobile-only-close { display: none !important; }
           .mobile-menu-trigger { display: none !important; }
           .main-content { margin-left: 220px !important; }
           .mobile-header-logo { display: none !important; }
        }
        
        /* Mobile: Sidebar hidden by default (handled by JS state transform) */
        @media (max-width: 767px) {
           .main-content { margin-left: 0 !important; }
        }
      `}</style>
        </div>
    )
}
