import React from 'react';
import { Settings, QrCode, UserPlus, Star, Award, Trophy, Zap, Shield, Sparkles, TrendingUp, BookOpen, Users, UserCheck } from 'lucide-react';
import { BottomNav, Tab } from '../ui/BottomNav';
import { motion } from 'motion/react';

interface ProfileScreenProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function ProfileScreen({ activeTab, onTabChange }: ProfileScreenProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50 relative font-sans text-slate-900">
      
      {/* Main Scrollable Content */}
      <main className="flex-1 overflow-y-auto no-scrollbar pb-6">
        
        {/* Header Profile Section */}
        <div className="relative mb-16">
           {/* Background Cover */}
           <div className="h-40 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              <div className="absolute top-4 right-4 flex gap-2">
                 <button className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition-colors">
                    <Settings className="w-5 h-5" />
                 </button>
              </div>
           </div>
           
           {/* Avatar Overlapping */}
           <div className="absolute -bottom-12 left-6">
              <div className="w-24 h-24 rounded-3xl bg-white p-1 shadow-lg transform rotate-3">
                 <img 
                   src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80" 
                   className="w-full h-full object-cover rounded-2xl"
                   alt="Profile"
                 />
                 <div className="absolute -bottom-2 -right-2 bg-emerald-500 w-6 h-6 rounded-full border-4 border-white"></div>
              </div>
           </div>
           
        </div>

        {/* User Info & Stats Row */}
        <div className="px-6 mb-8">
           <h1 className="text-2xl font-extrabold text-slate-800">Alex Johnson</h1>
           <p className="text-slate-500 font-medium text-sm mb-6">@alex_j • Joined 2023</p>

           {/* Stats in 2 Rows with Icons */}
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
              {/* First Row: Courses + Total Stars */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                       <BookOpen className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xl font-extrabold text-slate-900">12</span>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Courses</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 rounded-lg shrink-0">
                       <Star className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xl font-extrabold text-slate-900">3,450</span>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Stars</span>
                    </div>
                 </div>
              </div>

              <div className="h-px bg-slate-100"></div>

              {/* Second Row: Following + Fans */}
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg shrink-0">
                       <UserCheck className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xl font-extrabold text-slate-900">145</span>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Following</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-50 rounded-lg shrink-0">
                       <Users className="w-5 h-5 text-pink-500" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-xl font-extrabold text-slate-900">892</span>
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Fans</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* Overall Stats Section */}
        <div className="px-6 space-y-6">
           {/* Daily Exclusive Badge */}
           <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-800">Daily Exclusive Badge</h3>
                 <Sparkles className="w-5 h-5 text-purple-500" />
              </div>
              
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Award className="w-8 h-8 text-white" />
                 </div>
                 <div>
                    <p className="font-bold text-slate-800">7-Day Streak</p>
                    <p className="text-xs text-slate-500">Keep learning to maintain your badge!</p>
                 </div>
              </div>
           </div>

           {/* Achievements / Medals */}
           <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-800">Achievements</h3>
                 <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">View All</span>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                 <BadgeItem icon={Zap} color="text-yellow-500" bg="bg-yellow-100" />
                 <BadgeItem icon={Shield} color="text-emerald-500" bg="bg-emerald-100" />
                 <BadgeItem icon={Star} color="text-purple-500" bg="bg-purple-100" />
                 <BadgeItem icon={TrendingUp} color="text-blue-500" bg="bg-blue-100" />
              </div>
           </div>
        </div>

      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

function BadgeItem({ icon: Icon, color, bg }: { icon: any, color: string, bg: string }) {
   return (
      <motion.div 
        whileHover={{ scale: 1.1, rotate: 5 }}
        className={`aspect-square rounded-2xl ${bg} flex items-center justify-center cursor-pointer shadow-sm`}
      >
         <Icon className={`w-8 h-8 ${color}`} strokeWidth={2} />
      </motion.div>
   );
}