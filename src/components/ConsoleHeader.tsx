import React from 'react';
import { ShieldCheck, Activity, Settings, Bell } from 'lucide-react';

interface ConsoleHeaderProps {
  title: string;
}

const ConsoleHeader: React.FC<ConsoleHeaderProps> = ({ title }) => {
  return (
    <header className="bg-gray-900 bg-opacity-80 backdrop-blur-lg border border-gray-800 p-4 md:p-6 rounded-xl shadow-lg mb-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div className="flex items-center">
          <div className="bg-gradient-to-r from-cyan-600 to-blue-700 p-3 rounded-lg mr-4 shadow-md">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            <p className="text-cyan-400 text-xs font-medium tracking-widest uppercase mt-0.5">
              SMI Continuity Assurance Pilot — v1.0
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 mt-4 md:mt-0">
          <button
            className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200"
            title="Live Activity"
          >
            <Activity className="h-5 w-5 text-cyan-400" />
          </button>
          <button
            className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200"
            title="Alerts"
          >
            <Bell className="h-5 w-5 text-amber-400" />
          </button>
          <button
            className="bg-gray-800 border border-gray-700 hover:bg-gray-700 p-2 rounded-lg transition-colors duration-200"
            title="Settings"
          >
            <Settings className="h-5 w-5 text-gray-400" />
          </button>

          <div className="ml-2 flex items-center space-x-2 bg-gray-800 border border-gray-700 px-3 py-1.5 rounded-lg">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="text-xs font-bold text-white">XO</span>
            </div>
            <span className="text-gray-300 text-sm hidden md:block">XOps Reviewer</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ConsoleHeader;
