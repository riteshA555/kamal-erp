import { useState, useEffect } from 'react'
import { getCustomerStatement, getAssetLedgers, recordPayment } from '../services/accountingService'
import { Search, Plus, X, CheckCircle2 } from 'lucide-react'
import { formatIndianRupees } from '../utils/formatters'

export default function LedgerStatement() {
    // Data State
    const [customers, setCustomers] = useState<{ id: string, name: string }[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [transactions, setTransactions] = useState<any[]>([])

    // Date Filters
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0].substring(0, 8) + '01') // 1st of current month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

    // UI State
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [showPayModal, setShowPayModal] = useState(false)

    // Payment Form State
    const [payForm, setPayForm] = useState({
        amount: '',
        mode: 'Cash',
        note: ''
    })

    useEffect(() => {
        loadCustomers()
    }, [])

    useEffect(() => {
        if (selectedCustomer) {
            fetchStatement(selectedCustomer)
        } else {
            setTransactions([])
        }
    }, [selectedCustomer, startDate, endDate])

    const loadCustomers = async () => {
        try {
            const data = await getAssetLedgers()
            setCustomers(data)
        } catch (err) {
            console.error("Failed to load customers", err)
        }
    }

    const fetchStatement = async (custName: string) => {
        setLoading(true)
        setError('')
        try {
            const data = await getCustomerStatement(custName, startDate, endDate)
            setTransactions(data)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handlePaymentSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCustomer) return

        try {
            // Find ledger ID for selected name
            const customer = customers.find(c => c.name === selectedCustomer)
            if (!customer) throw new Error("Customer not found")

            await recordPayment(
                customer.id,
                Number(payForm.amount),
                payForm.mode,
                payForm.note
            )

            setShowPayModal(false)
            setPayForm({ amount: '', mode: 'Cash', note: '' })
            fetchStatement(selectedCustomer) // Refresh data
        } catch (err: any) {
            alert(err.message)
        }
    }

    const totalDebit = transactions.reduce((sum, t) => sum + Number(t.debit), 0)
    const totalCredit = transactions.reduce((sum, t) => sum + Number(t.credit), 0)
    const balance = totalDebit - totalCredit

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ margin: 0 }}>Customer Ledger</h1>
                {selectedCustomer && (
                    <button
                        onClick={() => setShowPayModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        <Plus size={18} /> Receive Payment
                    </button>
                )}
            </div>

            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Select Customer / ग्राहक चुनें</label>
                    <div style={{ position: 'relative' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                        <select
                            value={selectedCustomer}
                            onChange={e => setSelectedCustomer(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '0.8rem 1rem 0.8rem 2.8rem',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                fontSize: '1rem',
                                outline: 'none',
                                appearance: 'none',
                                background: 'white',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">-- Select a Customer --</option>
                            {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Date Filters */}
            {selectedCustomer && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={labelStyle}>Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={labelStyle}>End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                </div>
            )}

            {error && <div style={{ marginBottom: '1rem', padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px' }}>{error}</div>}

            {selectedCustomer && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <SummaryCard title="Total Billed" value={totalDebit} color="#eff6ff" textColor="#3b82f6" />
                        <SummaryCard title="Total Received" value={totalCredit} color="#ecfdf5" textColor="#10b981" />
                        <SummaryCard title="Current Balance (Pending)" value={balance} color="#fff7ed" textColor="#f97316" highlight />
                    </div>

                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                                <tr>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Description</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Debit (Dr)</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Credit (Cr)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No transactions found for this period.</td></tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={tdStyle}>{new Date(t.date).toLocaleDateString()}</td>
                                            <td style={{ ...tdStyle, fontWeight: 500 }}>{t.description}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: t.debit > 0 ? '#3b82f6' : '#cbd5e1' }}>
                                                {t.debit > 0 ? `₹${Number(t.debit).toLocaleString()}` : '-'}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: t.credit > 0 ? '#10b981' : '#cbd5e1', fontWeight: t.credit > 0 ? 600 : 400 }}>
                                                {t.credit > 0 ? `₹${Number(t.credit).toLocaleString()}` : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Payment Modal */}
            {showPayModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)'
                }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '20px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem' }}>Receive Payment</h2>
                        <form onSubmit={handlePaymentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Amount Received (₹)</label>
                                <input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                    style={inputStyle}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Payment Mode</label>
                                <select
                                    value={payForm.mode}
                                    onChange={e => setPayForm({ ...payForm, mode: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option>Cash</option>
                                    <option>Bank Transfer</option>
                                    <option>UPI</option>
                                    <option>Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Note (Optional)</label>
                                <input
                                    type="text"
                                    value={payForm.note}
                                    onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                                    style={inputStyle}
                                    placeholder="e.g. Cleared pending bill"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Save Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function SummaryCard({ title, value, color, textColor, highlight }: any) {
    return (
        <div style={{ background: color, padding: '1.25rem', borderRadius: '16px', border: highlight ? `2px solid ${textColor}` : '1px solid transparent' }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textColor }}>₹{value.toLocaleString('en-IN')}</div>
        </div>
    )
}

const thStyle: React.CSSProperties = {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700
}

const tdStyle: React.CSSProperties = {
    padding: '1rem',
    fontSize: '0.95rem',
    color: '#334155'
}

const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#475569'
}

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '1rem'
}
