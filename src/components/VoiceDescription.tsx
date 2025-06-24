import React, { useEffect, useState, useCallback } from 'react';
import { Volume2, VolumeX, Mic, Play } from 'lucide-react';

interface Face {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

interface VoiceDescriptionProps {
  faces: Face[];
  enabled: boolean;
  className?: string;
}

const VoiceDescription: React.FC<VoiceDescriptionProps> = ({ 
  faces, 
  enabled, 
  className = '' 
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastFaceCount, setLastFaceCount] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [currentDescription, setCurrentDescription] = useState('');

  useEffect(() => {
    setSpeechSupported('speechSynthesis' in window);
  }, []);

  const speakDescription = useCallback((text: string) => {
    if (!enabled || !speechSupported) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1.1;
    utterance.volume = 0.8;
    utterance.voice = window.speechSynthesis.getVoices().find(voice => 
      voice.name.includes('Google') || voice.name.includes('Neural') || voice.default
    ) || null;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setCurrentDescription(text);
    window.speechSynthesis.speak(utterance);
  }, [enabled, speechSupported]);

  useEffect(() => {
    if (!enabled) return;

    const currentFaceCount = faces.length;
    
    if (Math.abs(currentFaceCount - lastFaceCount) >= 1) {
      let description = '';
      
      if (currentFaceCount === 0) {
        description = 'No faces currently detected in the camera view. Please position yourself in front of the camera for face detection.';
      } else if (currentFaceCount === 1) {
        const confidence = Math.round(faces[0].probability * 100);
        const position = getPositionDescription(faces[0]);
        description = `One face detected with ${confidence}% confidence, positioned in the ${position} of the frame.`;
      } else {
        const avgConfidence = Math.round(faces.reduce((sum, face) => sum + face.probability, 0) / faces.length * 100);
        description = `${currentFaceCount} faces detected with an average confidence of ${avgConfidence}%.`;
      }

      speakDescription(description);
      setLastFaceCount(currentFaceCount);
    }
  }, [faces, enabled, lastFaceCount, speakDescription]);

  const getPositionDescription = (face: Face) => {
    const [x1, y1] = face.topLeft;
    const [x2, y2] = face.bottomRight;
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    
    const width = 640;
    const height = 480;
    
    let horizontal = '';
    let vertical = '';
    
    if (centerX < width * 0.33) horizontal = 'left';
    else if (centerX > width * 0.67) horizontal = 'right';
    else horizontal = 'center';
    
    if (centerY < height * 0.33) vertical = 'upper';
    else if (centerY > height * 0.67) vertical = 'lower';
    else vertical = 'middle';
    
    return `${vertical} ${horizontal}`;
  };

  const getDetailedDescription = () => {
    if (faces.length === 0) {
      return 'No faces currently detected. Please position yourself in front of the camera for optimal face detection. Ensure good lighting and that your face is clearly visible.';
    }

    let description = `Currently detecting ${faces.length} face${faces.length !== 1 ? 's' : ''} in the camera view. `;
    
    faces.forEach((face, index) => {
      const confidence = Math.round(face.probability * 100);
      const position = getPositionDescription(face);
      const [x1, y1] = face.topLeft;
      const [x2, y2] = face.bottomRight;
      const width = Math.round(x2 - x1);
      const height = Math.round(y2 - y1);
      
      description += `Face ${index + 1} is positioned in the ${position} area of the frame with ${confidence}% confidence. The face bounding box measures ${width} by ${height} pixels. `;
      
      if (confidence >= 95) {
        description += 'Excellent detection quality. ';
      } else if (confidence >= 80) {
        description += 'Good detection quality. ';
      } else {
        description += 'Fair detection quality - consider improving lighting or positioning. ';
      }
    });

    const avgConfidence = Math.round(faces.reduce((sum, face) => sum + face.probability, 0) / faces.length * 100);
    description += `Overall detection performance: ${avgConfidence}% average confidence.`;

    return description;
  };

  const speakDetailedDescription = () => {
    const description = getDetailedDescription();
    speakDescription(description);
  };

  const stopSpeaking = () => {
    if (speechSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  if (!enabled) return null;

  return (
    <div className={`bg-gradient-to-br from-emerald-900/80 via-teal-900/80 to-cyan-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-white/10 ${className}`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`absolute inset-0 bg-teal-500 rounded-xl blur ${isSpeaking ? 'animate-pulse' : ''}`}></div>
            <div className="relative p-2 sm:p-3 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl">
              <Volume2 size={20} className="sm:w-7 sm:h-7 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Voice Assistant
            </h2>
            <p className="text-teal-300 text-xs sm:text-sm">AI-powered audio descriptions</p>
          </div>
        </div>
        
        {isSpeaking && (
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="flex space-x-1">
              <div className="w-1.5 h-6 sm:w-2 sm:h-8 bg-teal-400 rounded animate-pulse"></div>
              <div className="w-1.5 h-4 sm:w-2 sm:h-6 bg-teal-400 rounded animate-pulse delay-75"></div>
              <div className="w-1.5 h-8 sm:w-2 sm:h-10 bg-teal-400 rounded animate-pulse delay-150"></div>
              <div className="w-1.5 h-3 sm:w-2 sm:h-4 bg-teal-400 rounded animate-pulse delay-300"></div>
            </div>
            <span className="text-teal-300 text-xs sm:text-sm font-medium">Speaking...</span>
          </div>
        )}
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Current Status Display */}
        <div className="bg-black/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 sm:mb-4 space-y-2 sm:space-y-0">
            <h3 className="text-base sm:text-lg font-semibold text-white">Current Status</h3>
            <div className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
              faces.length > 0 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {faces.length > 0 ? 'Active Detection' : 'Standby'}
            </div>
          </div>
          
          <div className="text-gray-300 leading-relaxed text-sm sm:text-base">
            {getDetailedDescription()}
          </div>

          {/* Live Description */}
          {currentDescription && isSpeaking && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-teal-500/10 rounded-lg sm:rounded-xl border border-teal-500/20">
              <div className="flex items-center space-x-2 mb-2">
                <Mic size={12} className="sm:w-4 sm:h-4 text-teal-400" />
                <span className="text-teal-400 text-xs sm:text-sm font-medium">Currently Speaking:</span>
              </div>
              <p className="text-teal-200 text-xs sm:text-sm italic">"{currentDescription}"</p>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={speakDetailedDescription}
            disabled={isSpeaking || !speechSupported}
            className="flex-1 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 font-medium shadow-lg transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
          >
            <Play size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Describe Current View</span>
            <span className="sm:hidden">Describe View</span>
          </button>

          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 font-medium shadow-lg transform hover:scale-105 text-sm sm:text-base"
            >
              <VolumeX size={16} className="sm:w-5 sm:h-5" />
              <span>Stop</span>
            </button>
          )}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/10">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-white font-medium text-sm sm:text-base">Auto Announcements</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              Automatic voice notifications when faces are detected or lost
            </p>
          </div>
          
          <div className="bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/10">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full"></div>
              <span className="text-white font-medium text-sm sm:text-base">Detailed Analysis</span>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">
              Comprehensive descriptions including position and confidence data
            </p>
          </div>
        </div>

        {/* Speech Support Warning */}
        {!speechSupported && (
          <div className="bg-orange-500/20 border border-orange-500/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center space-x-2">
              <VolumeX size={16} className="sm:w-5 sm:h-5 text-orange-400" />
              <span className="text-orange-300 font-medium text-sm sm:text-base">Speech synthesis not supported</span>
            </div>
            <p className="text-orange-200 text-xs sm:text-sm mt-1">
              Your browser doesn't support text-to-speech functionality
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceDescription;