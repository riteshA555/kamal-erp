import { useState, useEffect } from 'react'
import { getGSTOrders, getITCExpenses, calculateGSTSummary, GSTSummaryItem, getGSTCustomers } from '../../../services/gstService'
import { getSettings, updateSettings } from '../../../services/settingsService'
import { Order } from '../../../types'
import { Expense } from '../../../services/expenseService'
import { BusinessProfileSettings, GSTSettings } from '../../../types/settings'
import { Download, FileText, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownLeft, Calendar, Edit2 } from 'lucide-react'

export default function GSTReports() {
    const [orders, setOrders] = useState<any[]>([]) // ANY to support customer relation
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [businessProfile, setBusinessProfile] = useState<BusinessProfileSettings | null>(null)
    const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null)
    const [gstFilings, setGstFilings] = useState<any>({})

    // View Controls
    const [viewMode, setViewMode] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY')
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
    const [fyYear, setFyYear] = useState(new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear()) // Current FY

    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'OUTPUT' | 'INPUT'>('OUTPUT')
    const [activeMenu, setActiveMenu] = useState<'GSTR1' | 'GSTR3B' | null>(null)

    // Filing Status Logic Helpers (Monthly Only)
    const getNextMonthDates = (currentMonthStr: string) => {
        const [y, m] = currentMonthStr.split('-').map(Number)
        const nextMonth = m === 12 ? 1 : m + 1
        const nextYear = m === 12 ? y + 1 : y

        const gstr1Due = new Date(nextYear, nextMonth - 1, 11)
        const gstr3bDue = new Date(nextYear, nextMonth - 1, 20)

        return { gstr1Due, gstr3bDue, nextMonthName: gstr1Due.toLocaleString('default', { month: 'short' }) }
    }

    const loadData = async () => {
        setLoading(true)
        try {
            // Determine Date Range
            let startDate, endDate
            if (viewMode === 'MONTHLY') {
                const [y, m] = month.split('-')
                startDate = `${month}-01`
                endDate = new Date(Number(y), Number(m), 0).toISOString().split('T')[0] // Last day (e.g. 2026-02-28)
            } else {
                startDate = `${fyYear}-04-01`
                endDate = `${fyYear + 1}-03-31`
            }

            const [outData, inData, bizData, gData, filingsData, custData] = await Promise.all([
                getGSTOrders(startDate, endDate),
                getITCExpenses(startDate, endDate),
                getSettings<BusinessProfileSettings>('business_profile'),
                getSettings<GSTSettings>('gst_settings'),
                getSettings<any>('gst_filings'),
                getGSTCustomers()
            ])

            // Enrich Orders with Customer Data
            const enrichedOrders = outData.map((o: any) => ({
                ...o,
                customer: custData?.find((c: any) => c.id === o.customer_id)
            }))

            setOrders(enrichedOrders)
            setExpenses(inData)
            setBusinessProfile(bizData)
            setGstSettings(gData)
            setGstFilings(filingsData || {})
        } catch (err: any) {
            console.error(err)
            alert("Error loading GST Report: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [month, viewMode, fyYear])

    const handleMarkFiled = async (type: 'GSTR1' | 'GSTR3B') => {
        const confirmMsg = `Are you sure you want to mark ${type} as FILED for ${monthName}?\n\nThis means you have successfully submitted it on the GST Portal.`
        if (!confirm(confirmMsg)) return

        const currentMonthData = gstFilings[month] || {}
        const updatedData = {
            ...gstFilings,
            [month]: {
                ...currentMonthData,
                [type]: { status: 'FILED', date: new Date().toISOString() }
            }
        }

        try {
            // @ts-ignore - Valid category dynamically
            await updateSettings('gst_filings', updatedData)
            setGstFilings(updatedData)
            alert(`${type} marked as FILED! ✅`)
        } catch (err: any) {
            alert("Error updating status: " + err.message)
        }
    }

    const OPENING_ITC = gstSettings?.itcOpeningBalance || 0
    const BUSINESS_INFO = {
        name: businessProfile?.businessName || 'KUNAL KISHORE PURIA',
        gstin: businessProfile?.gstin || 'GSTIN_NOT_SET',
        address: businessProfile?.address || '',
        phone: businessProfile?.phone || '',
        email: businessProfile?.email || '',
        pan: businessProfile?.pan || ''
    }

    // Calculations
    const outputTotal = orders.reduce((sum, o) => sum + Number(o.gst_amount || 0), 0)
    const inputTotal = expenses.reduce((sum, e) => sum + Number(e.gst_amount || 0), 0)
    const netCredit = inputTotal - outputTotal
    const carryForward = OPENING_ITC + inputTotal - outputTotal

    const monthName = viewMode === 'MONTHLY'
        ? new Date(month + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })
        : `FY ${fyYear}-${fyYear + 1}`
    const { gstr1Due, gstr3bDue } = getNextMonthDates(month)
    const today = new Date()

    // Status Check Helpers
    const getStatus = (type: 'GSTR1' | 'GSTR3B') => {
        if (viewMode === 'YEARLY') return { status: 'NA', color: '#94a3b8', bg: '#f1f5f9', label: 'Summary' }

        const filedData = gstFilings[month]?.[type]
        if (filedData?.status === 'FILED') return { status: 'FILED', color: '#16a34a', bg: '#f0fdf4', label: 'Filed ✅' }

        const dueDate = type === 'GSTR1' ? gstr1Due : gstr3bDue
        if (today > dueDate) return { status: 'OVERDUE', color: '#dc2626', bg: '#fef2f2', label: 'Overdue ⚠️' }

        return { status: 'PENDING', color: '#ca8a04', bg: '#fefce8', label: `Due ${dueDate.getDate()}th` }
    }

    const gstr1Status = getStatus('GSTR1')
    const gstr3bStatus = getStatus('GSTR3B')

    const exportGSTR1 = () => {
        if (orders.length === 0) return alert("Bhai, GSTR-1 ke liye koi sales nahi hai!")

        // Official B2B Format Columns
        const headers = [
            "GSTIN/UIN of Recipient",
            "Receiver Name",
            "Invoice Number",
            "Invoice Date",
            "Invoice Value",
            "Place Of Supply",
            "Reverse Charge",
            "Applicable % of Tax Rate",
            "Invoice Type",
            "E-Commerce GSTIN",
            "Rate",
            "Taxable Value",
            "Cess Amount"
        ]

        const rows = orders.map(o => {
            const customerGSTIN = o.customer?.gst_number || ''
            const pos = o.customer?.state ? `${o.customer.state}` : ''
            const invType = "Regular"

            return [
                customerGSTIN,
                o.customer_name,
                `INV-${o.order_number}`,
                new Date(o.order_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
                o.total_amount.toFixed(2),
                pos,
                "N",
                "",
                invType,
                "",
                o.gst_rate,
                o.subtotal.toFixed(2),
                "0.00"
            ]
        })

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `GSTR1_${viewMode === 'MONTHLY' ? month : `FY_${fyYear}`}.csv`
        a.click()
    }

    const exportGSTR3B = () => {
        const outSummary = calculateGSTSummary(orders, 'output')
        const inSummary = calculateGSTSummary(expenses, 'input')

        const headers = ["Section", "GST Rate (%)", "Taxable Value", "GST Amount", "Total Value"]
        const rows: any[] = []

        // Output Section
        rows.push(["3.1(a) Outward Taxable Supplies", "", "", "", ""])
        outSummary.forEach(s => {
            rows.push(["", s.rate, s.taxableValue.toFixed(2), s.gstAmount.toFixed(2), s.totalAmount.toFixed(2)])
        })

        // ITC Section
        rows.push(["4(A) Eligible ITC", "", "", "", ""])
        inSummary.forEach(s => {
            rows.push(["", s.rate, s.taxableValue.toFixed(2), s.gstAmount.toFixed(2), s.totalAmount.toFixed(2)])
        })

        // Net Summary
        rows.push(["Summary", "", "", "", ""])
        rows.push(["Total Output GST", "", "", outputTotal.toFixed(2), ""])
        rows.push(["Total Input GST (ITC)", "", "", inputTotal.toFixed(2), ""])
        rows.push(["Net GST Credit/Payable", "", "", netCredit.toFixed(2), ""])

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n")
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `GSTR3B_Summary_${month}.csv`
        a.click()
    }

    const handleShare = async (title: string, text: string) => {
        if (navigator.share) {
            try {
                await navigator.share({ title, text, url: window.location.href })
            } catch (err) { console.log('Share failed', err) }
        } else {
            alert("Bhai, aapka browser sharing support nahi karta. Aap Link copy kar sakte hain.")
        }
    }

    const printGSTR = (type: 'GSTR1' | 'GSTR3B') => {
        window.print() // The CSS will handle showing the correct print view
    }

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>GST Module</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b' }}>
                        Track input/output GST and ITC / जीएसटी प्रबंधन
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', position: 'relative' }}>
                    {/* GSTR-1 Button + Menu */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setActiveMenu(activeMenu === 'GSTR1' ? null : 'GSTR1')}
                            style={{ ...secondaryBtnStyle, background: 'white', color: 'var(--color-text-primary)' }}
                        >
                            <FileText size={16} /> GSTR-1 Options
                        </button>
                        {activeMenu === 'GSTR1' && (
                            <div style={dropdownStyle}>
                                <div style={menuItemStyle} onClick={() => { exportGSTR1(); setActiveMenu(null); }}>📊 Export Excel (CSV)</div>
                                <div style={menuItemStyle} onClick={() => { printGSTR('GSTR1'); setActiveMenu(null); }}>🖨️ Print A4 Report</div>
                                <div style={menuItemStyle} onClick={() => { handleShare('GSTR-1 Report', `GSTR-1 for ${monthName}`); setActiveMenu(null); }}>🔗 Share Report</div>
                            </div>
                        )}
                    </div>

                    {/* GSTR-3B Button + Menu */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setActiveMenu(activeMenu === 'GSTR3B' ? null : 'GSTR3B')}
                            style={{ ...secondaryBtnStyle, background: 'var(--color-primary)', color: 'white' }}
                        >
                            <Download size={16} /> GSTR-3B Options
                        </button>
                        {activeMenu === 'GSTR3B' && (
                            <div style={dropdownStyle}>
                                <div style={menuItemStyle} onClick={() => { exportGSTR3B(); setActiveMenu(null); }}>📊 Export Excel (CSV)</div>
                                <div style={menuItemStyle} onClick={() => { printGSTR('GSTR3B'); setActiveMenu(null); }}>🖨️ Print A4 Summary</div>
                                <div style={menuItemStyle} onClick={() => { handleShare('GSTR-3B Summary', `GSTR-3B Summary for ${monthName}`); setActiveMenu(null); }}>🔗 Share Summary</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top 4 Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-success)' }}>
                            <ArrowUpRight size={18} /> Output GST (Collected)
                        </div>
                    </div>
                    <div style={cardValueStyle}>₹{outputTotal.toLocaleString()}</div>
                    <div style={cardSubStyle}>From sales & job work</div>
                </div>

                <div style={cardStyle}>
                    <div style={cardHeaderStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)' }}>
                            <ArrowDownLeft size={18} /> Input GST (ITC)
                        </div>
                    </div>
                    <div style={cardValueStyle}>₹{inputTotal.toLocaleString()}</div>
                    <div style={cardSubStyle}>From purchases & expenses</div>
                </div>

                <div style={{ ...cardStyle, borderLeft: '4px solid var(--color-success)' }}>
                    <div style={cardHeaderStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e293b' }}>
                            <Wallet size={18} /> Net GST Credit
                        </div>
                    </div>
                    <div style={cardValueStyle}>₹{Math.max(0, netCredit).toLocaleString()}</div>
                    <div style={cardSubStyle}>ITC available</div>
                </div>

                <div style={{ ...cardStyle }}>
                    <div style={cardHeaderStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Filing Status</span>
                            <Calendar size={16} />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0.4rem 0' }}>{monthName}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {/* GSTR-1 ROW */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>GSTR-1</span>
                                {gstr1Status.status !== 'FILED' && <span style={{ fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleMarkFiled('GSTR1')}>Mark Filed</span>}
                            </div>
                            <span style={statusTagStyle(gstr1Status.bg, gstr1Status.color)}>{gstr1Status.label}</span>
                        </div>
                        {/* GSTR-3B ROW */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>GSTR-3B</span>
                                {gstr3bStatus.status !== 'FILED' && <span style={{ fontSize: '0.65rem', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleMarkFiled('GSTR3B')}>Mark Filed</span>}
                            </div>
                            <span style={statusTagStyle(gstr3bStatus.bg, gstr3bStatus.color)}>{gstr3bStatus.label}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ITC Utilization Summary Section */}
            <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', padding: '1.5rem', marginBottom: '2.5rem' }}>
                <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>
                    ITC Utilization Summary<br />
                    <small style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.85rem' }}>Input Tax Credit carry forward / आईटीसी उपयोग</small>
                </h2>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2rem' }}>
                    <div>
                        <div style={labelStyle}>Opening ITC Balance</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>₹{OPENING_ITC.toLocaleString()}</div>
                    </div>
                    <div>
                        <div style={labelStyle}>ITC Claimed This Month</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>₹{inputTotal.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#fffbeb', padding: '1rem', borderRadius: '12px', border: '1px solid #fef3c7' }}>
                        <div style={{ ...labelStyle, color: '#b45309' }}>Carry Forward ITC</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309' }}>₹{carryForward.toLocaleString()}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                        <span>ITC Utilization</span>
                        <span style={{ fontWeight: 700 }}>{(outputTotal > 0 ? (outputTotal / (OPENING_ITC + inputTotal) * 100).toFixed(0) : 0)}%</span>
                    </div>
                    <div style={{ height: '8px', background: '#f8fafc', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${Math.min(100, (outputTotal / (OPENING_ITC + inputTotal) * 100))}%`,
                            height: '100%',
                            background: 'var(--color-primary)',
                            borderRadius: '4px'
                        }}></div>
                    </div>
                </div>
            </div>

            {/* Tabs & Register Tables */}
            <div style={{ background: 'white', border: '1px solid #f1f5f9', borderRadius: '16px', overflow: 'hidden' }}>
                <div style={{ borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1.5rem' }}>
                    <div style={{ display: 'flex' }}>
                        <button
                            onClick={() => setActiveTab('OUTPUT')}
                            style={{ ...tabBtnStyle, color: activeTab === 'OUTPUT' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'OUTPUT' ? '3px solid var(--color-primary)' : '3px solid transparent' }}
                        >
                            <ArrowUpRight size={18} /> Output GST
                        </button>
                        <button
                            onClick={() => setActiveTab('INPUT')}
                            style={{ ...tabBtnStyle, color: activeTab === 'INPUT' ? 'var(--color-text-primary)' : 'var(--color-text-muted)', borderBottom: activeTab === 'INPUT' ? '3px solid var(--color-primary)' : '3px solid transparent' }}
                        >
                            <ArrowDownLeft size={18} /> Input GST (ITC)
                        </button>
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '4px', borderRadius: '8px' }}>
                            <select
                                value={viewMode}
                                onChange={(e) => setViewMode(e.target.value as any)}
                                style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>

                            {viewMode === 'MONTHLY' ? (
                                <input
                                    type="month"
                                    value={month}
                                    onChange={(e) => setMonth(e.target.value)}
                                    style={{ border: 'none', padding: '0.4rem', fontWeight: 600, color: '#475569', outline: 'none', background: 'transparent' }}
                                />
                            ) : (
                                <select
                                    value={fyYear}
                                    onChange={(e) => setFyYear(Number(e.target.value))}
                                    style={{ padding: '0.4rem', fontWeight: 600, color: '#475569', border: 'none', background: 'transparent' }}>
                                    <option value={2024}>FY 2024-25</option>
                                    <option value={2025}>FY 2025-26</option>
                                    <option value={2026}>FY 2026-27</option>
                                </select>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ padding: '1.5rem' }}>
                    <h3 style={{ margin: '0 0 1.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
                        {activeTab === 'OUTPUT' ? 'Output GST Register' : 'Input GST Register'}<br />
                        <small style={{ fontWeight: 400, color: '#94a3b8', fontSize: '0.8rem' }}>
                            {activeTab === 'OUTPUT' ? 'GST collected on sales & job work / बिक्री पर जीएसटी' : 'GST paid on purchases & expenses / खरीद पर जीएसटी'}
                        </small>
                    </h3>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #f8fafc' }}>
                                    <th style={thStyle}>Invoice</th>
                                    <th style={thStyle}>Date</th>
                                    <th style={thStyle}>Customer/Vendor</th>
                                    <th style={thStyle}>Type</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>Taxable</th>
                                    <th style={{ ...thStyle, textAlign: 'center' }}>GST Rate</th>
                                    <th style={{ ...thStyle, textAlign: 'right' }}>GST Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeTab === 'OUTPUT' ? (
                                    orders.length === 0 ? <NoData /> : orders.map(o => (
                                        <tr key={o.id} style={trStyle}>
                                            <td style={tdStyle}>INV-{o.order_number}</td>
                                            <td style={tdStyle}>{new Date(o.order_date).toLocaleDateString()}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{o.customer_name}</td>
                                            <td style={tdStyle}><Badge text={o.material_type === 'CLIENT' ? 'Job Work' : 'Sale'} color={o.material_type === 'CLIENT' ? '#475569' : '#b45309'} bg={o.material_type === 'CLIENT' ? '#f1f5f9' : '#fffbeb'} /></td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>₹{o.subtotal.toLocaleString()}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{o.gst_rate}%</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-success)', fontWeight: 700 }}>₹{o.gst_amount.toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    expenses.length === 0 ? <NoData /> : expenses.map(e => (
                                        <tr key={e.id} style={trStyle}>
                                            <td style={tdStyle}>{e.invoice_number || 'EXP-' + e.id.slice(0, 4)}</td>
                                            <td style={tdStyle}>{new Date(e.date).toLocaleDateString()}</td>
                                            <td style={{ ...tdStyle, fontWeight: 600 }}>{e.vendor_name || e.head}</td>
                                            <td style={tdStyle}><Badge text="Expense" color="#1e293b" bg="#f1f5f9" /></td>
                                            <td style={{ ...tdStyle, textAlign: 'right' }}>₹{Number(e.amount).toLocaleString()}</td>
                                            <td style={{ ...tdStyle, textAlign: 'center' }}>{e.gst_rate}%</td>
                                            <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--color-warning)', fontWeight: 700 }}>₹{Number(e.gst_amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* PRINT ONLY SECTION - A4 Optimized */}
            <div className="print-only" style={{ display: 'none' }}>
                {/* GSTR-1 PRINT VIEW */}
                <div id="print-gstr1" className="print-section">
                    <div style={printHeaderContainerStyle}>
                        <div style={{ textAlign: 'left' }}>
                            <h1 style={{ margin: 0, fontSize: '24pt', fontWeight: 900 }}>{BUSINESS_INFO.name}</h1>
                            <p style={{ margin: '4px 0', fontSize: '10pt', color: '#333' }}>{BUSINESS_INFO.address}</p>
                            <p style={{ margin: '2px 0', fontSize: '10pt', color: '#333' }}>GSTIN: <strong>{BUSINESS_INFO.gstin}</strong> | PAN: {BUSINESS_INFO.pan}</p>
                            <p style={{ margin: '2px 0', fontSize: '10pt', color: '#333' }}>M: {BUSINESS_INFO.phone} | E: {BUSINESS_INFO.email}</p>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '200px' }}>
                            <div style={{ background: '#000', color: '#fff', padding: '8px 12px', fontWeight: 800, fontSize: '14pt', marginBottom: '8px' }}>GSTR-1 REGISTER</div>
                            <p style={{ margin: 0, fontSize: '10pt' }}><strong>Report Month:</strong> {monthName}</p>
                            <p style={{ margin: 0, fontSize: '9pt', color: '#666' }}>Generated: {new Date().toLocaleString()}</p>
                        </div>
                    </div>

                    <table style={printTableStyle}>
                        <thead>
                            <tr style={{ background: '#eee' }}>
                                <th style={{ width: '12%' }}>Inv No</th>
                                <th style={{ width: '12%' }}>Date</th>
                                <th style={{ width: '25%' }}>Customer Name</th>
                                <th style={{ width: '15%', textAlign: 'right' }}>Taxable (₹)</th>
                                <th style={{ width: '8%', textAlign: 'center' }}>Rate</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>GST (₹)</th>
                                <th style={{ width: '14%', textAlign: 'right' }}>Total (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map(o => (
                                <tr key={o.id}>
                                    <td>INV-{o.order_number}</td>
                                    <td>{new Date(o.order_date).toLocaleDateString()}</td>
                                    <td style={{ fontWeight: 600 }}>{o.customer_name}</td>
                                    <td style={{ textAlign: 'right' }}>{o.subtotal.toFixed(2)}</td>
                                    <td style={{ textAlign: 'center' }}>{o.gst_rate}%</td>
                                    <td style={{ textAlign: 'right' }}>{o.gst_amount.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{o.total_amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr style={{ fontWeight: 900, background: '#f5f5f5' }}>
                                <td colSpan={3} style={{ textAlign: 'right', paddingRight: '15px' }}>REPORT TOTALS</td>
                                <td style={{ textAlign: 'right' }}>{orders.reduce((a, b) => a + Number(b.subtotal), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td>-</td>
                                <td style={{ textAlign: 'right' }}>{outputTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td style={{ textAlign: 'right' }}>{orders.reduce((a, b) => a + Number(b.total_amount), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div style={printFooterStyle}>
                        <div style={{ marginTop: '20px' }}>* This is a computer generated report and does not require a physical signature.</div>
                        <div style={{ borderTop: '1px solid #000', width: '200px', marginTop: '60px', textAlign: 'center' }}>Authorised Signatory</div>
                    </div>
                </div>

                {/* GSTR-3B PRINT VIEW */}
                <div id="print-gstr3b" className="print-section">
                    <div style={printHeaderContainerStyle}>
                        <div style={{ textAlign: 'left' }}>
                            <h1 style={{ margin: 0, fontSize: '24pt', fontWeight: 900 }}>{BUSINESS_INFO.name}</h1>
                            <p style={{ margin: '4px 0', fontSize: '10pt', color: '#333' }}>{BUSINESS_INFO.address}</p>
                            <p style={{ margin: '2px 0', fontSize: '10pt', color: '#333' }}>GSTIN: <strong>{BUSINESS_INFO.gstin}</strong> | PAN: {BUSINESS_INFO.pan}</p>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '200px' }}>
                            <div style={{ background: '#000', color: '#fff', padding: '8px 12px', fontWeight: 800, fontSize: '14pt', marginBottom: '8px' }}>GSTR-3B SUMMARY</div>
                            <p style={{ margin: 0, fontSize: '10pt' }}><strong>Period:</strong> {monthName}</p>
                        </div>
                    </div>

                    <h3 style={printSubheadStyle}>3.1 Details of Outward Supplies (Liability)</h3>
                    <table style={printTableStyle}>
                        <thead>
                            <tr style={{ background: '#eee' }}>
                                <th>Nature of Supplies</th>
                                <th>Total Taxable Value</th>
                                <th>IGST</th>
                                <th>CGST</th>
                                <th>SGST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculateGSTSummary(orders, 'output').map(s => (
                                <tr key={s.rate}>
                                    <td>Outward Taxable Supplies ({s.rate}%)</td>
                                    <td style={{ textAlign: 'right' }}>{s.taxableValue.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>0.00</td>
                                    <td style={{ textAlign: 'right' }}>{(s.gstAmount / 2).toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{(s.gstAmount / 2).toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 800 }}>
                                <td>(A) Total Output Liability</td>
                                <td style={{ textAlign: 'right' }}>{orders.reduce((a, b) => a + Number(b.subtotal), 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>0.00</td>
                                <td style={{ textAlign: 'right' }}>{(outputTotal / 2).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>{(outputTotal / 2).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3 style={printSubheadStyle}>4. Eligible Input Tax Credit (ITC)</h3>
                    <table style={printTableStyle}>
                        <thead>
                            <tr style={{ background: '#eee' }}>
                                <th>Nature of ITC</th>
                                <th>Total Taxable Value</th>
                                <th>IGST</th>
                                <th>CGST</th>
                                <th>SGST</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calculateGSTSummary(expenses, 'input').map(s => (
                                <tr key={s.rate}>
                                    <td>Inward Supplies ({s.rate}% Purchases)</td>
                                    <td style={{ textAlign: 'right' }}>{s.taxableValue.toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>0.00</td>
                                    <td style={{ textAlign: 'right' }}>{(s.gstAmount / 2).toFixed(2)}</td>
                                    <td style={{ textAlign: 'right' }}>{(s.gstAmount / 2).toFixed(2)}</td>
                                </tr>
                            ))}
                            <tr style={{ fontWeight: 800 }}>
                                <td>(A) Total Eligible ITC</td>
                                <td style={{ textAlign: 'right' }}>{expenses.reduce((a, b) => a + Number(b.amount), 0).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>0.00</td>
                                <td style={{ textAlign: 'right' }}>{(inputTotal / 2).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>{(inputTotal / 2).toFixed(2)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style={printBalanceCardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Total Output GST Payable:</span>
                            <span style={{ fontWeight: 700 }}>₹{outputTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Total Eligible ITC:</span>
                            <span style={{ fontWeight: 700 }}>₹{inputTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px double #000', marginTop: '10px' }}>
                            <span style={{ fontWeight: 900, fontSize: '13pt' }}>NET GST BALANCE {netCredit >= 0 ? '(Credit)' : '(Payable)'}:</span>
                            <span style={{ fontWeight: 900, fontSize: '13pt' }}>₹{Math.abs(netCredit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div style={printFooterStyle}>
                        <div style={{ borderTop: '1px solid #000', width: '200px', marginTop: '100px', marginLeft: 'auto', textAlign: 'center' }}>Authorised Signatory</div>
                        <p style={{ fontSize: '9pt', color: '#666', marginTop: '40px' }}>Note: This is a summary report extracted for user convenience. Direct filing on the GST portal is required.</p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 1.5cm;
                    }
                    body * { visibility: hidden; }
                    .print-only, .print-only * { visibility: visible; }
                    .print-only { 
                        display: block !important; 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%;
                        max-width: 100%;
                        padding: 0;
                        background: white;
                        color: black;
                    }
                    .print-section { 
                        display: block !important;
                        page-break-after: always;
                    }
                    table { 
                        width: 100% !important; 
                        border-collapse: collapse !important; 
                        border: 1px solid black !important;
                        margin-bottom: 20px;
                        table-layout: fixed;
                    }
                    th, td { 
                        border: 1px solid black !important; 
                        padding: 6px !important; 
                        font-size: 9pt !important;
                        word-wrap: break-word;
                        overflow: hidden;
                    }
                    th { background: #f0f0f0 !important; font-weight: bold; }
                    h3 { font-size: 11pt !important; margin-top: 15px; margin-bottom: 5px; }
                }
            `}</style>
        </div>
    )
}

// Styling Helpers
const cardStyle: React.CSSProperties = {
    background: 'white',
    padding: '1.25rem',
    borderRadius: '16px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)'
}

const cardHeaderStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#64748b',
    marginBottom: '0.5rem'
}

const cardValueStyle: React.CSSProperties = {
    fontSize: '1.8rem',
    fontWeight: 800,
    color: '#1e293b',
    lineHeight: 1
}

const cardSubStyle: React.CSSProperties = {
    fontSize: '0.8rem',
    color: '#94a3b8',
    marginTop: '0.4rem'
}

const statusTagStyle = (bg: string, color: string): React.CSSProperties => ({
    padding: '2px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 600,
    backgroundColor: bg,
    color: color
})

const secondaryBtnStyle: React.CSSProperties = {
    padding: '0.6rem 1.2rem',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    fontSize: '0.9rem',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer'
}

const labelStyle: React.CSSProperties = {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#94a3b8',
    marginBottom: '0.3rem'
}

const tabBtnStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    padding: '1.25rem 1.5rem',
    fontSize: '0.95rem',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    transition: 'all 0.2s'
}

const thStyle: React.CSSProperties = {
    padding: '1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 700
}

const tdStyle: React.CSSProperties = {
    padding: '1.2rem 1rem',
    fontSize: '0.9rem',
    color: '#475569'
}

const trStyle: React.CSSProperties = {
    borderBottom: '1px solid #f8fafc'
}

const NoData = () => (
    <tr>
        <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
            No records found for this period.
        </td>
    </tr>
)

const Badge = ({ text, color, bg }: any) => (
    <span style={{
        padding: '4px 10px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        fontWeight: 700,
        color,
        backgroundColor: bg
    }}>
        {text}
    </span>
)

const dropdownStyle: React.CSSProperties = {
    position: 'absolute',
    top: '110%',
    right: 0,
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
    border: '1px solid #f1f5f9',
    zIndex: 100,
    minWidth: '220px',
    overflow: 'hidden',
    padding: '0.5rem'
}

const menuItemStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    borderRadius: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    // hover handled via JS or separate CSS if needed, using simple style for now
}

const printHeaderStyle: React.CSSProperties = {
    textAlign: 'center',
    borderBottom: '3px solid #000',
    paddingBottom: '1rem',
    marginBottom: '1.5rem'
}

const printTableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem',
    border: '1px solid #000'
}

const printHeaderContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '1.5rem',
    marginBottom: '1rem',
    borderBottom: '2px solid #000'
}

const printSubheadStyle: React.CSSProperties = {
    fontSize: '12pt',
    fontWeight: 800,
    textTransform: 'uppercase',
    marginTop: '20px',
    marginBottom: '10px',
    borderBottom: '1px solid #eee',
    paddingBottom: '5px'
}

const printBalanceCardStyle: React.CSSProperties = {
    marginTop: '2rem',
    padding: '1.5rem',
    border: '2px solid #000',
    background: '#fff',
    width: '400px',
    marginLeft: 'auto'
}

const printFooterStyle: React.CSSProperties = {
    marginTop: '2rem',
    fontSize: '9pt',
}
