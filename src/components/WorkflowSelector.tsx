import React, { useState, useEffect } from 'react';
import { getAllWorkflows } from '../services/continuityService';
import { AIWorkflow } from '../types/continuity';
import { CheckCircle2, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

interface WorkflowSelectorProps {
  onSelect: (workflowId: string) => void;
  selectedId: string;
}

const statusIcon = (status: string) => {
  switch (status) {
    case 'Approved':
      return <CheckCircle2 className="h-4 w-4 text-green-400" />;
    case 'Watch':
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    case 'Review Required':
      return <RefreshCw className="h-4 w-4 text-orange-400" />;
    case 'Quarantine':
      return <XCircle className="h-4 w-4 text-red-400" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-blue-400" />;
  }
};

const scoreColor = (score: number) => {
  if (score >= 90) return 'bg-green-500/20 text-green-400';
  if (score >= 75) return 'bg-green-500/10 text-green-500';
  if (score >= 60) return 'bg-yellow-500/20 text-yellow-400';
  return 'bg-red-500/20 text-red-400';
};

const WorkflowSelector: React.FC<WorkflowSelectorProps> = ({ onSelect, selectedId }) => {
  const [workflows, setWorkflows] = useState<AIWorkflow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getAllWorkflows();
        setWorkflows(data);
        if (!selectedId && data.length > 0) onSelect(data[0].id);
      } catch (err) {
        console.error('Error fetching workflows:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [onSelect, selectedId]);

  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg border border-gray-800 rounded-xl p-4 shadow-lg mb-6">
      <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-3">
        AI Workflow Selection
      </h3>

      {loading ? (
        <div className="flex justify-center items-center h-12">
          <div className="flex space-x-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-2 w-2 bg-cyan-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-nowrap overflow-x-auto pb-2 gap-2">
          {workflows.map((wf) => (
            <button
              key={wf.id}
              onClick={() => onSelect(wf.id)}
              className={`flex items-center whitespace-nowrap px-3 py-2 rounded-lg transition-all duration-200 border ${
                wf.id === selectedId
                  ? 'bg-cyan-700 border-cyan-500 text-white'
                  : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:border-gray-600'
              }`}
            >
              {statusIcon(wf.status)}
              <span className="ml-2 text-sm">{wf.name}</span>
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${scoreColor(wf.continuityScore)}`}>
                {wf.continuityScore}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowSelector;
