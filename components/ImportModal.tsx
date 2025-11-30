import React, { useState, useRef } from 'react';
import { Material } from '../types';
import { classifyTopic, estimateDifficulty } from '../services/geminiService';

interface ImportModalProps {
  onClose: () => void;
  onImport: (material: Material) => void;
}

type Tab = 'file' | 'link' | 'text';

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImport }) => {
  const [activeTab, setActiveTab] = useState<Tab>('file');
  const [dragActive, setDragActive] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Helper: Extract duration from media file
  const getMediaDuration = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const element = document.createElement(file.type.startsWith('video') ? 'video' : 'audio');
      element.preload = 'metadata';
      element.onloadedmetadata = () => {
        window.URL.revokeObjectURL(element.src);
        const minutes = Math.floor(element.duration / 60);
        const seconds = Math.floor(element.duration % 60);
        resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      };
      element.onerror = () => resolve('Unknown');
      element.src = URL.createObjectURL(file);
    });
  };

  const handleSubmit = async () => {
    setIsProcessing(true);
    
    let material: Material = {
      id: crypto.randomUUID(),
      title: 'New Material',
      type: 'text',
      duration: 'Unknown',
      source: 'User Import',
      difficulty: 'intermediate',
      topic: 'General',
      transcript: '',
      createdAt: Date.now()
    };

    try {
        if (activeTab === 'file' && file) {
           material.title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
           material.type = file.type.startsWith('video') ? 'video' : 'audio';
           material.audioUrl = URL.createObjectURL(file);
           
           // Parallel execution for metadata
           const [topic, difficulty, duration] = await Promise.all([
               classifyTopic(material.title),
               estimateDifficulty(material.title),
               file.type.startsWith('text') ? Promise.resolve('Unknown') : getMediaDuration(file)
           ]);

           material.topic = topic;
           material.difficulty = difficulty;
           if (duration !== 'Unknown') material.duration = duration;

           if(file.type === 'text/plain') {
               material.type = 'text';
               const text = await file.text();
               material.transcript = text;
               
               // Refine metadata with full text content
               const [contentTopic, contentDifficulty] = await Promise.all([
                   classifyTopic(text),
                   estimateDifficulty(text)
               ]);
               material.topic = contentTopic;
               material.difficulty = contentDifficulty;
               
               // Estimate text duration
               const words = text.split(/\s+/).length;
               const minutes = Math.ceil(words / 150);
               material.duration = `${minutes}:00`;
           }
        } else if (activeTab === 'link') {
            material.source = linkUrl;
            material.type = 'video';
            material.title = 'Web Video Resource';
            
            const [topic, difficulty] = await Promise.all([
                classifyTopic(linkUrl),
                estimateDifficulty(linkUrl)
            ]);
            material.topic = topic;
            material.difficulty = difficulty;

        } else if (activeTab === 'text') {
            material.type = 'text';
            material.transcript = textContent;
            material.title = 'Text Material';
            
            // Estimate duration
            const words = textContent.split(/\s+/).length;
            const minutes = Math.ceil(words / 150);
            material.duration = `${minutes}:00`;
            
            // AI Analysis
            const [topic, difficulty] = await Promise.all([
                classifyTopic(textContent),
                estimateDifficulty(textContent)
            ]);
            material.topic = topic;
            material.difficulty = difficulty;
        }

        onImport(material);
        onClose();
    } catch (error) {
        console.error("Import failed", error);
        alert("Import failed. Please try again.");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white/50 backdrop-blur-md z-10 shrink-0">
            <h3 className="text-xl font-bold text-gray-900">导入学习材料</h3>
            <button 
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
            >
                ✕
            </button>
        </div>

        {/* Navigation Tabs - Fixed */}
        <div className="flex p-2 bg-gray-50 border-b border-gray-100 shrink-0">
             {['file', 'link', 'text'].map((tab) => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab as Tab)}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab 
                        ? 'bg-white text-[#6a11cb] shadow-sm' 
                        : 'text-gray-500 hover:bg-gray-200/50'
                    }`}
                >
                    {tab === 'file' && '📁 上传文件'}
                    {tab === 'link' && '🔗 视频链接'}
                    {tab === 'text' && '📝 文本输入'}
                </button>
             ))}
        </div>

        {/* Content Area - Auto Scroll */}
        <div className="flex-1 overflow-y-auto p-6 bg-white custom-scrollbar min-h-0">
            
            {activeTab === 'file' && (
                <div 
                    className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors min-h-[200px] h-full ${
                        dragActive ? 'border-[#6a11cb] bg-[#6a11cb]/5' : 'border-gray-200 hover:border-[#6a11cb]/50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        className="hidden" 
                        accept="audio/*,video/*,.txt"
                        onChange={handleFileChange}
                    />
                    <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-4 text-3xl">
                        📁
                    </div>
                    {file ? (
                        <div className="text-center">
                            <p className="font-medium text-gray-900">{file.name}</p>
                            <p className="text-sm text-gray-500 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            <button className="text-xs text-red-500 mt-2 hover:underline" onClick={(e) => { e.stopPropagation(); setFile(null); }}>移除</button>
                        </div>
                    ) : (
                        <div className="text-center">
                             <p className="text-gray-600 font-medium">拖放文件到这里，或点击选择</p>
                             <p className="text-xs text-gray-400 mt-2">支持 MP3, WAV, MP4, TXT</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'link' && (
                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">视频/音频链接</label>
                    <input 
                        type="text" 
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="粘贴 YouTube, Bilibili 或其他链接..."
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6a11cb] focus:ring-2 focus:ring-[#6a11cb]/20 outline-none transition-all"
                    />
                    <div className="p-4 bg-blue-50 text-blue-700 text-sm rounded-xl">
                        💡 我们将尝试解析视频的字幕和音频内容。
                    </div>
                </div>
            )}

            {activeTab === 'text' && (
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex justify-between items-center shrink-0">
                        <label className="block text-sm font-medium text-gray-700">输入学习文本</label>
                        <span className="text-xs text-gray-400">{textContent.length} chars</span>
                    </div>
                    <textarea 
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        placeholder="在此处粘贴英文文章..."
                        className="w-full flex-1 min-h-[200px] px-4 py-3 rounded-xl border border-gray-200 focus:border-[#6a11cb] focus:ring-2 focus:ring-[#6a11cb]/20 outline-none transition-all resize-none"
                    ></textarea>
                </div>
            )}
        </div>

        {/* Footer - Fixed */}
        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-10 shrink-0">
            <button 
                onClick={onClose}
                className="px-6 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                disabled={isProcessing}
            >
                取消
            </button>
            <button 
                onClick={handleSubmit}
                disabled={isProcessing || (activeTab === 'file' && !file) || (activeTab === 'link' && !linkUrl) || (activeTab === 'text' && !textContent)}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#6a11cb] to-[#2575fc] text-white font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>处理中...</span>
                    </>
                ) : (
                    <span>确认导入</span>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModal;