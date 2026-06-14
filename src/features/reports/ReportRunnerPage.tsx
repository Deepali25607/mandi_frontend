import { Navigate, useParams } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';
import { reportByKey } from './reportsRegistry';

/** Resolves /reports/:reportKey to its report component, enforcing plan features. */
export default function ReportRunnerPage() {
  const { reportKey } = useParams();
  const features = useAppSelector((s) => s.auth.user?.features) ?? [];
  const report = reportKey ? reportByKey(reportKey) : undefined;

  if (!report) return <Navigate to="/reports" replace />;
  if (report.feature && !features.includes(report.feature)) return <Navigate to="/reports" replace />;

  const Component = report.Component;
  return <Component />;
}
