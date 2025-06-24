import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { Camera, CameraOff, Mic, MicOff, Play, Square, Settings } from 'lucide-react';

interface Face {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

interface WebcamCaptureProps {
  onFaceDetected: (faces: Face[]) => void;
  onVoiceToggle: (enabled: boolean) => void;
  voiceEnabled: boolean;
}

const WebcamCapture: React.FC<WebcamCaptureProps> = ({
  onFaceDetected,
  onVoiceToggle,
  voiceEnabled
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const [isStreaming, setIsStreaming] = useState(false);
  const [model, setModel] = useState<blazeface.BlazeFaceModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const fpsCounterRef = useRef(0);
  const lastTimeRef = useRef(0);
  const lastDetectionTime = useRef(0);

  const loadModel = useCallback(async () => {
    try {
      setIsLoading(true);
      await tf.ready();
      const loadedModel = await blazeface.load();
      setModel(loadedModel);
      setIsLoading(false);
    } catch (err) {
      setError('Failed to load face detection model');
      setIsLoading(false);
    }
  }, []);

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError(null);
      }
    } catch (err) {
      setError('Failed to access webcam. Please check permissions.');
    }
  }, []);

  const stopWebcam = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
      setIsRecording(false);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);

  const detectFaces = useCallback(async () => {
    if (!model || !videoRef.current || !canvasRef.current || !isStreaming) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.videoWidth === 0 || video.readyState !== 4) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }

    const now = performance.now();
    
    if (now - lastDetectionTime.current < 67) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
      return;
    }
    
    lastDetectionTime.current = now;

    if (lastTimeRef.current > 0) {
      const delta = now - lastTimeRef.current;
      fpsCounterRef.current++;
      
      if (fpsCounterRef.current % 15 === 0) {
        setFps(Math.round(1000 / delta));
      }
    }
    lastTimeRef.current = now;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    try {
      const predictions = await model.estimateFaces(video, false);
      const faces: Face[] = predictions.map(prediction => ({
        topLeft: prediction.topLeft as [number, number],
        bottomRight: prediction.bottomRight as [number, number],
        probability: prediction.probability ? prediction.probability[0] : 0.9
      }));

      setFaceCount(faces.length);
      onFaceDetected(faces);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      faces.forEach((face, index) => {
        const [x1, y1] = face.topLeft;
        const [x2, y2] = face.bottomRight;
        const width = x2 - x1;
        const height = y2 - y1;

        const hue = 120 + index * 60;
        
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(x1, y1, width, height);

        const cornerSize = 20;
        ctx.strokeStyle = `hsl(${hue}, 70%, 70%)`;
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1 + cornerSize);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 + cornerSize, y1);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x2 - cornerSize, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y1 + cornerSize);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x1, y2 - cornerSize);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x1 + cornerSize, y2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(x2 - cornerSize, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 - cornerSize);
        ctx.stroke();

        const labelWidth = 180;
        const labelHeight = 30;
        const labelY = y1 > labelHeight + 10 ? y1 - labelHeight - 5 : y2 + 10;
        
        ctx.fillStyle = `hsla(${hue}, 70%, 20%, 0.9)`;
        ctx.fillRect(x1, labelY, labelWidth, labelHeight);
        
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, labelY, labelWidth, labelHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px Inter, sans-serif';
        ctx.fillText(`Face ${index + 1} • ${Math.round(face.probability * 100)}%`, x1 + 8, labelY + 20);
      });
    } catch (err) {
      console.error('Face detection error:', err);
    }

    animationFrameRef.current = requestAnimationFrame(detectFaces);
  }, [model, onFaceDetected, isStreaming]);

  useEffect(() => {
    loadModel();
  }, [loadModel]);

  useEffect(() => {
    if (isStreaming && model) {
      animationFrameRef.current = requestAnimationFrame(detectFaces);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isStreaming, model, detectFaces]);

  const toggleWebcam = () => {
    if (isStreaming) {
      stopWebcam();
    } else {
      startWebcam();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-900/80 via-purple-900/80 to-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-white/10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-4 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Live Detection
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            {faceCount > 0 && (
              <div className="relative">
                <div className="absolute inset-0 bg-green-500 rounded-full blur animate-pulse"></div>
                <div className="relative bg-green-500 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-white text-xs sm:text-sm font-bold">
                  {faceCount} face{faceCount !== 1 ? 's' : ''} detected
                </div>
              </div>
            )}
            {isStreaming && (
              <div className="bg-blue-500/20 px-2 py-1 sm:px-3 sm:py-1 rounded-lg text-blue-300 text-xs sm:text-sm font-medium">
                {fps} FPS
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-2 sm:space-x-3">
          <button
            onClick={() => onVoiceToggle(!voiceEnabled)}
            className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-110 ${
              voiceEnabled 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/25' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {voiceEnabled ? <Mic size={16} className="sm:w-5 sm:h-5" /> : <MicOff size={16} className="sm:w-5 sm:h-5" />}
          </button>
          
          {isStreaming && (
            <button
              onClick={toggleRecording}
              className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-110 ${
                isRecording
                  ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                  : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              }`}
            >
              {isRecording ? <Square size={16} className="sm:w-5 sm:h-5" /> : <Play size={16} className="sm:w-5 sm:h-5" />}
            </button>
          )}
          
          <button
            onClick={toggleWebcam}
            disabled={isLoading}
            className={`p-2 sm:p-3 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-110 ${
              isStreaming
                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
            } disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
          >
            {isStreaming ? <CameraOff size={16} className="sm:w-5 sm:h-5" /> : <Camera size={16} className="sm:w-5 sm:h-5" />}
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-48 sm:h-64 lg:h-96 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl border border-gray-700">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-500"></div>
              <Settings size={16} className="sm:w-5 sm:h-5 absolute inset-0 m-auto text-blue-500 animate-pulse" />
            </div>
            <p className="text-white mt-4 font-medium text-sm sm:text-base">Initializing AI model...</p>
            <p className="text-gray-400 text-xs sm:text-sm">Please wait while we prepare face detection</p>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-48 sm:h-64 lg:h-96 bg-gradient-to-br from-red-900/20 to-red-800/20 border border-red-500/50 rounded-xl sm:rounded-2xl">
            <div className="text-center p-4 sm:p-8">
              <div className="text-red-400 text-4xl sm:text-6xl mb-4">⚠️</div>
              <p className="text-red-300 text-base sm:text-lg font-medium mb-2">Camera Access Required</p>
              <p className="text-red-400 text-xs sm:text-sm px-4">{error}</p>
              <button
                onClick={startWebcam}
                className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 sm:px-6 sm:py-2 rounded-lg transition-colors text-sm sm:text-base"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {!isLoading && !error && (
          <div className="relative">
            {!isStreaming && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl sm:rounded-2xl z-10 border border-gray-700">
                <div className="text-center p-4 sm:p-8">
                  <div className="relative mb-4 sm:mb-6">
                    <div className="absolute inset-0 bg-blue-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative p-4 sm:p-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full">
                      <Camera size={32} className="sm:w-12 sm:h-12 text-white" />
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4">Ready to Start</h3>
                  <p className="text-gray-300 mb-4 sm:mb-6 text-sm sm:text-base px-4">Click the button below to begin real-time face detection</p>
                  <button
                    onClick={startWebcam}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-blue-500/25 font-medium text-sm sm:text-base"
                  >
                    Start Camera
                  </button>
                </div>
              </div>
            )}
            
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-xl sm:rounded-2xl shadow-2xl"
              style={{ maxHeight: '600px', objectFit: 'cover' }}
            />
            
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full rounded-xl sm:rounded-2xl pointer-events-none"
            />

            {isRecording && (
              <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex items-center space-x-2 bg-red-500/90 backdrop-blur-sm px-2 py-1 sm:px-3 sm:py-2 rounded-lg">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-white text-xs sm:text-sm font-medium">REC</span>
              </div>
            )}

            {isStreaming && (
              <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/70 backdrop-blur-sm px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                  <div className="text-green-400">
                    <span className="font-medium">{fps}</span> FPS
                  </div>
                  <div className="text-blue-400">
                    <span className="font-medium">{faceCount}</span> Faces
                  </div>
                  <div className="text-purple-400 hidden sm:block">
                    <span className="font-medium">WebGL</span> Accelerated
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebcamCapture;