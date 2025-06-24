import React, { useEffect, useState } from 'react';
import { Eye, Clock, Users, Zap, TrendingUp, Target } from 'lucide-react';

interface Face {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

interface StatsPanelProps {
  faces: Face[];
  detectionCount: number;
  sessionTime: number;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ faces, detectionCount, sessionTime }) => {
  const [animatedValues, setAnimatedValues] = useState({
    faces: 0,
    confidence: 0,
    detections: 0,
    time: 0
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const averageConfidence = faces.length > 0 
    ? Math.round(faces.reduce((sum, face) => sum + face.probability, 0) / faces.length * 100)
    : 0;

  // Animate values
  useEffect(() => {
    const animate = (current: number, target: number, step: number = 1) => {
      if (current === target) return current;
      const diff = target - current;
      const increment = Math.sign(diff) * Math.min(Math.abs(diff), step);
      return current + increment;
    };

    const interval = setInterval(() => {
      setAnimatedValues(prev => ({
        faces: animate(prev.faces, faces.length),
        confidence: animate(prev.confidence, averageConfidence, 2),
        detections: animate(prev.detections, detectionCount, 3),
        time: sessionTime
      }));
    }, 50);

    return () => clearInterval(interval);
  }, [faces.length, averageConfidence, detectionCount, sessionTime]);

  const stats = [
    {
      icon: Eye,
      label: 'Active Faces',
      value: animatedValues.faces.toString(),
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-500/10 to-blue-600/10',
      accentColor: 'text-blue-400',
      change: faces.length > 0 ? '+' : '±'
    },
    {
      icon: Target,
      label: 'Avg Confidence',
      value: `${animatedValues.confidence}%`,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'from-green-500/10 to-emerald-600/10',
      accentColor: 'text-green-400',
      change: averageConfidence >= 90 ? '↗' : averageConfidence >= 70 ? '→' : '↘'
    },
    {
      icon: Users,
      label: 'Total Detections',
      value: animatedValues.detections.toLocaleString(),
      color: 'from-purple-500 to-violet-600',
      bgColor: 'from-purple-500/10 to-violet-600/10',
      accentColor: 'text-purple-400',
      change: '↗'
    },
    {
      icon: Clock,
      label: 'Session Time',
      value: formatTime(animatedValues.time),
      color: 'from-orange-500 to-amber-600',
      bgColor: 'from-orange-500/10 to-amber-600/10',
      accentColor: 'text-orange-400',
      change: '⏱'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className="group relative bg-gradient-to-br from-gray-800/50 via-gray-900/50 to-black/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 border border-white/10"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          {/* Background Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgColor} rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`}></div>
          
          {/* Glow Effect */}
          <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} rounded-xl sm:rounded-2xl blur-xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10`}></div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2 sm:mb-4">
              <div className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-r ${stat.color} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon size={16} className="sm:w-6 sm:h-6 text-white" />
              </div>
              <div className={`text-lg sm:text-2xl ${stat.accentColor} font-bold group-hover:scale-110 transition-transform duration-300`}>
                {stat.change}
              </div>
            </div>
            
            <div className="space-y-1 sm:space-y-2">
              <div className={`text-xl sm:text-2xl lg:text-3xl font-bold text-white group-hover:${stat.accentColor} transition-colors duration-300`}>
                {stat.value}
              </div>
              <div className="text-gray-400 text-xs sm:text-sm font-medium group-hover:text-gray-300 transition-colors duration-300">
                {stat.label}
              </div>
            </div>

            {/* Progress Indicator */}
            {stat.label === 'Avg Confidence' && averageConfidence > 0 && (
              <div className="mt-2 sm:mt-4">
                <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
                  <div 
                    className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-1000 ease-out`}
                    style={{ width: `${averageConfidence}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Trend Indicator for Active Faces */}
            {stat.label === 'Active Faces' && faces.length > 0 && (
              <div className="mt-2 sm:mt-3">
                <div className="flex items-center space-x-1">
                  <TrendingUp size={10} className="sm:w-3 sm:h-3 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">Active</span>
                </div>
              </div>
            )}
          </div>

          {/* Pulse Animation for Active Stats */}
          {((stat.label === 'Active Faces' && faces.length > 0) || 
            (stat.label === 'Total Detections' && detectionCount > 0)) && (
            <div className={`absolute inset-0 bg-gradient-to-r ${stat.color} rounded-xl sm:rounded-2xl opacity-20 animate-ping`}></div>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatsPanel;