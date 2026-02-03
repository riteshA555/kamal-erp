import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getSettings } from '../services/settingsService'
import { BusinessProfileSettings } from '../types/settings'
import { formatIndianRupees } from '../utils/formatters'
import { Loader2 } from 'lucide-react'

export default function InvoicePrint() {
    const { id } = useParams()
    const [order, setOrder] = useState<any>(null)
    const [business, setBusiness] = useState<BusinessProfileSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        const loadData = async () => {
            if (!id) return
            try {
                // Fetch Order
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select('*, order_items(*)')
                    .eq('id', id)
                    .single()

                if (orderError) throw orderError

                // Fetch Business Profile (Safe Fetch)
                let businessData: BusinessProfileSettings | null = null;
                try {
                    businessData = await getSettings<BusinessProfileSettings>('business_profile')
                } catch (e) {
                    console.warn("Could not fetch business profile, using defaults.")
                }

                setOrder(orderData)
                setBusiness(businessData)
            } catch (err: any) {
                console.error("Error loading invoice:", err)
                setError(err.message || "Failed to load order.")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [id])

    useEffect(() => {
        if (!loading && order) {
            // Auto-print
            setTimeout(() => {
                window.print()
            }, 800)
        }
    }, [loading, order])

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem', fontFamily: 'sans-serif' }}><Loader2 className="animate-spin" /> Preparing Invoice...</div>

    if (error) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>Error: {error}</div>

    if (!order) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red', fontFamily: 'sans-serif' }}>Order not found.</div>

    return (
        <div style={{
            fontFamily: '"Inter", sans-serif',
            maxWidth: '210mm',
            margin: '0 auto',
            background: 'white',
            padding: '40px',
            minHeight: '297mm',
            color: '#111827'
        }}>
            {/* Header / Business Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {business?.businessName || 'INVOICE'}
                    </h1>
                    <div style={{ fontSize: '13px', lineHeight: '1.4', color: '#4b5563' }}>
                        {business?.address && <div>{business.address}</div>}
                        {business?.city && <span>{business.city}</span>}
                        {business?.state && <span>, {business.state}</span>}
                        {business?.pincode && <span> - {business.pincode}</span>}
                        {business?.phone && <div style={{ marginTop: '4px' }}><strong>Phone:</strong> {business.phone}</div>}
                        {business?.email && <div><strong>Email:</strong> {business.email}</div>}
                        {business?.gstin && <div style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {business.gstin}</div>}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#6b7280', margin: '0 0 10px 0', textTransform: 'uppercase' }}>Tax Invoice</h2>
                    <div style={{ fontSize: '14px' }}>
                        <div><strong>Invoice No:</strong> {order.order_number || `#${order.id.slice(0, 6)}`}</div>
                        <div><strong>Date:</strong> {new Date(order.order_date).toLocaleDateString('en-IN')}</div>
                    </div>
                </div>
            </div>

            {/* Customer Details */}
            <div style={{ marginBottom: '30px', padding: '15px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '12px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Bill To</h3>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{order.customer_name}</div>
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '14px' }}>
                <thead>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontWeight: 700, color: '#374151' }}>Item Details</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Qty</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Rate</th>
                        <th style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#374151' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {order.order_items.map((item: any, idx: number) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '10px', color: '#6b7280' }}>{idx + 1}</td>
                            <td style={{ padding: '10px', fontWeight: 500 }}>{item.description}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>₹{formatIndianRupees(item.rate)}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>₹{formatIndianRupees(item.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '300px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <span style={{ color: '#6b7280', fontSize: '14px' }}>Subtotal</span>
                        <span style={{ fontWeight: 600 }}>₹{formatIndianRupees(order.total_amount)}</span>
                    </div>
                    {/* Placeholder for real tax breakdown if available later */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 800, color: '#111827', borderTop: '2px solid #111827', marginTop: '10px' }}>
                        <span>Grand Total</span>
                        <span>₹{formatIndianRupees(order.total_amount)}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Terms */}
            <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
                {business?.termsAndConditions ? (
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '15px', fontSize: '11px', color: '#6b7280' }}>
                        <strong>Terms & Conditions:</strong>
                        <p style={{ marginTop: '5px', whiteSpace: 'pre-line' }}>{business.termsAndConditions}</p>
                    </div>
                ) : (
                    <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '15px', textAlign: 'center', fontSize: '12px', color: '#9ca3af' }}>
                        Thank you using our services.
                    </div>
                )}
                <div style={{ textAlign: 'center', fontSize: '10px', color: '#d1d5db', marginTop: '20px' }}>
                    Generated by SterlingFlow ERP
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 10mm; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    )
}
