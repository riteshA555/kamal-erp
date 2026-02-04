import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './features/auth/AuthProvider'
import { SettingsProvider } from './features/settings/SettingsContext'
import Layout from './components/Layout'
import { Suspense } from 'react'
import LoadingSpinner from './shared/ui/LoadingSpinner'
import { lazyWithPreload } from './shared/utils/lazyWithPreload'

// Lazy Load Pages with Preload Support
const Login = lazyWithPreload(() => import('./features/auth/pages/Login'))
const Dashboard = lazyWithPreload(() => import('./features/dashboard/pages/Dashboard'))
const OrderList = lazyWithPreload(() => import('./features/orders/pages/OrderList'))
const OrderCreate = lazyWithPreload(() => import('./features/orders/pages/OrderCreate'))
const ExpenseManager = lazyWithPreload(() => import('./features/accounting/pages/ExpenseManager'))
const AccountingDashboard = lazyWithPreload(() => import('./features/accounting/pages/AccountingDashboard'))
const LedgerStatement = lazyWithPreload(() => import('./features/accounting/pages/LedgerStatement'))
const VendorMaster = lazyWithPreload(() => import('./features/contacts/pages/VendorMaster'))
const CustomerMaster = lazyWithPreload(() => import('./features/contacts/pages/CustomerMaster'))
const KarigarMaster = lazyWithPreload(() => import('./features/production/pages/KarigarMaster'))
const KarigarSettlement = lazyWithPreload(() => import('./features/production/pages/KarigarSettlement'))
const GSTReports = lazyWithPreload(() => import('./features/reports/pages/GSTReports'))
const SilverRateManager = lazyWithPreload(() => import('./features/rates/pages/SilverRateManager'))
const UnifiedCatalog = lazyWithPreload(() => import('./features/catalog/pages/UnifiedCatalog'))
const StockManagement = lazyWithPreload(() => import('./features/inventory/pages/StockManagement'))
const Settings = lazyWithPreload(() => import('./features/settings/pages/Settings'))
const OrderPrint = lazyWithPreload(() => import('./features/orders/components/OrderPrint'))
const InvoicePrint = lazyWithPreload(() => import('./features/orders/components/InvoicePrint'))

// Register components for preloading in Layout
import { registerPreloadableComponents } from './components/Layout'
registerPreloadableComponents({
    Dashboard,
    OrderList,
    OrderCreate,
    ExpenseManager,
    AccountingDashboard,
    LedgerStatement,
    VendorMaster,
    CustomerMaster,
    KarigarMaster,
    KarigarSettlement,
    GSTReports,
    SilverRateManager,
    UnifiedCatalog,
    StockManagement,
    Settings,
})

function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { session, loading } = useAuth()

    if (loading) return <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>

    if (!session) {
        return <Navigate to="/login" replace />
    }

    return children
}

function App() {
    return (
        <AuthProvider>
            <SettingsProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={
                            <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LoadingSpinner /></div>}>
                                <Login />
                            </Suspense>
                        } />

                        <Route path="/" element={
                            <ProtectedRoute>
                                <Layout />
                            </ProtectedRoute>
                        }>
                            <Route index element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Dashboard />
                                </Suspense>
                            } />
                            <Route path="orders" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <OrderList />
                                </Suspense>
                            } />
                            <Route path="orders/new" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <OrderCreate />
                                </Suspense>
                            } />
                            <Route path="orders/:id/print" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <OrderPrint />
                                </Suspense>
                            } />
                            <Route path="orders/:id/invoice" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <InvoicePrint />
                                </Suspense>
                            } />
                            <Route path="expenses" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <ExpenseManager />
                                </Suspense>
                            } />
                            <Route path="accounting" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <AccountingDashboard />
                                </Suspense>
                            } />
                            <Route path="ledger" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <LedgerStatement />
                                </Suspense>
                            } />
                            <Route path="vendors" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <VendorMaster />
                                </Suspense>
                            } />
                            <Route path="customers" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <CustomerMaster />
                                </Suspense>
                            } />
                            <Route path="karigar" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <KarigarMaster />
                                </Suspense>
                            } />
                            <Route path="settlement" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <KarigarSettlement />
                                </Suspense>
                            } />
                            <Route path="gst-reports" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <GSTReports />
                                </Suspense>
                            } />
                            <Route path="rates" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <SilverRateManager />
                                </Suspense>
                            } />
                            <Route path="catalog" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <UnifiedCatalog />
                                </Suspense>
                            } />
                            <Route path="stock" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <StockManagement />
                                </Suspense>
                            } />
                            <Route path="settings" element={
                                <Suspense fallback={<LoadingSpinner />}>
                                    <Settings />
                                </Suspense>
                            } />
                        </Route>
                    </Routes>
                </BrowserRouter>
            </SettingsProvider>
        </AuthProvider>
    )
}

export default App
