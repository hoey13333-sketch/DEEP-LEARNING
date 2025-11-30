import React from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose }) => {
  const menuItems = [
    { id: AppView.DASHBOARD, label: '学习概览', icon: '📊' },
    { id: AppView.LISTENING, label: '听力实验室', icon: '🎧' },
    { id: AppView.SPEAKING, label: '口语实验室', icon: '🗣️' },
    { id: AppView.VOCABULARY, label: '词汇库', icon: '📚' },
    { id: AppView.GRAMMAR, label: '语法库', icon: '🔍' },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 md:hidden fade-in"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Container - Widened to w-72 */}
      <div className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white/90 backdrop-blur-xl border-r border-white/20 shadow-2xl md:shadow-none
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `}>
        <div className="p-8 pb-4 flex justify-between items-center">
          <div className="overflow-hidden whitespace-nowrap">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6a11cb] to-[#2575fc]">
              Deep English Lab
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider">沉浸式英语学习</p>
          </div>
          {/* Mobile Close Button */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-gray-600 ml-4">
            ✕
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${
                currentView === item.id
                  ? 'bg-gradient-to-r from-[#6a11cb]/10 to-[#2575fc]/10 text-[#6a11cb] font-semibold shadow-sm'
                  : 'text-gray-500 hover:bg-black/5'
              }`}
            >
              <span className="text-xl mr-3 group-hover:scale-110 transition-transform duration-200">{item.icon}</span>
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200/50 bg-white/50">
          <div className="flex items-center space-x-3 p-2 rounded-xl hover:bg-black/5 cursor-pointer transition-colors">
            <img
              src="https://picsum.photos/100/100"
              alt="User"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
            />
            <div>
              <p className="text-sm font-semibold text-gray-800">Alex Chen</p>
              <p className="text-xs text-gray-500">专业会员</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;