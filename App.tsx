import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ListeningLab from './components/ListeningLab';
import SpeakingLab from './components/SpeakingLab';
import VocabularyLab from './components/VocabularyLab';
import { AppView } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderContent = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard />;
      case AppView.LISTENING:
        return <ListeningLab onNavigate={setCurrentView} />;
      case AppView.SPEAKING:
        return <SpeakingLab />;
      case AppView.VOCABULARY:
        return <VocabularyLab view="vocabulary" />;
      case AppView.GRAMMAR:
        return <VocabularyLab view="grammar" />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f2f2f7] font-sans text-[#1c1c1e] overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 flex items-center px-4 md:hidden">
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <span className="ml-4 font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-[#6a11cb] to-[#2575fc]">Deep English Lab</span>
      </div>

      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => {
          setCurrentView(view);
          setIsSidebarOpen(false);
        }} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Main Content - Adjusted margin for wider sidebar (ml-72) */}
      <main className="flex-1 w-full md:ml-72 relative overflow-y-auto h-full pt-16 md:pt-0">
        <div className="w-full h-full">
            {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default App;