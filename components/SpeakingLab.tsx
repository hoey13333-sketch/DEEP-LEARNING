import React, { useState, useEffect, useRef, useCallback } from 'react';
import { gradePronunciation, PronunciationResult, translateText } from '../services/geminiService';
import { getSpeakingSentences } from '../services/storageService';

interface SpeakingItem {
    id: string;
    text: string;
    translation: string;
    start: number;
    end: number;
    showTranslation: boolean;
    userAudioUrl?: string;
    score?: PronunciationResult;
    isAnalyzing?: boolean;
}

const SpeakingLab: React.FC = () => {
  // --- Global State ---
  const [items, setItems] = useState<SpeakingItem[]>([]);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  
  // --- Active States ---
  const [focusedIndex, setFocusedIndex] = useState(0); // Keyboard Navigation & Auto-scroll Focus
  const [playingOriginalIndex, setPlayingOriginalIndex] = useState<number | null>(null); // Visual Play State
  const [isSegmentMode, setIsSegmentMode] = useState(false);
  const [recordingIndex, setRecordingIndex] = useState<number | null>(null);
  const [playingUserIndex, setPlayingUserIndex] = useState<number | null>(null);
  const [playbackMode, setPlaybackMode] = useState<'sequence' | 'loop'>('sequence');
  const [isPlaying, setIsPlaying] = useState(false);
  
  // --- Refs ---
  const audioRef = useRef<HTMLAudioElement>(null);     
  const userAudioRef = useRef<HTMLAudioElement>(null); 
  const stopTimeRef = useRef<number | null>(null);     
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]); // Refs for auto-scrolling

  // --- Helper: Parse Timestamps ---
  const parseTimestampedText = (text: string): SpeakingItem[] => {
      const regex = /(\d{1,2}:\d{2})\s*([\s\S]*?)(?=(?:\d{1,2}:\d{2})|$)/g;
      const matches = [...text.matchAll(regex)];
      
      if (matches.length > 0) {
          return matches.map((match, index, arr) => {
              const timeString = match[1];
              const content = match[2].trim();
              
              const [min, sec] = timeString.split(':').map(Number);
              const startTime = min * 60 + sec;
              
              let endTime = startTime + 5; 
              if (index < arr.length - 1) {
                  const nextTimeString = arr[index + 1][1];
                  const [nextMin, nextSec] = nextTimeString.split(':').map(Number);
                  endTime = nextMin * 60 + nextSec;
              }

              return {
                  id: `seg-${index}-${Date.now()}`,
                  text: content || "No text content",
                  translation: "点击翻译按钮查看中文释义...",
                  start: startTime,
                  end: endTime,
                  showTranslation: false
              };
          });
      } else {
          const sentences = text.match(/[^.!?]+[.!?]+/g) || text.split('\n');
          return sentences.map((s, i) => ({
              id: `plain-${i}-${Date.now()}`,
              text: s.trim(),
              translation: "点击翻译按钮查看中文释义...",
              start: 0,
              end: 0,
              showTranslation: false
          })).filter(i => i.text.length > 0);
      }
  };

  // --- Initialization ---
  useEffect(() => {
    const stored = getSpeakingSentences();
    if (stored.length > 0 && items.length === 0) {
        const initialItems: SpeakingItem[] = stored.map((text, i) => ({
            id: `s-${i}`,
            text,
            translation: "点击翻译按钮查看中文释义...", // Placeholder for demo
            start: i * 5, 
            end: (i + 1) * 5,
            showTranslation: false
        }));
        setItems(initialItems);
    }
  }, []);

  // --- Auto Scroll to Focused Item ---
  useEffect(() => {
      if (itemRefs.current[focusedIndex]) {
          itemRefs.current[focusedIndex]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
          });
      }
  }, [focusedIndex]);

  // --- Helper: Recalculate Timings if Audio Loaded ---
  const handleAudioMetadata = (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const dur = e.currentTarget.duration;
      if (!dur || items.length === 0) return;

      const hasTimestamps = items.some((item, i) => i > 0 && item.start > 0);

      if (hasTimestamps) {
          setItems(prev => {
              const copy = [...prev];
              const last = copy[copy.length - 1];
              if (last.end < last.start + 1) {
                  copy[copy.length - 1] = { ...last, end: dur };
              }
              return copy;
          });
      } else {
          const totalChars = items.reduce((acc, item) => acc + item.text.length, 0);
          let currentTime = 0;
          const updated = items.map(item => {
              const weight = item.text.length / totalChars;
              const segDuration = weight * dur;
              const start = currentTime;
              const end = currentTime + segDuration;
              currentTime += segDuration;
              return { ...item, start, end };
          });
          setItems(updated);
      }
  };

  // --- Playback Controls (Global Bottom Bar) ---

  const toggleGlobalPlay = () => {
      if (!audioRef.current) return;
      
      if (isPlaying) {
          audioRef.current.pause();
      } else {
          if (playbackMode === 'loop' && items[focusedIndex]) {
               stopTimeRef.current = items[focusedIndex].end;
               if (audioRef.current.currentTime < items[focusedIndex].start || audioRef.current.currentTime > items[focusedIndex].end) {
                   audioRef.current.currentTime = items[focusedIndex].start;
               }
          } else {
              stopTimeRef.current = null;
          }
          audioRef.current.play().catch(e => console.log(e));
      }
      setIsPlaying(!isPlaying);
  };

  const playNext = () => {
      const nextIndex = Math.min(items.length - 1, focusedIndex + 1);
      setFocusedIndex(nextIndex);
      if (audioRef.current && items[nextIndex]) {
          audioRef.current.currentTime = items[nextIndex].start;
          if (playbackMode === 'loop') stopTimeRef.current = items[nextIndex].end;
          else stopTimeRef.current = null;
          
          if (!isPlaying) {
              audioRef.current.play().catch(console.error);
              setIsPlaying(true);
          }
      }
  };

  const playPrev = () => {
      const prevIndex = Math.max(0, focusedIndex - 1);
      setFocusedIndex(prevIndex);
      if (audioRef.current && items[prevIndex]) {
          audioRef.current.currentTime = items[prevIndex].start;
          if (playbackMode === 'loop') stopTimeRef.current = items[prevIndex].end;
          else stopTimeRef.current = null;
          
          if (!isPlaying) {
              audioRef.current.play().catch(console.error);
              setIsPlaying(true);
          }
      }
  };

  const toggleLoop = () => {
      setPlaybackMode(prev => {
          const newMode = prev === 'sequence' ? 'loop' : 'sequence';
          if (newMode === 'loop' && items[focusedIndex]) {
              stopTimeRef.current = items[focusedIndex].end;
          } else {
              stopTimeRef.current = null;
          }
          return newMode;
      });
  };

  // --- Audio Logic: Original ---
  const playOriginal = useCallback((index: number) => {
      if (!audioRef.current) return;
      
      if (playingOriginalIndex === index && !isSegmentMode) {
          audioRef.current.pause();
          setPlayingOriginalIndex(null);
          setIsPlaying(false);
          return;
      }

      const item = items[index];
      if (audioSrc) {
          audioRef.current.currentTime = item.start;
          stopTimeRef.current = null;
          setIsSegmentMode(false);
          
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
          setPlayingOriginalIndex(index);
          setFocusedIndex(index);
          setPlayingUserIndex(null);
          if (userAudioRef.current) userAudioRef.current.pause();
      } else {
          alert("请先上传原声音频文件以启用同步跟读功能。");
      }
  }, [items, audioSrc, playingOriginalIndex, isSegmentMode]);

  const playSegment = useCallback((index: number) => {
      if (!audioRef.current) return;

      if (playingOriginalIndex === index && isSegmentMode) {
          audioRef.current.pause();
          setPlayingOriginalIndex(null);
          setIsPlaying(false);
          return;
      }

      const item = items[index];
      if (audioSrc) {
          audioRef.current.currentTime = item.start;
          stopTimeRef.current = item.end;
          setIsSegmentMode(true);

          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
          setPlayingOriginalIndex(index);
          setFocusedIndex(index);
          setPlayingUserIndex(null);
          if (userAudioRef.current) userAudioRef.current.pause();
      }
  }, [items, audioSrc, playingOriginalIndex, isSegmentMode]);

  const handleOriginalTimeUpdate = () => {
      if (!audioRef.current) return;
      const time = audioRef.current.currentTime;

      // Loop Mode / Segment Stop Logic
      if (stopTimeRef.current !== null && time >= stopTimeRef.current) {
          if (playbackMode === 'loop' || isSegmentMode) {
               if (playbackMode === 'loop' && !isSegmentMode) {
                   // Global Loop
                   const item = items[focusedIndex];
                   if (item) audioRef.current.currentTime = item.start;
                   return;
               } else {
                   // Segment Stop
                   audioRef.current.pause();
                   setPlayingOriginalIndex(null);
                   setIsPlaying(false);
                   stopTimeRef.current = null;
                   return;
               }
          }
      }

      // Continuous Sync
      if (stopTimeRef.current === null && !audioRef.current.paused) {
          const index = items.findIndex(item => time >= item.start && time < item.end);
          if (index !== -1 && index !== focusedIndex) {
              setFocusedIndex(index);
              setPlayingOriginalIndex(index);
          }
      }
  };

  // --- Audio Logic: User Recording Playback ---
  const playUserAudio = useCallback((index: number) => {
      if (!userAudioRef.current) return;
      const item = items[index];
      
      if (!item.userAudioUrl) return;

      if (playingUserIndex === index) {
          userAudioRef.current.pause();
          setPlayingUserIndex(null);
      } else {
          userAudioRef.current.src = item.userAudioUrl;
          userAudioRef.current.play().catch(console.error);
          setPlayingUserIndex(index);
          setPlayingOriginalIndex(null);
          if (audioRef.current) audioRef.current.pause();
      }
  }, [items, playingUserIndex]);

  // --- Recording Logic ---
  const toggleRecording = useCallback(async (index: number) => {
      if (recordingIndex !== null && recordingIndex !== index) return;

      if (recordingIndex === index) {
          mediaRecorderRef.current?.stop();
          setRecordingIndex(null);
          return;
      }

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
              
              setItems(prev => prev.map((item, i) => i === index ? { ...item, isAnalyzing: true } : item));

              const feedback = await gradePronunciation(items[index].text);

              setItems(prev => prev.map((item, i) => 
                  i === index ? { 
                      ...item, 
                      userAudioUrl: audioUrl, 
                      score: feedback, 
                      isAnalyzing: false 
                  } : item
              ));

              stream.getTracks().forEach(track => track.stop());
          };

          mediaRecorder.start();
          setRecordingIndex(index);
          setPlayingOriginalIndex(null);
          setPlayingUserIndex(null);
          audioRef.current?.pause();
          userAudioRef.current?.pause();

      } catch (err) {
          alert("无法访问麦克风");
      }
  }, [items, recordingIndex]);

  const toggleTranslation = useCallback(async (index: number) => {
      const item = items[index];
      
      if (item.showTranslation) {
          setItems(prev => prev.map((it, i) => 
              i === index ? { ...it, showTranslation: false } : it
          ));
          return;
      }

      const isPlaceholder = item.translation === "点击翻译按钮查看中文释义..." || item.translation === "中文翻译生成中...";
      
      if (isPlaceholder) {
          setItems(prev => prev.map((it, i) => 
              i === index ? { ...it, showTranslation: true, translation: "AI 正在翻译中..." } : it
          ));

          const translatedText = await translateText(item.text);
          
          setItems(prev => prev.map((it, i) => 
              i === index ? { ...it, translation: translatedText } : it
          ));
      } else {
          setItems(prev => prev.map((it, i) => 
              i === index ? { ...it, showTranslation: true } : it
          ));
      }
  }, [items]);

  // --- Keyboard Shortcuts Effect ---
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

          switch(e.key.toLowerCase()) {
              case 'arrowdown':
                  e.preventDefault();
                  setFocusedIndex(prev => Math.min(prev + 1, items.length - 1));
                  break;
              case 'arrowup':
                  e.preventDefault();
                  setFocusedIndex(prev => Math.max(prev - 1, 0));
                  break;
              case 'o': // Original (Segment)
                  e.preventDefault();
                  playSegment(focusedIndex);
                  break;
              case 'r': // Record
                  e.preventDefault();
                  toggleRecording(focusedIndex);
                  break;
              case 'p': // Play User
                  e.preventDefault();
                  playUserAudio(focusedIndex);
                  break;
              case 't': // Translate
                  e.preventDefault();
                  toggleTranslation(focusedIndex);
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items.length, focusedIndex, playSegment, toggleRecording, playUserAudio, toggleTranslation]);


  // --- Import Handlers ---
  const handleImportText = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (text) {
              const parsedItems = parseTimestampedText(text);
              setItems(parsedItems);
              if (audioRef.current && audioRef.current.duration) {
                  const dur = audioRef.current.duration;
                  const last = parsedItems[parsedItems.length - 1];
                  if (last.end < last.start + 1) {
                      setItems(prev => {
                          const copy = [...prev];
                          copy[copy.length - 1] = { ...last, end: dur };
                          return copy;
                      });
                  }
              }
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleImportAudio = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      setAudioSrc(url);
      e.target.value = '';
  };

  return (
    <div className="h-full flex flex-col relative fade-in bg-[#f2f2f7]">
        {/* Hidden Players */}
        <audio 
            ref={audioRef} 
            src={audioSrc || undefined} 
            onLoadedMetadata={handleAudioMetadata}
            onTimeUpdate={handleOriginalTimeUpdate}
            onEnded={() => { setIsPlaying(false); setPlayingOriginalIndex(null); }}
        />
        <audio 
            ref={userAudioRef} 
            onEnded={() => setPlayingUserIndex(null)}
        />

        {/* Header */}
        <div className="p-4 md:p-6 pb-2 shrink-0 flex justify-between items-center sticky top-0 z-10 bg-[#f2f2f7]/80 backdrop-blur-md">
             <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">精读跟读</h2>
                <p className="text-xs text-gray-500 mt-1">Intensive Reading & Shadowing</p>
             </div>
             <div className="flex gap-2">
                 <button 
                    onClick={() => audioInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-[#6a11cb] transition-all shadow-sm"
                 >
                    <span>🎵</span> <span className="hidden sm:inline">音频</span>
                 </button>
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 md:px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-[#6a11cb] transition-all shadow-sm"
                 >
                    <span>📄</span> <span className="hidden sm:inline">文本 (TXT)</span>
                 </button>
             </div>
             <input ref={fileInputRef} type="file" accept=".txt" hidden onChange={handleImportText} />
             <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={handleImportAudio} />
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 custom-scrollbar">
            {items.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-center p-4">
                    <p>请导入文本 (支持时间戳格式 00:00) 和音频开始练习</p>
                </div>
            ) : (
                items.map((item, index) => (
                    <div 
                        key={item.id}
                        ref={el => { itemRefs.current[index] = el; }}
                        onClick={() => setFocusedIndex(index)}
                        className={`bg-white rounded-2xl shadow-sm p-4 md:p-5 mb-4 border transition-all duration-200 ${
                            // Visual indication for Focused vs Playing
                            index === focusedIndex
                                ? 'ring-2 ring-purple-100 border-purple-200 translate-x-1' 
                                : playingOriginalIndex === index
                                    ? 'border-purple-200 shadow-md'
                                    : 'border-transparent'
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <span className={`text-xs font-mono px-1.5 py-0.5 rounded transition-colors ${
                                index === focusedIndex ? 'bg-purple-100 text-[#6a11cb] font-bold' : 'bg-gray-50 text-gray-400'
                            }`}>
                                {Math.floor(item.start / 60).toString().padStart(2, '0')}:{Math.floor(item.start % 60).toString().padStart(2, '0')}
                            </span>
                            {index === focusedIndex && (
                                <span className="text-[10px] text-purple-300 font-bold hidden sm:inline-block">FOCUSED</span>
                            )}
                        </div>

                        {/* 1. Original Text */}
                        <div className="mb-3">
                            <p className={`text-base md:text-lg font-medium leading-relaxed transition-colors ${
                                playingOriginalIndex === index ? 'text-[#6a11cb]' : 'text-gray-800'
                            }`}>
                                {item.text}
                            </p>
                        </div>

                        {/* 2. Translation */}
                        <div className={`overflow-hidden transition-all duration-300 ${item.showTranslation ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
                            <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg">
                                {item.translation}
                            </p>
                        </div>

                        {/* 3. Controls & Feedback Row */}
                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-gray-50 gap-4">
                            
                            {/* Left: Actions */}
                            <div className="flex items-center gap-3 md:gap-4 flex-wrap">
                                {/* Translate */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleTranslation(index); }}
                                    className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-colors ${
                                        item.showTranslation ? 'bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                                    title="显示/隐藏翻译 (T)"
                                >
                                    译
                                </button>

                                {/* Play Segment (Strictly this sentence) */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); playSegment(index); }}
                                    disabled={!audioSrc}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                                        playingOriginalIndex === index && isSegmentMode
                                        ? 'bg-[#6a11cb] text-white shadow-purple-500/30'
                                        : 'bg-white border border-gray-100 text-[#6a11cb] hover:bg-purple-50'
                                    }`}
                                    title="播放此句 (O)"
                                >
                                    {playingOriginalIndex === index && isSegmentMode ? (
                                        <span className="animate-pulse">❚❚</span>
                                    ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                                            <line x1="19" y1="3" x2="19" y2="21"></line>
                                        </svg>
                                    )}
                                </button>

                                {/* Record */}
                                <button 
                                    onClick={(e) => { e.stopPropagation(); toggleRecording(index); }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all ${
                                        recordingIndex === index
                                        ? 'bg-red-500 text-white ring-4 ring-red-100'
                                        : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'
                                    }`}
                                    title="开始录音 (R)"
                                >
                                    {recordingIndex === index ? (
                                        <div className="w-3 h-3 bg-white rounded-sm animate-pulse"></div>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                                    )}
                                </button>

                                {/* Play User Recording */}
                                {item.userAudioUrl && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); playUserAudio(index); }}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-all ${
                                            playingUserIndex === index
                                            ? 'bg-green-500 text-white'
                                            : 'bg-green-50 border border-green-100 text-green-600 hover:bg-green-100'
                                        }`}
                                        title="回放我的录音 (P)"
                                    >
                                        {playingUserIndex === index ? '❚❚' : '▶'}
                                    </button>
                                )}
                            </div>

                            {/* Right: Scoring */}
                            <div className="flex items-center">
                                {item.isAnalyzing ? (
                                    <span className="text-xs text-[#6a11cb] animate-pulse font-medium">评分中...</span>
                                ) : item.score ? (
                                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-right-2">
                                        <div className="flex flex-col items-end hidden sm:flex">
                                            <div className="flex gap-1 h-1 w-16 bg-gray-100 rounded-full overflow-hidden">
                                                <div className="bg-[#6a11cb]" style={{width: `${item.score.fluency}%`}} title="流利度"></div>
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-0.5">流利度</span>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-md ${
                                            item.score.overall >= 85 ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-orange-400 to-orange-600'
                                        }`}>
                                            {item.score.overall}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-300">未练习</span>
                                )}
                            </div>

                        </div>
                    </div>
                ))
            )}
        </div>

        {/* FIXED BOTTOM CONTROL BAR */}
        <div className="shrink-0 bg-white/90 backdrop-blur-xl border-t border-gray-200 py-4 px-6 shadow-[0_-4px_30px_rgba(0,0,0,0.05)] z-30 flex items-center justify-center gap-8">
            
            {/* Prev Sentence */}
            <button 
                onClick={playPrev}
                disabled={focusedIndex <= 0}
                className="p-3 rounded-full text-gray-500 hover:text-[#6a11cb] hover:bg-gray-100 transition-colors disabled:opacity-30"
                title="上一句"
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 20L9 12l10-8v16z"></path><line x1="5" y1="19" x2="5" y2="5"></line></svg>
            </button>

            {/* Play/Pause Global */}
            <button 
                onClick={toggleGlobalPlay}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6a11cb] to-[#2575fc] text-white flex items-center justify-center shadow-xl shadow-purple-500/30 hover:shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all"
                title="播放/暂停"
            >
                {isPlaying ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="ml-1"><path d="M5 3l14 9-14 9V3z"/></svg>
                )}
            </button>

            {/* Next Sentence */}
            <button 
                onClick={playNext}
                disabled={focusedIndex >= items.length - 1}
                className="p-3 rounded-full text-gray-500 hover:text-[#6a11cb] hover:bg-gray-100 transition-colors disabled:opacity-30"
                title="下一句"
            >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4l10 8-10 8V4z"></path><line x1="19" y1="5" x2="19" y2="19"></line></svg>
            </button>

            {/* Loop Toggle */}
            <button 
                onClick={toggleLoop}
                className={`p-3 rounded-full transition-colors ${
                    playbackMode === 'loop' 
                    ? 'text-[#6a11cb] bg-purple-50' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
                title="单句循环"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 1l4 4-4 4"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 23l-4-4 4-4"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                </svg>
            </button>

            {/* Quick Record Button (Optional extra convenience) */}
            <div className="w-[1px] h-8 bg-gray-200 mx-2"></div>
            <button 
                onClick={() => toggleRecording(focusedIndex)}
                className={`p-3 rounded-full transition-colors ${
                    recordingIndex === focusedIndex 
                    ? 'text-red-500 bg-red-50 animate-pulse' 
                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                }`}
                title="录制当前句"
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
        </div>
    </div>
  );
};

export default SpeakingLab;