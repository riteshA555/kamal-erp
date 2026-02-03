import { useState, useEffect } from 'react'
import { getLiabilityLedgers, createLedger, getCustomerStatement, recordPaymentOut, deleteLedger } from '../services/accountingService'
import { Plus, Search, UserMinus, History, Trash2, Wallet } from 'lucide-react'
// import { showToast } from '../utils/toast' // Commented out missing import

export default function VendorMaster() {
    // State
    const [vendors, setVendors] = useState<{ id: string, name: string }[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [newVendorName, setNewVendorName] = useState('')

    // Ledger View State
    const [selectedVendor, setSelectedVendor] = useState('')
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Payment Out State
    const [showPayModal, setShowPayModal] = useState(false)
    const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', note: '' })

    useEffect(() => {
        loadVendors()
    }, [])

    useEffect(() => {
        if (selectedVendor) {
            fetchStatement(selectedVendor)
        } else {
            setTransactions([])
        }
    }, [selectedVendor])

    const loadVendors = async () => {
        try {
            const data = await getLiabilityLedgers()
            setVendors(data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreateVendor = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            await createLedger(newVendorName, 'LIABILITY')
            setNewVendorName('')
            setIsAdding(false)
            loadVendors()
            alert('Vendor Created Successfully!')
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleDeleteVendor = async () => {
        if (!selectedVendor) return
        const vendor = vendors.find(v => v.name === selectedVendor)
        if (!vendor) return

        if (!confirm(`Are you sure you want to delete ${selectedVendor}?`)) return

        try {
            await deleteLedger(vendor.id)
            alert('Vendor Deleted Successfully')
            setSelectedVendor('')
            loadVendors()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const fetchStatement = async (vendorName: string) => {
        setLoading(true)
        try {
            const data = await getCustomerStatement(vendorName)
            setTransactions(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePaymentOut = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVendor || !payForm.amount) return

        try {
            const vendor = vendors.find(v => v.name === selectedVendor)
            if (!vendor) return

            await recordPaymentOut(
                vendor.id,
                Number(payForm.amount),
                payForm.mode,
                payForm.note
            )

            setPayForm({ amount: '', mode: 'Cash', note: '' })
            setShowPayModal(false)
            fetchStatement(selectedVendor)
            alert("Payment Recorded Successfully")
        } catch (err: any) {
            alert(err.message)
        }
    }

    // Calculate Balances
    // For Liability: Credit is Bad (We Owe), Debit is Good (We Paid).
    // Balance = Credits - Debits
    const totalPurchased = transactions.reduce((sum, t) => sum + Number(t.credit), 0) // We bought on credit
    const totalPaid = transactions.reduce((sum, t) => sum + Number(t.debit), 0) // We paid them
    const balance = totalPurchased - totalPaid

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Vendor Master (Suppliers)</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b' }}>Manage Creditors & Accounts Payable</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {selectedVendor && (
                        <button
                            onClick={() => setShowPayModal(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                        >
                            <Wallet size={18} /> Pay Vendor
                        </button>
                    )}
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' }}
                    >
                        <Plus size={18} /> Add Vendor
                    </button>
                </div>
            </div>

            {isAdding && (
                <div style={{ marginBottom: '1.5rem', padding: '1.5rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Vendor Name</label>
                        <input
                            value={newVendorName}
                            onChange={e => setNewVendorName(e.target.value)}
                            placeholder="e.g. Ramesh Silver House"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                            autoFocus
                        />
                    </div>
                    <button onClick={handleCreateVendor} style={{ padding: '0.8rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Save Vendor
                    </button>
                    <button onClick={() => setIsAdding(false)} style={{ padding: '0.8rem 1.5rem', background: '#f1f5f9', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                        Cancel
                    </button>
                </div>
            )}

            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Select Vendor to View Ledger</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                            <select
                                value={selectedVendor}
                                onChange={e => setSelectedVendor(e.target.value)}
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
                                <option value="">-- Select a Vendor --</option>
                                {vendors.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
                            </select>
                        </div>
                        {selectedVendor && (
                            <button
                                onClick={handleDeleteVendor}
                                style={{ padding: '0 1.25rem', background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {selectedVendor && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <SummaryCard title="Total Purchased (Credit)" value={totalPurchased} color="#eff6ff" textColor="#3b82f6" />
                        <SummaryCard title="Total Paid" value={totalPaid} color="#ecfdf5" textColor="#10b981" />
                        <SummaryCard title="Pending Payable" value={balance} color="#fff1f2" textColor="#e11d48" highlight />
                    </div>

                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid var(--color-border)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid var(--color-border)' }}>
                                <tr>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Description</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Purchased (Cr)</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Paid (Dr)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No transactions found.</td></tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={tdStyle}>{new Date(t.date).toLocaleDateString()}</td>
                                            <td style={{ ...tdStyle, fontWeight: 500 }}>{t.description}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: t.credit > 0 ? '#e11d48' : '#cbd5e1' }}>
                                                {t.credit > 0 ? `₹${Number(t.credit).toLocaleString()} ` : '-'}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: t.debit > 0 ? '#10b981' : '#cbd5e1' }}>
                                                {t.debit > 0 ? `₹${Number(t.debit).toLocaleString()} ` : '-'}
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
                        <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 700, marginBottom: '1.5rem' }}>Make Payment to Vendor</h2>
                        <form onSubmit={handlePaymentOut} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Amount Paid (₹)</label>
                                <input
                                    type="number"
                                    value={payForm.amount}
                                    onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                                    style={inputStyle}
                                    required
                                    autoFocus
                                    placeholder="Enter amount"
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
                                    placeholder="e.g. Bill #123 settlement"
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '10px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Save Payment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
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

function SummaryCard({ title, value, color, textColor, highlight }: any) {
    return (
        <div style={{ background: color, padding: '1.25rem', borderRadius: '16px', border: highlight ? `2px solid ${textColor} ` : '1px solid transparent' }}>
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
