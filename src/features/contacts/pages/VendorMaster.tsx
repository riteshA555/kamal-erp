import { useState, useEffect } from 'react'
import { getLiabilityLedgers, createLedger, getCustomerStatement, recordPaymentOut, deleteLedger } from '../../../services/accountingService'
import { createExpense } from '../../../services/expenseService'
import { Plus, Search, Trash2, Wallet, Phone, MapPin, FileText, ShoppingCart, X, CheckCircle2 } from 'lucide-react'

interface VendorDetails {
    name: string
    contact: string
    address: string
    vendorType: string
    gstNumber: string
}

export default function VendorMaster() {
    // State
    const [vendors, setVendors] = useState<{ id: string, name: string }[]>([])
    const [isAdding, setIsAdding] = useState(false)
    const [vendorForm, setVendorForm] = useState<VendorDetails>({
        name: '',
        contact: '',
        address: '',
        vendorType: 'Raw Material',
        gstNumber: ''
    })

    // Ledger View State
    const [selectedVendor, setSelectedVendor] = useState('')
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    // Payment Out State
    const [showPayModal, setShowPayModal] = useState(false)
    const [payForm, setPayForm] = useState({ amount: '', mode: 'Cash', note: '' })

    // Purchase Entry State
    const [showPurchaseModal, setShowPurchaseModal] = useState(false)
    const [purchaseForm, setPurchaseForm] = useState({
        amount: '',
        description: '',
        billNumber: '',
        gstAmount: ''
    })

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
        if (!vendorForm.name.trim()) {
            alert('कृपया Vendor का नाम डालें / Please enter vendor name')
            return
        }

        try {
            // Create vendor with full details
            await createLedger({
                name: vendorForm.name,
                type: 'LIABILITY',
                contact_info: `${vendorForm.contact} (${vendorForm.vendorType})`,
                address: vendorForm.address,
                gst_number: vendorForm.gstNumber
            })

            setVendorForm({
                name: '',
                contact: '',
                address: '',
                vendorType: 'Raw Material',
                gstNumber: ''
            })
            setIsAdding(false)
            loadVendors()
            alert('✅ Vendor Successfully Created!\n✅ वेंडर सफलतापूर्वक बनाया गया!')
        } catch (err: any) {
            alert('❌ Error: ' + err.message)
        }
    }

    const handleDeleteVendor = async () => {
        if (!selectedVendor) return
        const vendor = vendors.find(v => v.name === selectedVendor)
        if (!vendor) return

        if (!confirm(`⚠️ क्या आप ${selectedVendor} को delete करना चाहते हैं?\n\nAre you sure you want to delete ${selectedVendor}?`)) return

        try {
            // First try normal delete
            await deleteLedger(vendor.id)
            alert('✅ Vendor Deleted Successfully\n✅ वेंडर सफलतापूर्वक हटाया गया')
            setSelectedVendor('')
            loadVendors()
        } catch (err: any) {
            // If error contains "transaction", offer force delete
            if (err.message.includes('transaction') || err.message.includes('लेनदेन')) {
                const forceDelete = confirm(
                    `❌ ERROR: Vendor has existing transactions!\n\n` +
                    `${err.message}\n\n` +
                    `⚠️ FORCE DELETE WARNING:\n` +
                    `Do you want to delete this vendor AND ALL THEIR HISTORY?\n` +
                    `क्या आप इस वेंडर और इसके सारे पुराने रिकॉर्ड मिटाना चाहते हैं?\n\n` +
                    `Click OK to DELETE EVERYTHING.`
                )

                if (forceDelete) {
                    try {
                        await deleteLedger(vendor.id, true) // Pass true for force delete
                        alert('✅ Vendor and History Deleted Successfully!')
                        setSelectedVendor('')
                        loadVendors()
                    } catch (forceErr: any) {
                        alert('❌ Error: ' + forceErr.message)
                    }
                }
            } else {
                alert('❌ Error: ' + err.message)
            }
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
            alert("✅ Payment Recorded Successfully!\n✅ भुगतान सफलतापूर्वक दर्ज किया गया!")
        } catch (err: any) {
            alert('❌ Error: ' + err.message)
        }
    }

    const handlePurchaseEntry = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedVendor || !purchaseForm.amount) {
            alert('कृपया सभी जानकारी भरें / Please fill all details')
            return
        }

        try {
            const vendor = vendors.find(v => v.name === selectedVendor)
            if (!vendor) return

            const taxableAmount = Number(purchaseForm.amount)
            const gstAmount = Number(purchaseForm.gstAmount || 0)
            const totalAmount = taxableAmount + gstAmount
            const description = `Purchase: ${purchaseForm.description}${purchaseForm.billNumber ? ` (Bill #${purchaseForm.billNumber})` : ''}`

            // 1. Record in Ledger (Credit to Vendor - We owe them)
            await recordPaymentOut(vendor.id, -totalAmount, 'Purchase', description)

            // 2. Record in Expenses (Debit to Purchase/Expense - For GST & P&L)
            // Calculate approximate GST rate
            const calculatedRate = taxableAmount > 0 ? (gstAmount / taxableAmount) * 100 : 0

            await createExpense({
                date: new Date().toISOString().split('T')[0],
                head: `Purchase: ${selectedVendor}`,
                amount: taxableAmount, // Expense amount is usually taxable value
                notes: description,
                gst_enabled: true, // Always enable to show in GST report
                gst_rate: Math.round(calculatedRate), // Round to nearest integer (e.g. 3, 5, 12, 18, 28)
                gst_amount: gstAmount,
                invoice_number: purchaseForm.billNumber || undefined,
                vendor_name: selectedVendor
            })

            setPurchaseForm({ amount: '', description: '', billNumber: '', gstAmount: '' })
            setShowPurchaseModal(false)
            fetchStatement(selectedVendor)
            alert("✅ Purchase Entry Recorded!\n1. Vendor Ledger Updated (Payable added)\n2. GST Input Credit Added (in GST Report)")
        } catch (err: any) {
            alert('❌ Error: ' + err.message)
        }
    }

    // Calculate Balances
    const totalPurchased = transactions.reduce((sum, t) => sum + Number(t.credit), 0)
    const totalPaid = transactions.reduce((sum, t) => sum + Number(t.debit), 0)
    const balance = totalPurchased - totalPaid

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem' }}>Vendor Master (Suppliers)</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>विक्रेता प्रबंधन | Manage Suppliers & Payables</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {selectedVendor && (
                        <>
                            <button
                                onClick={() => setShowPurchaseModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <ShoppingCart size={18} /> Purchase Entry
                            </button>
                            <button
                                onClick={() => setShowPayModal(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.75rem 1.25rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                <Wallet size={18} /> Pay Vendor
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setIsAdding(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        <Plus size={18} /> Add Vendor
                    </button>
                </div>
            </div>

            {/* Add Vendor Form */}
            {isAdding && (
                <div style={{
                    marginBottom: '1.5rem',
                    padding: '1.5rem',
                    background: 'white',
                    borderRadius: '16px',
                    border: '2px solid #3b82f6',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ margin: '0 0 1rem 0', color: '#1e293b' }}>➕ Add New Vendor / नया विक्रेता जोड़ें</h3>
                    <form onSubmit={handleCreateVendor}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>
                                    <span style={{ color: '#ef4444' }}>*</span> Vendor Name / नाम
                                </label>
                                <input
                                    value={vendorForm.name}
                                    onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })}
                                    placeholder="e.g. Rajesh Bullion Traders"
                                    style={inputStyle}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>
                                    <Phone size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Contact Number / मोबाइल
                                </label>
                                <input
                                    value={vendorForm.contact}
                                    onChange={e => setVendorForm({ ...vendorForm, contact: e.target.value })}
                                    placeholder="e.g. 9876543210"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Vendor Type / प्रकार</label>
                                <select
                                    value={vendorForm.vendorType}
                                    onChange={e => setVendorForm({ ...vendorForm, vendorType: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option>Raw Material</option>
                                    <option>Packaging</option>
                                    <option>Tools & Equipment</option>
                                    <option>Office Supplies</option>
                                    <option>Services</option>
                                    <option>Other</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={labelStyle}>
                                    <MapPin size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                    Address / पता
                                </label>
                                <input
                                    value={vendorForm.address}
                                    onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })}
                                    placeholder="e.g. Sarafa Bazaar, Indore"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>GST Number (Optional)</label>
                                <input
                                    value={vendorForm.gstNumber}
                                    onChange={e => setVendorForm({ ...vendorForm, gstNumber: e.target.value })}
                                    placeholder="e.g. 22AAAAA0000A1Z5"
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                style={{
                                    padding: '0.8rem 1.5rem',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '10px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    padding: '0.8rem 1.5rem',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                ✅ Save Vendor
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Vendor Selection */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '1.5rem' }}>
                <div style={{ position: 'relative' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '0.5rem' }}>
                        Select Vendor to View Ledger / विक्रेता चुनें
                    </label>
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
                                style={{
                                    padding: '0 1.25rem',
                                    background: '#fef2f2',
                                    color: '#ef4444',
                                    border: '1px solid #fee2e2',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <Trash2 size={18} /> Delete
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Ledger View */}
            {selectedVendor && (
                <>
                    {/* Summary Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <SummaryCard
                            title="Total Purchased (उधार लिया)"
                            value={totalPurchased}
                            color="#fff1f2"
                            textColor="#e11d48"
                            icon="📦"
                        />
                        <SummaryCard
                            title="Total Paid (भुगतान किया)"
                            value={totalPaid}
                            color="#ecfdf5"
                            textColor="#10b981"
                            icon="💰"
                        />
                        <SummaryCard
                            title="Pending Payable (बाकी)"
                            value={balance}
                            color="#fef3c7"
                            textColor="#f59e0b"
                            highlight
                            icon="⚠️"
                        />
                    </div>

                    {/* Transactions Table */}
                    <div style={{ overflowX: 'auto', background: 'white', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <tr>
                                    <th style={thStyle}>Date / तारीख</th>
                                    <th style={thStyle}>Description / विवरण</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Purchased (Cr) / खरीद</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Paid (Dr) / भुगतान</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                            <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                                            <div>No transactions found / कोई लेनदेन नहीं मिला</div>
                                        </td>
                                    </tr>
                                ) : (
                                    transactions.map(t => (
                                        <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={tdStyle}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                                            <td style={{ ...tdStyle, fontWeight: 500 }}>{t.description}</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: t.credit > 0 ? '#e11d48' : '#cbd5e1', fontWeight: t.credit > 0 ? 700 : 400 }}>
                                                {t.credit > 0 ? `₹${Number(t.credit).toLocaleString('en-IN')}` : '-'}
                                            </td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: t.debit > 0 ? '#10b981' : '#cbd5e1', fontWeight: t.debit > 0 ? 700 : 400 }}>
                                                {t.debit > 0 ? `₹${Number(t.debit).toLocaleString('en-IN')}` : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            {/* Purchase Entry Modal */}
            {showPurchaseModal && (
                <Modal onClose={() => setShowPurchaseModal(false)}>
                    <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        📦 Purchase Entry / खरीद दर्ज करें
                    </h2>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                        Vendor: <strong>{selectedVendor}</strong>
                    </p>
                    <form onSubmit={handlePurchaseEntry} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>
                                <span style={{ color: '#ef4444' }}>*</span> Purchase Amount / राशि (₹)
                            </label>
                            <input
                                type="number"
                                value={purchaseForm.amount}
                                onChange={e => setPurchaseForm({ ...purchaseForm, amount: e.target.value })}
                                style={inputStyle}
                                required
                                autoFocus
                                placeholder="Enter amount"
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>
                                <span style={{ color: '#ef4444' }}>*</span> Description / विवरण
                            </label>
                            <input
                                type="text"
                                value={purchaseForm.description}
                                onChange={e => setPurchaseForm({ ...purchaseForm, description: e.target.value })}
                                style={inputStyle}
                                required
                                placeholder="e.g. Gold 10gm, Silver 50gm"
                            />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div>
                                <label style={labelStyle}>Bill Number (Optional)</label>
                                <input
                                    type="text"
                                    value={purchaseForm.billNumber}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, billNumber: e.target.value })}
                                    style={inputStyle}
                                    placeholder="e.g. INV-123"
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>GST Amount (Input Tax Credit)</label>
                                <input
                                    type="number"
                                    value={purchaseForm.gstAmount}
                                    onChange={e => setPurchaseForm({ ...purchaseForm, gstAmount: e.target.value })}
                                    style={inputStyle}
                                    placeholder="0"
                                />
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
                                    💡 This GST you can claim back (Input Credit)
                                </div>
                            </div>
                        </div>
                        {purchaseForm.amount && (
                            <div style={{
                                padding: '1rem',
                                background: '#eff6ff',
                                borderRadius: '10px',
                                border: '1px solid #bfdbfe'
                            }}>
                                <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.25rem' }}>Total Amount:</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>
                                    ₹{(Number(purchaseForm.amount) + Number(purchaseForm.gstAmount || 0)).toLocaleString('en-IN')}
                                </div>
                            </div>
                        )}
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowPurchaseModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.8rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: '0.8rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#f59e0b',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                ✅ Save Purchase
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Payment Modal */}
            {showPayModal && (
                <Modal onClose={() => setShowPayModal(false)}>
                    <h2 style={{ marginTop: 0, fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                        💰 Make Payment / भुगतान करें
                    </h2>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#64748b', fontSize: '0.9rem' }}>
                        Vendor: <strong>{selectedVendor}</strong> | Pending: <strong style={{ color: '#f59e0b' }}>₹{balance.toLocaleString('en-IN')}</strong>
                    </p>
                    <form onSubmit={handlePaymentOut} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={labelStyle}>
                                <span style={{ color: '#ef4444' }}>*</span> Amount Paid / राशि (₹)
                            </label>
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
                            <label style={labelStyle}>Payment Mode / भुगतान का तरीका</label>
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
                            <label style={labelStyle}>Note (Optional) / टिप्पणी</label>
                            <input
                                type="text"
                                value={payForm.note}
                                onChange={e => setPayForm({ ...payForm, note: e.target.value })}
                                style={inputStyle}
                                placeholder="e.g. Bill #123 settlement"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setShowPayModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '0.8rem',
                                    borderRadius: '10px',
                                    border: '1px solid #cbd5e1',
                                    background: '#f1f5f9',
                                    color: '#475569',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                style={{
                                    flex: 1,
                                    padding: '0.8rem',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: '#10b981',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >
                                ✅ Save Payment
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    )
}

// Modal Component
function Modal({ children, onClose }: { children: React.ReactNode, onClose: () => void }) {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '20px',
                width: '100%',
                maxWidth: '500px',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }}>
                {children}
            </div>
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
    fontSize: '1rem',
    outline: 'none'
}

function SummaryCard({ title, value, color, textColor, highlight, icon }: any) {
    return (
        <div style={{
            background: color,
            padding: '1.25rem',
            borderRadius: '16px',
            border: highlight ? `2px solid ${textColor}` : '1px solid transparent',
            boxShadow: highlight ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
        }}>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {icon && <span style={{ marginRight: '0.5rem' }}>{icon}</span>}
                {title}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: textColor }}>
                ₹{value.toLocaleString('en-IN')}
            </div>
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
