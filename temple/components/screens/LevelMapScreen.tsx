import React from 'react';
import { ChevronLeft, Star, Lock, Check, Terminal } from 'lucide-react';
import { motion } from 'motion/react';

interface LevelMapScreenProps {
  onBack: () => void;
  onLevelStart: () => void;
}

export function LevelMapScreen({ onBack, onLevelStart }: LevelMapScreenProps) {
  return (
    <div className="flex flex-col h-full bg-[#f0f9ff] relative overflow-hidden font-sans">
      {/* Background Path Pattern - Simulated */}
      <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 100 Q 200 300 100 500 T 100 900" stroke="currentColor" strokeWidth="40" fill="none" className="text-indigo-300" />
      </svg>

      {/* Header */}
      <header className="h-16 flex items-center justify-between px-4 sticky top-0 z-20 bg-[#f0f9ff]/90 backdrop-blur-sm">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-bold text-lg text-slate-800">Module 1</span>
        
        {/* Star Counter */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-full">
           <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
           <span className="text-sm font-bold text-slate-600">5</span>
        </div>
      </header>

      {/* Main Map Area */}
      <main className="flex-1 overflow-y-auto px-6 py-8 relative z-10 flex flex-col items-center">
        
        {/* Previous Levels (Locked/Completed Visuals) */}
        <div className="flex flex-col items-center gap-12 w-full max-w-sm">
           <LevelNode status="completed" icon={Check} offset="ml-12" />
           <LevelNode status="completed" icon={Check} offset="mr-12" />
           
           {/* Current Active Level Card */}
           <motion.div 
             initial={{ scale: 0.9, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             className="relative z-20"
           >
             <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                
                <div className="relative w-64 bg-white rounded-2xl p-5 shadow-xl border-2 border-indigo-50 flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <Terminal className="w-8 h-8 text-white" />
                  </div>
                  
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Variables & Types</h2>
                    <p className="text-sm text-slate-500 font-medium">Lesson 3 of 5</p>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={onLevelStart}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-md shadow-indigo-200 transition-colors"
                  >
                    Start Coding
                  </motion.button>
                </div>

                {/* Popover Tip */}
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap animate-bounce">
                   Learn Strings!
                   <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                </div>
             </div>
           </motion.div>

           <LevelNode status="locked" icon={Lock} offset="ml-16" />
           <LevelNode status="locked" icon={Lock} offset="mr-8" />
        </div>

      </main>
    </div>
  );
}

function LevelNode({ status, icon: Icon, offset }: { status: 'completed' | 'locked', icon: any, offset: string }) {
  const isLocked = status === 'locked';
  return (
    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-b-4 transition-transform hover:scale-105 ${offset}
      ${isLocked 
        ? 'bg-slate-200 border-slate-300 text-slate-400' 
        : 'bg-emerald-400 border-emerald-600 text-white shadow-lg shadow-emerald-200'
      }`}
    >
      <Icon className="w-6 h-6" strokeWidth={3} />
    </div>
  );
}
