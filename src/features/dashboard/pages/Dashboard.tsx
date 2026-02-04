import { useState, useEffect, useCallback, useMemo, memo } from 'react'
import { getLatestRate, SilverRate } from '../../../services/rateService'
import { getMetalInventory, getFinishedGoodsWeight, MetalInventory } from '../../../services/inventoryService'
import { getOrders, updateOrderStatus } from '../../../services/orderService'
import { getProducts } from '../../../services/productService'
import { Scale, TrendingUp, Wrench, ShoppingCart, FileText, Package, Plus, Receipt, Calculator, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useSettings } from '../../settings/SettingsContext'
import { t } from '../../../shared/utils/i18n'
import { Order, Product } from '../../../types'
import { supabase } from '../../../supabaseClient'

// --- Optimizations: Static Styles & Components Extracted ---



const TypeBadge = memo(({ type }: { type: string }) => {
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
});

const StockItem = memo(({ label, hindiLabel, value, percent, color }: any) => (
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
));

const GstCalculatorModal = ({ onClose }: { onClose: () => void }) => {
    const [amount, setAmount] = useState('')
    const [rate, setRate] = useState('3')
    const val = Number(amount) || 0
    const r = Number(rate) || 0
    const gst = (val * r) / 100
    const total = val + gst

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={onClose}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', minWidth: '320px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
                <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem', fontWeight: 700 }}>
                    <Calculator size={24} color="var(--color-primary)" /> GST Calculator
                </h3>
                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>Amount (₹)</label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        style={{ width: '100%', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '1.2rem', fontWeight: 'bold', outlineColor: '#3b82f6' }}
                        autoFocus
                        placeholder="Enter amount"
                    />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '4px' }}>GST Rate (%)</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[3, 5, 12, 18].map(rt => (
                            <button key={rt} onClick={() => setRate(rt.toString())}
                                style={{ flex: 1, padding: '8px', borderRadius: '6px', border: rate === rt.toString() ? '1px solid #3b82f6' : '1px solid #e2e8f0', background: rate === rt.toString() ? '#eff6ff' : 'white', fontWeight: 600, color: rate === rt.toString() ? '#3b82f6' : '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}>
                                {rt}%
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#64748b' }}>
                        <span>GST Amount:</span>
                        <span>₹{gst.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>
                        <span>Total:</span>
                        <span>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <button onClick={onClose} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', fontSize: '1rem' }}>
                    Close
                </button>
            </div>
        </div>
    )
}

// Extracted styles to avoid recreation object on every render
const PAGE_CONTAINER_STYLE = { maxWidth: '1400px', margin: '0 auto', paddingBottom: '3rem' };
const HEADER_STYLE = { marginBottom: '2rem' };
const H1_STYLE = { margin: 0, fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--color-text-primary)' };
const SUBTITLE_STYLE = { margin: '0.5rem 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-base)' };
const GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' };
const MAIN_GRID_STYLE = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '2rem' }; // Responsive fix: changed 1fr 340px to auto-fit
const TABLE_CONTAINER_STYLE = { background: 'var(--color-surface)', borderRadius: '16px', border: '1px solid var(--color-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' };
const TABLE_HEADER_BAR_STYLE = { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const VIEW_ALL_LINK_STYLE = { fontSize: '0.85rem', color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' };


export default function Dashboard() {
    const { settings } = useSettings()

    // State
    const [rate, setRate] = useState<SilverRate | null>(null)
    const [inventory, setInventory] = useState<MetalInventory[]>([])
    const [finishedWeight, setFinishedWeight] = useState(0)
    const [orders, setOrders] = useState<Order[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [recentRates, setRecentRates] = useState<SilverRate[]>([])
    const [showGstCalc, setShowGstCalc] = useState(false)
    const [loading, setLoading] = useState(true)

    // Helper for Rate History
    const getRateHistory = useCallback(async () => {
        const { data, error } = await supabase.from('silver_rates').select('*').order('rate_date', { ascending: true })
        if (error) throw error
        return data as SilverRate[]
    }, [])

    const loadData = useCallback(async () => {
        try {
            // Parallel fetching is good, keep it
            const [r, inv, fw, ords, hist, prods] = await Promise.all([
                getLatestRate(),
                getMetalInventory(),
                getFinishedGoodsWeight(),
                getOrders(),
                getRateHistory(),
                getProducts()
            ])

            // Batch updates are automatic in React 18
            setRate(r)
            setInventory(inv)
            setFinishedWeight(fw)
            setOrders(ords)
            setRecentRates(hist)
            setProducts(prods)
        } catch (err) {
            console.error('Dashboard load error:', err)
        } finally {
            setLoading(false)
        }
    }, [getRateHistory])

    useEffect(() => {
        loadData()
    }, [loadData])

    // --- Optimization: Memoize Expensive Calculations ---

    const stats = useMemo(() => {
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
        const pendingCount = pendingOrders.length

        const monthlySales = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
        const gstPayable = monthlyOrders.reduce((sum, o) => sum + (o.gst_amount || 0), 0)

        const productsMadeCount = monthlyOrders.reduce((sum, o) => {
            return sum + (o.items?.reduce((iSum, item) => iSum + (item.quantity || 0), 0) || 0)
        }, 0)

        // Rate Calculations
        const prevRate = recentRates.length > 1 ? recentRates[recentRates.length - 2].rate_10g : (rate?.rate_10g || 0)
        const rateChangePercent = rate ? ((rate.rate_10g - prevRate) / (prevRate || 1)) * 100 : 0 // avoid div by 0
        const rateChangeAmt = rate ? (rate.rate_10g - prevRate) * 100 : 0
        const currentRateKg = rate ? rate.rate_10g * 100 : 0

        return {
            totalSilverStockKg,
            currentRateKg,
            rateChangePercent,
            rateChangeAmt,
            pendingCount,
            pendingValue,
            monthlySales,
            gstPayable,
            productsMadeCount,
            rawSilverWeight
        }
    }, [orders, inventory, finishedWeight, recentRates, rate])

    // Memoize the sliced orders to prevent re-slicing on every render
    const recentOrders = useMemo(() => orders.slice(0, 6), [orders])

    // Find specific inventory items only when inventory changes
    const rawSilverItem = useMemo(() => inventory.find(i => i.name === 'Raw Silver')?.weight_gm || 0, [inventory]);
    const wastageItem = useMemo(() => inventory.find(i => i.name === 'Wastage Silver')?.weight_gm || 0, [inventory]);

    const productStats = useMemo(() => {
        const stats: Record<string, number> = {}
        products.forEach(p => {
            if (p.category && p.current_stock > 0) {
                stats[p.category] = (stats[p.category] || 0) + p.current_stock
            }
        })
        const items = Object.entries(stats)
            .map(([label, value]) => ({ label, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 3)

        const maxValue = Math.max(...items.map(i => i.value), 10) // Min scale 10
        return items.map(item => ({
            ...item,
            percent: (item.value / maxValue) * 100
        }))
    }, [products])

    const stockPercentages = useMemo(() => {
        // Normalize bars relative to the largest stock item (min 1kg scale)
        const maxVal = Math.max(rawSilverItem, wastageItem, 1000)
        return {
            raw: (rawSilverItem / maxVal) * 100,
            wastage: (wastageItem / maxVal) * 100
        }
    }, [rawSilverItem, wastageItem])

    const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
        try {
            // Optimistic update
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus as any } : o))
            await updateOrderStatus(id, newStatus)
        } catch (err) {
            console.error(err)
            // Revert on error (could implement revert logic here)
            loadData() // Reload to be safe
        }
    }, [loadData])


    return (
        <div style={PAGE_CONTAINER_STYLE}>
            {/* Header */}
            <header style={HEADER_STYLE}>
                <h1 style={H1_STYLE}>Dashboard</h1>
                <p style={SUBTITLE_STYLE}>
                    Welcome back! Here's your business overview. / व्यापार की स्थिति
                </p>
            </header>

            {/* Top Stat Row */}
            <div style={GRID_STYLE}>
                {/* 1. Total Silver Stock */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Total Silver Stock<br /><small style={{ color: 'var(--color-text-muted)' }}>कुल चांदी स्टॉक</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><Scale size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>{stats.totalSilverStockKg.toFixed(1)} kg</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>+2.3 kg this month</div>
                </CardSkeleton>

                {/* 2. Today's Rate */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Today's Rate<br /><small style={{ color: 'var(--color-text-muted)' }}>आज का भाव</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><TrendingUp size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>₹{stats.currentRateKg.toLocaleString()}/kg</div>
                    <div style={{
                        fontSize: 'var(--text-xs)',
                        color: stats.rateChangePercent >= 0 ? 'var(--color-success)' : '#ef4444',
                        fontWeight: 'var(--font-semibold)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        {stats.rateChangePercent >= 0 ? '▲' : '▼'}
                        ₹{Math.abs(stats.rateChangeAmt).toLocaleString()} ({Math.abs(stats.rateChangePercent).toFixed(1)}%)
                    </div>
                </CardSkeleton>

                {/* 3. Pending Job Work */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Pending Job Work<br /><small style={{ color: 'var(--color-text-muted)' }}>पेंडिंग जॉब वर्क</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-bg)' }}><Wrench size={20} color="var(--color-text-secondary)" /></div>
                    </div>
                    <div style={cardValueStyle}>{stats.pendingCount} Orders</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-medium)' }}>Worth ₹{stats.pendingValue.toLocaleString()}</div>
                </CardSkeleton>

                {/* 4. Monthly Sales */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Monthly Sales<br /><small style={{ color: 'var(--color-text-muted)' }}>मासिक बिक्री</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><ShoppingCart size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>₹{stats.monthlySales.toLocaleString()}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 'var(--font-semibold)' }}>+18% from last month</div>
                </CardSkeleton>

                {/* 5. GST Payable */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>GST Payable<br /><small style={{ color: 'var(--color-text-muted)' }}>GST देय</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><FileText size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>₹{stats.gstPayable.toLocaleString()}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-medium)' }}>Due by 20th {new Date().toLocaleString('default', { month: 'short' })}</div>
                </CardSkeleton>

                {/* 6. Products Made */}
                <CardSkeleton loading={loading}>
                    <div style={cardHeaderStyle}>
                        <span>Products Made<br /><small style={{ color: 'var(--color-text-muted)' }}>उत्पादन</small></span>
                        <div style={{ ...iconBoxStyle, background: 'var(--color-warning-light)' }}><Package size={20} color="var(--color-warning)" /></div>
                    </div>
                    <div style={cardValueStyle}>{stats.productsMadeCount} pcs</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: 'var(--font-medium)' }}>This month</div>
                </CardSkeleton>
            </div>

            {/* Main Content Grid */}
            <div style={MAIN_GRID_STYLE}>

                {/* Left: Recent Orders */}
                <div style={TABLE_CONTAINER_STYLE}>
                    <div style={TABLE_HEADER_BAR_STYLE}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{t('recent_orders', settings.language as any)}</h3>
                        <Link to="/orders" style={VIEW_ALL_LINK_STYLE}>
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
                                {recentOrders.map((order) => {
                                    const firstItem = order.items?.[0]
                                    return (
                                        <tr key={order.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                                            <td style={tdStyle}>{order.order_number}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{order.customer_name}</td>
                                            <td style={tdStyle}>{firstItem?.description || 'N/A'}</td>
                                            <td style={tdStyle}>{firstItem?.quantity || 0}</td>
                                            <td style={tdStyle}><TypeBadge type={order.material_type} /></td>
                                            <td style={tdStyle}>
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.75rem',
                                                        fontWeight: 600,
                                                        border: '1px solid #e2e8f0',
                                                        background: order.status === 'Completed' ? '#f0fdf4' : order.status === 'Pending' ? '#fffbeb' : '#f1f5f9',
                                                        color: order.status === 'Completed' ? '#16a34a' : order.status === 'Pending' ? '#d97706' : '#475569',
                                                        outline: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="In Progress">In Progress</option>
                                                    <option value="Completed">Completed</option>
                                                    <option value="Cancelled">Cancelled</option>
                                                </select>
                                            </td>
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
                            <button style={actionButtonStyle} onClick={() => setShowGstCalc(true)}>
                                <Calculator size={20} color="#64748b" />
                                <span>GST Calculator<br /><small style={{ color: '#94a3b8', fontSize: '0.7rem' }}>GST कैलकुलेटर</small></span>
                            </button>
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
                                value={`${(rawSilverItem / 1000).toFixed(1)} kg`}
                                percent={stockPercentages.raw}
                                color="#f59e0b"
                            />
                            {/* Wastage */}
                            <StockItem
                                label="Wastage Silver"
                                hindiLabel="वेस्टेज चांदी"
                                value={`${(wastageItem / 1000).toFixed(1)} kg`}
                                percent={stockPercentages.wastage}
                                color="#94a3b8"
                            />
                            {/* Dynamic Product Categories */}
                            {productStats.length > 0 ? (
                                productStats.map((stat, i) => (
                                    <StockItem
                                        key={stat.label}
                                        label={stat.label}
                                        hindiLabel={`${stat.label} Stock`} // Fallback label
                                        value={`${stat.value} pcs`}
                                        percent={stat.percent}
                                        color={['#1e293b', '#3b82f6', '#8b5cf6'][i % 3]}
                                    />
                                ))
                            ) : (
                                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>No products in stock</div>
                            )}
                        </div>
                    </div>

                </div>

            </div>
            {showGstCalc && <GstCalculatorModal onClose={() => setShowGstCalc(false)} />}
        </div >
    )
}

// Keep expensive style objects outside to prevent recreation
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

const CardSkeleton = memo(({ loading, children }: { loading: boolean, children: React.ReactNode }) => {
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
});
