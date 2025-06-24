import React, { useState, useRef } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { Upload, Download, Image as ImageIcon, X, Zap, Eye, Target } from 'lucide-react';

interface Face {
  topLeft: [number, number];
  bottomRight: [number, number];
  probability: number;
}

interface ImageUploadProps {
  onFaceDetected: (faces: Face[]) => void;
  model: blazeface.BlazeFaceModel | null;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onFaceDetected, model }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<Face[]>([]);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setDetectedFaces([]);
        setAnalysisComplete(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const detectFacesInImage = async () => {
    if (!model || !imageRef.current || !canvasRef.current) return;

    setIsProcessing(true);
    
    try {
      const image = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const predictions = await model.estimateFaces(image, false);
      const faces: Face[] = predictions.map(prediction => ({
        topLeft: prediction.topLeft as [number, number],
        bottomRight: prediction.bottomRight as [number, number],
        probability: prediction.probability ? prediction.probability[0] : 0.9
      }));

      setDetectedFaces(faces);
      onFaceDetected(faces);
      setAnalysisComplete(true);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      faces.forEach((face, index) => {
        const [x1, y1] = face.topLeft;
        const [x2, y2] = face.bottomRight;
        const width = x2 - x1;
        const height = y2 - y1;

        const hue = 120 + index * 60;
        
        ctx.shadowColor = `hsl(${hue}, 70%, 50%)`;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        ctx.strokeRect(x1 - 3, y1 - 3, width + 6, height + 6);

        ctx.shadowBlur = 0;
        ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        ctx.lineWidth = 3;
        ctx.setLineDash([12, 6]);
        ctx.strokeRect(x1, y1, width, height);

        const cornerSize = Math.min(width, height) * 0.15;
        ctx.strokeStyle = `hsl(${hue}, 70%, 70%)`;
        ctx.lineWidth = 4;
        ctx.setLineDash([]);
        
        const corners = [
          { x: x1, y: y1, dx: [1, 0, 0, 1], dy: [0, 1, 1, 0] },
          { x: x2, y: y1, dx: [-1, 0, 0, 1], dy: [0, 1, 1, 0] },
          { x: x1, y: y2, dx: [1, 0, 0, -1], dy: [0, -1, -1, 0] },
          { x: x2, y: y2, dx: [-1, 0, 0, -1], dy: [0, -1, -1, 0] }
        ];

        corners.forEach(corner => {
          ctx.beginPath();
          ctx.moveTo(corner.x + corner.dx[0] * cornerSize, corner.y + corner.dy[0] * cornerSize);
          ctx.lineTo(corner.x, corner.y);
          ctx.lineTo(corner.x + corner.dx[1] * cornerSize, corner.y + corner.dy[1] * cornerSize);
          ctx.stroke();
        });

        const labelWidth = Math.max(250, width * 0.8);
        const labelHeight = 45;
        const labelY = y1 > labelHeight + 10 ? y1 - labelHeight - 5 : y2 + 10;
        
        const gradient = ctx.createLinearGradient(x1, labelY, x1 + labelWidth, labelY + labelHeight);
        gradient.addColorStop(0, `hsla(${hue}, 70%, 10%, 0.95)`);
        gradient.addColorStop(0.5, `hsla(${hue}, 70%, 20%, 0.95)`);
        gradient.addColorStop(1, `hsla(${hue}, 70%, 15%, 0.95)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x1, labelY, labelWidth, labelHeight);
        
        ctx.strokeStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
        ctx.lineWidth = 2;
        ctx.strokeRect(x1, labelY, labelWidth, labelHeight);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.fillText(`Face ${index + 1}`, x1 + 15, labelY + 22);
        
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = `hsl(${hue}, 70%, 70%)`;
        ctx.fillText(`${Math.round(face.probability * 100)}% confidence`, x1 + 15, labelY + 38);

        const barWidth = labelWidth - 30;
        const barHeight = 4;
        const barY = labelY + labelHeight - 12;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x1 + 15, barY, barWidth, barHeight);
        
        const progressWidth = (face.probability * barWidth);
        const barGradient = ctx.createLinearGradient(x1 + 15, barY, x1 + 15 + progressWidth, barY);
        barGradient.addColorStop(0, `hsl(${hue}, 70%, 50%)`);
        barGradient.addColorStop(1, `hsl(${hue}, 70%, 70%)`);
        ctx.fillStyle = barGradient;
        ctx.fillRect(x1 + 15, barY, progressWidth, barHeight);
      });
    } catch (error) {
      console.error('Error detecting faces:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadResult = () => {
    if (!canvasRef.current || !selectedImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resultCanvas = document.createElement('canvas');
    const resultCtx = resultCanvas.getContext('2d');
    if (!resultCtx) return;

    resultCanvas.width = canvas.width;
    resultCanvas.height = canvas.height;

    const img = new Image();
    img.onload = () => {
      resultCtx.drawImage(img, 0, 0);
      resultCtx.drawImage(canvas, 0, 0);
      
      const link = document.createElement('a');
      link.download = `face-detection-result-${Date.now()}.png`;
      link.href = resultCanvas.toDataURL('image/png', 1.0);
      link.click();
    };
    img.src = selectedImage;
  };

  const clearImage = () => {
    setSelectedImage(null);
    setDetectedFaces([]);
    setAnalysisComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-gradient-to-br from-indigo-900/80 via-purple-900/80 to-pink-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl border border-white/10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
          Image Analysis
        </h2>
        {detectedFaces.length > 0 && (
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 rounded-full blur animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 sm:px-4 sm:py-2 rounded-full text-white text-xs sm:text-sm font-bold shadow-lg">
              {detectedFaces.length} face{detectedFaces.length !== 1 ? 's' : ''} detected
            </div>
          </div>
        )}
      </div>

      {!selectedImage ? (
        <div className="group border-2 border-dashed border-gray-400/50 hover:border-purple-400/70 rounded-xl sm:rounded-2xl p-8 sm:p-12 lg:p-16 text-center transition-all duration-300 hover:bg-white/5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          
          <div className="relative mb-6 sm:mb-8">
            <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
            <div className="relative p-4 sm:p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full inline-block">
              <ImageIcon size={32} className="sm:w-12 sm:h-12 text-white" />
            </div>
          </div>
          
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 sm:mb-4">Upload Your Image</h3>
          <p className="text-gray-300 mb-6 sm:mb-8 text-sm sm:text-lg px-4">
            Drag and drop an image here, or click to browse
          </p>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 sm:px-8 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25 font-medium flex items-center space-x-3 mx-auto text-sm sm:text-base"
          >
            <Upload size={20} className="sm:w-6 sm:h-6" />
            <span>Choose Image</span>
          </button>
          
          <div className="mt-4 sm:mt-6 text-xs sm:text-sm text-gray-400">
            Supports: JPG, PNG, GIF, WebP • Max size: 10MB
          </div>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          <div className="relative group overflow-hidden rounded-xl sm:rounded-2xl">
            <img
              ref={imageRef}
              src={selectedImage}
              alt="Uploaded"
              className="w-full rounded-xl sm:rounded-2xl shadow-2xl max-h-[400px] sm:max-h-[500px] object-contain bg-gray-900"
              onLoad={() => {
                if (model && !analysisComplete) {
                  detectFacesInImage();
                }
              }}
            />
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0 w-full h-full rounded-xl sm:rounded-2xl pointer-events-none"
            />
            
            <button
              onClick={clearImage}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-red-500/90 hover:bg-red-600/90 backdrop-blur-sm text-white p-2 sm:p-3 rounded-full transition-all duration-300 transform hover:scale-110 shadow-lg"
            >
              <X size={16} className="sm:w-5 sm:h-5" />
            </button>

            {analysisComplete && detectedFaces.length > 0 && (
              <div className="absolute bottom-2 left-2 sm:bottom-4 sm:left-4 bg-black/70 backdrop-blur-sm px-2 py-1 sm:px-4 sm:py-2 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                  <div className="flex items-center space-x-1 text-green-400">
                    <Eye size={12} className="sm:w-4 sm:h-4" />
                    <span>{detectedFaces.length} faces</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-400">
                    <Target size={12} className="sm:w-4 sm:h-4" />
                    <span>{Math.round(detectedFaces.reduce((sum, face) => sum + face.probability, 0) / detectedFaces.length * 100)}% avg</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
            <button
              onClick={detectFacesInImage}
              disabled={isProcessing || !model}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 font-medium shadow-lg disabled:shadow-none transform hover:scale-105 disabled:transform-none text-sm sm:text-base"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-white"></div>
                  <span>Analyzing Image...</span>
                </>
              ) : (
                <>
                  <Zap size={20} className="sm:w-6 sm:h-6" />
                  <span>Detect Faces</span>
                </>
              )}
            </button>

            {detectedFaces.length > 0 && (
              <button
                onClick={downloadResult}
                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-4 py-3 sm:px-6 sm:py-4 rounded-lg sm:rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 font-medium shadow-lg shadow-green-500/25 transform hover:scale-105 text-sm sm:text-base"
              >
                <Download size={20} className="sm:w-6 sm:h-6" />
                <span className="hidden sm:inline">Download Result</span>
                <span className="sm:hidden">Download</span>
              </button>
            )}
          </div>

          {/* Analysis Results */}
          {analysisComplete && (
            <div className="bg-black/20 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/10">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Analysis Results</h3>
              <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {detectedFaces.map((face, index) => (
                  <div key={index} className="bg-white/5 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 space-y-2 sm:space-y-0">
                      <span className="text-white font-medium text-sm sm:text-base">Face {index + 1}</span>
                      <span className={`text-xs sm:text-sm px-2 py-1 rounded-full self-start sm:self-auto ${
                        face.probability > 0.9 ? 'bg-green-500/20 text-green-400' :
                        face.probability > 0.7 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {Math.round(face.probability * 100)}% confidence
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">
                      Position: ({Math.round(face.topLeft[0])}, {Math.round(face.topLeft[1])}) to ({Math.round(face.bottomRight[0])}, {Math.round(face.bottomRight[1])})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUpload;