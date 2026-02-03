import { useState, useEffect } from 'react'
import { getPLReport, PLData } from '../services/accountingService'
import { TrendingUp, TrendingDown, IndianRupee, PieChart, ArrowUpRight, ArrowDownRight } from 'lucide-react'

export default function AccountingDashboard() {
    const [data, setData] = useState<PLData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const report = await getPLReport()
            setData(report)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    // Show UI instantly - removed loading check
    if (error) return <p style={{ color: 'red' }}>{error}</p>
    if (!data) return null // Show nothing until data loads

    return (
        <div>
            <h1 style={{ marginBottom: '1.5rem' }}>Financial Dashboard (P&L)</h1>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card
                    title="Gross Income"
                    value={data.jobWorkIncome + data.productSalesIncome}
                    icon={<TrendingUp color="var(--color-success)" />}
                    color="var(--color-success-light)"
                />
                <Card
                    title="Total Expenses"
                    value={data.totalExpenses}
                    icon={<TrendingDown color="var(--color-error)" />}
                    color="var(--color-error-light)"
                />
                <Card
                    title="Net Profit"
                    value={data.netProfit}
                    icon={<PieChart color="var(--color-info)" />}
                    color="var(--color-info-light)"
                    highlight
                />
            </div>

            {/* Breakdown Table */}
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--color-border)' }}>
                <h3 style={{ marginTop: 0, marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Income & Expense Breakdown</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                        <Row label="Job Work Income" value={data.jobWorkIncome} icon={<ArrowUpRight size={16} color="var(--color-success)" />} />
                        <Row label="Product Sales Income" value={data.productSalesIncome} icon={<ArrowUpRight size={16} color="var(--color-success)" />} />
                        <Row label="Karigar Payments (Paid)" value={-data.karigarExpenses} icon={<ArrowDownRight size={16} color="var(--color-error)" />} isExpense />
                        <Row label="General Operating Expenses" value={-data.generalExpenses} icon={<ArrowDownRight size={16} color="var(--color-error)" />} isExpense />
                        <tr style={{ borderTop: '2px solid #f1f5f9' }}>
                            <td style={{ padding: '1rem 0', fontWeight: 700, fontSize: '1.1rem' }}>Net Profit</td>
                            <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 700, fontSize: '1.1rem', color: data.netProfit >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}>
                                ₹{data.netProfit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>
                * Note: GST collected is not included in Income or Profit calculation.
            </p>
        </div>
    )
}

function Card({ title, value, icon, color, highlight }: any) {
    return (
        <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            border: highlight ? '2px solid #6366f1' : '1px solid var(--color-border)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
        }}>
            <div style={{ background: color, padding: '0.75rem', borderRadius: '10px' }}>{icon}</div>
            <div>
                <div style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: 500 }}>{title}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹{value.toLocaleString('en-IN')}</div>
            </div>
        </div>
    )
}

function Row({ label, value, icon, isExpense }: any) {
    return (
        <tr style={{ borderBottom: '1px solid #f8fafc' }}>
            <td style={{ padding: '0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {icon} {label}
            </td>
            <td style={{ padding: '0.75rem 0', textAlign: 'right', fontWeight: 500, color: isExpense ? 'var(--color-error)' : 'inherit' }}>
                {value >= 0 ? '+' : ''}{value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
        </tr>
    )
}
