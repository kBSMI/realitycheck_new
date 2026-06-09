import React, { useState, useEffect } from 'react';
import { getAllWorkflows, getWorkflowDependencies } from '../services/continuityService';
import { AIWorkflow, WorkflowDependency } from '../types/continuity';
import { Network, X } from 'lucide-react';

const statusColor = (status: string) => {
  switch (status) {
    case 'Approved': return '#10B981';
    case 'Watch': return '#22C55E';
    case 'Review Required': return '#F59E0B';
    case 'Quarantine': return '#EF4444';
    default: return '#3B82F6';
  }
};

const linkColor = (strength: number, active: boolean) => {
  if (!active) return '#374151';
  if (strength >= 80) return '#0891B2'; // cyan
  if (strength >= 50) return '#3B82F6'; // blue
  return '#F59E0B'; // amber
};

const WorkflowDependencyMap: React.FC = () => {
  const [workflows, setWorkflows] = useState<AIWorkflow[]>([]);
  const [dependencies, setDependencies] = useState<WorkflowDependency[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [wfs, deps] = await Promise.all([getAllWorkflows(), getWorkflowDependencies()]);
        setWorkflows(wfs);
        setDependencies(deps);
      } catch (err) {
        console.error('Error fetching dependency map:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const nodePosition = (index: number, total: number) => {
    const radius = 115;
    const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
    return { x: 150 + radius * Math.cos(angle), y: 150 + radius * Math.sin(angle) };
  };

  const visibleDeps = selected
    ? dependencies.filter((d) => d.sourceId === selected || d.targetId === selected)
    : dependencies;

  const selectedWf = workflows.find((w) => w.id === selected);

  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-white">Workflow Dependency Map</h3>
          <p className="text-gray-400 text-xs mt-0.5">AI workflow continuity topology</p>
        </div>
        <Network className="h-5 w-5 text-cyan-400" />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-80">
          <div className="flex space-x-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 bg-cyan-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative h-80">
          <svg width="300" height="300" className="mx-auto">
            {/* Dependencies */}
            {visibleDeps.map((dep) => {
              const srcPos = nodePosition(workflows.findIndex((w) => w.id === dep.sourceId), workflows.length);
              const tgtPos = nodePosition(workflows.findIndex((w) => w.id === dep.targetId), workflows.length);
              return (
                <g key={`${dep.sourceId}-${dep.targetId}`}>
                  <line
                    x1={srcPos.x} y1={srcPos.y}
                    x2={tgtPos.x} y2={tgtPos.y}
                    stroke={linkColor(dep.strength, dep.active)}
                    strokeWidth={dep.strength / 25}
                    strokeOpacity="0.55"
                  />
                  <text
                    x={(srcPos.x + tgtPos.x) / 2}
                    y={(srcPos.y + tgtPos.y) / 2 - 3}
                    textAnchor="middle"
                    fill="#6B7280"
                    fontSize="7"
                  >
                    {dep.linkType}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {workflows.map((wf, i) => {
              const pos = nodePosition(i, workflows.length);
              const isSelected = wf.id === selected;
              const isConnected = !selected || dependencies.some(
                (d) => (d.sourceId === selected && d.targetId === wf.id) ||
                        (d.targetId === selected && d.sourceId === wf.id) ||
                        d.sourceId === wf.id && selected === wf.id ||
                        d.targetId === wf.id && selected === wf.id
              );
              const color = statusColor(wf.status);

              return (
                <g
                  key={wf.id}
                  onClick={() => setSelected(isSelected ? null : wf.id)}
                  className="cursor-pointer"
                  opacity={isConnected ? 1 : 0.25}
                >
                  {wf.status === 'Approved' && (
                    <circle cx={pos.x} cy={pos.y} r="14" fill={color} opacity="0.15" className="animate-ping" />
                  )}
                  <circle
                    cx={pos.x} cy={pos.y} r="11"
                    fill={color}
                    stroke={isSelected ? 'white' : 'transparent'}
                    strokeWidth="2"
                  />
                  <text x={pos.x} y={pos.y + 26} textAnchor="middle" fill="white" fontSize="9" fontWeight={isSelected ? 'bold' : 'normal'}>
                    {wf.name.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>

          {selectedWf && (
            <div className="absolute bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-sm border border-gray-700 p-3 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-2">
                  <h4 className="text-white font-medium text-sm">{selectedWf.name}</h4>
                  <p className="text-gray-400 text-xs mt-0.5">{selectedWf.description}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedWf.policyTags.map((tag, j) => (
                      <span key={j} className="text-xs bg-cyan-900/40 border border-cyan-800/50 text-cyan-300 px-1.5 py-0.5 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  className="text-gray-500 hover:text-white transition-colors"
                  onClick={() => setSelected(null)}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowDependencyMap;
