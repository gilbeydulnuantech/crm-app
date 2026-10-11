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
import TemplatesPage from './pages/TemplatesPage';
import EmailTemplateEditorPage from './pages/EmailTemplateEditorPage';
import InvoiceTemplateEditorPage from './pages/InvoiceTemplateEditorPage';
import ReceiptTemplateEditorPage from './pages/ReceiptTemplateEditorPage';
import ProposalsListPage from './pages/ProposalsListPage';
import ApprovedProposalsListPage from './pages/ApprovedProposalsListPage';
import ProposalEditorPage from './pages/ProposalEditorPage';
import ContractsListPage from './pages/ContractsListPage';
import SignedContractsListPage from './pages/SignedContractsListPage';
import ContractEditorPage from './pages/ContractEditorPage';
import PagesListPage from './pages/PagesListPage';
import PageEditorPage from './pages/PageEditorPage';
import ProductsListPage from './pages/ProductsListPage';
import ProductEditorPage from './pages/ProductEditorPage';
import Automations from './pages/Automations';
import AutomationBuilderPage from './pages/AutomationBuilderPage';
import AutomationLogsPage from './pages/AutomationLogsPage';
import AutomationEmailStepsPage from './pages/AutomationEmailStepsPage';
import PipelineStageRemindersPage from './pages/PipelineStageRemindersPage';
import StageReminderEditorPage from './pages/StageReminderEditorPage';
import Settings from './pages/Settings';
import ObservabilityDashboard from './pages/ObservabilityDashboard';
import Tickets from './pages/Tickets';
import TicketDetailPage from './pages/TicketDetailPage';
import Payments from './pages/Payments';
import PaymentDetailPage from './pages/PaymentDetailPage';
import InvoicesListPage from './pages/InvoicesListPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import CreateInvoicePage from './pages/CreateInvoicePage';
import PublicProposalPage from './pages/PublicProposalPage';
import PublicContractPage from './pages/PublicContractPage';
import PublicPayInvoicePage from './pages/PublicPayInvoicePage';
import PublicUnsubscribePage from './pages/PublicUnsubscribePage';
import PublicCancelBookingPage from './pages/PublicCancelBookingPage';
import PrintContractPage from './pages/PrintContractPage';
import PrintInvoicePage from './pages/PrintInvoicePage';
import PublicTicketPage from './pages/PublicTicketPage';
import PublicBookingPage from './pages/PublicBookingPage';
import BookingEntryPage from './pages/BookingEntryPage';

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
          <Route path="/documents/invoice/:token" element={<PublicPayInvoicePage />} />
          <Route path="/unsubscribe/:token" element={<PublicUnsubscribePage />} />
          <Route path="/cancel-booking/:activityId" element={<PublicCancelBookingPage />} />
          <Route path="/print/contract/:token" element={<PrintContractPage />} />
          <Route path="/print/invoice/:token" element={<PrintInvoicePage />} />
          <Route path="/support/new" element={<PublicTicketPage />} />
          <Route path="/book/:token" element={<PublicBookingPage />} />
          <Route path="/book" element={<BookingEntryPage />} />

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
            <Route path="/documents" element={<Navigate to="/documents/templates" replace />} />
            <Route path="/documents/templates" element={<TemplatesPage />} />
            <Route path="/documents/templates/email/new" element={<EmailTemplateEditorPage />} />
            <Route path="/documents/templates/email/:id/edit" element={<EmailTemplateEditorPage />} />
            <Route path="/documents/templates/invoice/new" element={<InvoiceTemplateEditorPage />} />
            <Route path="/documents/templates/invoice/:id/edit" element={<InvoiceTemplateEditorPage />} />
            <Route path="/documents/templates/receipt/new" element={<ReceiptTemplateEditorPage />} />
            <Route path="/documents/templates/receipt/:id/edit" element={<ReceiptTemplateEditorPage />} />
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
            <Route path="/automations/new" element={<AutomationBuilderPage />} />
            <Route path="/automations/:id/edit" element={<AutomationBuilderPage />} />
            <Route path="/automations/logs" element={<AutomationLogsPage />} />
            <Route path="/automations/stage-reminders" element={<PipelineStageRemindersPage />} />
            <Route path="/automations/stage-reminders/new" element={<StageReminderEditorPage />} />
            <Route path="/automations/stage-reminders/:id" element={<StageReminderEditorPage />} />
            <Route path="/automations/:workflowId" element={<AutomationEmailStepsPage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/observability" element={<ObservabilityDashboard />} />
            <Route path="/products" element={<ProductsListPage />} />
            <Route path="/products/new" element={<ProductEditorPage />} />
            <Route path="/products/:id/edit" element={<ProductEditorPage />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/invoices" element={<InvoicesListPage />} />
            <Route path="/payments/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/payments/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/payments/:id" element={<PaymentDetailPage />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </ThemeProvider>
    </AuthProvider>
  );
}
