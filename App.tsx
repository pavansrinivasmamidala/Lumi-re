import React, { useState, useEffect } from 'react';
import { generateQuiz } from './services/geminiService';
import { saveQuizToHistory, getSavedQuizzes, deleteSavedQuiz, checkSupabaseConnection } from './services/storageService';
import { QuizSettings, QuizData, SavedQuiz } from './types';
import { QuizForm } from './components/QuizForm';
import { QuizInterface } from './components/QuizInterface';
import { QuizHistory } from './components/QuizHistory';
import { ClockIcon, CloudIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'offline'>('offline');

  // Load history on mount from DB
  useEffect(() => {
    const initApp = async () => {
        // Check DB connection
        const isConnected = await checkSupabaseConnection();
        setCloudStatus(isConnected ? 'connected' : 'offline');

        // Load History
        setIsHistoryLoading(true);
        try {
            const history = await getSavedQuizzes();
            setSavedQuizzes(history);
        } catch (e) {
            console.error("Failed to load history", e);
        } finally {
            setIsHistoryLoading(false);
        }
    };
    initApp();
  }, []);

  const handleCreateQuiz = async (settings: QuizSettings) => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateQuiz(settings);
      
      if (response && response.quiz && Array.isArray(response.quiz.questions)) {
          setQuizData(response.quiz);
          
          // Async save to DB
          try {
             const saved = await saveQuizToHistory(response.quiz);
             setSavedQuizzes(prev => [saved, ...prev]);
          } catch (saveError) {
             console.error("Failed to save to DB", saveError);
             // We don't block the user from playing if save fails, but we log it.
          }
      } else {
          throw new Error("Invalid response format from AI");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromHistory = (quiz: QuizData) => {
    setQuizData(quiz);
    setShowHistory(false);
    setError(null);
  };

  const handleDeleteQuiz = async (id: string) => {
    // Optimistic update for UI responsiveness
    const previous = savedQuizzes;
    setSavedQuizzes(prev => prev.filter(q => q.id !== id));
    
    try {
        await deleteSavedQuiz(id);
    } catch (e) {
        console.error("Failed to delete", e);
        // Revert on failure
        setSavedQuizzes(previous);
        alert("Failed to delete quiz from cloud.");
    }
  };

  const restart = () => {
    setQuizData(null);
    setError(null);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 selection:bg-french-blue selection:text-white">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={restart}>
             <div className="flex h-6 w-8 shadow-sm border border-slate-100 rounded-sm overflow-hidden">
                <div className="w-1/3 bg-french-blue h-full"></div>
                <div className="w-1/3 bg-french-white h-full"></div>
                <div className="w-1/3 bg-french-red h-full"></div>
             </div>
             <h1 className="font-serif font-bold text-xl tracking-tight text-slate-800">Lumière</h1>
          </div>
          
          <div className="flex gap-4">
              {!quizData && !showHistory && (
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-french-blue transition-colors"
                  >
                      <ClockIcon className="w-5 h-5" />
                      History
                      {savedQuizzes.length > 0 && !isHistoryLoading && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                              {savedQuizzes.length}
                          </span>
                      )}
                  </button>
              )}
              {quizData && (
                  <button onClick={restart} className="text-sm font-medium text-slate-500 hover:text-french-blue transition-colors">
                      New Quiz
                  </button>
              )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        
        {/* Error Notification */}
        {error && (
            <div className="mb-8 w-full max-w-lg bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm animate-fade-in">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        )}

        {/* View Switching Logic */}
        {quizData ? (
           <div className="w-full animate-fade-in-up">
               <QuizInterface quiz={quizData} onRestart={restart} />
           </div>
        ) : showHistory ? (
           <>
              {isHistoryLoading ? (
                  <div className="w-full h-64 flex items-center justify-center">
                       <div className="w-12 h-12 border-4 border-french-blue/30 border-t-french-blue rounded-full animate-spin"></div>
                  </div>
              ) : (
                  <QuizHistory 
                    quizzes={savedQuizzes} 
                    onSelect={handleSelectFromHistory}
                    onDelete={handleDeleteQuiz}
                    onBack={() => setShowHistory(false)}
                  />
              )}
           </>
        ) : (
           <div className="w-full flex flex-col items-center">
               <div className="text-center mb-10 max-w-2xl animate-fade-in">
                   <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 mb-6">Master French, <br/><span className="text-french-blue">One Quiz at a Time.</span></h1>
                   <p className="text-lg text-slate-500">
                       Select your topic and level. Our AI engine generates a unique, structured quiz perfectly tailored to your needs instantly.
                   </p>
               </div>
               <div className="animate-fade-in-up w-full flex justify-center">
                   <QuizForm onSubmit={handleCreateQuiz} isLoading={loading} />
               </div>
           </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
        <p>&copy; {new Date().getFullYear()} Lumière French Engine. Powered by Google Gemini.</p>
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-medium">
             {cloudStatus === 'connected' ? (
                 <span className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                     </span>
                     Database Connected
                 </span>
             ) : (
                 <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2 py-1 rounded-full border border-slate-200">
                     <span className="inline-flex rounded-full h-2 w-2 bg-slate-400"></span>
                     Local Mode (Database Offline)
                 </span>
             )}
        </div>
      </footer>
      
      {/* Global CSS for animations */}
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
