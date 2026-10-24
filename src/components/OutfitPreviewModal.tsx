import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  X,
  Sparkles,
  Download,
  RotateCcw,
  Check,
  AlertCircle,
  Upload,
  SwitchCamera,
  Share2,
  Bookmark,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { OutfitSuggestion, Meeting } from '../types';

interface OutfitPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  outfit: OutfitSuggestion | null;
  meeting: Meeting | null;
}

export const OutfitPreviewModal: React.FC<OutfitPreviewModalProps> = ({
  isOpen,
  onClose,
  outfit,
  meeting,
}) => {
  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeView, setActiveView] = useState<'capture' | 'preview'>('capture');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera
  const startCamera = async () => {
    try {
      setCameraError(null);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Camera access was unavailable or denied. You can take a photo with your device or upload an image below.'
      );
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (isOpen && activeView === 'capture' && !capturedPhoto) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeView, capturedPhoto, facingMode]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleClose = () => {
    stopCamera();
    setCapturedPhoto(null);
    setGeneratedImage(null);
    setGenerationError(null);
    setActiveView('capture');
    onClose();
  };

  // Capture Snapshot from video
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // If front camera, mirror image for natural feel
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }
  };

  // File Upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setCapturedPhoto(reader.result as string);
        stopCamera();
      };
      reader.readAsDataURL(file);
    }
  };

  // Toggle Camera
  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedPhoto(null);
    setGeneratedImage(null);
    setGenerationError(null);
    setActiveView('capture');
  };

  // Generate with Nano Banana
  const handleGenerate = async () => {
    if (!capturedPhoto || !outfit) return;

    setIsGenerating(true);
    setGenerationError(null);

    const itemsDesc = outfit.items
      .map(
        i =>
          `- ${i.category.toUpperCase()}: ${i.name} (Subcategory: ${i.subcategory}, Color: ${i.color}, Fabric: ${i.material}, Warmth: ${i.warmth}/5, Weather: ${i.weatherTags.join(', ')})`
      )
      .join('\n');

    try {
      const res = await fetch('/api/stylist/preview-outfit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPhotoBase64: capturedPhoto,
          outfitTitle: outfit.title,
          outfitSubtitle: outfit.subtitle,
          itemsDescription: itemsDesc,
          meetingTitle: meeting?.title,
          formality: meeting?.formality,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.imageUrl) {
        throw new Error(data.error || 'Failed to generate tailored image.');
      }

      setGeneratedImage(data.imageUrl);
      setActiveView('preview');
    } catch (err: any) {
      console.error(err);
      setGenerationError(err.message || 'Image generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Download Generated Photo
  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement('a');
    a.href = generatedImage;
    a.download = `jeeves-tryon-${outfit?.title.toLowerCase().replace(/\s+/g, '-') || 'outfit'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Save to Lookbook
  const handleSaveToLookbook = () => {
    if (!generatedImage || !outfit) return;
    try {
      const saved = JSON.parse(localStorage.getItem('jeeves_saved_tryons') || '[]');
      saved.unshift({
        id: `tryon-${Date.now()}`,
        outfitTitle: outfit.title,
        date: new Date().toISOString(),
        imageUrl: generatedImage,
      });
      localStorage.setItem('jeeves_saved_tryons', JSON.stringify(saved.slice(0, 15)));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  // Share photo
  const handleShare = async () => {
    if (!generatedImage) return;
    if (navigator.share) {
      try {
        const blob = await (await fetch(generatedImage)).blob();
        const file = new File([blob], 'outfit-preview.png', { type: 'image/png' });
        await navigator.share({
          title: `My ${outfit?.title} Look`,
          text: `Tailored preview for ${meeting?.title || 'my meeting'} generated by Jeeves.`,
          files: [file],
        });
      } catch (err) {
        console.warn('Share dismissed:', err);
      }
    } else {
      handleDownload();
    }
  };

  if (!isOpen || !outfit) return null;

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-serif font-bold text-base leading-tight">Virtual Outfit Try-On</h3>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold">
                  Nano Banana
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-sm">
                {outfit.title} &bull; {outfit.items.length} garments curated for {meeting?.formality.replace('_', ' ') || 'today'}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close Preview Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Garments Preview Bar */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-2">
              Outfit Ensemble to Try On:
            </span>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
              {outfit.items.map(item => (
                <div
                  key={item.id}
                  className="flex items-center space-x-2 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shrink-0"
                >
                  <div className="w-7 h-7 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs">👔</div>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-900 leading-tight truncate max-w-[110px]">
                      {item.name}
                    </p>
                    <p className="text-[9px] text-slate-500">{item.color}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: Camera Viewfinder or Captured Photo */}
          {!generatedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] sm:aspect-[16/11] bg-slate-950 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center">
                {capturedPhoto ? (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedPhoto}
                      alt="Your captured photo"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-white font-medium flex items-center gap-1.5 border border-white/10">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Photo Ready
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                    />

                    {/* Camera Silhouette Alignment Guide */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center border-2 border-dashed border-white/20 m-6 rounded-2xl">
                      <div className="w-24 h-32 rounded-full border border-white/30 mb-2 opacity-60" />
                      <div className="w-48 h-36 border-t border-l border-r border-white/30 rounded-t-3xl opacity-50" />
                      <span className="text-[11px] font-medium text-white/70 bg-black/50 px-3 py-1 rounded-full mt-3">
                        Frame yourself from waist or chest up
                      </span>
                    </div>

                    {/* Camera Controls Overlay */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center space-x-4">
                      <button
                        onClick={toggleCamera}
                        className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/10 transition-colors"
                        title="Switch Camera (Front/Rear)"
                      >
                        <SwitchCamera className="w-5 h-5" />
                      </button>

                      <button
                        onClick={takeSnapshot}
                        className="w-16 h-16 rounded-full bg-white border-4 border-amber-500 shadow-xl flex items-center justify-center active:scale-95 transition-transform"
                        title="Capture Photo"
                      >
                        <div className="w-12 h-12 rounded-full bg-amber-600" />
                      </button>

                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-md border border-white/10 transition-colors"
                        title="Upload from device"
                      >
                        <Upload className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                )}

                <canvas ref={canvasRef} className="hidden" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {cameraError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-xl text-xs flex items-center justify-between">
                  <span>{cameraError}</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="font-bold underline ml-2"
                  >
                    Upload Photo
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                {capturedPhoto ? (
                  <button
                    onClick={handleRetake}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center space-x-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-amber-700 hover:text-amber-900 flex items-center space-x-1"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Or upload existing photo</span>
                  </button>
                )}

                <button
                  onClick={handleGenerate}
                  disabled={!capturedPhoto || isGenerating}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white shadow-md flex items-center space-x-2 transition-all active:scale-95"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Nano Banana is Tailoring...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <span>Generate Photorealistic Try-On</span>
                    </>
                  )}
                </button>
              </div>

              {generationError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{generationError}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Tailored Generated Image Preview */}
          {generatedImage && (
            <div className="space-y-4">
              {savedSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-2 rounded-xl flex items-center space-x-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium">Look saved to your personal Lookbook!</span>
                </div>
              )}

              <div className="relative aspect-[3/4] sm:aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center border border-slate-200">
                <img
                  src={generatedImage}
                  alt={`You wearing ${outfit.title}`}
                  className="w-full h-full object-cover"
                />

                <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[11px] text-white font-medium flex items-center gap-1.5 border border-white/10">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Photorealistic Try-On &bull; Nano Banana
                </div>
              </div>

              {/* Garment match summary */}
              <p className="text-xs text-slate-600 text-center italic">
                Tailored with {outfit.items.map(i => i.name).join(', ')}.
              </p>

              {/* Action Buttons: Save Photo, Download, Lookbook, Retake */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Try With Another Photo</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveToLookbook}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center space-x-1.5 transition-colors"
                  >
                    <Bookmark className="w-3.5 h-3.5 text-amber-600" />
                    <span>Save to Lookbook</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center space-x-1.5 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5 text-slate-600" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={handleDownload}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md flex items-center space-x-1.5 transition-all active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Save Photo (Download)</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
