import React from 'react';
import { Star } from 'lucide-react';
import { motion } from 'motion/react';
import { BottomNav, Tab } from '../ui/BottomNav';

interface HomeScreenProps {
  onOpenMap: () => void;
  onStartLearning: () => void;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function HomeScreen({ onOpenMap, onStartLearning, activeTab, onTabChange }: HomeScreenProps) {
  return (
    <div className="flex flex-col h-full bg-[#f8f9fc] relative font-sans text-slate-900">
      {/* Header */}
      <header className="h-20 flex items-center justify-between px-6 pt-4 bg-transparent z-10">
        <div className="flex-1">
           {/* Left side empty (CodeLingo removed) */}
        </div>
        
        {/* Star Counter (Shiny) */}
        <div className="flex items-center gap-2 bg-white border border-slate-100 shadow-sm px-4 py-2 rounded-full">
           <div className="relative">
             <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
             <motion.div 
               animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.2, 1] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute inset-0 bg-amber-400 blur-sm opacity-50 rounded-full"
             />
           </div>
           <span className="text-sm font-bold text-slate-700">5</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-2 relative overflow-hidden">
        
        {/* Clickable Area for Map (Title + Logo) */}
        <div 
          onClick={onOpenMap}
          className="cursor-pointer flex flex-col items-center z-0 w-full"
        >
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-extrabold text-slate-900 mb-2 tracking-tight"
            >
              Data Structures
            </motion.h1>
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-bold text-indigo-500 tracking-[0.2em] uppercase mb-8"
            >
              Level 4
            </motion.h2>
            
            {/* Python Learning Logo (CSS Constructed) */}
            <motion.div 
               initial={{ scale: 0.8, opacity: 0, rotate: 0 }}
               animate={{ scale: 1, opacity: 1, rotate: 6 }}
               transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
               whileHover={{ scale: 1.05, rotate: 0 }}
               whileTap={{ scale: 0.95 }}
               className="relative w-60 h-60 -mb-12 z-0"
            >
               <div className="w-full h-full bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 rounded-[3rem] shadow-2xl flex items-center justify-center border-t border-l border-white/30 relative overflow-hidden group">
                  {/* Internal Glow */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/20 to-transparent opacity-50"></div>
                  
                  {/* Python Logo Shapes - Simplified */}
                  <div className="relative z-10 flex flex-col items-center gap-1">
                     <div className="flex gap-2">
                        <div className="w-16 h-16 bg-yellow-400 rounded-2xl rounded-br-none shadow-lg"></div>
                        <div className="w-16 h-16 bg-yellow-400 rounded-2xl rounded-bl-none shadow-lg opacity-80"></div>
                     </div>
                     <div className="flex gap-2">
                         <div className="w-16 h-16 bg-blue-300 rounded-2xl rounded-tr-none shadow-lg opacity-80"></div>
                         <div className="w-16 h-16 bg-blue-300 rounded-2xl rounded-tl-none shadow-lg"></div>
                     </div>
                     <span className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-white drop-shadow-md tracking-tighter mix-blend-overlay">Py</span>
                  </div>
               </div>
            </motion.div>
        </div>

        {/* Bottom Card Area (Drawer) */}
        <div className="w-full bg-white rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] pb-[16px] flex flex-col gap-6 relative z-10 mt-32 pt-[32px] pr-[32px] pl-[32px]">

           {/* Course List Items */}
           <div className="space-y-6">
              <div className="flex items-center gap-5 group cursor-pointer">
                 <div className="relative shrink-0">
                 </div>
                 <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg">The Dot Product</h3>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide">3 Lessons</p>
                 </div>
                 <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></div>
                 </div>
              </div>

              <div className="flex items-center gap-5 group cursor-pointer opacity-60">
                 <div className="relative shrink-0">
                 </div>
                 <div className="flex-1">
                    <h3 className="font-bold text-slate-800 text-lg">Cross Product</h3>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wide text-[12px]">Locked</p>
                 </div>
                 <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200"></div>
              </div>
           </div>

           {/* Removed the flex-1 spacer here to reduce whitespace */}

           {/* Learning Button */}
           <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onStartLearning}
              className="w-full py-4 bg-indigo-600 rounded-2xl text-white font-extrabold text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-colors mb-2 tracking-wide flex items-center justify-center gap-2 mt-auto"
           >
              Learning
           </motion.button>
        </div>

      </main>

      {/* Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
