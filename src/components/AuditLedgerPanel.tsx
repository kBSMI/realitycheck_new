import React, { useState, useEffect } from 'react';
import { getAuditLedger } from '../services/continuityService';
import { AuditEntry } from '../types/continuity';
import { BookLock, TrendingUp } from 'lucide-react';

interface AuditLedgerPanelProps {
  sessionId: string;
}

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

const AuditLedgerPanel: React.FC<AuditLedgerPanelProps> = ({ sessionId }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getAuditLedger(sessionId);
        setEntries(data);
      } catch (err) {
        console.error('Error fetching audit ledger:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [sessionId]);

  const totalScore = entries.reduce((sum, e) => sum + e.score, 0);

  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Audit Ledger</h3>
          <p className="text-gray-400 text-xs mt-0.5">Immutable continuity event records</p>
        </div>
        <BookLock className="h-5 w-5 text-cyan-400" />
      </div>

      <div className="bg-gradient-to-r from-cyan-900/40 to-blue-900/30 border border-cyan-800/40 rounded-lg p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest">Session Audit Score</p>
            <p className="text-3xl font-bold text-white mt-1">{totalScore}</p>
            <p className="text-cyan-400 text-xs mt-0.5">{sessionId}</p>
          </div>
          <div className="bg-cyan-500/20 border border-cyan-700 p-3 rounded-full">
            <TrendingUp className="h-6 w-6 text-cyan-400" />
          </div>
        </div>
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
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors duration-200"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0 mr-3">
                  <h4 className="text-gray-200 text-sm font-medium truncate">{entry.source}</h4>
                  <p className="text-xs text-cyan-600 mt-0.5 font-mono truncate">{entry.policyRef}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(entry.timestamp)}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-cyan-400 font-bold">+{entry.score}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLedgerPanel;
