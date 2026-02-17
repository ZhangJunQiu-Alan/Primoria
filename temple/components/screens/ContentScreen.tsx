import React from 'react';
import { ChevronLeft, Info, Terminal, Play } from 'lucide-react';
import { motion } from 'motion/react';

interface ContentScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export function ContentScreen({ onBack, onComplete }: ContentScreenProps) {
  return (
    <div className="flex flex-col h-full bg-white font-sans text-slate-900">
      {/* Progress Bar Header */}
      <header className="h-16 flex items-center gap-4 px-4 sticky top-0 bg-white z-10">
        <button 
          onClick={onBack}
          className="text-slate-400 hover:text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>
        
        {/* Progress Bar */}
        <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: '60%' }}
            className="h-full bg-indigo-500 rounded-full"
          />
        </div>
        
        <div className="text-slate-400 font-bold text-sm">
           3/5
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 max-w-md mx-auto w-full">
        
        <h1 className="text-xl font-bold text-slate-800 text-center">
          Construct the correct print statement
        </h1>

        {/* Character/Mascot Hint */}
        <div className="flex items-center gap-4 w-full px-2">
           <div className="w-16 h-16 rounded-full bg-yellow-100 border-2 border-yellow-200 flex items-center justify-center shrink-0">
             <span className="text-3xl">🐍</span>
           </div>
           <div className="bg-white border-2 border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm relative">
             <p className="text-slate-700 font-medium">Output "Hello World" to the terminal!</p>
             <button className="absolute -right-2 -top-2 bg-indigo-500 text-white p-1 rounded-full shadow-sm hover:bg-indigo-600">
                <Info className="w-3 h-3" />
             </button>
           </div>
        </div>

        {/* Code Editor Simulation Area */}
        <div className="w-full bg-slate-900 rounded-xl p-4 shadow-lg flex flex-col gap-2 min-h-[120px]">
           <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
              <span className="text-xs text-slate-500 font-mono ml-2">main.py</span>
           </div>
           
           <div className="flex flex-wrap items-center gap-2 font-mono text-lg">
             {/* Drop Zone */}
             <div className="h-10 min-w-[100px] border-2 border-dashed border-slate-600 rounded-lg flex items-center justify-center px-3 text-slate-500 bg-slate-800/50">
               drag here
             </div>
           </div>
        </div>

        {/* Word/Code Bank */}
        <div className="flex flex-wrap justify-center gap-3 w-full mt-4">
           {['print', '(', '"Hello World"', ')', ';', 'console.log'].map((word, i) => (
             <motion.button
               key={word}
               whileHover={{ scale: 1.05, y: -2 }}
               whileTap={{ scale: 0.95 }}
               className="bg-white border-2 border-slate-200 border-b-4 active:border-b-2 text-indigo-900 font-mono font-bold px-4 py-3 rounded-xl shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-all"
             >
               {word}
             </motion.button>
           ))}
        </div>

      </main>

      {/* Footer / Action Area */}
      <footer className="p-4 border-t border-slate-100 bg-white">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <button className="p-3 rounded-xl bg-slate-100 text-slate-500 font-bold hover:bg-slate-200 transition-colors">
            Skip
          </button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onComplete}
            className="flex-1 ml-4 py-3.5 bg-emerald-500 border-b-4 border-emerald-600 active:border-b-0 active:translate-y-1 text-white rounded-xl font-bold uppercase tracking-wide shadow-lg shadow-emerald-200 hover:bg-emerald-400 transition-all text-center flex items-center justify-center gap-2"
          >
            <Play className="w-5 h-5 fill-current" />
            Run Code
          </motion.button>
        </div>
      </footer>
    </div>
  );
}
