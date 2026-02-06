import { useState, useEffect } from 'react'
import { getKarigars, createKarigar, updateKarigar, deleteKarigar, getKarigarBalances, Karigar } from '../../../services/karigarService'
import { getSettings } from '../../../services/settingsService'
import { KarigarSettings } from '../../../types/settings'
import { Plus, Hammer, Settings2, Trash2, Edit2, AlertCircle } from 'lucide-react'

export default function KarigarMaster() {
    const [karigars, setKarigars] = useState<Karigar[]>([])
    const [balances, setBalances] = useState<{ [key: string]: number }>({})
    const [settings, setSettings] = useState<KarigarSettings | null>(null)

    // Form State
    const [isAdding, setIsAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        work_type: 'General',
        rate_type: 'Per KG',
        default_rate: 0,
        status: 'ACTIVE'
    })

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [kData, bData, sData] = await Promise.all([
                getKarigars(),
                getKarigarBalances(),
                getSettings<KarigarSettings>('karigar_settings')
            ])
            setKarigars(kData)
            setBalances(bData)
            setSettings(sData)

            // Set Default if adding new
            if (!editingId && sData) {
                setFormData(prev => ({ ...prev, rate_type: sData.defaultRateType === 'per_kg' ? 'Per KG' : sData.defaultRateType === 'per_piece' ? 'Per Piece' : 'Fixed' }))
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingId) {
                await updateKarigar(editingId, formData as any)
                alert('Karigar Updated Successfully')
            } else {
                await createKarigar(formData as any)
                alert('Karigar Created Successfully')
            }
            resetForm()
            loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const handleEdit = (k: Karigar) => {
        setFormData({
            name: k.name,
            work_type: k.work_type,
            rate_type: k.rate_type,
            default_rate: k.default_rate,
            status: k.status
        })
        setEditingId(k.id)
        setIsAdding(true)
    }

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}?`)) return
        try {
            await deleteKarigar(id)
            loadData()
        } catch (err: any) {
            alert(err.message)
        }
    }

    const resetForm = () => {
        setFormData({
            name: '',
            work_type: 'General',
            rate_type: settings?.defaultRateType === 'per_kg' ? 'Per KG' : settings?.defaultRateType === 'per_piece' ? 'Per Piece' : 'Fixed',
            default_rate: 0,
            status: 'ACTIVE'
        })
        setEditingId(null)
        setIsAdding(false)
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h1 style={{ margin: 0 }}>Karigar Master</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b' }}>Manage Artisans & Rates</p>
                </div>
                <button
                    onClick={() => {
                        if (isAdding) resetForm()
                        else setIsAdding(true)
                    }}
                    style={{
                        background: isAdding ? '#f1f5f9' : 'var(--color-primary)',
                        color: isAdding ? '#334155' : 'white',
                        border: isAdding ? '1px solid #cbd5e1' : 'none',
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer'
                    }}
                >
                    <Plus size={18} style={{ transform: isAdding ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s' }} />
                    {isAdding ? 'Cancel' : 'Add Karigar'}
                </button>
            </div>

            {isAdding && (
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', marginBottom: '1.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <h3 style={{ marginTop: 0, marginBottom: '1rem', color: 'var(--color-primary)' }}>
                        {editingId ? 'Edit Karigar' : 'New Karigar'}
                    </h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Karigar Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outlineColor: 'var(--color-primary)' }}
                                placeholder="e.g. Raju Bengali"
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Work Type</label>
                            <select
                                value={formData.work_type}
                                onChange={e => setFormData({ ...formData, work_type: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outlineColor: 'var(--color-primary)', background: 'white' }}
                            >
                                <option>Cutting</option>
                                <option>Choti</option>
                                <option>Half Belt</option>
                                <option>General</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Rate Type</label>
                            <select
                                value={formData.rate_type}
                                onChange={e => setFormData({ ...formData, rate_type: e.target.value })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outlineColor: 'var(--color-primary)', background: 'white' }}
                            >
                                <option>Per KG</option>
                                <option>Per Piece</option>
                                <option>Fixed</option>
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Default Rate (₹)</label>
                            <input
                                type="number"
                                value={formData.default_rate}
                                onChange={e => setFormData({ ...formData, default_rate: Number(e.target.value) })}
                                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outlineColor: 'var(--color-primary)' }}
                            />
                        </div>
                        {editingId && (
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.9rem' }}>Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outlineColor: 'var(--color-primary)', background: 'white' }}
                                >
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </div>
                        )}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                            <button type="submit" style={{ flex: 1, padding: '0.8rem', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                                {editingId ? 'Update Karigar' : 'Save Karigar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid-responsive">
                {karigars.map(k => {
                    const balance = balances[k.id] || 0
                    return (
                        <div key={k.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-sm)', position: 'relative' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>{k.name}</div>
                                    <span style={{
                                        display: 'inline-block',
                                        marginTop: '0.4rem',
                                        padding: '0.25rem 0.6rem',
                                        borderRadius: '50px',
                                        fontSize: '0.7rem',
                                        background: k.status === 'ACTIVE' ? '#dcfce7' : '#f1f5f9',
                                        color: k.status === 'ACTIVE' ? '#166534' : '#64748b',
                                        fontWeight: 700,
                                        letterSpacing: '0.05em'
                                    }}>{k.status}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                        onClick={() => handleEdit(k)}
                                        style={{ padding: '0.5rem', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        title="Edit"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(k.id, k.name)}
                                        style={{ padding: '0.5rem', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '1rem 0', margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Hammer size={14} /> Work Type</span>
                                    <span style={{ fontWeight: 600 }}>{k.work_type}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Settings2 size={14} /> Rate</span>
                                    <span style={{ fontWeight: 600 }}>₹{k.default_rate} / {k.rate_type === 'Per KG' ? 'kg' : 'pc'}</span>
                                </div>
                            </div>

                            <div style={{ background: balance > 0 ? '#fff1f2' : '#f8fafc', padding: '1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: balance > 0 ? '#e11d48' : '#64748b', fontWeight: 600, fontSize: '0.9rem' }}>
                                    <AlertCircle size={16} />
                                    Pending Dues
                                </div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: balance > 0 ? '#e11d48' : '#334155' }}>
                                    ₹{balance.toLocaleString()}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
