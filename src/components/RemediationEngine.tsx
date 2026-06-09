import React, { useState, useEffect } from 'react';
import { getRemediationRecommendations } from '../services/continuityService';
import { RemediationRecommendation } from '../types/continuity';
import { Wrench, TrendingUp } from 'lucide-react';

interface RemediationEngineProps {
  workflowId: string;
}

const effortColor = (effort: 'Low' | 'Medium' | 'High') => {
  switch (effort) {
    case 'Low': return 'bg-green-500/20 text-green-400 border-green-700';
    case 'Medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-700';
    case 'High': return 'bg-red-500/20 text-red-400 border-red-700';
  }
};

const formatDate = (dateString: string) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));

const RemediationEngine: React.FC<RemediationEngineProps> = ({ workflowId }) => {
  const [recommendations, setRecommendations] = useState<RemediationRecommendation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getRemediationRecommendations(workflowId);
        setRecommendations(data);
      } catch (err) {
        console.error('Error fetching remediation recommendations:', err);
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
          <h3 className="text-lg font-semibold text-white">Remediation Recommendation Engine</h3>
          <p className="text-gray-400 text-xs mt-0.5">SMI-generated policy alignment actions</p>
        </div>
        <Wrench className="h-5 w-5 text-amber-400" />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-48">
          <div className="flex space-x-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 bg-amber-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500">
          <Wrench className="h-10 w-10 mb-3 opacity-30" />
          <p className="text-sm text-center">No remediation actions required for this workflow</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <div
              key={rec.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors duration-200"
            >
              <div className="flex justify-between items-start mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${effortColor(rec.effort)}`}>
                  Effort: {rec.effort}
                </span>
                <span className="text-xs text-gray-500">{formatDate(rec.timestamp)}</span>
              </div>

              <p className="text-gray-200 text-sm mb-3 leading-relaxed">{rec.recommendation}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                  <TrendingUp className="h-4 w-4 text-green-400 mr-1.5" />
                  <span className="text-green-400">+{rec.scoreImprovement} pts continuity</span>
                </div>
                <button className="px-3 py-1 bg-cyan-700 hover:bg-cyan-600 border border-cyan-600 rounded-md text-white text-xs font-medium transition-colors duration-200">
                  Apply Action
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RemediationEngine;
