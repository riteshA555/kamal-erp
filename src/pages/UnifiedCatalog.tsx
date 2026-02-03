import { useState, useEffect } from 'react'
import { getProducts, updateProduct, deleteProduct, addProduct } from '../services/productService'
import { getJobWorkItems, updateJobWorkItem, deleteJobWorkItem, addJobWorkItem } from '../services/jobWorkService'
import { Product, JobWorkItem } from '../types'
import { Search, Package, Hammer, Edit2, Trash2, Check, X, Plus } from 'lucide-react'

export default function UnifiedCatalog() {
    const [products, setProducts] = useState<Product[]>([])
    const [services, setServices] = useState<JobWorkItem[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [tab, setTab] = useState<'Products' | 'Services'>('Products')

    // UI states
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editValues, setEditValues] = useState<any>({})
    const [isAdding, setIsAdding] = useState(false)
    const [itemTypeToAdd, setItemTypeToAdd] = useState<'Products' | 'Services'>('Products')
    const [newValues, setNewValues] = useState<any>({
        name: '',
        category: '',
        unit: 'Gram',
        default_weight: '',
        wastage_percent: '',
        labour_cost: '',
        default_rate: '',
        current_stock: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        // Don't show loading if we already have data (from cache)
        if (products.length === 0 && services.length === 0) {
            setLoading(true)
        }
        try {
            const [p, s] = await Promise.all([getProducts(), getJobWorkItems()])
            setProducts(p)
            setServices(s)
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    const startEditing = (item: any) => {
        setEditingId(item.id)
        setEditValues({ ...item })
    }

    const cancelEditing = () => {
        setEditingId(null)
        setEditValues({})
    }

    const openAddForm = () => {
        setItemTypeToAdd(tab)
        setIsAdding(true)
        setNewValues({
            name: '',
            category: '',
            unit: 'Gram',
            default_weight: '',
            wastage_percent: '',
            labour_cost: '',
            default_rate: '',
            current_stock: ''
        })
    }

    const handleUpdateProduct = async () => {
        if (!editingId) return
        try {
            await updateProduct(editingId, {
                name: editValues.name,
                category: editValues.category,
                size: editValues.size,
                default_weight: Number(editValues.default_weight),
                wastage_percent: Number(editValues.wastage_percent),
                labour_cost: Number(editValues.labour_cost)
            })
            setEditingId(null)
            loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleUpdateService = async () => {
        if (!editingId) return
        try {
            await updateJobWorkItem(editingId, {
                name: editValues.name,
                unit: editValues.unit,
                default_rate: Number(editValues.default_rate)
            })
            setEditingId(null)
            loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleDeleteProduct = async (id: string, name: string) => {
        if (confirm(`Bhai, kya aap sach mein "${name}" ko delete karna chahte hain?`)) {
            try {
                await deleteProduct(id)
                loadData()
            } catch (err: any) {
                alert(err.message)
            }
        }
    }

    const handleDeleteService = async (id: string, name: string) => {
        if (confirm(`Bhai, kya aap sach mein "${name}" service ko delete karna chahte hain?`)) {
            try {
                await deleteJobWorkItem(id)
                loadData()
            } catch (err: any) {
                alert(err.message)
            }
        }
    }

    const handleAddItem = async () => {
        try {
            if (itemTypeToAdd === 'Products') {
                if (!newValues.name || !newValues.category) return alert("Bhai, Name aur Category likhna zaroori hai!");
                await addProduct({
                    name: newValues.name,
                    category: newValues.category,
                    size: newValues.size || '',
                    default_weight: Number(newValues.default_weight || 0),
                    wastage_percent: Number(newValues.wastage_percent || 0),
                    labour_cost: Number(newValues.labour_cost || 0),
                    current_stock: Number(newValues.current_stock || 0),
                    is_active: true
                })
            } else {
                if (!newValues.name || !newValues.unit) return alert("Bhai, Service ka Name aur Unit (Gram/Piece) batana zaroori hai!");
                await addJobWorkItem({
                    name: newValues.name,
                    unit: newValues.unit,
                    default_rate: Number(newValues.default_rate || 0),
                    is_active: true
                })
            }
            setIsAdding(false)
            loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredServices = services.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Business Catalog</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontSize: '0.9rem' }}>Manage your products and services in one place.</p>
                </div>
                <button
                    onClick={openAddForm}
                    style={{
                        background: 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontWeight: 700,
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                    }}
                >
                    <Plus size={20} /> Add New Entry
                </button>
            </div>

            {/* Premium Add Form */}
            {isAdding && (
                <div style={{
                    background: 'white',
                    padding: '2rem',
                    borderRadius: '24px',
                    border: '1px solid #e2e8f0',
                    marginBottom: '2.5rem',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Create New Catalog Entry</h2>
                            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Fill in the details below to add to your list.</p>
                        </div>
                        <button onClick={() => setIsAdding(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Type Toggle Switch */}
                    <div style={{
                        display: 'inline-flex',
                        background: '#f1f5f9',
                        padding: '0.4rem',
                        borderRadius: '12px',
                        marginBottom: '2rem'
                    }}>
                        <button
                            onClick={() => setItemTypeToAdd('Products')}
                            style={{
                                border: 'none',
                                padding: '0.6rem 1.5rem',
                                borderRadius: '8px',
                                background: itemTypeToAdd === 'Products' ? 'white' : 'transparent',
                                color: itemTypeToAdd === 'Products' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: itemTypeToAdd === 'Products' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Package size={16} /> Product
                        </button>
                        <button
                            onClick={() => setItemTypeToAdd('Services')}
                            style={{
                                border: 'none',
                                padding: '0.6rem 1.5rem',
                                borderRadius: '8px',
                                background: itemTypeToAdd === 'Services' ? 'white' : 'transparent',
                                color: itemTypeToAdd === 'Services' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: itemTypeToAdd === 'Services' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            <Hammer size={16} /> Service
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Nama (Item Name)</label>
                            <input
                                type="text"
                                placeholder={itemTypeToAdd === 'Products' ? "e.g. Silver Chain 925" : "e.g. Laser Cutting"}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }}
                                value={newValues.name || ''}
                                onChange={e => setNewValues({ ...newValues, name: e.target.value })}
                            />
                        </div>

                        {itemTypeToAdd === 'Products' ? (
                            <>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Category</label>
                                    <input type="text" placeholder="e.g. Ring, Chain, Payal" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.category || ''} onChange={e => setNewValues({ ...newValues, category: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Size (e.g. Small, 7 inch)</label>
                                    <input type="text" placeholder='e.g. Small, 18"' style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.size || ''} onChange={e => setNewValues({ ...newValues, size: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Weight (g)</label>
                                    <input type="number" step="0.01" placeholder="0.00" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.default_weight || ''} onChange={e => setNewValues({ ...newValues, default_weight: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Wastage (%)</label>
                                    <input type="number" step="0.1" placeholder="0.0" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.wastage_percent || ''} onChange={e => setNewValues({ ...newValues, wastage_percent: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Labour Rate (₹)</label>
                                    <input type="number" placeholder="₹ per piece" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.labour_cost || ''} onChange={e => setNewValues({ ...newValues, labour_cost: e.target.value })} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Opening Stock</label>
                                    <input type="number" placeholder="Available pieces" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.current_stock || ''} onChange={e => setNewValues({ ...newValues, current_stock: e.target.value })} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Unit (Paimana)</label>
                                    <select
                                        style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', background: 'white' }}
                                        value={newValues.unit}
                                        onChange={e => setNewValues({ ...newValues, unit: e.target.value })}
                                    >
                                        <option value="Gram">Gram</option>
                                        <option value="Piece">Piece (Nug)</option>
                                        <option value="Fixed">Fixed (Lumpsum)</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '0.4rem' }}>Service Rate (₹)</label>
                                    <input type="number" placeholder="₹ per unit" style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1' }} value={newValues.default_rate || ''} onChange={e => setNewValues({ ...newValues, default_rate: e.target.value })} />
                                </div>
                            </>
                        )}
                    </div>

                    <div style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => setIsAdding(false)}
                            style={{
                                background: 'var(--color-bg)',
                                color: 'var(--color-text-secondary)',
                                border: 'none',
                                padding: '0.8rem 1.5rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: 600
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAddItem}
                            style={{
                                background: 'var(--color-primary)',
                                color: 'white',
                                border: 'none',
                                padding: '0.8rem 2.5rem',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                fontWeight: 700
                            }}
                        >
                            Save to Catalog
                        </button>
                    </div>
                </div>
            )}

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '2.5rem',
                padding: '1.25rem',
                background: '#f1f5f9',
                borderRadius: '16px',
                border: '1px solid #e2e8f0'
            }}>
                <div style={{ flex: '1 1 300px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                        type="text"
                        placeholder="Search items or services..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            padding: '0.8rem 1rem 0.8rem 3rem',
                            width: '100%',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            background: 'white',
                            fontSize: '1rem',
                            boxSizing: 'border-box'
                        }}
                    />
                </div>
                <div style={{
                    display: 'flex',
                    background: 'white',
                    padding: '0.35rem',
                    borderRadius: '12px',
                    border: '1px solid #cbd5e1',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    flex: '0 1 auto'
                }}>
                    <button
                        onClick={() => { setTab('Products'); setIsAdding(false); }}
                        style={{
                            borderRadius: '8px',
                            padding: '0.6rem 1.25rem',
                            border: 'none',
                            background: tab === 'Products' ? 'var(--color-primary)' : 'transparent',
                            color: tab === 'Products' ? 'white' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Package size={16} /> Products
                    </button>
                    <button
                        onClick={() => { setTab('Services'); setIsAdding(false); }}
                        style={{
                            borderRadius: '8px',
                            padding: '0.6rem 1.25rem',
                            border: 'none',
                            background: tab === 'Services' ? 'var(--color-primary)' : 'transparent',
                            color: tab === 'Services' ? 'white' : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                        }}
                    >
                        <Hammer size={16} /> Services
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {tab === 'Products' ? (
                    filteredProducts.length === 0 ? <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>No products found.</p> :
                        filteredProducts.map(p => (
                            <div key={p.id} style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: editingId === p.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                    {editingId === p.id ? (
                                        <input
                                            type="text"
                                            style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: '#475569', width: '100px' }}
                                            value={editValues.category}
                                            onChange={e => setEditValues({ ...editValues, category: e.target.value })}
                                        />
                                    ) : (
                                        <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 800, color: '#94a3b8' }}>{p.category}</span>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {editingId === p.id ? (
                                            <>
                                                <button onClick={handleUpdateProduct} style={{ background: 'var(--color-success)', padding: '4px', borderRadius: '4px', color: 'white', border: 'none', cursor: 'pointer' }}><Check size={14} /></button>
                                                <button onClick={cancelEditing} style={{ background: 'var(--color-text-secondary)', padding: '4px', borderRadius: '4px', color: 'white', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEditing(p)} style={{ background: 'var(--color-bg)', padding: '4px', borderRadius: '4px', color: 'var(--color-text-secondary)', border: 'none', cursor: 'pointer' }}><Edit2 size={14} /></button>
                                                <button onClick={() => handleDeleteProduct(p.id, p.name)} style={{ background: 'var(--color-error-light)', padding: '4px', borderRadius: '4px', color: 'var(--color-error)', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.8rem' }}>
                                    {editingId === p.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            <input
                                                type="text"
                                                style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                value={editValues.name}
                                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                                placeholder="Product Name"
                                            />
                                            <input
                                                type="text"
                                                style={{ width: '100%', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                                                value={editValues.size}
                                                onChange={e => setEditValues({ ...editValues, size: e.target.value })}
                                                placeholder="Size (e.g. 18 inch)"
                                            />
                                        </div>
                                    ) : (
                                        <>{p.name} {p.size && `- ${p.size}`}</>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
                                    <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '6px' }}>
                                        Weight: {editingId === p.id ?
                                            <input type="number" style={{ width: '50px', marginLeft: '5px' }} value={editValues.default_weight} onChange={e => setEditValues({ ...editValues, default_weight: e.target.value })} /> :
                                            <b>{p.default_weight}g</b>
                                        }
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '6px' }}>
                                        Wastage: {editingId === p.id ?
                                            <input type="number" style={{ width: '40px', marginLeft: '5px' }} value={editValues.wastage_percent} onChange={e => setEditValues({ ...editValues, wastage_percent: e.target.value })} /> :
                                            <b>{p.wastage_percent}%</b>
                                        }
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '0.4rem', borderRadius: '6px', gridColumn: '1 / -1' }}>
                                        Labour: {editingId === p.id ?
                                            <input type="number" style={{ width: '80px', marginLeft: '5px' }} value={editValues.labour_cost} onChange={e => setEditValues({ ...editValues, labour_cost: e.target.value })} /> :
                                            <b>₹{p.labour_cost}</b>
                                        }
                                    </div>
                                </div>

                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Current Stock</span>
                                    <span style={{ fontWeight: 800, color: p.current_stock > 0 ? 'var(--color-success)' : 'var(--color-error)' }}>{p.current_stock} pcs</span>
                                </div>
                            </div>
                        ))
                ) : (
                    filteredServices.length === 0 ? <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748b' }}>No services found.</p> :
                        filteredServices.map(s => (
                            <div key={s.id} style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: editingId === s.id ? '2px solid var(--color-primary)' : '1px solid var(--color-border)', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                    {editingId === s.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                                            <input
                                                type="text"
                                                style={{ width: '100%', padding: '6px', fontSize: '1.1rem', fontWeight: 700, borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                value={editValues.name}
                                                onChange={e => setEditValues({ ...editValues, name: e.target.value })}
                                            />
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)' }}>
                                                ₹<input type="number" style={{ width: '100px', fontSize: '1.2rem', borderRadius: '4px', border: '1px solid #cbd5e1' }} value={editValues.default_rate} onChange={e => setEditValues({ ...editValues, default_rate: e.target.value })} />
                                                <select
                                                    style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b', padding: '4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                                                    value={editValues.unit}
                                                    onChange={e => setEditValues({ ...editValues, unit: e.target.value })}
                                                >
                                                    <option value="Gram">/ Gram</option>
                                                    <option value="Piece">/ Piece</option>
                                                    <option value="Fixed">/ Fixed</option>
                                                </select>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>{s.name}</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-primary)', marginTop: '0.5rem' }}>
                                                ₹{s.default_rate.toLocaleString()} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#64748b' }}>/ {s.unit}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                                        {editingId === s.id ? (
                                            <>
                                                <button onClick={handleUpdateService} style={{ background: 'var(--color-success)', padding: '6px', borderRadius: '6px', color: 'white', border: 'none', cursor: 'pointer' }}><Check size={16} /></button>
                                                <button onClick={cancelEditing} style={{ background: 'var(--color-text-secondary)', padding: '6px', borderRadius: '6px', color: 'white', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => startEditing(s)} style={{ background: 'var(--color-bg)', padding: '6px', borderRadius: '6px', color: 'var(--color-text-secondary)', border: 'none', cursor: 'pointer' }}><Edit2 size={16} /></button>
                                                <button onClick={() => handleDeleteService(s.id, s.name)} style={{ background: '#fef2f2', padding: '6px', borderRadius: '6px', color: '#ef4444', border: 'none', cursor: 'pointer' }}><Trash2 size={16} /></button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                    Base service rate used for Job Work calculation.
                                </div>
                            </div>
                        ))
                )}
            </div>
        </div>
    )
}
