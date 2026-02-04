import { useState, useEffect } from 'react'
import { getAssetLedgers, createLedger, getCustomerStatement, recordPayment, deleteLedger } from '../../../services/accountingService'
import { sendEmail } from '../../../services/emailService'
import { getSettings } from '../../../services/settingsService'
import { CustomerSettings } from '../../../types/settings'
import { Plus, Search, Trash2, Wallet, MapPin, FileText, User, Phone, Briefcase, CreditCard, Mail } from 'lucide-react'

export default function CustomerMaster() {
    const [customers, setCustomers] = useState<any[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [settings, setSettings] = useState<CustomerSettings | null>(null)

    // Form State
    const [form, setForm] = useState({
        name: '',
        contact: '',
        address: '',
        gstNumber: '',
        creditLimit: '',
        paymentTerms: ''
    })

    // Ledger View State
    const [selectedCustomer, setSelectedCustomer] = useState('')
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Payment In State
    const [showPayModal, setShowPayModal] = useState(false)
    const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', note: '' })

    useEffect(() => {
        loadCustomers()
        loadSettings()
    }, [])

    useEffect(() => {
        if (selectedCustomer) fetchStatement(selectedCustomer)
        else setTransactions([])
    }, [selectedCustomer])

    const loadSettings = async () => {
        try {
            const s = await getSettings<CustomerSettings>('customer_settings')
            if (s) {
                setSettings(s)
                setForm(prev => ({
                    ...prev,
                    creditLimit: s.defaultCreditLimit.toString(),
                    paymentTerms: s.defaultPaymentTerms
                }))
            }
        } catch (err) {
            console.error(err)
        }
    }

    const loadCustomers = async () => {
        try {
            const data = await getAssetLedgers()
            setCustomers(data)
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) return alert('Name is required')

        try {
            await createLedger({
                name: form.name,
                type: 'ASSET',
                contact_info: form.contact,
                address: form.address,
                gst_number: form.gstNumber,
                credit_limit: Number(form.creditLimit),
                payment_terms: form.paymentTerms
            })

            // Reset but keep settings defaults
            setForm({
                name: '',
                contact: '',
                address: '',
                gstNumber: '',
                creditLimit: settings?.defaultCreditLimit.toString() || '',
                paymentTerms: settings?.defaultPaymentTerms || ''
            })
            setIsAdding(false)
            loadCustomers()
            alert('✅ Customer Created Successfully!')
        } catch (err: any) {
            alert('Error: ' + err.message)
        }
    }

    const handleDelete = async () => {
        if (!selectedCustomer) return
        const cust = customers.find(c => c.name === selectedCustomer)
        if (!cust) return
        if (!confirm(`Are you sure you want to delete ${selectedCustomer}?`)) return

        try {
            await deleteLedger(cust.id)
            alert('✅ Customer Deleted')
            setSelectedCustomer('')
            loadCustomers()
        } catch (err: any) {
            // Handle transaction error (force delete logic omitted for brevity but can be added)
            alert('Error: ' + err.message)
        }
    }

    const fetchStatement = async (name: string) => {
        setLoading(true)
        try {
            const data = await getCustomerStatement(name)
            setTransactions(data)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const handlePaymentIn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedCustomer || !payForm.amount) return

        try {
            const cust = customers.find(c => c.name === selectedCustomer)
            if (!cust) return

            await recordPayment(cust.id, Number(payForm.amount), payForm.mode, payForm.note)

            setPayForm({ amount: '', mode: 'Cash', note: '' })
            setShowPayModal(false)
            fetchStatement(selectedCustomer)
            alert("✅ Payment Received Successfully!")
        } catch (err: any) {
            alert('Error: ' + err.message)
        }
    }

    const handleSendStatement = async () => {
        if (!selectedCustomer) return
        const cust = customers.find(c => c.name === selectedCustomer)
        if (!cust) return

        let email = prompt('Enter customer email to send statement:', cust.contact_info?.includes('@') ? cust.contact_info : '')
        if (!email) return

        const balanceAmount = transactions.reduce((sum, t) => sum + Number(t.debit) - Number(t.credit), 0)

        try {
            const result = await sendEmail({
                to_email: email,
                to_name: cust.name,
                subject: `Statement of Account - ${cust.name}`,
                message: `Dear ${cust.name},\n\nYour current outstanding balance is ₹${balanceAmount.toLocaleString()}.\n\nPlease arrange for payment at your earliest convenience.\n\nRegards,\nKunal Kishore Puria`
            })

            if (result.success) {
                alert('✅ Statement Sent Successfully!')
            } else {
                alert('❌ ' + result.message)
            }
        } catch (err: any) {
            alert('Error: ' + err.message)
        }
    }

    // Totals
    const totalSales = transactions.reduce((sum, t) => sum + Number(t.debit), 0) // Debit to Customer = Sale
    const totalReceived = transactions.reduce((sum, t) => sum + Number(t.credit), 0) // Credit to Customer = Payment
    const balance = totalSales - totalReceived

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Customer Master</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b' }}>Manage Customers, Credit Limits & Receivables</p>
                </div>
                <button
                    onClick={() => setIsAdding(true)}
                    style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 700, display: 'flex', gap: '0.5rem', alignItems: 'center', cursor: 'pointer' }}
                >
                    <Plus size={18} /> Add Customer
                </button>
            </div>

            {isAdding && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginTop: 0 }}>Add New Customer</h3>
                    <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label style={labelStyle}>Customer Name</label>
                            <input type="text" style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. John Doe" required />
                        </div>
                        <div>
                            <label style={labelStyle}>Contact Info</label>
                            <input type="text" style={inputStyle} value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="Mobile Number" />
                        </div>
                        <div>
                            <label style={labelStyle}>Address</label>
                            <input type="text" style={inputStyle} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="City/Address" />
                        </div>
                        <div>
                            <label style={labelStyle}>GST Number (Optional)</label>
                            <input type="text" style={inputStyle} value={form.gstNumber} onChange={e => setForm({ ...form, gstNumber: e.target.value })} placeholder="GSTIN" />
                        </div>
                        <div>
                            <label style={labelStyle}>Credit Limit (₹)</label>
                            <div style={{ position: 'relative' }}>
                                <CreditCard size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                                <input type="number" style={{ ...inputStyle, paddingLeft: '30px' }} value={form.creditLimit} onChange={e => setForm({ ...form, creditLimit: e.target.value })} placeholder="Limit" />
                            </div>
                        </div>
                        <div>
                            <label style={labelStyle}>Payment Terms</label>
                            <select style={inputStyle} value={form.paymentTerms} onChange={e => setForm({ ...form, paymentTerms: e.target.value })}>
                                <option value="Net 7">Net 7 Days</option>
                                <option value="Net 15">Net 15 Days</option>
                                <option value="Net 30">Net 30 Days</option>
                                <option value="Immediate">Immediate</option>
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                            <button type="button" onClick={() => setIsAdding(false)} style={{ padding: '0.8rem 1.5rem', border: '1px solid #cbd5e1', background: 'white', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '0.8rem 2rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Customer</button>
                        </div>
                    </form>
                </div>
            )}

            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <Search color="#94a3b8" />
                    <select
                        value={selectedCustomer}
                        onChange={e => setSelectedCustomer(e.target.value)}
                        style={{ ...inputStyle, maxWidth: '400px' }}
                    >
                        <option value="">-- Select Customer to View --</option>
                        {customers.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                    {selectedCustomer && (
                        <>
                            <button onClick={() => setShowPayModal(true)} style={{ marginLeft: 'auto', background: '#22c55e', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }}><Wallet size={16} /> Receive Payment</button>
                            <button onClick={handleSendStatement} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', gap: '0.5rem' }}><Mail size={16} /> Email Statement</button>
                            <button onClick={handleDelete} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.6rem 1rem', borderRadius: '8px', cursor: 'pointer' }}><Trash2 size={16} /></button>
                        </>
                    )}
                </div>
            </div>

            {selectedCustomer && (
                <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <Card title="Total Sales (Udhari)" value={totalSales} color="#f0f9ff" textColor="#0369a1" />
                        <Card title="Total Received (Jama)" value={totalReceived} color="#f0fdf4" textColor="#15803d" />
                        <Card title="Current Balance (Baki)" value={balance} color="#fffbeb" textColor="#b45309" isBalance />
                    </div>

                    <div style={{ background: 'white', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>DATE</th>
                                    <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.8rem', color: '#64748b' }}>DESCRIPTION</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>DEBIT (SALE)</th>
                                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.8rem', color: '#64748b' }}>CREDIT (RCVD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No transactions found</td></tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '1rem', fontSize: '0.9rem' }}>{new Date(t.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.9rem', fontWeight: 500 }}>{t.description}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: t.debit > 0 ? '#0369a1' : '#cbd5e1' }}>{t.debit > 0 ? `₹${Number(t.debit).toLocaleString()}` : '-'}</td>
                                            <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600, color: t.credit > 0 ? '#15803d' : '#cbd5e1' }}>{t.credit > 0 ? `₹${Number(t.credit).toLocaleString()}` : '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {showPayModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '400px' }}>
                        <h3>Receive Payment from {selectedCustomer}</h3>
                        <form onSubmit={handlePaymentIn} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <input type="number" placeholder="Amount" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} style={inputStyle} autoFocus required />
                            <select value={payForm.mode} onChange={e => setPayForm({ ...payForm, mode: e.target.value })} style={inputStyle}>
                                <option>Cash</option>
                                <option>UPI</option>
                                <option>Bank Transfer</option>
                            </select>
                            <input type="text" placeholder="Note (Optional)" value={payForm.note} onChange={e => setPayForm({ ...payForm, note: e.target.value })} style={inputStyle} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.8rem', borderRadius: '8px', border: 'none', background: '#22c55e', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Received</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

const labelStyle = { display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.5rem' }
const inputStyle = { width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }

function Card({ title, value, color, textColor, isBalance }: any) {
    return (
        <div style={{ background: color, padding: '1.25rem', borderRadius: '14px', border: isBalance ? `1px solid ${textColor}` : 'none' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textColor, marginTop: '0.4rem' }}>₹{value?.toLocaleString()}</div>
        </div>
    )
}
