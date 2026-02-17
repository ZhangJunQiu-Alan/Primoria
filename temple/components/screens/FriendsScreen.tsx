import React, { useState, useRef, useEffect } from 'react';
import { UserPlus, MessageSquare, Users as UsersIcon, QrCode, Search } from 'lucide-react';
import { BottomNav, Tab } from '../ui/BottomNav';
import { motion, AnimatePresence } from 'motion/react';

interface FriendsScreenProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

// Mock user data for the galaxy visualization - Spherical distribution
const GALAXY_USERS = [
  // Center cluster
  { id: 1, name: '大清话', x: 50, y: 45, color: 'bg-cyan-400', size: 'large', floatDelay: 0 },
  { id: 2, name: 'Mia小夏', x: 48, y: 50, color: 'bg-pink-400', size: 'large', floatDelay: 0.3 },
  { id: 3, name: 'xX', x: 52, y: 48, color: 'bg-white', size: 'medium', floatDelay: 0.6 },
  
  // Inner ring
  { id: 4, name: '抹茶', x: 40, y: 45, color: 'bg-cyan-400', size: 'medium', floatDelay: 0.2 },
  { id: 5, name: '沈术士', x: 45, y: 38, color: 'bg-pink-300', size: 'medium', floatDelay: 0.5 },
  { id: 6, name: '无限星消风', x: 55, y: 38, color: 'bg-emerald-400', size: 'medium', floatDelay: 0.8 },
  { id: 7, name: '一起吃冬瓜', x: 60, y: 45, color: 'bg-pink-300', size: 'medium', floatDelay: 1.1 },
  { id: 8, name: '墓放独主', x: 55, y: 55, color: 'bg-cyan-400', size: 'medium', floatDelay: 1.4 },
  { id: 9, name: '侣人', x: 45, y: 55, color: 'bg-pink-300', size: 'medium', floatDelay: 1.7 },
  { id: 10, name: 'bsh', x: 40, y: 52, color: 'bg-pink-300', size: 'medium', floatDelay: 2.0 },
  { id: 11, name: '爱吃香菜 🍀', x: 50, y: 58, color: 'bg-pink-300', size: 'medium', floatDelay: 2.3 },
  
  // Outer ring - top
  { id: 12, name: '跨的透明人', x: 35, y: 30, color: 'bg-slate-300', size: 'small', floatDelay: 0.4 },
  { id: 13, name: 'dragon', x: 42, y: 25, color: 'bg-slate-400', size: 'small', floatDelay: 0.7 },
  { id: 14, name: '野', x: 50, y: 23, color: 'bg-pink-300', size: 'small', floatDelay: 1.0 },
  { id: 15, name: '&dnajaj', x: 58, y: 25, color: 'bg-slate-400', size: 'small', floatDelay: 1.3 },
  { id: 16, name: 'rainbow', x: 65, y: 30, color: 'bg-slate-400', size: 'small', floatDelay: 1.6 },
  
  // Outer ring - right
  { id: 17, name: '越自由', x: 70, y: 40, color: 'bg-red-400', size: 'small', floatDelay: 0.9 },
  { id: 18, name: '城边配', x: 72, y: 48, color: 'bg-slate-400', size: 'small', floatDelay: 1.2 },
  { id: 19, name: '汉音夜飘', x: 70, y: 55, color: 'bg-slate-400', size: 'small', floatDelay: 1.5 },
  
  // Outer ring - bottom
  { id: 20, name: 'momo', x: 65, y: 62, color: 'bg-pink-300', size: 'small', floatDelay: 1.8 },
  { id: 21, name: '小小', x: 58, y: 68, color: 'bg-pink-300', size: 'small', floatDelay: 2.1 },
  { id: 22, name: '心碎小狗', x: 50, y: 70, color: 'bg-cyan-400', size: 'small', floatDelay: 2.4 },
  { id: 23, name: '爱吃生蚝', x: 42, y: 68, color: 'bg-emerald-400', size: 'small', floatDelay: 2.7 },
  { id: 24, name: 'DN', x: 35, y: 62, color: 'bg-cyan-400', size: 'small', floatDelay: 3.0 },
  
  // Outer ring - left
  { id: 25, name: '电灯泡', x: 28, y: 48, color: 'bg-pink-300', size: 'small', floatDelay: 0.6 },
  { id: 26, name: 'Souler', x: 30, y: 40, color: 'bg-emerald-400', size: 'small', floatDelay: 1.1 },
  { id: 27, name: '喔过阴花', x: 32, y: 35, color: 'bg-pink-300', size: 'small', floatDelay: 1.9 },
  
  // Far outer points - creating depth
  { id: 28, name: '分不明星人', x: 25, y: 38, color: 'bg-slate-400', size: 'small', floatDelay: 2.2 },
  { id: 29, name: '大大梅西宁宇', x: 22, y: 50, color: 'bg-slate-400', size: 'small', floatDelay: 2.5 },
  { id: 30, name: '喃喃不加情', x: 25, y: 58, color: 'bg-pink-300', size: 'small', floatDelay: 2.8 },
  { id: 31, name: '小郝难夜', x: 32, y: 68, color: 'bg-pink-300', size: 'small', floatDelay: 3.1 },
  { id: 32, name: 'kkkk', x: 42, y: 75, color: 'bg-slate-400', size: 'small', floatDelay: 0.8 },
  { id: 33, name: '沪海玉', x: 50, y: 78, color: 'bg-pink-300', size: 'small', floatDelay: 1.4 },
  { id: 34, name: '冷米', x: 58, y: 75, color: 'bg-slate-400', size: 'small', floatDelay: 2.0 },
  { id: 35, name: '小杰', x: 68, y: 68, color: 'bg-slate-400', size: 'small', floatDelay: 2.6 },
  { id: 36, name: '燕新人', x: 75, y: 58, color: 'bg-slate-400', size: 'small', floatDelay: 3.2 },
  { id: 37, name: '小浊不瑕', x: 78, y: 48, color: 'bg-slate-400', size: 'small', floatDelay: 0.5 },
  { id: 38, name: '壹奇', x: 75, y: 38, color: 'bg-slate-400', size: 'small', floatDelay: 1.3 },
  { id: 39, name: '金综独钱', x: 68, y: 28, color: 'bg-slate-400', size: 'small', floatDelay: 2.1 },
  { id: 40, name: 'Cce', x: 58, y: 20, color: 'bg-cyan-400', size: 'small', floatDelay: 2.9 },
  { id: 41, name: '不吃软饭', x: 50, y: 18, color: 'bg-cyan-400', size: 'small', floatDelay: 3.3 },
];

// Mock conversation data
const MOCK_CONVERSATIONS = [
  { id: 1, name: 'Sarah Connor', message: 'Python functions are so interesting!', time: '10:30', unread: true, avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 2, name: 'Mike Chen', message: 'Want to practice coding together tomorrow?', time: '09:15', unread: true, avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 3, name: 'Jessica Lee', message: 'Thank you for your help!', time: 'Yesterday', unread: false, avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 4, name: 'Python Study Group', message: 'Alex: Today\'s homework is too hard...', time: 'Yesterday', unread: false, avatar: 'https://i.pravatar.cc/150?u=group1' },
  { id: 5, name: 'David Park', message: 'See you this weekend!', time: 'Wed', unread: false, avatar: 'https://i.pravatar.cc/150?u=5' },
];

export function FriendsScreen({ activeTab, onTabChange }: FriendsScreenProps) {
  const [view, setView] = useState<'find' | 'message'>('find');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handlePlanetClick = (userId: number, userName: string) => {
    setSelectedUser(userId);
    // Simulate starting a chat
    setTimeout(() => {
      alert(`开始与 ${userName} 聊天`);
      setSelectedUser(null);
    }, 300);
  };

  const getPlanetSize = (size: string) => {
    switch(size) {
      case 'small': return 'w-3 h-3';
      case 'medium': return 'w-4 h-4';
      case 'large': return 'w-5 h-5';
      default: return 'w-4 h-4';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative font-sans text-slate-900">
      
      {/* Header Area */}
      <header className="px-6 pt-8 pb-4 bg-white relative z-20">
        <div className="flex items-center justify-center gap-8 mb-4 relative">
          {/* Find Tab */}
          <button 
            onClick={() => setView('find')}
            className="relative pb-1"
          >
            <span className={`font-bold text-base transition-colors ${view === 'find' ? 'text-slate-900' : 'text-slate-400'}`}>
              find
            </span>
            {view === 'find' && (
              <motion.div 
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
              />
            )}
          </button>

          {/* Message Tab */}
          <button 
            onClick={() => setView('message')}
            className="relative pb-1"
          >
            <span className={`font-bold text-base transition-colors ${view === 'message' ? 'text-slate-900' : 'text-slate-400'}`}>
              message
            </span>
            {view === 'message' && (
              <motion.div 
                layoutId="tab-underline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900"
              />
            )}
          </button>

          {/* Add Friend Button with Dropdown Menu */}
          <div className="absolute right-0 top-0" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 bg-slate-50 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <UserPlus className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden"
                >
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <UsersIcon className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-800">发起群聊</span>
                  </button>
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <UserPlus className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-800">添加朋友</span>
                  </button>
                  <button 
                    onClick={() => setShowMenu(false)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <QrCode className="w-5 h-5 text-slate-600" />
                    <span className="font-medium text-slate-800">扫一扫</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'find' ? (
            <motion.div
              key="find"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full flex flex-col"
            >
              {/* Galaxy Visualization - Dark Theme */}
              <div className="flex-1 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 relative overflow-hidden">
                {/* Planets/Users */}
                {GALAXY_USERS.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      y: [0, -10, 0],
                      x: [0, 5, 0]
                    }}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ 
                      scale: { delay: user.floatDelay * 0.05 },
                      opacity: { delay: user.floatDelay * 0.05 },
                      y: {
                        duration: 3 + (user.floatDelay % 2),
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: user.floatDelay
                      },
                      x: {
                        duration: 4 + (user.floatDelay % 3),
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay: user.floatDelay * 0.5
                      }
                    }}
                    className="absolute cursor-pointer group"
                    style={{ 
                      left: `${user.x}%`, 
                      top: `${user.y}%`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => handlePlanetClick(user.id, user.name)}
                  >
                    {/* Glow effect */}
                    <div className={`absolute inset-0 rounded-full blur-lg ${user.color} opacity-60 scale-[2.5] group-hover:opacity-80 transition-opacity`}></div>
                    
                    {/* Main planet */}
                    <div className={`relative ${getPlanetSize(user.size)} rounded-full ${user.color} shadow-lg group-hover:shadow-xl transition-shadow`}></div>
                    
                    {/* Name label - Always visible */}
                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
                      <span className="text-[9px] font-medium text-slate-300 group-hover:text-white transition-colors">
                        {user.name}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Find Button - Dark Theme */}
              <div className="p-6 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border-t border-slate-800">
                <button className="w-full py-4 bg-transparent border-2 border-slate-300 rounded-2xl font-bold text-slate-300 hover:bg-slate-300 hover:text-slate-950 transition-all active:scale-95">
                  Find
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="message"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="h-full flex flex-col bg-white"
            >
              {/* Search Box */}
              <div className="px-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="search box"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {MOCK_CONVERSATIONS.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: conversation.id * 0.05 }}
                    className="px-6 py-4 flex items-center gap-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-200">
                        <img src={conversation.avatar} alt={conversation.name} className="w-full h-full object-cover" />
                      </div>
                      {conversation.unread && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">1</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-bold text-slate-900">{conversation.name}</h4>
                        <span className="text-xs text-slate-400">{conversation.time}</span>
                      </div>
                      <p className={`text-sm truncate ${conversation.unread ? 'text-slate-900 font-medium' : 'text-slate-500'}`}>
                        {conversation.message}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}