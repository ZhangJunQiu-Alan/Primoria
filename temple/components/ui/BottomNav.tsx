import React from 'react';
import { Home, Library, Users, User } from 'lucide-react';

export type Tab = 'home' | 'library' | 'friends' | 'profile';

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="h-20 bg-white border-t border-slate-100 flex items-center justify-around px-2 pb-2 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-50 relative">
      <NavIcon 
        icon={Home} 
        label="Home" 
        active={activeTab === 'home'} 
        onClick={() => onTabChange('home')} 
      />
      <NavIcon 
        icon={Library} 
        label="Library" 
        active={activeTab === 'library'} 
        onClick={() => onTabChange('library')} 
      />
      <NavIcon 
        icon={Users} 
        label="Community" 
        active={activeTab === 'friends'} 
        onClick={() => onTabChange('friends')} 
      />
      <NavIcon 
        icon={User} 
        label="Profile" 
        active={activeTab === 'profile'} 
        onClick={() => onTabChange('profile')} 
      />
    </nav>
  );
}

function NavIcon({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all active:scale-95 w-16
        ${active ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
    >
      <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}