import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './components/AuthProvider'
import { SettingsProvider } from './components/SettingsContext'
import Layout from './components/Layout'
import { Suspense, lazy } from 'react'
import LoadingSpinner from './components/LoadingSpinner'

// Lazy Load Pages
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const OrderList = lazy(() => import('./pages/OrderList'))
const OrderCreate = lazy(() => import('./pages/OrderCreate'))
const ExpenseManager = lazy(() => import('./pages/ExpenseManager'))
const AccountingDashboard = lazy(() => import('./pages/AccountingDashboard'))
const LedgerStatement = lazy(() => import('./pages/LedgerStatement'))
const VendorMaster = lazy(() => import('./pages/VendorMaster'))
const KarigarMaster = lazy(() => import('./pages/KarigarMaster'))
const KarigarSettlement = lazy(() => import('./pages/KarigarSettlement'))
const GSTReports = lazy(() => import('./pages/GSTReports'))
const SilverRateManager = lazy(() => import('./pages/SilverRateManager'))
const UnifiedCatalog = lazy(() => import('./pages/UnifiedCatalog'))
const StockManagement = lazy(() => import('./pages/StockManagement'))
const Settings = lazy(() => import('./pages/Settings'))

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
