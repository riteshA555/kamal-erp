import { useState, useEffect } from 'react'
import { getKarigars, getKarigarWorkHistory, recordKarigarPayment, getKarigarStats, Karigar, KarigarWorkRecord } from '../../../services/karigarService'
import { CheckCircle2, Wallet, AlertCircle, Coins, ArrowRight } from 'lucide-react'

export default function KarigarSettlement() {
    const [karigars, setKarigars] = useState<Karigar[]>([])
    const [selectedKarigarId, setSelectedKarigarId] = useState('')

    // Stats
    const [stats, setStats] = useState({ pendingWork: 0, advance: 0 })
    const [records, setRecords] = useState<KarigarWorkRecord[]>([])

    // Payment Form
    const [amount, setAmount] = useState('')
    const [mode, setMode] = useState('Cash')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        loadKarigars()
    }, [])

    useEffect(() => {
        if (selectedKarigarId) {
            loadStats()
        } else {
            setStats({ pendingWork: 0, advance: 0 })
            setRecords([])
        }
    }, [selectedKarigarId])

    const loadKarigars = async () => {
        const data = await getKarigars()
        setKarigars(data)
    }

    const loadStats = async () => {
        setLoading(true)
        try {
            const [sData, rData] = await Promise.all([
                getKarigarStats(selectedKarigarId),
                getKarigarWorkHistory(selectedKarigarId) // Defaults to current month but we might want ALL pending?
                // Actually filter to just pending for the list view
            ])
            setStats(sData)

            // Filter locally for Pending display
            setRecords(rData.filter(r => r.payment_status === 'PENDING'))
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || Number(amount) <= 0) return alert("Enter valid amount")

        if (!confirm(`Confirm Payment of ₹${amount}? System will auto-settle oldest dues.`)) return

        try {
            await recordKarigarPayment(selectedKarigarId, Number(amount), mode, date)
            setAmount('')
            loadStats()
            alert("Payment Recorded Successfully")
        } catch (err: any) {
            alert(err.message)
        }
    }

    const netPayable = stats.pendingWork - stats.advance

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '1.5rem' }}>Karigar Settlement</h1>

            {/* Selection */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>Select Karigar</label>
                <select
                    value={selectedKarigarId}
                    onChange={e => setSelectedKarigarId(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '0.8rem', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
                >
                    <option value="">-- Select Artisan --</option>
                    {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                </select>
            </div>

            {selectedKarigarId && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>

                    {/* Left: Stats & Pay */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: '#fff1f2', padding: '1.25rem', borderRadius: '16px' }}>
                                <div style={{ color: '#e11d48', fontWeight: 600, fontSize: '0.85rem' }}>Pending Work</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#be123c' }}>₹{stats.pendingWork.toLocaleString()}</div>
                            </div>
                            <div style={{ background: '#ecfdf5', padding: '1.25rem', borderRadius: '16px' }}>
                                <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.85rem' }}>Advance Balance</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#047857' }}>₹{stats.advance.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* Net Payable */}
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>Net Payable</div>
                                <div style={{ fontSize: '2rem', fontWeight: 800, color: netPayable > 0 ? '#1e293b' : '#059669' }}>
                                    {netPayable > 0 ? `₹${netPayable.toLocaleString()}` : `(Advance: ₹${Math.abs(netPayable).toLocaleString()})`}
                                </div>
                            </div>
                            {netPayable > 0 && <div style={{ padding: '0.5rem 1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '50px', fontWeight: 700, fontSize: '0.8rem' }}>DUE NOW</div>}
                        </div>

                        {/* Payment Form */}
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
                                <Wallet size={20} /> Record Payment
                            </h3>
                            <form onSubmit={handlePayment} style={{ display: 'grid', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Amount (₹)</label>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="Enter Amount"
                                        style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 600 }}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Mode</label>
                                        <select
                                            value={mode}
                                            onChange={e => setMode(e.target.value)}
                                            style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white' }}
                                        >
                                            <option>Cash</option>
                                            <option>Bank Transfer</option>
                                            <option>UPI</option>
                                        </select>
                                    </div>
                                </div>
                                <button
                                    type="submit"
                                    style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                                >
                                    <Coins size={18} /> Make Payment
                                </button>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
                                    Excess amount will differ to Advance Balance.
                                </p>
                            </form>
                        </div>

                    </div>

                    {/* Right: Record List */}
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', height: 'fit-content' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc', fontWeight: 600, color: '#334155' }}>
                            Unpaid Work Records ({records.length})
                        </div>
                        <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
                            {records.length === 0 ? (
                                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No pending records.</div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                    <tbody>
                                        {records.map(r => (
                                            <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ fontWeight: 600, marginBottom: '0.2rem' }}>{r.description}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{new Date(r.work_date).toLocaleDateString()}</div>
                                                </td>
                                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{r.quantity} x {r.rate}</div>
                                                    <div style={{ fontWeight: 600 }}>₹{Number(r.amount).toLocaleString()}</div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                </div>
            )}
        </div>
    )
}
