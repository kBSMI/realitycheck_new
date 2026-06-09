import React, { useState, useEffect } from 'react';
import { getBehavioralEvents } from '../services/continuityService';
import { BehavioralEvent } from '../types/continuity';
import { ClipboardList, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface BehavioralEventLogProps {
  workflowId: string;
}

const classificationDisplay = (cls: BehavioralEvent['classification']) => {
  switch (cls) {
    case 'Nominal':
      return {
        icon: <CheckCircle2 className="h-4 w-4" />,
        color: 'text-green-400 bg-green-500/10 border-green-800',
      };
    case 'Anomalous':
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-800',
      };
    case 'Guardrail Triggered':
      return {
        icon: <ShieldAlert className="h-4 w-4" />,
        color: 'text-red-400 bg-red-500/10 border-red-800',
      };
  }
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

const BehavioralEventLog: React.FC<BehavioralEventLogProps> = ({ workflowId }) => {
  const [events, setEvents] = useState<BehavioralEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getBehavioralEvents(workflowId);
        setEvents(data);
      } catch (err) {
        console.error('Error fetching behavioral events:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [workflowId]);

  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-white">Behavioral Event Log</h3>
          <p className="text-gray-400 text-xs mt-0.5">AI workflow guardrail and anomaly events</p>
        </div>
        <ClipboardList className="h-5 w-5 text-cyan-400" />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
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
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm">No events recorded for this workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => {
            const { icon, color } = classificationDisplay(evt.classification);
            return (
              <div
                key={evt.id}
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors duration-200"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full border text-xs font-medium ${color}`}>
                    {icon}
                    <span>{evt.classification}</span>
                  </div>
                  <span className="text-xs text-gray-500">{formatDate(evt.timestamp)}</span>
                </div>

                <p className="text-gray-200 text-sm leading-relaxed mb-3">{evt.message}</p>

                <div className="mt-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Severity Signal</span>
                    <span>{evt.severity}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        evt.classification === 'Nominal'
                          ? 'bg-green-500'
                          : evt.classification === 'Guardrail Triggered'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}
                      style={{ width: `${evt.severity}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BehavioralEventLog;
