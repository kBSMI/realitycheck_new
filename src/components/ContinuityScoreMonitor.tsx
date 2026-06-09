import React, { useState, useEffect } from 'react';
import { getContinuityPulse } from '../services/continuityService';
import { ContinuityPulse } from '../types/continuity';
import { Activity } from 'lucide-react';

interface ContinuityScoreMonitorProps {
  workflowId: string;
}

const scoreColor = (score: number) => {
  if (score >= 90) return '#10B981'; // green
  if (score >= 75) return '#22C55E'; // lighter green
  if (score >= 60) return '#EAB308'; // yellow
  return '#EF4444'; // red
};

const scoreLabel = (score: number) => {
  if (score >= 90) return 'Approved';
  if (score >= 75) return 'Watch';
  if (score >= 60) return 'Review Required';
  return 'Quarantine';
};

const scoreLabelColor = (score: number) => {
  if (score >= 90) return 'text-green-400';
  if (score >= 75) return 'text-green-500';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

const ContinuityScoreMonitor: React.FC<ContinuityScoreMonitorProps> = ({ workflowId }) => {
  const [pulseData, setPulseData] = useState<ContinuityPulse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const data = await getContinuityPulse(workflowId);
        setPulseData(data);
      } catch (err) {
        console.error('Error fetching continuity pulse:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, [workflowId]);

  const currentScore = pulseData.length > 0 ? pulseData[0].score : 0;

  const createPoints = () => {
    if (pulseData.length === 0) return '';
    const dataPoints = pulseData.slice(0, 12).reverse();
    return dataPoints
      .map((p, i) => {
        const x = (i / (dataPoints.length - 1)) * 100;
        const y = 50 - (p.score / 100) * 50;
        return `${x},${y}`;
      })
      .join(' ');
  };

  const color = scoreColor(currentScore);

  return (
    <div className="bg-gray-900 bg-opacity-80 backdrop-blur-lg border border-gray-800 rounded-xl p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Continuity Score Monitor</h3>
          <p className="text-gray-400 text-xs mt-0.5">24-hour behavioral score trend</p>
        </div>
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4" style={{ color }} />
          <span className="text-2xl font-bold text-white">{currentScore}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-800 ${scoreLabelColor(currentScore)}`}>
            {scoreLabel(currentScore)}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-32">
          <div className="flex space-x-1.5">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-3 w-3 bg-cyan-500 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="relative h-32">
          <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
            {/* Threshold lines */}
            <line x1="0" y1="5" x2="100" y2="5" stroke="#374151" strokeWidth="0.4" strokeDasharray="2,2" />
            <line x1="0" y1="12.5" x2="100" y2="12.5" stroke="#374151" strokeWidth="0.4" strokeDasharray="2,2" />
            <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.4" strokeDasharray="2,2" />
            {/* Score line */}
            <polyline
              points={createPoints()}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Area fill */}
            <polyline
              points={`0,50 ${createPoints()} 100,50`}
              fill={color}
              fillOpacity="0.06"
              stroke="none"
            />
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 px-1">
            <span>-12h</span>
            <span>-6h</span>
            <span>Now</span>
          </div>
        </div>
      )}

      {!loading && pulseData.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pulseData[0].behaviorPatterns.map((p, i) => (
            <span
              key={i}
              className="px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 text-gray-400 rounded-full"
            >
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContinuityScoreMonitor;
