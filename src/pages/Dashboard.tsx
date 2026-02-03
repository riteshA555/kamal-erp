import { useState, useEffect, useCallback } from 'react'
import { getLatestRate, SilverRate } from '../services/rateService'
import { getMetalInventory, getFinishedGoodsWeight, MetalInventory } from '../services/inventoryService'
import { getOrders } from '../services/orderService'
import { Scale, TrendingUp, Wrench, ShoppingCart, FileText, Package, Plus, Receipt, Calculator, Eye, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSettings } from '../components/SettingsContext'
import { t } from '../utils/i18n'
import { Order } from '../types'
import { supabase } from '../supabaseClient'

export default function Dashboard() {
    const { settings } = useSettings()
    const [rate, setRate] = useState<SilverRate | null>(null)
    const [inventory, setInventory] = useState<MetalInventory[]>([])
    const [finishedWeight, setFinishedWeight] = useState(0)
    const [orders, setOrders] = useState<Order[]>([])
    const [recentRates, setRecentRates] = useState<SilverRate[]>([])
    const [loading, setLoading] = useState(true)

    // SWR Helper Functions
    const getRateHistory = async () => {
        const { data, error } = await supabase.from('silver_rates').select('*').order('rate_date', { ascending: true })
        if (error) throw error
        return data as SilverRate[]
    }

    useEffect(() => {
        loadData()
    }, [])

    const loadData = useCallback(async () => {
        // Background refresh always keeps data fresh
        try {
            const [r, inv, fw, ords, hist] = await Promise.all([
                getLatestRate(),
                getMetalInventory(),
                getFinishedGoodsWeight(),
                getOrders(),
                getRateHistory()
            ])
            setRate(r)
            setInventory(inv)
            setFinishedWeight(fw)
            setOrders(ords)
            setRecentRates(hist)
        } catch (err) {
            console.error('Dashboard load error:', err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        // Initial load
        loadData()
    }, [loadData])

    const calculateChange = (current: number, previous: number) => {
        if (!previous || previous === 0) return 0
        return ((current - previous) / previous) * 100
    }

    const prevRate = recentRates.length > 1 ? recentRates[recentRates.length - 2].rate_10g : (rate?.rate_10g || 0)
    const rateChangePercent = rate ? calculateChange(rate.rate_10g, prevRate) : 0
    const rateChangeAmt = rate ? (rate.rate_10g - prevRate) * 100 : 0


    // Don't block rendering - show data immediately

    // Calculations
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const monthlyOrders = orders.filter(o => {
        const d = new Date(o.order_date)
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })

    const rawSilverWeight = inventory.reduce((sum, item) => sum + (item.weight_gm || 0), 0)
    const totalSilverStockKg = (rawSilverWeight + finishedWeight) / 1000

    const pendingOrders = orders.filter(o => o.status !== 'Completed')
    const pendingValue = pendingOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

    const monthlySales = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
    const gstPayable = monthlyOrders.reduce((sum, o) => sum + (o.gst_amount || 0), 0)

    const productsMadeCount = monthlyOrders.reduce((sum, o) => {
        return sum + (o.items?.reduce((iSum, item) => iSum + (item.quantity || 0), 0) || 0)
    }, 0)

    // Helper for Status Badge
    const StatusBadge = ({ status }: { status: string }) => {
        const colors: any = {
            'Completed': { bg: 'var(--color-success-light)', text: 'var(--color-success)', border: 'var(--color-success)' },
            'Pending': { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'var(--color-warning)' },
            'In Progress': { bg: 'var(--color-warning-light)', text: 'var(--color-warning)', border: 'var(--color-warning)' }
        }
        const style = colors[status] || colors['Pending']
        return (
            <span style={{
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: 600,
                backgroundColor: style.bg,
                color: style.text,
                border: `1px solid ${style.border}`
            }}>
                {status}
            </span>
        )
    }

    const TypeBadge = ({ type }: { type: string }) => {
        const isJobWork = type === 'CLIENT'
        return (
            <span style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 700,
                backgroundColor: isJobWork ? 'var(--color-bg)' : 'var(--color-warning-light)',
                color: isJobWork ? 'var(--color-text-secondary)' : 'var(--color-warning)',
                textTransform: 'uppercase'
            }}>
                {isJobWork ? 'Job Work' : 'Sale'}
            </span>
        )
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' }}>
            {/* Header */}
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ margin: 0, fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' }}>Dashboard</h1>
                <p style={{ margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' }}>
                    Welcome back! Here's your business overview. / व्यापार की स्थिति
                </p>
            </header>

            {/* Top Stat Row - 6 Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1.25rem',
                marginBottom: '2.5rem'
            }}>
                {/* 1. Total Silver Stock */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Total Silver Stock<br /><small style={{ color: 'var(--color-text-muted)' }}>कुल चांदी स्टॉक</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><Scale size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>{totalSilverStockKg.toFixed(1)} kg</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>+2.3 kg this month</div>
                </CardSkeleton>

                {/* 2. Today's Rate */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Today's Rate<br /><small style={{ color: 'var(--color-text-muted)' }}>आज का भाव</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><TrendingUp size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>₹{(rate?.rate_10g ? rate.rate_10g * 100 : 0).toLocaleString()}/kg</div>
                    <div style={{
                        fontSize: 'var(--text-xs)',
                        color: rateChangePercent >= 0 ? 'var(--color-success)' : '#ef4444',
                        fontWeight: 'var(--font-semibold)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {rateChangePercent >= 0 ? '▲' : '▼'}
                        ₹{Math.abs(rateChangeAmt).toLocaleString()} ({Math.abs(rateChangePercent).toFixed(1)}%)
                    </div>
                </CardSkeleton>

                {/* 3. Pending Job Work */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Pending Job Work<br /><small style={{ color: 'var(--color-text-muted)' }}>पेंडिंग जॉब वर्क</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-bg)' }}><Wrench size={20} color="var(--color-text-secondary)" /></div>
                    </div>
                    <div style={cardValueStyle}>{pendingOrders.length} Orders</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-medium)' }}>Worth ₹{pendingValue.toLocaleString()}</div>
                </CardSkeleton>

                {/* 4. Monthly Sales */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Monthly Sales<br /><small style={{ color: 'var(--color-text-muted)' }}>मासिक बिक्री</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><ShoppingCart size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>₹{monthlySales.toLocaleString()}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>+18% from last month</div>
                </CardSkeleton>

                {/* 5. GST Payable */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>GST Payable<br /><small style={{ color: 'var(--color-text-muted)' }}>GST देय</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><FileText size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>₹{gstPayable.toLocaleString()}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-medium)' }}>Due by 20th {new Date().toLocaleString('default', { month: 'short' })}</div>
                </CardSkeleton>

                {/* 6. Products Made */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Products Made<br /><small style={{ color: 'var(--color-text-muted)' }}>उत्पादन</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><Package size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>{productsMadeCount} pcs</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-medium)' }}>This month</div>
                </CardSkeleton>
            </div>

            {/* Main Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>

                {/* Left: Recent Orders */}
                <div style={{ background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
                    <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('recent_orders', settings.language as any)}</h3>
                        <Link to="/orders" style={{ fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {t('view_all', settings.language as any)} <ChevronRight size={14} />
                        </Link>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{t('order_id', settings.language as any)}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{t('customer', settings.language as any)}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{t('type', settings.language as any)}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{t('status', settings.language as any)}</th>
                                    <th style={{ padding: '12px 24px', textAlign: 'right', fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{t('amount', settings.language as any)}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.slice(0, 6).map((order) => {
                                    const firstItem = order.items?.[0]
                                    return (
                                        <tr key={order.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                            <td style={tdStyle}>{order.order_number}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{order.customer_name}</td>
                                            <td style={tdStyle}>{firstItem?.description || 'N/A'}</td>
                                            <td style={tdStyle}>{firstItem?.quantity || 0}</td>
                                            <td style={tdStyle}><TypeBadge type={order.material_type} /></td>
                                            <td style={tdStyle}><StatusBadge status={order.status} /></td>
                                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700 }}>₹{order.total_amount.toLocaleString()}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column: Actions & Stock Overview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {/* Quick Actions */}
                    <div>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
                            Quick Actions<br />
                            <small style={{ fontWeight: 400, color: '#94a3b8' }}>त्वरित कार्य</small>
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <Link to="/orders" style={{ textDecoration: 'none' }}>
                                <button style={{ ...actionButtonStyle, background: 'var(--color-primary)', color: 'white' }}>
                                    <Plus size={20} />
                                    <span>New Job Work<br /><small style={{ opacity: 0.7, fontSize: '0.7rem' }}>नया जॉब वर्क</small></span>
                                </button>
                            </Link>
                            <Link to="/orders" style={{ textDecoration: 'none' }}>
                                <button style={actionButtonStyle}>
                                    <Receipt size={20} color="#64748b" />
                                    <span>Create Invoice<br /><small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>बिल बनाएं</small></span>
                                </button>
                            </Link>
                            <Link to="/rates" style={{ textDecoration: 'none' }}>
                                <button style={actionButtonStyle}>
                                    <TrendingUp size={20} color="#64748b" />
                                    <span>Update Rate<br /><small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>भाव अपडेट</small></span>
                                </button>
                            </Link>
                            <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                                <button style={actionButtonStyle}>
                                    <Calculator size={20} color="#64748b" />
                                    <span>GST Calculator<br /><small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>GST कैलकुलेटर</small></span>
                                </button>
                            </Link>
                        </div>
                    </div>

                    {/* Stock Overview */}
                    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
                            Stock Overview<br />
                            <small style={{ fontWeight: 400, color: '#94a3b8' }}>स्टॉक स्थिति</small>
                        </h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* Raw Silver */}
                            <StockItem
                                label="Raw Silver Stock"
                                hindiLabel="कच्ची चांदी"
                                value={`${(inventory.find(i => i.name === 'Raw Silver')?.weight_gm || 0) / 1000} kg`}
                                percent={75}
                                color="#f59e0b"
                            />
                            {/* Wastage */}
                            <StockItem
                                label="Wastage Silver"
                                hindiLabel="वेस्टेज चांदी"
                                value={`${(inventory.find(i => i.name === 'Wastage Silver')?.weight_gm || 0) / 1000} kg`}
                                percent={35}
                                color="#94a3b8"
                            />
                            {/* Product Category - Mocked for visual */}
                            <StockItem
                                label="Kanpuri Pendants"
                                hindiLabel="कानपुरी पेंडेंट"
                                value="450 pcs"
                                percent={60}
                                color="#1e293b"
                            />
                        </div>
                    </div>

                </div>

            </div>
        </div >
    )
}

// Sub-components & Styles
const cardStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-lg)',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all var(--transition-base)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '140px'
}

const cardHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 'var(--spacing-md)',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-semibold)',
    color: 'var(--color-text-secondary)',
    lineHeight: 1.2
}

const iconBoxStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
}

const cardValueStyle: React.CSSProperties = {
    fontSize: 'var(--text-3xl)',
    fontWeight: 'var(--font-bold)',
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--spacing-sm)'
}

const thStyle: React.CSSProperties = {
    background: 'var(--color-bg)',
    borderBottom: '2px solid var(--color-border)',
    padding: 'var(--spacing-md)',
    textAlign: 'left',
    fontSize: 'var(--text-xs)',
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 'var(--font-semibold)'
}

const tdStyle: React.CSSProperties = {
    padding: '1.25rem 1rem',
    fontSize: 'var(--text-sm)',
    color: 'var(--color-text-primary)'
}

const actionButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '1.25rem 1rem',
    borderRadius: 'var(--radius-lg)',
    border: '1.5px solid var(--color-border)',
    background: 'var(--color-surface)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    cursor: 'pointer',
    textAlign: 'center',
    fontSize: 'var(--text-sm)',
    fontWeight: 'var(--font-semibold)',
    transition: 'all var(--transition-base)',
    boxShadow: 'var(--shadow-sm)'
}

const StockItem = ({ label, hindiLabel, value, percent, color }: any) => (
    <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>
                {label}<br />
                <small style={{ fontWeight: 400, color: '#94a3b8' }}>{hindiLabel}</small>
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>{value}</div>
        </div>
        <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${percent}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
        </div>
    </div>
)

const CardSkeleton = ({ loading, children }: { loading: boolean, children: React.ReactNode }) => {
    if (!loading) return <div style={cardStyle}>{children}</div>

    return (
        <div style={{ ...cardStyle, position: 'relative', overflow: 'hidden' }}>
            <div className="shimmer" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shimmer 1.5s infinite'
            }} />
            <div style={{ height: '20px', width: '60%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '1rem' }} />
            <div style={{ height: '32px', width: '80%', background: '#f1f5f9', borderRadius: '4px', marginBottom: '1rem' }} />
            <div style={{ height: '16px', width: '40%', background: '#f1f5f9', borderRadius: '4px' }} />
            <style>{`
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            `}</style>
        </div>
    )
}
