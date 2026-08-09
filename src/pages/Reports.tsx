import { useState } from 'react';
import { ReportTab } from '../types/report';
import { useAuth } from '../context/AuthContext';
import ReportTabs from '../components/reports/ReportTabs';
import ReportDateRange from '../components/reports/ReportDateRange';
import OverviewTab from '../components/reports/OverviewTab';
import SalesTab from '../components/reports/SalesTab';
import PipelineTab from '../components/reports/PipelineTab';
import ContactsTab from '../components/reports/ContactsTab';
import TeamTab from '../components/reports/TeamTab';
import ActivitiesTab from '../components/reports/ActivitiesTab';

export default function Reports() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<ReportTab>('overview');
  const [days, setDays] = useState(30);

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-slate-200">
        <h1 className="text-lg font-bold text-slate-800">Reports</h1>
      </div>

      <ReportTabs tab={tab} onChange={setTab} isAdmin={isAdmin} />

      {/* Pipeline tab is a live snapshot (not date-ranged), so hide the range picker there */}
      {tab !== 'pipeline' && <ReportDateRange days={days} onChange={setDays} />}

      {tab === 'overview' && <OverviewTab days={days} />}
      {tab === 'sales' && <SalesTab days={days} />}
      {tab === 'pipeline' && <PipelineTab />}
      {tab === 'contacts' && <ContactsTab days={days} />}
      {tab === 'team' && isAdmin && <TeamTab days={days} />}
      {tab === 'team' && !isAdmin && (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          Team reports are only visible to admins.
        </div>
      )}
      {tab === 'activities' && <ActivitiesTab days={days} />}
    </div>
  );
}
