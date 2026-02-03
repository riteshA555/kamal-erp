import React from 'react';

const LoadingSpinner: React.FC = () => {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            minHeight: '200px',
            width: '100%',
            color: 'var(--color-primary)'
        }}>
            <div className="spinner" style={{
                width: '40px',
                height: '40px',
                border: '3px solid var(--color-bg-secondary)',
                borderTop: '3px solid var(--color-primary)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
            }}></div>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
};

export default LoadingSpinner;
