import React, { useState } from 'react';
import { HomeScreen } from './components/screens/HomeScreen';
import { LevelMapScreen } from './components/screens/LevelMapScreen';
import { ContentScreen } from './components/screens/ContentScreen';
import { LibraryScreen } from './components/screens/LibraryScreen';
import { FriendsScreen } from './components/screens/FriendsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { AnimatePresence, motion } from 'motion/react';
import { Tab } from './components/ui/BottomNav';

// Navigation State Types
type ViewState = 
  | { type: 'tab', tab: Tab }
  | { type: 'map' }
  | { type: 'content' };

export default function App() {
  const [viewState, setViewState] = useState<ViewState>({ type: 'tab', tab: 'home' });
  const [direction, setDirection] = useState(0);

  // Helper to handle tab switching
  const handleTabChange = (newTab: Tab) => {
    setDirection(0); 
    setViewState({ type: 'tab', tab: newTab });
  };

  // Helper for deep navigation (Home -> Map -> Content)
  const navigateToMap = () => {
    setDirection(1);
    setViewState({ type: 'map' });
  };

  const navigateToContent = () => {
    setDirection(1);
    setViewState({ type: 'content' });
  };

  const navigateBack = () => {
    setDirection(-1);
    if (viewState.type === 'content') {
      // If we came from "Start Learning" (Home -> Content), we might want to go back to Home.
      // But usually Content is part of Map flow. 
      // For simplicity in this demo, let's go to Map if coming from Content, 
      // unless we want to strictly track history.
      // However, if the user clicked "Learning" on Home, going back to Map is acceptable 
      // as it shows their progress.
      setViewState({ type: 'map' });
    } else if (viewState.type === 'map') {
      setViewState({ type: 'tab', tab: 'home' });
    }
  };

  // Special handler for "Start Learning" direct from Home
  const startLearning = () => {
    setDirection(1);
    setViewState({ type: 'content' });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : direction < 0 ? '-100%' : 0,
      opacity: direction === 0 ? 0 : 1,
      position: 'absolute' as const, 
      zIndex: 1
    }),
    center: {
      x: 0,
      opacity: 1,
      position: 'relative' as const,
      zIndex: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? '100%' : direction > 0 ? '-20%' : 0,
      opacity: direction === 0 ? 0 : 1,
      position: 'absolute' as const,
      zIndex: -1,
      transition: { duration: 0.3 }
    })
  };

  // Determine what component to render based on state
  const renderContent = () => {
    if (viewState.type === 'map') {
      return (
        <LevelMapScreen 
          onBack={navigateBack} 
          onLevelStart={navigateToContent} 
        />
      );
    }
    
    if (viewState.type === 'content') {
      return (
        <ContentScreen 
          onBack={navigateBack} 
          onComplete={navigateBack} 
        />
      );
    }

    // Tab Views
    switch (viewState.tab) {
      case 'home':
        return (
          <HomeScreen 
            onOpenMap={navigateToMap} 
            onStartLearning={startLearning}
            activeTab="home" 
            onTabChange={handleTabChange} 
          />
        );
      case 'library':
        return <LibraryScreen activeTab="library" onTabChange={handleTabChange} />;
      case 'friends':
        return <FriendsScreen activeTab="friends" onTabChange={handleTabChange} />;
      case 'profile':
        return <ProfileScreen activeTab="profile" onTabChange={handleTabChange} />;
      default:
        return (
          <HomeScreen 
            onOpenMap={navigateToMap} 
            onStartLearning={startLearning}
            activeTab="home" 
            onTabChange={handleTabChange} 
          />
        );
    }
  };

  // Unique key for AnimatePresence to trigger animations
  const getKey = () => {
    if (viewState.type === 'tab') return viewState.tab;
    return viewState.type;
  };

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-0 sm:p-4 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Mobile Device Frame Simulator */}
      <div className="w-full h-[100dvh] sm:h-[844px] sm:w-[390px] bg-white sm:rounded-[3rem] sm:border-[8px] sm:border-slate-900 shadow-2xl overflow-hidden relative flex flex-col ring-8 ring-slate-900/5">
        
        {/* Notch / Status Bar simulation */}
        <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-slate-900 rounded-b-2xl z-50"></div>
        
        <div className="flex-1 relative overflow-hidden flex flex-col bg-white">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={getKey()}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full h-full flex flex-col"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
        
        {/* Home Indicator */}
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-1 bg-slate-900/20 rounded-full z-50 mb-2"></div>
      </div>
    </div>
  );
}
