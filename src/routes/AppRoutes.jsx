import React, { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { ROLES } from '../utils/constants';

// Public & Auth Pages
const LandingPage = lazy(() => import('../pages/public/LandingPage'));
const LegalPage = lazy(() => import('../pages/public/LegalPage'));
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const UnauthorizedPage = lazy(() => import('../pages/auth/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/auth/NotFoundPage'));

// Student Pages
const StudentDashboard = lazy(() => import('../pages/student/StudentDashboard'));
const CreatePassPage = lazy(() => import('../pages/student/CreatePassPage'));
const MyRequestsPage = lazy(() => import('../pages/student/MyRequestsPage'));
const PassDetailsPage = lazy(() => import('../pages/student/PassDetailsPage'));
const StudentProfilePage = lazy(() => import('../pages/student/StudentProfilePage'));

// Clerk Pages
const ClerkDashboard = lazy(() => import('../pages/clerk/ClerkDashboard'));
const PendingRequestsPage = lazy(() => import('../pages/clerk/PendingRequestsPage'));
const RequestDetailsPage = lazy(() => import('../pages/clerk/RequestDetailsPage'));
const ApprovedRequestsPage = lazy(() => import('../pages/clerk/ApprovedRequestsPage'));
const RejectedRequestsPage = lazy(() => import('../pages/clerk/RejectedRequestsPage'));

// Guard Pages
const GuardDashboard = lazy(() => import('../pages/guard/GuardDashboard'));
const ScanQRPage = lazy(() => import('../pages/guard/ScanQRPage'));
const VerificationResultPage = lazy(() => import('../pages/guard/VerificationResultPage'));
const ScanHistoryPage = lazy(() => import('../pages/guard/ScanHistoryPage'));

// Admin Pages
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const ManageStudentsPage = lazy(() => import('../pages/admin/ManageStudentsPage'));
const ManageClerksPage = lazy(() => import('../pages/admin/ManageClerksPage'));
const ManageGuardsPage = lazy(() => import('../pages/admin/ManageGuardsPage'));
const AllPassesPage = lazy(() => import('../pages/admin/AllPassesPage'));
const ReportsPage = lazy(() => import('../pages/admin/ReportsPage'));

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullScreen label="Loading page..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<LegalPage page="privacy" />} />
        <Route path="/terms" element={<LegalPage page="terms" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Protected Student Portal */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.STUDENT]} />}>
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/create-request" element={<CreatePassPage />} />
          <Route path="/student/my-requests" element={<MyRequestsPage />} />
          <Route path="/student/approved-pass" element={<PassDetailsPage />} />
          <Route path="/student/profile" element={<StudentProfilePage />} />
        </Route>

        {/* Protected Clerk Portal */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.CLERK]} />}>
          <Route path="/clerk/dashboard" element={<ClerkDashboard />} />
          <Route path="/clerk/pending-requests" element={<PendingRequestsPage />} />
          <Route path="/clerk/request-details" element={<RequestDetailsPage />} />
          <Route path="/clerk/approved-requests" element={<ApprovedRequestsPage />} />
          <Route path="/clerk/rejected-requests" element={<RejectedRequestsPage />} />
        </Route>

        {/* Protected Security Guard Portal */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.GUARD]} />}>
          <Route path="/guard/dashboard" element={<GuardDashboard />} />
          <Route path="/guard/scan" element={<ScanQRPage />} />
          <Route path="/guard/verification-result" element={<VerificationResultPage />} />
          <Route path="/guard/scan-history" element={<ScanHistoryPage />} />
        </Route>

        {/* Protected Admin Portal */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/students" element={<ManageStudentsPage />} />
          <Route path="/admin/clerks" element={<ManageClerksPage />} />
          <Route path="/admin/guards" element={<ManageGuardsPage />} />
          <Route path="/admin/gate-passes" element={<AllPassesPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>

        {/* 404 Not Found */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
