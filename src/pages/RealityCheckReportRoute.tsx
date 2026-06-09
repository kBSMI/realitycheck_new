import { Link, useParams } from 'react-router-dom';
import RealityCheckReportDetail from './RealityCheckReportDetail';
import { realityCheckRepository } from '../services/repositories/realityCheckRepository';
import { useEffect, useState } from 'react';
import type { ImprovementCheckResult, RealityCheckResult } from '../types/realityCheck';

export default function RealityCheckReportRoute() {
  const { id } = useParams();
  const [result, setResult] = useState<RealityCheckResult | null>(null);
  const [improvement, setImprovement] = useState<ImprovementCheckResult | null>(null);

  useEffect(() => {
    if (!id) return;
    realityCheckRepository.getRealityCheck(id).then(setResult);
    realityCheckRepository.listImprovementChecks(id).then((items) => setImprovement(items[0] ?? null));
  }, [id]);

  if (!result) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-800 bg-gray-900/60 p-6">
        <h2 className="text-xl font-bold text-white">Report not found</h2>
        <p className="mt-2 text-sm text-gray-500">This report is not available in the current repository session.</p>
        <Link to="/history" className="mt-4 inline-flex text-sm font-semibold text-cyan-400 hover:text-cyan-300">Back to history</Link>
      </div>
    );
  }

  return <RealityCheckReportDetail result={result} improvement={improvement} />;
}
