import { useState, useEffect, useCallback } from 'react'
import { getExpenses, createExpense, deleteExpense, Expense } from '../services/expenseService'
import { Plus, IndianRupee, Calendar, FileText, Trash2 } from 'lucide-react'
import { formatIndianRupees } from '../utils/formatters'

export default function ExpenseManager() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [error, setError] = useState('')
    const [deleting, setDeleting] = useState<string | null>(null)

    // Form State
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        head: '',
        amount: '',
        notes: '',
        gst_enabled: false,
        gst_rate: '3',
        vendor_name: '',
        invoice_number: ''
    })

    useEffect(() => {
        loadExpenses()
    }, [])

    const loadExpenses = useCallback(async () => {
        try {
            // Only show loading on first load when there's no data
            if (expenses.length === 0) {
                setLoading(true)
            }
            const data = await getExpenses()
            setExpenses(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [expenses.length])

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        if (!formData.head || !formData.amount) {
            setError('Please fill required fields')
            return
        }

        try {
            await createExpense({
                date: formData.date,
                head: formData.head,
                amount: Number(formData.amount),
                notes: formData.notes,
                gst_enabled: formData.gst_enabled,
                gst_rate: formData.gst_enabled ? Number(formData.gst_rate) : 0,
                gst_amount: formData.gst_enabled ? (Number(formData.amount) * Number(formData.gst_rate) / (100 + Number(formData.gst_rate))) : 0,
                vendor_name: formData.vendor_name,
                invoice_number: formData.invoice_number
            })
            setFormData({
                date: new Date().toISOString().split('T')[0],
                head: '',
                amount: '',
                notes: '',
                gst_enabled: false,
                gst_rate: '3',
                vendor_name: '',
                invoice_number: ''
            })
            setIsAdding(false)
            loadExpenses()
        } catch (err: any) {
            setError(err.message)
        }
    }, [formData, loadExpenses])

    const handleDelete = async (expenseId: string, expenseHead: string) => {
        if (!confirm(`Are you sure you want to delete expense "${expenseHead}"? This action cannot be undone.`)) {
            return
        }

        try {
            setDeleting(expenseId)
            await deleteExpense(expenseId)
            await loadExpenses()
        } catch (err: any) {
            alert(`Failed to delete expense: ${err.message}`)
        } finally {
            setDeleting(null)
        }
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Expenses</h1>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: isAdding ? 'var(--color-text-secondary)' : 'var(--color-primary)',
                        color: 'white',
                        padding: '0.6em 1.2em',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    <Plus size={18} />
                    {isAdding ? 'Cancel' : 'Add Expense'}
                </button>
            </div>

            {error && <div style={{ background: 'var(--color-error-light)', color: 'var(--color-error)', padding: '1rem', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>{error}</div>}

            {isAdding && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Expense Head</label>
                            <input
                                type="text"
                                placeholder="e.g. Rent, Labour, Electricity"
                                value={formData.head}
                                onChange={e => setFormData({ ...formData, head: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Amount (Total ₹)</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                required
                            />
                        </div>

                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #f1f5f9', paddingTop: '1rem', marginTop: '0.5rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={formData.gst_enabled}
                                    onChange={e => setFormData({ ...formData, gst_enabled: e.target.checked })}
                                />
                                Include GST Details (for ITC)
                            </label>
                        </div>

                        {formData.gst_enabled && (
                            <>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Vendor Name</label>
                                    <input
                                        type="text"
                                        placeholder="Supplier name"
                                        value={formData.vendor_name}
                                        onChange={e => setFormData({ ...formData, vendor_name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Invoice Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. PUR/001"
                                        value={formData.invoice_number}
                                        onChange={e => setFormData({ ...formData, invoice_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>GST Rate (%)</label>
                                    <select
                                        value={formData.gst_rate}
                                        onChange={e => setFormData({ ...formData, gst_rate: e.target.value })}
                                    >
                                        <option value="3">3% (Silver)</option>
                                        <option value="5">5% (Labour/Other)</option>
                                        <option value="12">12%</option>
                                        <option value="18">18%</option>
                                    </select>
                                </div>
                            </>
                        )}
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Notes</label>
                            <input
                                type="text"
                                placeholder="Optional description"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <button type="submit" style={{ width: '100%', padding: '0.8rem' }}>Save Expense</button>
                        </div>
                    </form>
                </div>
            )}

            {loading && expenses.length === 0 ? (
                <p>Loading expenses...</p>
            ) : (
                <div style={{ overflowX: 'auto', background: 'white', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: 'var(--color-bg)', borderBottom: '1px solid var(--color-border)' }}>
                            <tr>
                                <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Head</th>
                                <th style={{ padding: '0.75rem 1rem' }}>Notes</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Amount</th>
                                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>No expenses recorded yet.</td></tr>
                            ) : (
                                expenses.map(exp => (
                                    <tr key={exp.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '0.75rem 1rem' }}>{exp.date}</td>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 500 }}>{exp.head}</td>
                                        <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)' }}>{exp.notes || '-'}</td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 600 }}>
                                            ₹{formatIndianRupees(Number(exp.amount))}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                                            <button
                                                onClick={() => handleDelete(exp.id, exp.head)}
                                                disabled={deleting === exp.id}
                                                style={{
                                                    background: deleting === exp.id ? 'var(--color-border)' : 'var(--color-error-light)',
                                                    color: deleting === exp.id ? 'var(--color-text-secondary)' : 'var(--color-error)',
                                                    border: 'none',
                                                    padding: '0.4rem 0.6rem',
                                                    borderRadius: '6px',
                                                    cursor: deleting === exp.id ? 'not-allowed' : 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '0.3rem',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 500,
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (deleting !== exp.id) {
                                                        e.currentTarget.style.background = '#fecaca'
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (deleting !== exp.id) {
                                                        e.currentTarget.style.background = '#fee2e2'
                                                    }
                                                }}
                                            >
                                                <Trash2 size={14} />
                                                {deleting === exp.id ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
