import React from 'react';
import { Brain, Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  progress: number;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden px-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-spin-slow"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-l from-cyan-500/20 to-pink-500/20 rounded-full blur-3xl animate-spin-reverse"></div>
      </div>

      <div className="relative z-10 text-center space-y-6 sm:space-y-8 max-w-md mx-auto">
        {/* Logo */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl blur-2xl opacity-50 animate-pulse"></div>
          <div className="relative p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl sm:rounded-3xl">
            <Brain size={48} className="sm:w-16 sm:h-16 text-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-purple-200 bg-clip-text text-transparent mb-3 sm:mb-4">
            AI Face Detection
          </h1>
          <p className="text-gray-300 text-base sm:text-lg px-4">Initializing TensorFlow.js BlazeFace Model</p>
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-sm mx-auto space-y-3 sm:space-y-4 px-4">
          <div className="relative">
            <div className="w-full bg-gray-700 rounded-full h-2.5 sm:h-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full"></div>
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Loading Model...</span>
            <span className="text-blue-400 font-medium">{progress}%</span>
          </div>
        </div>

        {/* Loading Steps */}
        <div className="space-y-2 sm:space-y-3 px-4">
          {[
            { step: 'Initializing TensorFlow.js', threshold: 20 },
            { step: 'Setting up WebGL Backend', threshold: 40 },
            { step: 'Loading BlazeFace Model', threshold: 60 },
            { step: 'Optimizing for Performance', threshold: 80 },
            { step: 'Ready for Detection', threshold: 100 }
          ].map((item, index) => (
            <div key={index} className="flex items-center justify-center space-x-3">
              {progress >= item.threshold ? (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              ) : progress >= item.threshold - 20 ? (
                <Loader2 size={8} className="text-blue-400 animate-spin" />
              ) : (
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-600 rounded-full"></div>
              )}
              <span 
                className={`text-xs sm:text-sm transition-colors duration-300 ${
                  progress >= item.threshold 
                    ? 'text-green-400' 
                    : progress >= item.threshold - 20
                    ? 'text-blue-400'
                    : 'text-gray-500'
                }`}
              >
                {item.step}
              </span>
            </div>
          ))}
        </div>

        {/* Performance Indicators */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-6 sm:pt-8 border-t border-gray-700/50">
          <div className="text-center">
            <div className="text-blue-400 font-bold text-sm sm:text-base">2.1MB</div>
            <div className="text-xs text-gray-500">Model Size</div>
          </div>
          <div className="text-center">
            <div className="text-green-400 font-bold text-sm sm:text-base">60 FPS</div>
            <div className="text-xs text-gray-500">Target Rate</div>
          </div>
          <div className="text-center">
            <div className="text-purple-400 font-bold text-sm sm:text-base">WebGL</div>
            <div className="text-xs text-gray-500">Acceleration</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;