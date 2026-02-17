import React, { useState } from 'react';
import { Search, PlayCircle, BookOpen, Clock, Code, Star, Terminal, Calculator, Atom, Briefcase, Users, ChevronRight, Brain, Beaker, TrendingUp, Globe } from 'lucide-react';
import { BottomNav, Tab } from '../ui/BottomNav';
import { motion, AnimatePresence } from 'motion/react';
import { Carousel, CarouselContent, CarouselItem } from '../ui/carousel';

interface LibraryScreenProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const CATEGORIES = [
  { id: 'CS', name: 'CS', icon: Terminal },
  { id: 'Math', name: 'Math', icon: Calculator },
  { id: 'Science', name: 'Science', icon: Atom },
  { id: 'Business', name: 'Business', icon: Briefcase },
  { id: 'Social', name: 'Social', icon: Users },
];

// Recommended courses by category
const RECOMMENDED_BY_CATEGORY: Record<string, any[]> = {
  CS: [
    {
      id: 1,
      title: "Python Basics",
      image: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400",
      lessons: 42,
      color: "bg-blue-500"
    },
    {
      id: 2,
      title: "Web Dev",
      image: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=400",
      lessons: 35,
      color: "bg-cyan-500"
    },
    {
      id: 3,
      title: "Machine Learning",
      image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400",
      lessons: 50,
      color: "bg-purple-500"
    },
    {
      id: 4,
      title: "Data Science",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
      lessons: 38,
      color: "bg-indigo-500"
    }
  ],
  Math: [
    {
      id: 1,
      title: "Calculus I",
      image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400",
      lessons: 45,
      color: "bg-orange-500"
    },
    {
      id: 2,
      title: "Linear Algebra",
      image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400",
      lessons: 32,
      color: "bg-pink-500"
    },
    {
      id: 3,
      title: "Statistics",
      image: "https://images.unsplash.com/photo-1543286386-2e659306cd6c?w=400",
      lessons: 28,
      color: "bg-teal-500"
    },
    {
      id: 4,
      title: "Discrete Math",
      image: "https://images.unsplash.com/photo-1596495577886-d920f1fb7238?w=400",
      lessons: 40,
      color: "bg-purple-500"
    }
  ],
  Science: [
    {
      id: 1,
      title: "Physics I",
      image: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=400",
      lessons: 50,
      color: "bg-blue-500"
    },
    {
      id: 2,
      title: "Organic Chem",
      image: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=400",
      lessons: 44,
      color: "bg-emerald-500"
    },
    {
      id: 3,
      title: "Biology 101",
      image: "https://images.unsplash.com/photo-1578496479763-c21c718af028?w=400",
      lessons: 36,
      color: "bg-green-500"
    },
    {
      id: 4,
      title: "Astronomy",
      image: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=400",
      lessons: 30,
      color: "bg-indigo-600"
    }
  ],
  Business: [
    {
      id: 1,
      title: "Marketing 101",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
      lessons: 25,
      color: "bg-rose-500"
    },
    {
      id: 2,
      title: "Finance Basics",
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=400",
      lessons: 30,
      color: "bg-emerald-600"
    },
    {
      id: 3,
      title: "Entrepreneurship",
      image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400",
      lessons: 28,
      color: "bg-blue-500"
    },
    {
      id: 4,
      title: "Leadership",
      image: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400",
      lessons: 22,
      color: "bg-amber-500"
    }
  ],
  Social: [
    {
      id: 1,
      title: "Psychology",
      image: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=400",
      lessons: 35,
      color: "bg-violet-500"
    },
    {
      id: 2,
      title: "Sociology",
      image: "https://images.unsplash.com/photo-1529070538774-1843cb3265df?w=400",
      lessons: 28,
      color: "bg-fuchsia-500"
    },
    {
      id: 3,
      title: "Economics",
      image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400",
      lessons: 32,
      color: "bg-cyan-600"
    },
    {
      id: 4,
      title: "Anthropology",
      image: "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400",
      lessons: 26,
      color: "bg-orange-500"
    }
  ]
};

// Popular courses by category
const POPULAR_BY_CATEGORY: Record<string, any[]> = {
  CS: [
    { title: "Python Basics", sub: "Beginner • 2 hours", color: "bg-yellow-400", icon: Code },
    { title: "Web Scraping 101", sub: "Intermediate • 45 mins", color: "bg-emerald-500", icon: Globe },
    { title: "Django Framework", sub: "Advanced • 10 hours", color: "bg-indigo-500", icon: Code },
    { title: "Machine Learning", sub: "Expert • 20 hours", color: "bg-purple-500", icon: Brain },
    { title: "React & Python", sub: "Fullstack • 5 hours", color: "bg-cyan-500", icon: Code }
  ],
  Math: [
    { title: "Calculus Fundamentals", sub: "Beginner • 3 hours", color: "bg-orange-400", icon: Calculator },
    { title: "Linear Algebra", sub: "Intermediate • 4 hours", color: "bg-pink-500", icon: Calculator },
    { title: "Probability Theory", sub: "Advanced • 6 hours", color: "bg-teal-500", icon: Calculator },
    { title: "Advanced Statistics", sub: "Expert • 8 hours", color: "bg-purple-500", icon: Calculator },
    { title: "Number Theory", sub: "Intermediate • 5 hours", color: "bg-indigo-500", icon: Calculator }
  ],
  Science: [
    { title: "Newton's Laws", sub: "Beginner • 2 hours", color: "bg-blue-400", icon: Atom },
    { title: "Chemical Bonds", sub: "Intermediate • 3 hours", color: "bg-emerald-500", icon: Beaker },
    { title: "Cell Biology", sub: "Beginner • 2.5 hours", color: "bg-green-500", icon: Atom },
    { title: "Quantum Physics", sub: "Advanced • 12 hours", color: "bg-indigo-600", icon: Atom },
    { title: "Thermodynamics", sub: "Intermediate • 4 hours", color: "bg-orange-500", icon: Beaker }
  ],
  Business: [
    { title: "Digital Marketing", sub: "Beginner • 3 hours", color: "bg-rose-400", icon: TrendingUp },
    { title: "Investment Basics", sub: "Intermediate • 4 hours", color: "bg-emerald-500", icon: TrendingUp },
    { title: "Startup Strategy", sub: "Advanced • 6 hours", color: "bg-blue-500", icon: Briefcase },
    { title: "Team Management", sub: "Intermediate • 3 hours", color: "bg-amber-500", icon: Users },
    { title: "Business Analytics", sub: "Advanced • 5 hours", color: "bg-purple-500", icon: TrendingUp }
  ],
  Social: [
    { title: "Intro to Psychology", sub: "Beginner • 2 hours", color: "bg-violet-400", icon: Brain },
    { title: "Social Structures", sub: "Intermediate • 3 hours", color: "bg-fuchsia-500", icon: Users },
    { title: "Microeconomics", sub: "Intermediate • 4 hours", color: "bg-cyan-500", icon: TrendingUp },
    { title: "Cultural Studies", sub: "Beginner • 2.5 hours", color: "bg-orange-500", icon: Globe },
    { title: "Behavioral Science", sub: "Advanced • 6 hours", color: "bg-indigo-500", icon: Brain }
  ]
};

export function LibraryScreen({ activeTab, onTabChange }: LibraryScreenProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('CS');

  // Handle scroll to show/hide search and shrink categories
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollTop = e.currentTarget.scrollTop;
    if (scrollTop > 20) {
      setIsScrolled(true);
    } else {
      setIsScrolled(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-slate-50 relative font-sans text-slate-900">
      
      {/* Header Area */}
      <motion.header 
        className="px-6 bg-white z-10 shadow-sm rounded-b-[2rem] overflow-hidden flex flex-col justify-end"
        initial={{ paddingBottom: '1.5rem', paddingTop: '2rem' }}
        animate={{ 
          paddingBottom: '1.5rem', 
          paddingTop: isScrolled ? '1.5rem' : '2rem'
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Search Bar - Always visible */}
        <div className="relative w-full mb-4">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input 
             type="text" 
             placeholder="Search topics..." 
             className="w-full bg-slate-50 border-none rounded-xl py-3 pl-9 pr-4 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-400 shadow-inner"
           />
        </div>

        {/* Category Tabs - Shrinks when scrolled */}
        <div>
          <div className="overflow-x-auto scrollbar-hide -mx-6 px-6 pb-2">
            <motion.div 
              className="flex min-w-max"
              animate={{ gap: isScrolled ? '0.5rem' : '1rem' }}
            >
              {CATEGORIES.map((category) => {
                const isSelected = selectedCategory === category.id;
                const Icon = category.icon;
                
                return (
                  <motion.button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    layout
                    animate={{
                      padding: isScrolled ? '0.5rem 1rem' : '0.75rem',
                      minWidth: isScrolled ? 'auto' : '80px',
                      borderRadius: '1rem'
                    }}
                    className={`
                      relative flex items-center justify-center transition-colors duration-300
                      ${isSelected ? 'bg-indigo-600 shadow-lg shadow-indigo-200' : 'bg-transparent hover:bg-slate-50'}
                      ${isScrolled ? 'flex-row gap-2' : 'flex-col gap-3'}
                    `}
                  >
                    {/* Icon Container - Hides/Shrinks when scrolled */}
                    <AnimatePresence mode="popLayout">
                      {!isScrolled && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className={`
                            w-14 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border-2
                            ${isSelected 
                              ? 'bg-white/20 border-white/20 text-white' 
                              : 'bg-indigo-50 border-indigo-100 text-indigo-600'}
                          `}
                        >
                          <Icon className="w-6 h-6" strokeWidth={2.5} />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Label */}
                    <motion.span 
                      layout 
                      className={`text-sm font-bold transition-colors ${
                        isSelected ? 'text-white' : 'text-slate-600'
                      }`}
                    >
                      {category.name}
                    </motion.span>
                  </motion.button>
                );
              })}
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth"
      >
        
        {/* Recommended Course (Carousel) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Recommended</h2>
          
          <Carousel
            opts={{
              align: "start",
              dragFree: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {RECOMMENDED_BY_CATEGORY[selectedCategory].map((course) => (
                <CarouselItem key={course.id} className="pl-4 basis-[160px]">
                  <motion.div 
                    whileTap={{ scale: 0.95 }}
                    className="relative group cursor-pointer"
                  >
                    {/* Book Cover Style Card */}
                    <div className="w-full aspect-[3/4] rounded-2xl overflow-hidden shadow-md mb-3 relative bg-slate-200">
                      <img 
                        src={course.image} 
                        alt={course.title} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60"></div>
                      
                      {/* Floating Badge */}
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm p-1 rounded-lg shadow-sm">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      </div>

                      {/* Lesson Count */}
                      <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{course.lessons} lessons</span>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-800 text-sm leading-tight">{course.title}</h3>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>

        {/* Popular List Items */}
        <div className="space-y-4 pb-20">
           <h2 className="text-lg font-bold text-slate-800">Popular Now</h2>
           {POPULAR_BY_CATEGORY[selectedCategory].map((item, i) => (
             <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-4 hover:shadow-md transition-shadow cursor-pointer">
                <div className="w-16 h-16 rounded-xl bg-slate-50 shrink-0 flex items-center justify-center border border-slate-100">
                   <item.icon className="w-8 h-8 text-slate-400" />
                </div>
                <div className="flex-1 flex flex-col justify-center">
                   <h4 className="font-bold text-slate-800 text-sm">{item.title}</h4>
                   <p className="text-xs text-slate-500 mt-1">{item.sub}</p>
                   <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden w-20">
                      <div className={`h-full ${item.color} w-1/3 rounded-full`}></div>
                   </div>
                </div>
             </div>
           ))}
        </div>

      </main>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}