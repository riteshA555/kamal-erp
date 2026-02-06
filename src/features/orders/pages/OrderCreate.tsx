import { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { createOrder } from '../../../services/orderService'
import { getAssetLedgers } from '../../../services/accountingService'
import { getJobWorkItems } from '../../../services/jobWorkService'
import { getProducts } from '../../../services/productService'
import { getKarigars, Karigar } from '../../../services/karigarService'
import { getLatestRate, SilverRate } from '../../../services/rateService'
import { MaterialType, JobWorkItem, Product } from '../../../types'
import { supabase } from '../../../supabaseClient'
import {
    Trash2, Plus, ShoppingCart, User, Package, Hammer,
    CheckCircle2, AlertTriangle, Loader2, ArrowRight, Printer, Share2, X
} from 'lucide-react'
import { formatIndianRupees } from '../../../shared/utils/formatters'
import { getSettings } from '../../../services/settingsService'
import { BusinessProfileSettings, GSTSettings } from '../../../types/settings'

type FormValues = {
    customer_name: string
    order_date: string
    material_type: MaterialType
    items: {
        description: string
        quantity: number
        unit: string
        rate: number
        product_id?: string
        weight?: number
        wastage_percent?: number
        labour_cost?: number
        has_karigar?: boolean
        karigar_id?: string
        karigar_rate?: number
        karigar_quantity?: number
    }[]
    gst_enabled: boolean
}

export default function OrderCreate() {
    const navigate = useNavigate()
    const [submissionError, setSubmissionError] = useState('')
    const [jobWorkItems, setJobWorkItems] = useState<JobWorkItem[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [karigars, setKarigars] = useState<Karigar[]>([])
    const [savedCustomers, setSavedCustomers] = useState<any[]>([])

    // Business Info State
    const [businessProfile, setBusinessProfile] = useState<BusinessProfileSettings | null>(null)
    const [gstSettings, setGstSettings] = useState<GSTSettings | null>(null)

    // Success Modal State
    const [successData, setSuccessData] = useState<{
        open: boolean,
        orderId: string,
        customer: string,
        total: number,
        items: any[],
        date: string
    } | null>(null)

    // Workbench State
    const [draftItem, setDraftItem] = useState<{
        description: string
        quantity: number
        unit: string
        rate: number
        product_id?: string
        weight?: number
        wastage_percent?: number
        labour_cost?: number
        has_karigar?: boolean
        karigar_id?: string
        karigar_rate?: number
        karigar_quantity?: number
    }>({ description: '', quantity: 0, unit: 'KG', rate: 0 })

    const [draftError, setDraftError] = useState('')

    // Multi-Karigar State
    const [karigarSplits, setKarigarSplits] = useState<{ karigar_id: string, name: string, quantity: number }[]>([])

    const { register, control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
        defaultValues: {
            order_date: new Date().toISOString().split('T')[0],
            material_type: 'CLIENT',
            gst_enabled: false,
            items: []
        }
    })

    const { fields, append, remove, replace } = useFieldArray({
        control,
        name: 'items'
    })

    const [silverRate, setSilverRate] = useState<SilverRate | null>(null)

    // Initial Load
    useEffect(() => {
        let mounted = true
        const loadData = async () => {
            try {
                const [jwData, prodData, karigarData, businessData, gstData, currentRate, customerList] = await Promise.all([
                    getJobWorkItems(),
                    getProducts(),
                    getKarigars(),
                    getSettings<BusinessProfileSettings>('business_profile'),
                    getSettings<GSTSettings>('gst_settings'),
                    getLatestRate(),
                    getAssetLedgers()
                ])
                if (mounted) {
                    setJobWorkItems(jwData)
                    setProducts(prodData)
                    setKarigars(karigarData)
                    setBusinessProfile(businessData)
                    setGstSettings(gstData)
                    setSilverRate(currentRate)
                    setSavedCustomers(customerList || [])
                }
            } catch (err: any) {
                console.error('Error fetching catalog data:', err)
            }
        }
        loadData()
        return () => { mounted = false }
    }, [])

    // REAL-TIME STOCK UPDATES (Zero Latency)
    useEffect(() => {
        const channel = supabase
            .channel('product_stock_changes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'products' },
                (payload: any) => {
                    const updatedProduct = payload.new as Product
                    setProducts(prevProducts =>
                        prevProducts.map(p => p.id === updatedProduct.id ? { ...p, current_stock: updatedProduct.current_stock } : p)
                    )
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const materialType = watch('material_type')
    const items = watch('items')
    const gstEnabled = watch('gst_enabled')
    const customerName = watch('customer_name')

    // Totals
    const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.rate || 0)), 0)
    const gstRate = materialType === 'CLIENT'
        ? (gstSettings?.defaultGstRateJobWork ?? 5)
        : (gstSettings?.defaultGstRateSale ?? 3)
    const gstAmount = gstEnabled ? (subtotal * gstRate) / 100 : 0
    const grandTotal = subtotal + gstAmount

    useEffect(() => {
        if (materialType === 'CLIENT') setValue('gst_enabled', false)
        else if (materialType === 'OWN') setValue('gst_enabled', true)

        setDraftItem({ description: '', quantity: 0, unit: 'KG', rate: 0 })
        setDraftError('')
        setKarigarSplits([])
    }, [materialType, setValue])

    // --- HANDLERS ---
    const handleDraftItemChange = (field: string, value: any) => {
        setDraftItem(prev => ({ ...prev, [field]: value }))
        setDraftError('')

        // Auto-fill logic
        if (field === 'description' && materialType === 'CLIENT') {
            const jw = jobWorkItems.find(j => j.name === value)
            if (jw) {
                setDraftItem(prev => ({ ...prev, description: jw.name, unit: jw.unit, rate: jw.default_rate, product_id: undefined }))
            }
        }
        if (field === 'product_id' && materialType === 'OWN') {
            const prod = products.find(p => p.id === value)
            if (prod) {
                setDraftItem(prev => ({
                    ...prev,
                    product_id: prod.id,
                    description: prod.name,
                    unit: 'Piece',
                    rate: prod.labour_cost,
                    weight: prod.default_weight,
                    wastage_percent: prod.wastage_percent,
                    labour_cost: prod.labour_cost
                }))
            }
        }
        if (field === 'has_karigar' && !value) {
            setDraftItem(prev => ({ ...prev, has_karigar: false, karigar_id: undefined, karigar_rate: 0, karigar_quantity: 0 }))
            setKarigarSplits([])
        }
        if (field === 'karigar_id') {
            const k = karigars.find(kg => kg.id === value)
            if (k) setDraftItem(prev => ({ ...prev, karigar_id: value, karigar_rate: k.default_rate, karigar_quantity: prev.quantity }))
        }
    }

    // LIVE VALIDATION HELPER
    const getStockStatus = () => {
        if (materialType !== 'OWN' || !draftItem.product_id) return null
        const prod = products.find(p => p.id === draftItem.product_id)
        if (!prod) return null

        const requested = Number(draftItem.quantity || 0)
        const available = Number(prod.current_stock)

        if (requested > available) {
            return { type: 'error', msg: `Insufficient Stock! (Max: ${available})` }
        }
        if (available <= 5) {
            return { type: 'warning', msg: `Low Stock! Only ${available} left.` }
        }
        return { type: 'success', msg: `Stock Available: ${available}` }
    }

    const stockStatus = getStockStatus()

    const addToBill = () => {
        setDraftError('')

        if (materialType === 'CLIENT' && !draftItem.description) return setDraftError('Please select a Job Work Item.')
        if (materialType === 'OWN' && !draftItem.product_id) return setDraftError('Please select a Product.')
        if (Number(draftItem.quantity) <= 0) return setDraftError('Quantity must be greater than zero.')

        // Stock Check (OWN only) - double check
        if (materialType === 'OWN' && draftItem.product_id) {
            const prod = products.find(p => p.id === draftItem.product_id)
            if (prod && Number(draftItem.quantity) > prod.current_stock) {
                return setDraftError(`Insufficient Stock! Available: ${prod.current_stock}`)
            }
        }

        // Handle Karigar Assignments
        if (draftItem.has_karigar) {
            if (karigarSplits.length > 0) {
                // MULTI-SPLIT MODE
                const totalSplit = karigarSplits.reduce((acc, curr) => acc + curr.quantity, 0)
                if (Math.abs(totalSplit - Number(draftItem.quantity)) > 0.01) {
                    return setDraftError(`Split quantity (${totalSplit}) does not match Total Quantity (${draftItem.quantity})`)
                }

                // Add each split as a separate line item
                karigarSplits.forEach(split => {
                    const k = karigars.find(kg => kg.id === split.karigar_id)
                    append({
                        ...draftItem,
                        quantity: split.quantity,
                        karigar_id: split.karigar_id,
                        karigar_rate: k?.default_rate || 0,
                        karigar_quantity: split.quantity
                    })
                })
            } else {
                // SINGLE MODE
                if (!draftItem.karigar_id) return setDraftError('Please select a Karigar.')
                append({ ...draftItem })
            }
        } else {
            // NO KARIGAR
            append({ ...draftItem })
        }

        const resetBase = materialType === 'CLIENT'
            ? { description: '', quantity: 0, unit: 'KG', rate: 0 }
            : { description: '', quantity: 0, unit: 'Piece', rate: 0, product_id: undefined }
        setDraftItem(resetBase)
        setKarigarSplits([])
    }

    const onSubmit = async (data: FormValues) => {
        try {
            setSubmissionError('')
            if (data.items.length === 0) throw new Error("The bill is empty! Add items first.")
            if (!data.customer_name) throw new Error("Customer Name is required.")

            if (data.material_type === 'OWN') {
                for (const item of data.items) {
                    if (item.product_id) {
                        const p = products.find(prod => prod.id === item.product_id)
                        if (p && Number(item.quantity) > p.current_stock) {
                            throw new Error(`Stock changed! Insufficient stock for ${p.name}`)
                        }
                    }
                }
            }

            const cleanedItems = data.items.map(item => ({
                ...item,
                karigar_id: item.has_karigar ? item.karigar_id : undefined,
                karigar_rate: item.has_karigar ? item.karigar_rate : undefined,
                karigar_quantity: item.has_karigar ? item.karigar_quantity : undefined
            }))

            const gstRateValue = data.material_type === 'CLIENT'
                ? (gstSettings?.defaultGstRateJobWork ?? 5)
                : (gstSettings?.defaultGstRateSale ?? 3)

            const result = await createOrder({
                customer_name: data.customer_name,
                order_date: data.order_date,
                material_type: data.material_type,
                status: 'Pending'
            }, cleanedItems, data.gst_enabled, gstRateValue)

            // SHOW SUCCESS MODAL INSTEAD OF NAVIGATING
            setSuccessData({
                open: true,
                orderId: result.order_id,
                customer: data.customer_name,
                total: result.total || 0,
                // Pass items to success state for sharing
                items: data.items,
                date: data.order_date
            })

            // Clear Form
            replace([])
            reset()

        } catch (err: any) {
            console.error(err)
            let msg = err.message
            if (msg.includes('products_current_stock_check') || msg.includes('check constraint')) {
                msg = "Insufficient Stock! Current stock level prevents this order."
            }
            setSubmissionError(msg)
        }
    }


    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem', height: 'calc(100vh - 100px)', position: 'relative' }}>

            {/* SUCCESS MODAL OVERLAY */}
            {successData && successData.open && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(5px)' }}>
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '24px', width: '450px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center', animation: 'scaleIn 0.3s ease' }}>
                        <div style={{ background: '#dcfce7', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                            <CheckCircle2 size={48} color="#16a34a" strokeWidth={3} />
                        </div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>Order Placed!</h2>
                        <p style={{ color: '#6b7280', fontSize: '1.1rem' }}>Order for <strong>{successData.customer}</strong> saved.</p>

                        <div style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '12px', marginTop: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: '0.25rem' }}>Total Amount</div>
                            <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111827' }}>₹{formatIndianRupees(successData.total)}</div>
                        </div>

                        {/* Buttons Removed - Simplified View */}
                        <div style={{ marginTop: '2rem' }}>
                            <button
                                onClick={() => {
                                    setSuccessData(null) // Close
                                }}
                                style={{
                                    background: '#1f2937',
                                    color: 'white',
                                    border: 'none',
                                    padding: '1rem',
                                    borderRadius: '12px',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    width: '100%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem'
                                }}
                            >
                                <CheckCircle2 size={20} /> Close & Start New Order
                            </button>
                        </div>

                    </div>
                </div>
            )}


            {/* TOP HEADER BAR */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', background: 'white', padding: '1rem 1.5rem', borderRadius: '12px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)', padding: '0.75rem', borderRadius: '10px', color: 'white' }}>
                        <ShoppingCart size={24} />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            Create New Order
                            {silverRate && (
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, background: '#fef3c7', color: '#92400e', padding: '0.2rem 0.6rem', borderRadius: '6px', border: '1px solid #fde68a' }}>
                                    Live Rate: ₹{(silverRate.rate_10g * 100).toLocaleString()}/kg
                                </span>
                            )}
                        </h1>
                        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>Full Screen Workbench Mode</p>
                    </div>
                </div>

                {/* Material Switcher */}
                <div style={{ display: 'flex', background: '#f3f4f6', padding: '4px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <button
                        type="button"
                        onClick={() => { setValue('material_type', 'CLIENT'); remove() }}
                        style={{
                            padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer',
                            background: materialType === 'CLIENT' ? 'white' : 'transparent',
                            color: materialType === 'CLIENT' ? 'var(--color-primary)' : '#6b7280',
                            boxShadow: materialType === 'CLIENT' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Hammer size={16} /> Client Material (JOB WORK)
                    </button>
                    <button
                        type="button"
                        onClick={() => { setValue('material_type', 'OWN'); remove() }}
                        style={{
                            padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: 'pointer',
                            background: materialType === 'OWN' ? 'white' : 'transparent',
                            color: materialType === 'OWN' ? 'var(--color-success)' : '#6b7280',
                            boxShadow: materialType === 'OWN' ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        <Package size={16} /> Own Material (SALE)
                    </button>
                </div>
            </div>

            {/* MAIN SPLIT LAYOUT */}
            <div className="grid-responsive" style={{ gap: '1.5rem' }}>

                {/* LEFT: WORKBENCH */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    {/* Customer Card */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem', fontWeight: 700, color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} /> Customer Details
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                            <input
                                {...register('customer_name', { required: true })}
                                list="customer_options"
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: errors.customer_name ? '2px solid #ef4444' : '1px solid #d1d5db', fontSize: '1rem' }}
                                placeholder="Search or Type Customer Name"
                                autoFocus
                            />
                            <datalist id="customer_options">
                                {savedCustomers.map(c => <option key={c.id} value={c.name} />)}
                            </datalist>
                            <input
                                type="date"
                                {...register('order_date', { required: true })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '1rem' }}
                            />
                        </div>
                    </div>

                    {/* Add Item Card */}
                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: materialType === 'OWN' ? '2px solid var(--color-success)' : '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', flex: 1 }}>
                        <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #f3f4f6' }}>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: materialType === 'OWN' ? 'var(--color-success)' : '#1f2937' }}>
                                {materialType === 'OWN' ? 'OWN MATERIAL SALE' : 'CLIENT MATERIAL JOB WORK'}
                            </h3>
                            <p style={{ margin: '0.25rem 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                                {materialType === 'OWN'
                                    ? 'Select Stocked Products to Sell. Auto-deducts stock.'
                                    : 'Select Job Work Service. No stock impact.'}
                            </p>
                        </div>

                        {draftError && (
                            <div style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <AlertTriangle size={16} /> {draftError}
                            </div>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            {/* SELECTOR */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#4b5563' }}>
                                    {materialType === 'CLIENT' ? 'Select Job Work Service' : 'Select Product (From Stock)'}
                                </label>
                                <select
                                    value={materialType === 'CLIENT' ? draftItem.description : (draftItem.product_id || '')}
                                    onChange={(e) => handleDraftItemChange(materialType === 'CLIENT' ? 'description' : 'product_id', e.target.value)}
                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '1rem', background: 'white' }}
                                >
                                    <option value="">-- Select Item --</option>
                                    {materialType === 'CLIENT'
                                        ? jobWorkItems.map(j => <option key={j.id} value={j.name}>{j.name} (Service) - ₹{j.default_rate}</option>)
                                        : products.map(p => <option key={p.id} value={p.id} disabled={p.current_stock <= 0}>{p.name} - Stock: {p.current_stock}{p.current_stock <= 0 ? ' (OUT)' : ''}</option>)
                                    }
                                </select>
                            </div>

                            {/* Qty & Rate Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#4b5563' }}>Quantity ({draftItem.unit})</label>
                                    <input
                                        type="number" step="any"
                                        value={draftItem.quantity || ''}
                                        onChange={(e) => handleDraftItemChange('quantity', Number(e.target.value))}
                                        style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '1.25rem', fontWeight: 700 }}
                                        placeholder="0"
                                    />
                                    {/* LIVE STOCK INDICATOR */}
                                    {materialType === 'OWN' && stockStatus && (
                                        <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: stockStatus.type === 'error' ? '#dc2626' : stockStatus.type === 'warning' ? '#d97706' : '#059669', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            {stockStatus.type === 'error' ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {stockStatus.msg}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.5rem', color: '#4b5563' }}>Rate (₹)</label>
                                    <input
                                        type="number" step="any"
                                        value={draftItem.rate || ''}
                                        onChange={(e) => handleDraftItemChange('rate', Number(e.target.value))}
                                        style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: '2px solid #e5e7eb', fontSize: '1.25rem', fontWeight: 700 }}
                                    />
                                </div>
                            </div>

                            {/* KARIGAR SELECTION */}
                            <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 600, color: '#374151', userSelect: 'none', marginBottom: '0.5rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={draftItem.has_karigar || false}
                                        onChange={(e) => handleDraftItemChange('has_karigar', e.target.checked)}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)' }}
                                    />
                                    Assign to Karigar?
                                </label>

                                {draftItem.has_karigar && (
                                    <div style={{ animation: 'fadeIn 0.2s' }}>
                                        {/* SPLIT LIST */}
                                        {karigarSplits.map((split, idx) => (
                                            <div key={idx} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                                                <div style={{ flex: 1, fontWeight: 500, background: 'white', padding: '0.5rem', borderRadius: '6px', border: '1px solid #d1d5db' }}>
                                                    {split.name}
                                                </div>
                                                <div style={{ width: '80px', textAlign: 'center', fontWeight: 600 }}>
                                                    {split.quantity} {draftItem.unit}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setKarigarSplits(prev => prev.filter((_, i) => i !== idx))}
                                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.4rem', cursor: 'pointer' }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}

                                        {/* ADDER */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
                                            <select
                                                id="split_karigar"
                                                className="karigar-select"
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                                            >
                                                <option value="">-- Karigar --</option>
                                                {karigars.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                            </select>

                                            <input
                                                id="split_qty"
                                                type="number"
                                                placeholder="Qty"
                                                defaultValue={Math.max(0, (draftItem.quantity || 0) - karigarSplits.reduce((acc, c) => acc + c.quantity, 0))}
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '0.9rem' }}
                                            />

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const kSelect = document.getElementById('split_karigar') as HTMLSelectElement
                                                    const qInput = document.getElementById('split_qty') as HTMLInputElement
                                                    const kId = kSelect.value
                                                    const qty = Number(qInput.value)

                                                    if (!kId || qty <= 0) return

                                                    const kName = karigars.find(k => k.id === kId)?.name || 'Unknown'
                                                    setKarigarSplits(prev => [...prev, { karigar_id: kId, name: kName, quantity: qty }])

                                                    // Reset
                                                    kSelect.value = ""
                                                    qInput.value = ""
                                                }}
                                                style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem', cursor: 'pointer' }}
                                            >
                                                <Plus size={18} />
                                            </button>
                                        </div>

                                        <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '4px', textAlign: 'right' }}>
                                            Assigned: {karigarSplits.reduce((a, c) => a + c.quantity, 0)} / {draftItem.quantity || 0}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* ADD BUTTON */}
                            <button
                                type="button"
                                onClick={addToBill}
                                disabled={stockStatus?.type === 'error'}
                                style={{
                                    background: (stockStatus?.type === 'error') ? '#9ca3af' : 'var(--color-primary)',
                                    color: 'white', border: 'none', padding: '1rem', borderRadius: '12px',
                                    fontSize: '1rem', fontWeight: 700, cursor: (stockStatus?.type === 'error') ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                                    marginTop: '0.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                                }}
                            >
                                <Plus size={20} /> Add Item to Bill <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: BILL PREVIEW */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e5e7eb', boxShadow: '0 10px 30px rgba(0,0,0,0.08)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                        {/* Header */}
                        <div style={{ background: '#f9fafb', padding: '1.25rem', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#111827' }}>Current Bill</h2>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#6b7280', background: 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', border: '1px solid #e5e7eb' }}>
                                {fields.length} Items
                            </div>
                        </div>

                        {/* Items List */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                            {fields.length === 0 ? (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', minHeight: '300px' }}>
                                    <ShoppingCart size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                                    <p>Bill is empty.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {fields.map((item, index) => (
                                        <div key={item.id} style={{ background: '#f9fafb', padding: '1rem', borderRadius: '12px', border: '1px solid #f3f4f6', position: 'relative' }}>
                                            <div style={{ fontWeight: 600, color: '#374151' }}>{item.description}</div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', color: '#6b7280', fontSize: '0.9rem' }}>
                                                <span>{item.quantity} {item.unit} x ₹{item.rate}</span>
                                                <span style={{ fontWeight: 700, color: '#111827' }}>₹{formatIndianRupees(item.quantity * item.rate)}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => remove(index)}
                                                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Totals Footer */}
                        <div style={{ background: '#111827', padding: '1.5rem', color: 'white', marginTop: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        {...register('gst_enabled')}
                                        style={{ width: '16px', height: '16px' }}
                                    />
                                    Apply GST?
                                </label>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Subtotal: ₹{formatIndianRupees(subtotal)}</div>
                                    {gstEnabled && <div style={{ fontSize: '0.9rem', color: '#fbbf24' }}>+ GST: ₹{formatIndianRupees(gstAmount)}</div>}
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>Grand Total</div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981' }}>₹{formatIndianRupees(grandTotal)}</div>
                            </div>

                            <button
                                type="button"
                                onClick={handleSubmit(onSubmit)}
                                disabled={isSubmitting || fields.length === 0}
                                style={{
                                    width: '100%', marginTop: '1.25rem', padding: '1rem',
                                    background: (isSubmitting || fields.length === 0) ? '#374151' : 'var(--color-success)',
                                    color: (isSubmitting || fields.length === 0) ? '#9ca3af' : 'white',
                                    border: 'none', borderRadius: '10px',
                                    fontSize: '1.1rem', fontWeight: 700, cursor: (isSubmitting || fields.length === 0) ? 'not-allowed' : 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                                }}
                            >
                                {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={22} />}
                                {isSubmitting ? 'Processing...' : 'Save Order'}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
            {/* Keyframes */}
            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    )
}
