import React, { useState, useEffect, useRef } from 'react';
import { Material, AppView } from '../types';
import { getMaterials, saveMaterial, updateMaterial, addVocabulary, addGrammar, addSpeakingSentences } from '../services/storageService';
import ImportModal from './ImportModal';
import { analyzeWord, gradePronunciation, PronunciationResult } from '../services/geminiService';

enum Step {
  GRID = 0,
  BLIND_LISTENING = 1,
  DICTATION = 2,
  CORRECTION = 3,
  SHADOWING = 4
}

interface ListeningLabProps {
    onNavigate: (view: AppView) => void;
}

interface SentenceNode {
    text: string;
    start: number;
    end: number;
}

// Extracted UI Component for Player Controls
const PlayerControlBar: React.FC<{
    currentTime: number;
    durationString?: string;
    audioDuration: number;
    isPlaying: boolean;
    onTogglePlay: () => void;
    onSkip: (seconds: number) => void;
    onSeek: (time: number) => void;
    playbackRate: number;
    onChangeSpeed: (rate: number) => void;
    showSpeed?: boolean;
    // New props for Sentence Mode
    onPrev?: () => void;
    onNext?: () => void;
    onToggleLoop?: () => void;
    isLooping?: boolean;
}> = ({ 
    currentTime, durationString, audioDuration, isPlaying, 
    onTogglePlay, onSkip, onSeek, playbackRate, onChangeSpeed, showSpeed = true,
    onPrev, onNext, onToggleLoop, isLooping
}) => {
    const [showSpeedMenu, setShowSpeedMenu] = useState(false);

    return (
        <div className="bg-white rounded-2xl px-4 md:px-6 py-2 shadow-sm border border-gray-100 mb-0 flex flex-col gap-1 w-full relative">
            {/* Row 1: Progress Bar */}
            <div className="w-full">
                <div 
                    className="h-1.5 bg-gray-100 rounded-full overflow-hidden cursor-pointer group" 
                    onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const percent = (e.clientX - rect.left) / rect.width;
                        onSeek(percent * audioDuration);
                    }}
                >
                    <div 
                        className="h-full bg-[#6a11cb] relative transition-all duration-100 ease-linear" 
                        style={{width: `${audioDuration ? (currentTime / audioDuration) * 100 : 0}%`}}
                    >
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform"></div>
                    </div>
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1 font-medium">
                    <span>{Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(0).padStart(2, '0')}</span>
                    <span>{durationString || '0:00'}</span>
                </div>
            </div>

            {/* Row 2: Controls (Buttons Below) */}
            <div className="flex items-center justify-center relative w-full pt-1 pb-1">
                
                {/* Center Controls */}
                <div className="flex items-center gap-4 md:gap-6">
                    
                    {/* Prev Sentence Button (or Skip -5s fallback) */}
                    {onPrev ? (
                        <button 
                            onClick={onPrev} 
                            className="text-gray-400 hover:text-[#6a11cb] transition-colors p-2 hover:bg-gray-50 rounded-full"
                            title="上一句"
                        >
                             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 20L9 12l10-8v16z"></path><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                        </button>
                    ) : (
                        <button onClick={() => onSkip(-5)} className="text-xs font-medium text-gray-500 hover:text-[#6a11cb] transition-colors flex items-center gap-1 p-2 rounded-lg hover:bg-gray-50">
                            <span className="text-base">↺</span> 5s
                        </button>
                    )}

                    {/* Play/Pause Button */}
                    <button 
                        onClick={onTogglePlay}
                        className="w-12 h-12 rounded-full bg-gradient-to-br from-[#6a11cb] to-[#2575fc] text-white flex items-center justify-center shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all text-xl pl-0.5"
                    >
                        {isPlaying ? (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5"><path d="M5 3l14 9-14 9V3z"/></svg>
                        )}
                    </button>

                    {/* Next Sentence Button (or Skip +5s fallback) */}
                    {onNext ? (
                        <button 
                            onClick={onNext} 
                            className="text-gray-400 hover:text-[#6a11cb] transition-colors p-2 hover:bg-gray-50 rounded-full"
                            title="下一句"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4l10 8-10 8V4z"></path><line x1="19" y1="5" x2="19" y2="19"></line></svg>
                        </button>
                    ) : (
                        <button onClick={() => onSkip(5)} className="text-xs font-medium text-gray-500 hover:text-[#6a11cb] transition-colors flex items-center gap-1 p-2 rounded-lg hover:bg-gray-50">
                            5s <span className="text-base">↻</span>
                        </button>
                    )}

                    {/* Loop Toggle Button */}
                    {onToggleLoop && (
                        <button 
                            onClick={onToggleLoop}
                            className={`p-2 rounded-full transition-colors ${
                                isLooping 
                                ? 'text-[#6a11cb] bg-purple-50' 
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                            }`}
                            title="单句循环"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                            </svg>
                        </button>
                    )}
                </div>

                {/* Speed Control - Right Aligned */}
                {showSpeed && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2">
                        <div className="relative">
                            <button 
                                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                                className="px-2 py-1 rounded-lg bg-gray-50 text-gray-600 text-xs font-bold hover:bg-gray-100 border border-gray-200 transition-colors"
                            >
                                {playbackRate}x
                            </button>
                            {showSpeedMenu && (
                                <div className="absolute bottom-full right-0 mb-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[80px] z-50 animate-in fade-in zoom-in-95 duration-200">
                                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(rate => (
                                        <button
                                            key={rate}
                                            onClick={() => { onChangeSpeed(rate); setShowSpeedMenu(false); }}
                                            className={`w-full px-4 py-2 text-xs text-left hover:bg-gray-50 ${playbackRate === rate ? 'text-[#6a11cb] font-bold bg-purple-50' : 'text-gray-700'}`}
                                        >
                                            {rate}x
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ListeningLab: React.FC<ListeningLabProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<Step>(Step.GRID);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  
  // Filters
  const [filterDifficulty, setFilterDifficulty] = useState<string>('');
  const [filterTopic, setFilterTopic] = useState<string>('');
  const [filterDuration, setFilterDuration] = useState<string>('');
  
  // Workflow States
  const [userTranscript, setUserTranscript] = useState('');
  const audioRef = useRef<HTMLAudioElement>(null);
  const transcriptInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [playbackMode, setPlaybackMode] = useState<'sequence' | 'loop'>('sequence');

  // Correction State
  const [selectionMenu, setSelectionMenu] = useState<{x: number, y: number, text: string, type: 'word' | 'sentence'} | null>(null);
  const selectionRef = useRef<HTMLDivElement>(null);
  
  // Upload Menu State (Step 3)
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  // Shadowing State (Step 4 - Advanced)
  const [shadowingSentences, setShadowingSentences] = useState<SentenceNode[]>([]);
  const [currentShadowIndex, setCurrentShadowIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState<PronunciationResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);
  const [isPlayingUserAudio, setIsPlayingUserAudio] = useState(false);
  
  const shadowingListRef = useRef<HTMLDivElement>(null);
  const activeShadowSentenceRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const userAudioRef = useRef<HTMLAudioElement>(null);
  const stopTimeRef = useRef<number | null>(null);
  const shadowItemRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    setMaterials(getMaterials());
  }, []);

  // Force load audio when material changes to ensure playback is ready
  useEffect(() => {
      if (selectedMaterial && audioRef.current) {
          audioRef.current.load();
      }
  }, [selectedMaterial?.audioUrl]);

  // Audio Reset on Step Change
  useEffect(() => {
      setIsPlaying(false);
      if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
          setPlaybackMode('sequence'); // Reset mode
      }
  }, [step]);

  // Handle click outside for menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectionMenu && selectionRef.current && !selectionRef.current.contains(event.target as Node)) {
        setSelectionMenu(null);
      }
      if (showUploadMenu && uploadMenuRef.current && !uploadMenuRef.current.contains(event.target as Node)) {
        setShowUploadMenu(false);
      }
    };

    if (selectionMenu || showUploadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectionMenu, showUploadMenu]);

  // Init Shadowing Data when entering Step 4
  useEffect(() => {
    if (step === Step.SHADOWING && selectedMaterial) {
        let durationInSeconds = audioDuration;
        if (durationInSeconds === 0) {
             if (selectedMaterial.duration.includes(':')) {
                const parts = selectedMaterial.duration.split(':');
                durationInSeconds = parseInt(parts[0]) * 60 + parseInt(parts[1]);
            } else {
                const words = selectedMaterial.transcript.split(' ').length;
                durationInSeconds = Math.ceil(words / 2.5);
            }
        }

        const textContent = selectedMaterial.transcript;
        const timestampRegex = /(\d{2}:\d{2})/;

        let nodes: SentenceNode[] = [];

        // Check if the text contains timestamps like "00:00"
        if (timestampRegex.test(textContent)) {
            const matches = [...textContent.matchAll(/(\d{2}:\d{2})\s*([\s\S]*?)(?=(?:\d{2}:\d{2})|$)/g)];
            
            if (matches.length > 0) {
                nodes = matches.map((match, index, arr) => {
                    const timeString = match[1];
                    const content = match[2].trim();
                    
                    const [min, sec] = timeString.split(':').map(Number);
                    const startTime = min * 60 + sec;
                    
                    let endTime;
                    if (index < arr.length - 1) {
                        const nextTimeString = arr[index + 1][1];
                        const [nextMin, nextSec] = nextTimeString.split(':').map(Number);
                        endTime = nextMin * 60 + nextSec;
                    } else {
                        endTime = durationInSeconds || startTime + 5;
                    }

                    return {
                        text: content || "...",
                        start: startTime,
                        end: endTime
                    };
                });
            }
        }

        // Fallback if no timestamps found or parsing failed
        if (nodes.length === 0) {
            const rawSentences = textContent.match(/[^.!?]+[.!?]+/g) || [textContent];
            const cleanSentences = rawSentences.map(s => s.trim()).filter(s => s.length > 0);
            
            const totalChars = cleanSentences.reduce((acc, s) => acc + s.length, 0);
            let currentTime = 0;
            nodes = cleanSentences.map(text => {
                const weight = text.length / totalChars;
                const segDuration = weight * durationInSeconds;
                const start = currentTime;
                const end = currentTime + segDuration;
                currentTime += segDuration;
                return { text, start, end };
            });
        }
        
        setShadowingSentences(nodes);
        setCurrentShadowIndex(0);
        setFeedback(null);
        setUserAudioUrl(null);
    }
  }, [step, selectedMaterial, audioDuration]);

  // Auto-scroll logic for Step 4 Active Sentence
  useEffect(() => {
    if (step === Step.SHADOWING && shadowItemRefs.current[currentShadowIndex]) {
        shadowItemRefs.current[currentShadowIndex]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
  }, [currentShadowIndex, step]);


  // Filter Logic
  const filteredMaterials = materials.filter(m => {
      const matchDiff = !filterDifficulty || m.difficulty === filterDifficulty;
      const matchTopic = !filterTopic || m.topic.toLowerCase() === filterTopic.toLowerCase();
      
      let matchDuration = true;
      if (filterDuration) {
          const minutes = parseInt(m.duration);
          if (filterDuration === 'short') matchDuration = minutes < 3;
          else if (filterDuration === 'medium') matchDuration = minutes >= 3 && minutes <= 5;
          else if (filterDuration === 'long') matchDuration = minutes > 5;
      }
      
      return matchDiff && matchTopic && matchDuration;
  });

  const handleImport = (material: Material) => {
    const updated = saveMaterial(material);
    setMaterials(updated);
  };

  const startPractice = (material: Material) => {
    setSelectedMaterial(material);
    setStep(Step.BLIND_LISTENING);
    setUserTranscript('');
    setCurrentTime(0);
    setIsPlaying(false);
    setPlaybackRate(1);
    setShowCompletionModal(false);
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (audioRef.current.paused) {
          // Play Logic
          if (playbackMode === 'loop' && shadowingSentences[currentShadowIndex]) {
               stopTimeRef.current = shadowingSentences[currentShadowIndex].end;
          } else {
              stopTimeRef.current = null;
          }
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => {
                  console.log("Playback interrupted", error);
                  setIsPlaying(false);
              });
          }
          setIsPlaying(true);
      } else {
          // Pause Logic
          audioRef.current.pause();
          setIsPlaying(false);
      }
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const seek = (time: number) => {
      if (audioRef.current) {
          audioRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const changeSpeed = (rate: number) => {
      if (audioRef.current) {
          audioRef.current.playbackRate = rate;
          setPlaybackRate(rate);
      }
  };

  // Global Time Update Handler
  const handleAudioTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const time = e.currentTarget.currentTime;
      setCurrentTime(time);

      // Loop Mode Auto-Stop / Replay Logic
      if (playbackMode === 'loop' && stopTimeRef.current !== null) {
          if (time >= stopTimeRef.current) {
              const node = shadowingSentences[currentShadowIndex];
              if (node) {
                  e.currentTarget.currentTime = node.start;
                  e.currentTarget.play();
                  return; // Loop back
              }
          }
      }

      // Sequence Mode Auto-Stop (Optional)
      if (step === Step.SHADOWING && shadowingSentences.length > 0) {
          const index = shadowingSentences.findIndex(node => time >= node.start && time < node.end);
          if (index !== -1 && index !== currentShadowIndex) {
              setCurrentShadowIndex(index);
          }
      }
  };

  const playSegment = (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      const node = shadowingSentences[index];
      if (audioRef.current) {
          audioRef.current.currentTime = node.start;
          stopTimeRef.current = node.end;
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
              playPromise.catch(error => console.log("Segment play interrupted", error));
          }
          setIsPlaying(true);
          setCurrentShadowIndex(index);
      }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            setUserAudioUrl(audioUrl);
            
            setAnalyzing(true);
            const text = shadowingSentences[currentShadowIndex]?.text || "";
            const result = await gradePronunciation(text);
            setFeedback(result);
            setAnalyzing(false);
            
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setFeedback(null);
        setUserAudioUrl(null);
        
        if (isPlaying && audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
        }
    } catch (err) {
        alert("无法访问麦克风");
    }
  };

  const toggleRecord = () => {
      if (isRecording) {
          mediaRecorderRef.current?.stop();
          setIsRecording(false);
      } else {
          startRecording();
      }
  };

  const toggleUserAudio = () => {
      if (!userAudioRef.current) return;
      if (isPlayingUserAudio) {
          userAudioRef.current.pause();
      } else {
          const playPromise = userAudioRef.current.play();
          if (playPromise !== undefined) {
              playPromise.catch(e => console.log("User audio play interrupted", e));
          }
      }
      setIsPlayingUserAudio(!isPlayingUserAudio);
  };

  const nextShadowSentence = () => {
      if (currentShadowIndex < shadowingSentences.length - 1) {
          const newIndex = currentShadowIndex + 1;
          setCurrentShadowIndex(newIndex);
          if (audioRef.current) {
              audioRef.current.currentTime = shadowingSentences[newIndex].start;
               if (playbackMode === 'loop') {
                  stopTimeRef.current = shadowingSentences[newIndex].end;
              } else {
                  stopTimeRef.current = null;
              }
          }
      }
  };

  const prevShadowSentence = () => {
      if (currentShadowIndex > 0) {
          const newIndex = currentShadowIndex - 1;
          setCurrentShadowIndex(newIndex);
          if (audioRef.current) {
              audioRef.current.currentTime = shadowingSentences[newIndex].start;
              if (playbackMode === 'loop') stopTimeRef.current = shadowingSentences[newIndex].end;
              else stopTimeRef.current = null;
          }
      }
  };

  const toggleLoopMode = () => {
      setPlaybackMode(prev => {
          const newMode = prev === 'sequence' ? 'loop' : 'sequence';
          // Immediate effect if playing
          if (newMode === 'loop' && shadowingSentences[currentShadowIndex]) {
              stopTimeRef.current = shadowingSentences[currentShadowIndex].end;
          } else {
              stopTimeRef.current = null;
          }
          return newMode;
      });
  };

  const handleTranscriptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMaterial) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const updated = { ...selectedMaterial, transcript: text };
        setSelectedMaterial(updated);
        updateMaterial(updated);
        setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m));
      }
    };
    reader.readAsText(file);
    setShowUploadMenu(false);
  };

  const handlePasteTranscript = async () => {
    try {
        const text = await navigator.clipboard.readText();
        if (text && selectedMaterial) {
            const updated = { ...selectedMaterial, transcript: text };
            setSelectedMaterial(updated);
            updateMaterial(updated);
            setMaterials(prev => prev.map(m => m.id === updated.id ? updated : m));
            alert("文本已粘贴");
        }
    } catch (err) {
        console.error("Failed to read clipboard", err);
        alert("无法访问剪贴板，请手动输入或上传文件。");
    }
    setShowUploadMenu(false);
  };

  const handleTextSelection = (e: React.MouseEvent | React.KeyboardEvent) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
        const text = selection.toString().trim();
        // If text contains spaces, consider it potentially a sentence/phrase
        const isSentence = text.includes(' ');
        
        let x = 0, y = 0;
        if (e.type === 'mouseup' || e.type === 'click') {
            const mouseEvent = e as React.MouseEvent;
            x = mouseEvent.clientX;
            y = mouseEvent.clientY;
        } else {
             const range = selection.getRangeAt(0);
             const rect = range.getBoundingClientRect();
             x = rect.left + rect.width / 2;
             y = rect.top;
        }

        setSelectionMenu({ x, y, text, type: isSentence ? 'sentence' : 'word' });
    } else {
        setSelectionMenu(null);
    }
  };

  // Keyboard Shortcuts for Dictation
  const handleDictationKeyDown = (e: React.KeyboardEvent) => {
      if (e.ctrlKey) {
          if (e.code === 'Space' || e.key === ' ') {
              e.preventDefault();
              togglePlay();
          } else if (e.code === 'ArrowLeft' || e.key === 'ArrowLeft') {
              e.preventDefault();
              skip(-5);
          } else if (e.code === 'ArrowRight' || e.key === 'ArrowRight') {
              e.preventDefault();
              skip(5);
          }
      }
  };

  const collectItem = async (type: 'word' | 'sentence') => {
      if (!selectionMenu) return;
      if (type === 'word') {
          const analysis = await analyzeWord(selectionMenu.text, selectedMaterial?.transcript || '');
          addVocabulary({
              id: crypto.randomUUID(),
              word: selectionMenu.text,
              context: selectedMaterial?.title || '',
              definition: analysis.definition || 'Pending...',
              translation: analysis.translation || 'Pending...',
              addedAt: Date.now()
          });
          alert(`已收藏单词: ${selectionMenu.text}`);
      } else {
          addGrammar({
              id: crypto.randomUUID(),
              sentence: selectionMenu.text,
              rule: 'User Collected',
              explanation: 'Saved from listening practice',
              addedAt: Date.now()
          });
           alert(`已收藏句型`);
      }
      setSelectionMenu(null);
      window.getSelection()?.removeAllRanges();
  };

  const handleCompleteAndSync = () => {
      if (selectedMaterial) {
          const sentences = selectedMaterial.transcript.match(/[^.!?]+[.!?]+/g) || [selectedMaterial.transcript];
          const cleanSentences = sentences.map(s => s.trim()).filter(s => s.length > 0);
          addSpeakingSentences(cleanSentences);
          setShowCompletionModal(true);
      }
  };

  // VIEW: Grid
  if (step === Step.GRID) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto fade-in">
        <header className="flex justify-between items-center mb-6 md:mb-8">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">听力实验室</h2>
                <p className="text-sm md:text-base text-gray-500 mt-1">精听细读，深度解析每一篇素材。</p>
            </div>
            <button 
                onClick={() => setShowImport(true)}
                className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 shadow-sm hover:shadow-md transition-all hover:scale-105 active:scale-95 text-xl"
            >
                +
            </button>
        </header>

        {/* Filters */}
        <div className="flex flex-col md:flex-row flex-wrap gap-4 mb-8">
            <div className="flex flex-wrap gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                    <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} className="w-full appearance-none bg-white pl-4 pr-10 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:border-[#6a11cb] cursor-pointer shadow-sm">
                        <option value="">所有难度</option>
                        <option value="beginner">初级 (Beginner)</option>
                        <option value="intermediate">中级 (Intermediate)</option>
                        <option value="advanced">高级 (Advanced)</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
                </div>
                <div className="relative flex-1 md:flex-none">
                    <select value={filterTopic} onChange={(e) => setFilterTopic(e.target.value)} className="w-full appearance-none bg-white pl-4 pr-10 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:border-[#6a11cb] cursor-pointer shadow-sm">
                        <option value="">所有话题</option>
                        <option value="technology">科技 (Technology)</option>
                        <option value="business">商业 (Business)</option>
                        <option value="culture">文化 (Culture)</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
                </div>
                <div className="relative flex-1 md:flex-none">
                    <select value={filterDuration} onChange={(e) => setFilterDuration(e.target.value)} className="w-full appearance-none bg-white pl-4 pr-10 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 focus:outline-none focus:border-[#6a11cb] cursor-pointer shadow-sm">
                        <option value="">所有时长</option>
                        <option value="short">1-3 分钟</option>
                        <option value="medium">3-5 分钟</option>
                        <option value="long">5-10 分钟</option>
                    </select>
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">▼</span>
                </div>
            </div>
            
            <div className="flex-1 relative">
                <input type="text" placeholder="搜索材料..." className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#6a11cb] shadow-sm transition-colors"/>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMaterials.map(item => (
                <div key={item.id} className="group bg-white rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col h-full">
                    <div className="relative aspect-video rounded-xl overflow-hidden mb-4 bg-gray-100">
                        {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-4xl">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                            </div>
                        )}
                        <span className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-lg">
                            {item.duration}
                        </span>
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button onClick={() => startPractice(item)} className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-[#6a11cb] shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${item.difficulty === 'beginner' ? 'bg-green-100 text-green-700' : item.difficulty === 'intermediate' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                                {item.difficulty === 'beginner' ? '初级' : item.difficulty === 'intermediate' ? '中级' : '高级'}
                            </span>
                            <span className="text-xs text-gray-400">{item.source}</span>
                        </div>
                        <h3 className="font-bold text-gray-900 mb-1 leading-tight flex-1 line-clamp-2">{item.title}</h3>
                        
                        {/* Topic Tag Display */}
                        <div className="mt-1">
                            <span className="inline-block bg-purple-50 text-[#6a11cb] text-[10px] px-2 py-0.5 rounded-full font-medium border border-purple-100">
                                {item.topic}
                            </span>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                            <button onClick={() => startPractice(item)} className="flex-1 py-2 bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white text-sm font-semibold rounded-lg shadow-md hover:shadow-lg transition-all">
                                开始练习
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {showImport && <ImportModal onClose={() => setShowImport(false)} onImport={handleImport} />}
      </div>
    );
  }

  // VIEW: Workflow Steps
  return (
    <div className="h-full flex flex-col bg-[#f2f2f7] items-center relative">
        {/* Persistent Audio Elements */}
        <audio 
            ref={audioRef} 
            src={selectedMaterial?.audioUrl || undefined} 
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={(e) => setAudioDuration(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
        />
        <audio
            ref={userAudioRef}
            src={userAudioUrl || undefined}
            onEnded={() => setIsPlayingUserAudio(false)}
        />

        {/* Completion Modal */}
        {showCompletionModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 text-green-500">
                        🎉
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">恭喜完成训练！</h3>
                    <p className="text-gray-500 mb-8 leading-relaxed">
                        恭喜已完成精听训练，此文章已同步至口语实验室，是否立即开始背诵？
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setShowCompletionModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors">
                            取消
                        </button>
                        <button onClick={() => onNavigate(AppView.SPEAKING)} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white font-medium shadow-lg hover:shadow-purple-500/40 transition-all">
                            确认
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Workflow Header - Constrained Width & Floating */}
        <div className="w-full max-w-4xl z-20 shrink-0 px-4 mt-3 mb-1">
            <div className="h-16 bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 flex items-center justify-between px-4 md:px-6">
                <button 
                    onClick={() => setStep(Step.GRID)}
                    className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1"
                >
                    ✕ <span className="hidden sm:inline">退出</span>
                </button>
                
                {/* Scrollable Step Indicator for Mobile */}
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none">
                    {[1, 2, 3, 4].map(s => (
                        <div key={s} className="flex items-center flex-shrink-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                step === s 
                                ? 'bg-[#6a11cb] text-white shadow-lg shadow-purple-500/30' 
                                : step > s 
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-200 text-gray-400'
                            }`}>
                                {step > s ? '✓' : s}
                            </div>
                            {s < 4 && <div className={`w-4 sm:w-8 h-0.5 mx-1 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`}></div>}
                        </div>
                    ))}
                </div>

                <div className="flex gap-2"></div>
            </div>
        </div>

        {/* FIXED PLAYER BAR for Step 2 and 3 - Shortened to max-w-3xl */}
        {(step === Step.DICTATION || step === Step.CORRECTION) && (
             <div className="w-full max-w-3xl z-10 pt-2 px-4 flex justify-center shrink-0">
                 <PlayerControlBar 
                    currentTime={currentTime}
                    durationString={selectedMaterial?.duration}
                    audioDuration={audioDuration}
                    isPlaying={isPlaying}
                    onTogglePlay={togglePlay}
                    onSkip={skip}
                    onSeek={seek}
                    playbackRate={playbackRate}
                    onChangeSpeed={changeSpeed}
                 />
             </div>
        )}

        {/* Workflow Content */}
        <div className="flex-1 w-full max-w-4xl p-4 pt-2 overflow-hidden flex flex-col relative">
            
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 text-center shrink-0">
                {step === Step.BLIND_LISTENING && 'Step 1: 盲听预热'}
                {step === Step.DICTATION && 'Step 2: 逐句听写'}
                {step === Step.CORRECTION && 'Step 3: 智能校对'}
                {step === Step.SHADOWING && 'Step 4: 跟读模仿'}
            </h2>
            <p className="text-gray-500 text-center mb-6 text-xs md:text-sm shrink-0 px-4">
                 {step === Step.BLIND_LISTENING && '不看原文，专注于听，尝试捕捉大意。'}
                 {step === Step.DICTATION && '再听一遍，尽可能把听到的内容写下来。'}
                 {step === Step.CORRECTION && '对比原文，找出盲点和错误。'}
                 {step === Step.SHADOWING && '模仿原声语调，直到能够同步跟读。'}
            </p>

            {/* Main Content Card - Removed overflow-hidden for Step 4 specifically to allow speed menu to pop up */}
            <div className={`bg-white rounded-3xl shadow-xl border border-white flex-1 flex flex-col relative w-full ${step === Step.SHADOWING ? 'overflow-visible' : 'overflow-hidden'}`}>
                
                {/* Step 1: Blind Listening */}
                {step === Step.BLIND_LISTENING && (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 bg-gradient-to-b from-purple-50/50 to-white relative rounded-3xl overflow-hidden">
                         {/* Centered Large Play Button */}
                         <div className="relative z-10">
                            <div className={`absolute inset-0 bg-[#6a11cb] rounded-full blur-xl opacity-20 animate-pulse ${isPlaying ? 'scale-150' : 'scale-100'}`}></div>
                            <button 
                                onClick={togglePlay}
                                className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-[#6a11cb] to-[#2575fc] text-white flex items-center justify-center text-4xl md:text-5xl shadow-2xl hover:scale-105 active:scale-95 transition-all relative z-20"
                            >
                                {isPlaying ? (
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                ) : (
                                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="ml-2"><path d="M8 5v14l11-7z"/></svg>
                                )}
                            </button>
                         </div>
                         
                         <p className="mt-8 text-gray-400 font-medium tracking-wide">
                             {isPlaying ? '正在播放...' : '点击开始盲听'}
                         </p>
                    </div>
                )}

                {/* Step 2: Dictation */}
                {step === Step.DICTATION && (
                    <div className="flex flex-col h-full rounded-3xl overflow-hidden bg-white shadow-sm relative">
                         {/* Shortcut Hint Overlay */}
                         <div className="px-6 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center justify-end gap-3 text-[10px] text-gray-400 select-none hidden md:flex">
                             <span>⌨️ 快捷键:</span>
                             <span title="Control + Space"><kbd className="font-sans border rounded px-1 bg-white">Ctrl</kbd>+<kbd className="font-sans border rounded px-1 bg-white">Space</kbd> 播放/暂停</span>
                             <span title="Control + Left Arrow"><kbd className="font-sans border rounded px-1 bg-white">Ctrl</kbd>+<kbd className="font-sans border rounded px-1 bg-white">←</kbd> 后退</span>
                             <span title="Control + Right Arrow"><kbd className="font-sans border rounded px-1 bg-white">Ctrl</kbd>+<kbd className="font-sans border rounded px-1 bg-white">→</kbd> 快进</span>
                         </div>
                         <textarea 
                            className="flex-1 w-full p-6 text-lg leading-relaxed resize-none focus:outline-none bg-transparent transition-colors duration-300 focus:bg-purple-50/30 rounded-b-2xl caret-[#6a11cb] selection:bg-[#6a11cb] selection:text-white placeholder-gray-300 font-medium text-gray-700"
                            placeholder="请在此输入你听到的内容..."
                            value={userTranscript}
                            onChange={(e) => setUserTranscript(e.target.value)}
                            onPaste={(e) => {
                                e.preventDefault();
                                alert("听写模式下禁止粘贴！");
                            }}
                            onKeyDown={handleDictationKeyDown}
                            onMouseUp={handleTextSelection}
                            onKeyUp={handleTextSelection}
                         ></textarea>
                    </div>
                )}

                {/* Step 3: Correction */}
                {step === Step.CORRECTION && (
                    <div className="flex flex-col h-full rounded-3xl overflow-hidden">
                        {/* Mobile: Stacked, Desktop: Side-by-Side */}
                        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100 overflow-hidden">
                            <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-red-50/10 min-h-[200px]">
                                <h3 className="text-xs font-bold text-gray-400 uppercase mb-4">你的听写</h3>
                                <textarea 
                                    className="w-full h-full bg-transparent resize-none outline-none text-base md:text-lg leading-relaxed text-red-600 selection:bg-[#6a11cb] selection:text-white caret-red-500 font-medium"
                                    value={userTranscript}
                                    onChange={(e) => setUserTranscript(e.target.value)}
                                    placeholder="输入你的听写内容..."
                                    onMouseUp={handleTextSelection}
                                    onKeyUp={handleTextSelection}
                                />
                            </div>
                            <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-green-50/10 min-h-[200px]">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-xs font-bold text-gray-400 uppercase">标准原文</h3>
                                    <div className="relative group">
                                        <input 
                                                type="file" 
                                                accept=".txt" 
                                                className="hidden" 
                                                ref={transcriptInputRef}
                                                onChange={handleTranscriptUpload}
                                        />
                                        <button 
                                                onClick={() => transcriptInputRef.current?.click()}
                                                className="text-[10px] px-2 py-1 bg-white border border-gray-200 text-gray-600 rounded hover:bg-gray-50 transition-colors flex items-center gap-1 shadow-sm"
                                        >
                                            📄 上传原文
                                        </button>
                                        
                                        {showUploadMenu && (
                                            <div className="absolute top-0 right-full mr-2 flex flex-col bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden min-w-[120px] z-50 animate-in fade-in zoom-in-95 duration-200">
                                                <button 
                                                    onClick={() => { transcriptInputRef.current?.click(); setShowUploadMenu(false); }}
                                                    className="px-4 py-3 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2 border-b border-gray-50"
                                                >
                                                    <span className="text-base">📁</span> 文件导入
                                                </button>
                                                <button 
                                                    onClick={handlePasteTranscript}
                                                    className="px-4 py-3 text-xs font-medium text-gray-700 hover:bg-gray-50 text-left flex items-center gap-2"
                                                >
                                                    <span className="text-base">📋</span> 粘贴文本
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div 
                                    className="text-base md:text-lg leading-relaxed text-gray-800 selection:bg-[#6a11cb] selection:text-white caret-[#6a11cb] whitespace-pre-wrap"
                                    onMouseUp={handleTextSelection}
                                    onKeyUp={handleTextSelection}
                                >
                                    {selectedMaterial?.transcript || "No transcript available."}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Shadowing */}
                {step === Step.SHADOWING && (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 bg-gray-50/30 rounded-3xl relative">
                        <div className="max-w-3xl w-full h-full flex flex-col relative">
                             
                             {/* Floating Play Button */}
                             <div className="absolute bottom-36 right-8 z-30">
                                <button 
                                    onClick={togglePlay}
                                    className="w-14 h-14 rounded-full bg-[#6a11cb] text-white shadow-xl hover:scale-110 active:scale-95 transition-transform flex items-center justify-center"
                                >
                                    {isPlaying ? (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                                    ) : (
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="white" className="ml-1"><path d="M5 3l14 9-14 9V3z"/></svg>
                                    )}
                                </button>
                             </div>

                             {/* Auto Scrolling Text Container - 2/3 Height */}
                             <div 
                                ref={shadowingListRef}
                                className="flex-grow h-2/3 overflow-y-auto px-4 md:px-8 py-4 mb-6 relative scroll-smooth rounded-2xl bg-white/50 border border-gray-100 shadow-inner"
                             >
                                 <div className="space-y-6 py-32">
                                     {shadowingSentences.map((node, index) => {
                                         const isActive = index === currentShadowIndex;
                                         return (
                                             <div
                                                key={index}
                                                ref={(el) => { shadowItemRefs.current[index] = el; }}
                                                onClick={() => {
                                                    if(audioRef.current) {
                                                        audioRef.current.currentTime = node.start;
                                                        stopTimeRef.current = null;
                                                        setCurrentShadowIndex(index);
                                                        if (!isPlaying) {
                                                            audioRef.current.play().catch(console.error);
                                                            setIsPlaying(true);
                                                        }
                                                    }
                                                }}
                                                className={`transition-all duration-500 cursor-pointer p-6 rounded-2xl border-2 ${
                                                    isActive 
                                                    ? 'bg-white border-[#6a11cb] shadow-xl scale-105 text-[#6a11cb] z-10' 
                                                    : 'border-transparent text-gray-400 hover:text-gray-600 scale-100 opacity-60 hover:opacity-100 hover:bg-white/50'
                                                }`}
                                             >
                                                 {/* Show Time for Timestamped content */}
                                                 <div className="text-[10px] opacity-50 mb-1 font-mono">
                                                     {Math.floor(node.start / 60).toString().padStart(2, '0')}:{Math.floor(node.start % 60).toString().padStart(2, '0')}
                                                 </div>
                                                 <p className={`text-xl md:text-2xl font-medium leading-relaxed transition-all`}>
                                                     {node.text}
                                                 </p>
                                             </div>
                                         );
                                     })}
                                 </div>
                             </div>

                             {/* Player - This needs to not be clipped by overflow-hidden */}
                             <div className="shrink-0 mb-4 z-10">
                                <PlayerControlBar 
                                    currentTime={currentTime}
                                    durationString={selectedMaterial?.duration}
                                    audioDuration={audioDuration}
                                    isPlaying={isPlaying}
                                    onTogglePlay={togglePlay}
                                    onSkip={skip}
                                    onSeek={seek}
                                    playbackRate={playbackRate}
                                    onChangeSpeed={changeSpeed}
                                    showSpeed={true}
                                    // New Sentence Mode Props
                                    onPrev={prevShadowSentence}
                                    onNext={nextShadowSentence}
                                    onToggleLoop={toggleLoopMode}
                                    isLooping={playbackMode === 'loop'}
                                />
                             </div>
                        </div>
                    </div>
                )}

                {/* Context Menu (Tooltip) */}
                {selectionMenu && (
                    <div 
                        ref={selectionRef}
                        className="fixed z-50 flex flex-col bg-[#1c1c1e]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 overflow-visible animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            // Position above the cursor, shifted left so bottom-right corner is near cursor
                            top: selectionMenu.y - (selectionMenu.type === 'sentence' ? 100 : 60), // Dynamic height adjustment
                            left: Math.max(10, Math.min(window.innerWidth - 140, selectionMenu.x - 70)) // Center horizontally relative to click, clamp to screen
                        }}
                    >
                        {/* Content */}
                        <div className="flex flex-col overflow-hidden rounded-xl w-36">
                             <button 
                                onClick={() => collectItem('word')}
                                className="flex items-center gap-3 px-4 py-2.5 text-white text-sm hover:bg-white/15 transition-colors text-left group"
                            >
                                <span className="text-lg group-hover:scale-110 transition-transform">📖</span> 
                                <span className="font-medium">收藏单词</span>
                            </button>
                            
                            {/* Only show sentence option if it looks like a phrase/sentence or explicit selection */}
                            {(selectionMenu.type === 'sentence' || selectionMenu.text.includes(' ')) && (
                                <>
                                    <div className="h-[1px] bg-white/10 w-full mx-auto"></div>
                                    <button 
                                        onClick={() => collectItem('sentence')}
                                        className="flex items-center gap-3 px-4 py-2.5 text-white text-sm hover:bg-white/15 transition-colors text-left group"
                                    >
                                        <span className="text-lg group-hover:scale-110 transition-transform">⭐</span> 
                                        <span className="font-medium">收藏句型</span>
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Pointer Arrow */}
                        <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#1c1c1e]/95 backdrop-blur-xl rotate-45 border-r border-b border-white/10"></div>
                    </div>
                )}

            </div>
        </div>

        {/* Workflow Footer Navigation - Constrained Width & Floating */}
        <div className="w-full max-w-4xl shrink-0 z-20 px-4 mb-4">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-sm border border-white/20 py-2.5 px-6 flex justify-between items-center">
                 <button 
                    onClick={() => setStep(Math.max(Step.BLIND_LISTENING, step - 1))}
                    disabled={step === Step.BLIND_LISTENING}
                    className="px-4 md:px-6 py-2.5 rounded-xl text-gray-500 font-medium hover:bg-gray-100 disabled:opacity-30 transition-colors text-sm md:text-base"
                 >
                     ← <span className="hidden sm:inline">上一步</span>
                 </button>
                 
                 {step < Step.SHADOWING ? (
                     <button 
                        onClick={() => setStep(step + 1)}
                        className="px-6 md:px-8 py-2.5 rounded-xl bg-[#1c1c1e] text-white font-medium hover:bg-gray-800 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all text-sm md:text-base"
                     >
                         <span className="hidden sm:inline">下一步</span> →
                     </button>
                 ) : (
                     <button 
                        onClick={handleCompleteAndSync}
                        className="px-6 md:px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm md:text-base"
                     >
                         <span>完成</span>
                         <span>🚀</span>
                     </button>
                 )}
            </div>
        </div>
    </div>
  );
};

export default ListeningLab;