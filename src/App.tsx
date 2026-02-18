import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy-loaded Pages (code-splitting)
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Patients = lazy(() => import("./pages/Patients"));
const PatientDetail = lazy(() => import("./pages/PatientDetail"));
const Appointments = lazy(() => import("./pages/Appointments"));
const Services = lazy(() => import("./pages/Services"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Payments = lazy(() => import("./pages/Payments"));
const Finance = lazy(() => import("./pages/Finance"));
const Documents = lazy(() => import("./pages/Documents"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Settings = lazy(() => import("./pages/Settings"));
const ToothChartDemo = lazy(() => import("./pages/ToothChartDemo"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const Salary = lazy(() => import("./pages/Salary"));
const WaitingList = lazy(() => import("./pages/WaitingList"));
const LiveChat = lazy(() => import("./pages/LiveChat"));
const BulkCampaigns = lazy(() => import("./pages/BulkCampaigns"));
const Loyalty = lazy(() => import("./pages/Loyalty"));
const Packages = lazy(() => import("./pages/Packages"));
const AuditLog = lazy(() => import("./pages/AuditLog"));
const Tasks = lazy(() => import("./pages/Tasks"));
const PublicBooking = lazy(() => import("./pages/PublicBooking"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Admin Pages
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminAlerts = lazy(() => import("./pages/admin/AdminAlerts"));
const AdminClinics = lazy(() => import("./pages/admin/AdminClinics"));
const AdminSubscriptions = lazy(() => import("./pages/admin/AdminSubscriptions"));
const AdminSystemHealth = lazy(() => import("./pages/admin/AdminSystemHealth"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="dentelica-theme">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ErrorBoundary>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/accept-invitation" element={<AcceptInvitation />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/booking/:subdomain" element={<PublicBooking />} />

                {/* Protected Routes */}
                <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/patients" element={<Patients />} />
                  <Route path="/patients/:id" element={<PatientDetail />} />
                  <Route path="/appointments" element={<Appointments />} />
                  <Route path="/tooth-chart" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'doctor']}><ToothChartDemo /></ProtectedRoute>
                  } />
                  <Route path="/services" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Services /></ProtectedRoute>
                  } />
                  <Route path="/inventory" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Inventory /></ProtectedRoute>
                  } />
                  <Route path="/payments" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Payments /></ProtectedRoute>
                  } />
                  <Route path="/finance" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Finance /></ProtectedRoute>
                  } />
                  <Route path="/documents" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Documents /></ProtectedRoute>
                  } />
                  <Route path="/analytics" element={
                    <ProtectedRoute requiredRoles={['clinic_admin']}><Analytics /></ProtectedRoute>
                  } />
                  <Route path="/salary" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'doctor']}><Salary /></ProtectedRoute>
                  } />
                  <Route path="/waiting-list" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception', 'doctor']}><WaitingList /></ProtectedRoute>
                  } />
                  <Route path="/campaigns" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><BulkCampaigns /></ProtectedRoute>
                  } />
                  <Route path="/live-chat" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><LiveChat /></ProtectedRoute>
                  } />
                  <Route path="/loyalty" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Loyalty /></ProtectedRoute>
                  } />
                  <Route path="/packages" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'reception']}><Packages /></ProtectedRoute>
                  } />
                  <Route path="/tasks" element={
                    <ProtectedRoute requiredRoles={['clinic_admin', 'doctor', 'reception']}><Tasks /></ProtectedRoute>
                  } />
                  <Route path="/audit-log" element={
                    <ProtectedRoute requiredRoles={['clinic_admin']}><AuditLog /></ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute requiredRoles={['clinic_admin']}><Settings /></ProtectedRoute>
                  } />
                </Route>

                {/* Super Admin Routes - Separate Portal */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/clinics" element={<AdminClinics />} />
                  <Route path="/admin/subscriptions" element={<AdminSubscriptions />} />
                  <Route path="/admin/system-health" element={<AdminSystemHealth />} />
                  <Route path="/admin/analytics" element={<AdminAnalytics />} />
                  <Route path="/admin/alerts" element={<AdminAlerts />} />
                  <Route path="/admin/settings" element={<AdminDashboard />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
