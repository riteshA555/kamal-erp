import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { getSettings } from '../services/settingsService'
import { BusinessProfileSettings } from '../types/settings'
import { formatIndianRupees } from '../utils/formatters'
import { Loader2 } from 'lucide-react'

export default function OrderPrint() {
    const { id } = useParams()
    const [order, setOrder] = useState<any>(null)
    const [business, setBusiness] = useState<BusinessProfileSettings | null>(null)
    const [loading, setLoading] = useState(true)

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

                // Fetch Business Profile
                const businessData = await getSettings<BusinessProfileSettings>('business_profile')

                setOrder(orderData)
                setBusiness(businessData)
            } catch (err) {
                console.error("Error loading invoice:", err)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [id])

    useEffect(() => {
        if (!loading && order && business) {
            // Auto-print after a short delay to ensure rendering
            setTimeout(() => {
                window.print()
            }, 500)
        }
    }, [loading, order, business])

    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '1rem' }}><Loader2 className="animate-spin" /> Generating Invoice...</div>

    if (!order) return <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>Order not found.</div>

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
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                    {business?.logoUrl && (
                        <div style={{ width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb' }}>
                            <img src={business.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    )}
                    <div>
                        <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 5px 0', textTransform: 'uppercase', letterSpacing: '1px' }}>
                            {business?.businessName || 'Business Name'}
                        </h1>
                        <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#4b5563' }}>
                            {business?.address && <div>{business.address}</div>}
                            {business?.city && <span>{business.city}, </span>}
                            {business?.state && <span>{business.state}</span>}
                            {business?.pincode && <span> - {business.pincode}</span>}
                            {business?.phone && <div style={{ marginTop: '4px' }}><strong>Phone:</strong> {business.phone}</div>}
                            {business?.email && <div><strong>Email:</strong> {business.email}</div>}
                            {business?.gstin && <div style={{ marginTop: '4px' }}><strong>GSTIN:</strong> {business.gstin}</div>}
                        </div>
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
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Bill To</h3>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{order.customer_name}</div>
                {/* Fallback if customer address was stored or linked, mostly user just stores name in simple form */}
            </div>

            {/* Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
                <thead>
                    <tr style={{ background: '#111827', color: 'white' }}>
                        <th style={{ padding: '12px', textAlign: 'left', borderRadius: '4px 0 0 4px' }}>#</th>
                        <th style={{ padding: '12px', textAlign: 'left' }}>Item Description</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '12px', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '12px', textAlign: 'right', borderRadius: '0 4px 4px 0' }}>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {order.order_items.map((item: any, idx: number) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: '12px', color: '#6b7280' }}>{idx + 1}</td>
                            <td style={{ padding: '12px', fontWeight: 600 }}>{item.description}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>{item.quantity} {item.unit}</td>
                            <td style={{ padding: '12px', textAlign: 'right' }}>₹{formatIndianRupees(item.rate)}</td>
                            <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>₹{formatIndianRupees(item.amount)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <div style={{ width: '250px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ color: '#6b7280' }}>Subtotal</span>
                        <span style={{ fontWeight: 600 }}>₹{formatIndianRupees(order.total_amount)}</span>
                        {/* Note: In schema total_amount is final. if we had tax breakdown we'd reverse calc or store it. 
                            Simple version: assuming total_amount is the grand total for now based on OrderCreate logic.
                        */}
                    </div>
                    {/* If we stored GST separately we'd show it here. 
                        OrderCreate calculates it but currently saves 'total_amount'.
                    */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: '18px', fontWeight: 800, color: '#111827', borderTop: '2px solid #111827', marginTop: '10px' }}>
                        <span>Grand Total</span>
                        <span>₹{formatIndianRupees(order.total_amount)}</span>
                    </div>
                </div>
            </div>

            {/* Footer / Terms */}
            {business?.termsAndConditions ? (
                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                    <strong>Terms & Conditions:</strong>
                    <p style={{ marginTop: '5px', whiteSpace: 'pre-line' }}>{business.termsAndConditions}</p>
                </div>
            ) : (
                <div style={{ marginTop: '50px', textAlign: 'center', fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                    Thank you for your business!
                </div>
            )}

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page { margin: 10mm; }
                    body { background: white; }
                    .no-print { display: none; }
                }
            `}</style>
        </div>
    )
}
