import { ReactNode } from 'react'

interface ResponsiveTableProps {
    headers: string[]
    children: ReactNode
    className?: string
}

export function ResponsiveTable({ headers, children, className = '' }: ResponsiveTableProps) {
    return (
        <div className="table-responsive">
            <table className={`mobile-card-view ${className}`} style={{
                width: '100%',
                borderCollapse: 'collapse',
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden'
            }}>
                <thead>
                    <tr>
                        {headers.map((header, idx) => (
                            <th key={idx} style={{
                                padding: '1rem',
                                textAlign: 'left',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 600,
                                color: 'var(--color-text-secondary)',
                                borderBottom: '1px solid var(--color-border)',
                                background: 'var(--color-bg)'
                            }}>
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {children}
                </tbody>
            </table>
        </div>
    )
}

interface ResponsiveGridProps {
    children: ReactNode
    minWidth?: string
}

export function ResponsiveGrid({ children, minWidth = '250px' }: ResponsiveGridProps) {
    return (
        <div className="grid-responsive" style={{
            display: 'grid',
            gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}, 1fr))`,
            gap: '1.5rem'
        }}>
            {children}
        </div>
    )
}

interface ResponsiveFormProps {
    children: ReactNode
}

export function ResponsiveForm({ children }: ResponsiveFormProps) {
    return (
        <div className="form-responsive" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1rem'
        }}>
            {children}
        </div>
    )
}
