
import React, { useState, useEffect } from 'react';
import { generateQuiz, generateStory, checkApiKeyConfigured } from './services/geminiService';
import { 
    saveQuizToHistory, getSavedQuizzes, deleteSavedQuiz, 
    saveStoryToHistory, getSavedStories, deleteSavedStory,
    checkSupabaseConnection 
} from './services/storageService';
import { QuizSettings, QuizData, StoryData, SavedQuiz, SavedStory } from './types';
import { QuizForm } from './components/QuizForm';
import { QuizInterface } from './components/QuizInterface';
import { StoryInterface } from './components/StoryInterface';
import { VocabularyExplorer } from './components/VocabularyExplorer';
import { QuizHistory } from './components/QuizHistory';
import { StoryHistory } from './components/StoryHistory';
import { BookOpenIcon, AcademicCapIcon, RectangleStackIcon, SunIcon, MoonIcon, ListBulletIcon } from '@heroicons/react/24/outline';

type Tab = 'quiz' | 'stories' | 'vocabulary';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('quiz');
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'offline'>('offline');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- THEME STATE ---
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' ||
        (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // --- QUIZ STATE ---
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [showQuizHistory, setShowQuizHistory] = useState(false);

  // --- STORY STATE ---
  const [storyData, setStoryData] = useState<StoryData | null>(null);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [showStoryHistory, setShowStoryHistory] = useState(false);

  // Initialize App
  useEffect(() => {
    const initApp = async () => {
        const hasKey = checkApiKeyConfigured();
        const isConnected = await checkSupabaseConnection();
        console.log(`Diagnostic: API Key ${hasKey}, DB ${isConnected}`);
        setCloudStatus(isConnected ? 'connected' : 'offline');

        try {
            const [qHistory, sHistory] = await Promise.all([
                getSavedQuizzes(),
                getSavedStories()
            ]);
            setSavedQuizzes(qHistory);
            setSavedStories(sHistory);
        } catch (e) {
            console.error("Failed to load history", e);
        }
    };
    initApp();
  }, []);

  // --- QUIZ HANDLERS ---
  const handleCreateQuiz = async (settings: QuizSettings) => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateQuiz(settings);
      if (response && response.quiz) {
          setQuizData(response.quiz);
          setShowQuizHistory(false);
          try {
             const saved = await saveQuizToHistory(response.quiz);
             setSavedQuizzes(prev => [saved, ...prev]);
          } catch (e) { console.error("DB Save failed", e); }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuiz = (quiz: QuizData) => {
    setQuizData(quiz);
    setShowQuizHistory(false);
  };

  const handleDeleteQuiz = async (id: string) => {
    const prev = savedQuizzes;
    setSavedQuizzes(p => p.filter(q => q.id !== id));
    try { await deleteSavedQuiz(id); } 
    catch { setSavedQuizzes(prev); }
  };

  const closeQuiz = () => {
      setQuizData(null);
  };

  // --- STORY HANDLERS ---
  const handleCreateStory = async (settings: QuizSettings) => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateStory(settings);
      if (response && response.story) {
          setStoryData(response.story);
          setShowStoryHistory(false);
          try {
             const saved = await saveStoryToHistory(response.story);
             setSavedStories(prev => [saved, ...prev]);
          } catch (e) { console.error("DB Save failed", e); }
      }
    } catch (err: any) {
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSelectStory = (story: StoryData) => {
      setStoryData(story);
      setShowStoryHistory(false);
  };

  const handleDeleteStory = async (id: string) => {
      const prev = savedStories;
      setSavedStories(p => p.filter(s => s.id !== id));
      try { await deleteSavedStory(id); }
      catch { setSavedStories(prev); }
  };

  const closeStory = () => {
      setStoryData(null);
  };

  // --- RENDER HELPERS ---
  
  const renderQuizTab = () => {
      if (quizData) {
          return <div className="animate-fade-in-up w-full"><QuizInterface quiz={quizData} onRestart={closeQuiz} /></div>;
      }
      if (showQuizHistory) {
          return (
            <QuizHistory 
                quizzes={savedQuizzes} 
                onSelect={handleSelectQuiz} 
                onDelete={handleDeleteQuiz}
                onBack={() => setShowQuizHistory(false)}
            />
          );
      }
      return (
          <div className="w-full flex flex-col items-center">
              <div className="text-center mb-10 max-w-2xl animate-fade-in">
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-6">Test Your Skills</h1>
                  <p className="text-lg text-slate-500 dark:text-slate-400 mb-6">
                      Generate adaptive quizzes tailored to your proficiency level.
                  </p>
                  {savedQuizzes.length > 0 && (
                      <button 
                        onClick={() => setShowQuizHistory(true)}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-french-blue dark:hover:text-blue-400 hover:border-french-blue dark:hover:border-blue-400 transition-colors shadow-sm"
                      >
                          <RectangleStackIcon className="w-4 h-4" />
                          View Saved Quizzes ({savedQuizzes.length})
                      </button>
                  )}
              </div>
              <div className="animate-fade-in-up w-full flex justify-center">
                  <QuizForm onSubmit={handleCreateQuiz} isLoading={loading} mode="quiz" />
              </div>
          </div>
      );
  };

  const renderStoryTab = () => {
      if (storyData) {
          return <div className="animate-fade-in-up w-full"><StoryInterface story={storyData} onBack={closeStory} /></div>;
      }
      if (showStoryHistory) {
          return (
            <StoryHistory 
                stories={savedStories}
                onSelect={handleSelectStory}
                onDelete={handleDeleteStory}
                onBack={() => setShowStoryHistory(false)}
            />
          );
      }
      return (
          <div className="w-full flex flex-col items-center">
              <div className="text-center mb-10 max-w-2xl animate-fade-in">
                  <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-6">Learn through Stories</h1>
                  <p className="text-lg text-slate-500 dark:text-slate-400 mb-6">
                      Generate immersive short stories with instant hover-translation.
                  </p>
                  {savedStories.length > 0 && (
                      <button 
                        onClick={() => setShowStoryHistory(true)}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full text-slate-600 dark:text-slate-300 text-sm font-medium hover:text-french-blue dark:hover:text-blue-400 hover:border-french-blue dark:hover:border-blue-400 transition-colors shadow-sm"
                      >
                          <RectangleStackIcon className="w-4 h-4" />
                          View Saved Stories ({savedStories.length})
                      </button>
                  )}
              </div>
              <div className="animate-fade-in-up w-full flex justify-center">
                  <QuizForm onSubmit={handleCreateStory} isLoading={loading} mode="story" />
              </div>
          </div>
      );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-french-blue selection:text-white transition-colors duration-300">
      {/* Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50 transition-colors duration-300">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setQuizData(null); setStoryData(null); setActiveTab('quiz'); }}>
             <div className="flex h-6 w-8 shadow-sm border border-slate-100 dark:border-slate-700 rounded-sm overflow-hidden">
                <div className="w-1/3 bg-french-blue h-full"></div>
                <div className="w-1/3 bg-french-white h-full"></div>
                <div className="w-1/3 bg-french-red h-full"></div>
             </div>
             <h1 className="font-serif font-bold text-xl tracking-tight text-slate-800 dark:text-white">Lumière</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <nav className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-full transition-colors">
                <button 
                  onClick={() => setActiveTab('quiz')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'quiz' ? 'bg-white dark:bg-slate-700 shadow-sm text-french-blue dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <AcademicCapIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Quiz</span>
                </button>
                <button 
                  onClick={() => setActiveTab('stories')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'stories' ? 'bg-white dark:bg-slate-700 shadow-sm text-french-blue dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <BookOpenIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Stories</span>
                </button>
                <button 
                  onClick={() => setActiveTab('vocabulary')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${activeTab === 'vocabulary' ? 'bg-white dark:bg-slate-700 shadow-sm text-french-blue dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                >
                    <ListBulletIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Vocabulary</span>
                </button>
            </nav>

            {/* Theme Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        
        {error && (
            <div className="mb-8 w-full max-w-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded shadow-sm animate-fade-in">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
        )}

        {activeTab === 'quiz' && renderQuizTab()}
        {activeTab === 'stories' && renderStoryTab()}
        {activeTab === 'vocabulary' && (
            <div className="animate-fade-in-up w-full">
                <VocabularyExplorer />
            </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm flex flex-col items-center gap-2 transition-colors">
        <p>&copy; {new Date().getFullYear()} Lumière French Engine. Powered by Google Gemini.</p>
        <div className="flex items-center gap-2 text-xs font-medium" title={cloudStatus === 'offline' ? "Check console for .env diagnostic" : "Connected"}>
             {cloudStatus === 'connected' ? (
                 <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full border border-green-100 dark:border-green-800/50">
                     <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span>
                     Database Connected
                 </span>
             ) : (
                 <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                     <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                     Local Mode
                 </span>
             )}
        </div>
      </footer>
      
      <style>{`
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
            animation: fadeIn 0.4s ease-out forwards;
        }
        .animate-fade-in-up {
            animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default App;
