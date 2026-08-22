import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ThemeProvider from './context/ThemeProvider';
import RequireAuth from './components/RequireAuth';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Contacts from './pages/Contacts';
import Companies from './pages/Companies';
import Pipeline from './pages/Pipeline';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import Reports from './pages/Reports';
import TeamChat from './pages/TeamChat';
import Documents from './pages/Documents';
import ProposalsListPage from './pages/ProposalsListPage';
import ApprovedProposalsListPage from './pages/ApprovedProposalsListPage';
import ProposalEditorPage from './pages/ProposalEditorPage';
import ContractsListPage from './pages/ContractsListPage';
import SignedContractsListPage from './pages/SignedContractsListPage';
import ContractEditorPage from './pages/ContractEditorPage';
import PagesListPage from './pages/PagesListPage';
import PageEditorPage from './pages/PageEditorPage';
import Automations from './pages/Automations';
import Settings from './pages/Settings';
import PublicProposalPage from './pages/PublicProposalPage';
import PublicContractPage from './pages/PublicContractPage';
import PrintContractPage from './pages/PrintContractPage';

function LoginRoute() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <Login />;
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/documents/proposal/:token" element={<PublicProposalPage />} />
          <Route path="/documents/contract/:token" element={<PublicContractPage />} />
          <Route path="/print/contract/:token" element={<PrintContractPage />} />

          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/team-chat" element={<TeamChat />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/documents/proposals" element={<ProposalsListPage />} />
            <Route path="/documents/proposals/approved" element={<ApprovedProposalsListPage />} />
            <Route path="/documents/proposals/new" element={<ProposalEditorPage />} />
            <Route path="/documents/proposals/:id/edit" element={<ProposalEditorPage />} />
            <Route path="/documents/contracts" element={<ContractsListPage />} />
            <Route path="/documents/contracts/signed" element={<SignedContractsListPage />} />
            <Route path="/documents/contracts/new" element={<ContractEditorPage />} />
            <Route path="/documents/contracts/:id/edit" element={<ContractEditorPage />} />
            <Route path="/documents/pages" element={<PagesListPage />} />
            <Route path="/documents/pages/new" element={<PageEditorPage />} />
            <Route path="/documents/pages/:id/edit" element={<PageEditorPage />} />
            <Route path="/automations" element={<Automations />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
