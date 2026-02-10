import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminProtectedRoute } from "@/components/admin/AdminProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Patients from "./pages/Patients";
import PatientDetail from "./pages/PatientDetail";
import Appointments from "./pages/Appointments";
import Services from "./pages/Services";
import Inventory from "./pages/Inventory";
import Payments from "./pages/Payments";
import Finance from "./pages/Finance";
import Documents from "./pages/Documents";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import ToothChartDemo from "./pages/ToothChartDemo";
import AcceptInvitation from "./pages/AcceptInvitation";
import Salary from "./pages/Salary";
import WaitingList from "./pages/WaitingList";
import LiveChat from "./pages/LiveChat";
import BulkCampaigns from "./pages/BulkCampaigns";
import Loyalty from "./pages/Loyalty";
import Packages from "./pages/Packages";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminAlerts from "./pages/admin/AdminAlerts";
import AdminClinics from "./pages/admin/AdminClinics";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminSystemHealth from "./pages/admin/AdminSystemHealth";
import AdminAnalytics from "./pages/admin/AdminAnalytics";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/accept-invitation" element={<AcceptInvitation />} />

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
          </BrowserRouter>
        </AuthProvider>
      </ErrorBoundary>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
