import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOrders, deleteOrder, deleteOrders } from '../services/orderService'
import { Order } from '../types'
import { Plus, Trash2, CheckSquare, Square, X } from 'lucide-react'
import { formatIndianRupees } from '../utils/formatters'

export default function OrderList() {
    const [orders, setOrders] = useState<Order[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)
    const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set())
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    useEffect(() => {
        loadOrders()
    }, [])

    const loadOrders = async () => {
        // Only show loading on first load
        if (orders.length === 0) {
            setLoading(true)
        }
        try {
            const data = await getOrders()
            setOrders(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (orderId: string, orderNumber: string) => {
        if (!confirm(`Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`)) {
            return
        }

        try {
            setDeleting(orderId)
            await deleteOrder(orderId)
            await loadOrders() // Reload orders after deletion
        } catch (err: any) {
            alert(`Failed to delete order: ${err.message}`)
        } finally {
            setDeleting(null)
        }
    }

    // --- BULK ACTION HANDLERS ---
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allIds = new Set(orders.map(o => o.id))
            setSelectedOrders(allIds)
        } else {
            setSelectedOrders(new Set())
        }
    }

    const handleSelectOne = (orderId: string, checked: boolean) => {
        const newSelected = new Set(selectedOrders)
        if (checked) newSelected.add(orderId)
        else newSelected.delete(orderId)
        setSelectedOrders(newSelected)
    }

    const handleBulkDelete = async () => {
        const count = selectedOrders.size
        if (count === 0) return

        if (!confirm(`Are you sure you want to delete ${count} orders? This action cannot be undone.`)) {
            return
        }

        setIsBulkDeleting(true)
        try {
            await deleteOrders(Array.from(selectedOrders))
            await loadOrders()
            setSelectedOrders(new Set())
        } catch (err: any) {
            alert(`Failed to delete orders: ${err.message}`)
        } finally {
            setIsBulkDeleting(false)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Orders</h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedOrders.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                background: '#fee2e2', color: '#dc2626',
                                padding: '0.6em 1.2em', borderRadius: '8px',
                                border: '1px solid #fecaca', cursor: 'pointer', fontWeight: 600
                            }}
                        >
                            <Trash2 size={18} />
                            Delete Selected ({selectedOrders.size})
                        </button>
                    )}
                    <Link
                        to="/orders/new"
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            background: 'var(--color-primary)', color: 'white',
                            padding: '0.6em 1.2em', borderRadius: '8px',
                            textDecoration: 'none', fontWeight: 500
                        }}
                    >
                        <Plus size={18} />
                        New Order
                    </Link>
                </div>
            </div>

            {/* Removed loading message - show empty state instantly */}
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {!loading && !error && orders.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    No orders found. Create your first one!
                </div>
            )}

            {orders.length > 0 && (
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                                    <input
                                        type="checkbox"
                                        checked={selectedOrders.size === orders.length && orders.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                    />
                                </th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Order #</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Customer</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Material</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Total</th>
                                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => {
                                const total = order.total_amount || 0
                                const isSelected = selectedOrders.has(order.id)
                                return (
                                    <tr key={order.id} style={{ borderBottom: '1px solid var(--color-border)', background: isSelected ? '#f0f9ff' : 'transparent' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={(e) => handleSelectOne(order.id, e.target.checked)}
                                                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                                            />
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>{order.order_number}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>{order.order_date}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>{order.customer_name}</td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: 600,
                                                    background: order.material_type === 'CLIENT' ? 'var(--color-info-light)' : 'var(--color-success-light)',
                                                    color: order.material_type === 'CLIENT' ? 'var(--color-info)' : 'var(--color-success)'
                                                }}>
                                                    {order.material_type}
                                                </span>
                                                {order.gst_enabled && (
                                                    <span style={{
                                                        padding: '0.1rem 0.4rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.65rem',
                                                        background: 'var(--color-primary-pale)',
                                                        color: 'var(--color-primary)',
                                                        border: '1px solid var(--color-primary-light)'
                                                    }}>GST</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                                            ₹{formatIndianRupees(total)}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDelete(order.id, String(order.order_number))}
                                                disabled={deleting === order.id}
                                                style={{
                                                    background: deleting === order.id ? 'var(--color-border)' : 'var(--color-error-light)',
                                                    color: deleting === order.id ? 'var(--color-text-secondary)' : 'var(--color-error)',
                                                    border: 'none',
                                                    padding: '0.4rem 0.6rem',
                                                    borderRadius: '6px',
                                                    cursor: deleting === order.id ? 'not-allowed' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (deleting !== order.id) {
                                                        e.currentTarget.style.background = '#fecaca'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (deleting !== order.id) {
                                                        e.currentTarget.style.background = '#fee2e2'
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                {deleting === order.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
