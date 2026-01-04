
import React, { useState } from 'react';
import { generateVocabularyList, generateWordDetails } from '../services/geminiService';
import { getVocabularyByLevel, saveVocabularyList, getWordDetailsFromDB, updateWordDetailsInDB } from '../services/storageService';
import { VocabularyEntry, WordDetail, CefrLevel } from '../types';
import { ArrowLeftIcon, BookOpenIcon, SparklesIcon, CircleStackIcon } from '@heroicons/react/24/solid';

const LEVELS: { id: CefrLevel; label: string; desc: string }[] = [
  { id: 'A1', label: 'A1 Beginner', desc: 'Basic survival vocabulary' },
  { id: 'A2', label: 'A2 Elementary', desc: 'Routine & daily tasks' },
  { id: 'B1', label: 'B1 Intermediate', desc: 'Work, school, leisure' },
  { id: 'B2', label: 'B2 Upper Inter.', desc: 'Technical & abstract' },
];

export const VocabularyExplorer: React.FC = () => {
  const [view, setView] = useState<'levels' | 'list' | 'detail'>('levels');
  const [selectedLevel, setSelectedLevel] = useState<CefrLevel | null>(null);
  const [wordList, setWordList] = useState<VocabularyEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<WordDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');

  const handleLevelSelect = async (lvl: CefrLevel) => {
    setSelectedLevel(lvl);
    setLoading(true);
    setLoadingText('Checking database...');
    
    try {
      // 1. Try to fetch from DB
      let words = await getVocabularyByLevel(lvl);
      
      // 2. If empty, Seed DB using AI
      if (words.length === 0) {
        setLoadingText(`Seeding database for ${lvl}...`);
        const response = await generateVocabularyList(lvl);
        
        // Convert response to proper DB entries
        const vocabEntries: VocabularyEntry[] = response.words.map(w => ({
            ...w,
            level: lvl,
            details: null
        }));

        await saveVocabularyList(lvl, vocabEntries);
        words = vocabEntries;
      }
      
      setWordList(words);
      setView('list');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleWordSelect = async (wordEntry: VocabularyEntry) => {
    setLoading(true);
    setLoadingText('Loading word details...');
    try {
      // 1. Check if we already have the details in memory/list
      if (wordEntry.details) {
          setSelectedWord(wordEntry.details);
          setView('detail');
          setLoading(false);
          return;
      }

      // 2. Check DB explicitly (in case list was stale or minimal fetch)
      const dbDetails = await getWordDetailsFromDB(wordEntry.word);
      if (dbDetails) {
          setSelectedWord(dbDetails);
          setView('detail');
          setLoading(false);
          return;
      }

      // 3. Generate via AI and Save to DB
      setLoadingText('Analyzing grammar...');
      const response = await generateWordDetails(wordEntry.word);
      const newDetails = response.word_data;
      
      await updateWordDetailsInDB(wordEntry.word, newDetails);
      
      // Update local state list to prevent re-fetch
      setWordList(prev => prev.map(w => w.word === wordEntry.word ? { ...w, details: newDetails } : w));
      
      setSelectedWord(newDetails);
      setView('detail');

    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    if (view === 'detail') setView('list');
    else if (view === 'list') setView('levels');
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl p-12 flex flex-col items-center justify-center min-h-[500px] transition-colors">
         <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-slate-100 dark:border-slate-800 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-french-blue dark:border-blue-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
         </div>
         <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-100 animate-pulse">
           {loadingText}
         </h3>
         <p className="text-slate-500 dark:text-slate-400 mt-2">
           Consulting the French language engine
         </p>
      </div>
    );
  }

  // --- VIEW 1: LEVELS ---
  if (view === 'levels') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="text-center mb-10 animate-fade-in">
            <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-6">Vocabulary Explorer</h1>
            <p className="text-lg text-slate-500 dark:text-slate-400">
                Explore words by proficiency level. Data is seeded once and cached.
            </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            {LEVELS.map((lvl) => (
                <button
                    key={lvl.id}
                    onClick={() => handleLevelSelect(lvl.id)}
                    className="group relative p-8 border-2 border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-800 hover:border-french-blue dark:hover:border-blue-500 transition-all text-left flex flex-col justify-center bg-white dark:bg-slate-900 shadow-sm hover:shadow-xl"
                >
                    <span className="text-5xl font-black text-slate-100 dark:text-slate-700 group-hover:text-blue-50 dark:group-hover:text-slate-600 absolute right-6 top-6 transition-colors">{lvl.id}</span>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:text-french-blue dark:group-hover:text-blue-400 transition-colors relative z-10">{lvl.label}</h3>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed group-hover:text-slate-600 dark:group-hover:text-slate-300 relative z-10">{lvl.desc}</p>
                </button>
            ))}
        </div>
      </div>
    );
  }

  // --- VIEW 2: WORD LIST ---
  if (view === 'list') {
    return (
      <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl min-h-[600px] flex flex-col animate-fade-in transition-colors">
         <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-french-blue dark:bg-slate-800 rounded-t-2xl text-white">
            <div className="flex items-center gap-4">
                <button onClick={goBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <div>
                    <span className="text-xs font-bold uppercase tracking-wider opacity-80">Level {selectedLevel}</span>
                    <h2 className="text-2xl font-serif font-bold">Word Bank</h2>
                </div>
            </div>
            <div className="flex items-center gap-2 text-xs bg-black/20 px-3 py-1 rounded-full">
                <CircleStackIcon className="w-4 h-4" />
                <span>{wordList.length} words loaded</span>
            </div>
         </div>
         
         <div className="p-8 grid grid-cols-2 md:grid-cols-4 gap-4 overflow-y-auto">
            {wordList.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => handleWordSelect(item)}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-french-blue dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-left transition-all group"
                >
                    <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase mb-1 flex justify-between">
                        {item.type}
                        {item.details && <SparklesIcon className="w-3 h-3 text-yellow-500" title="Detailed view cached" />}
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1 capitalize truncate" title={item.word}>{item.word}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 italic truncate" title={item.translation}>{item.translation}</div>
                </button>
            ))}
         </div>
      </div>
    );
  }

  // --- VIEW 3: DETAIL ---
  const d = selectedWord!;
  const isVerb = d.type === 'verb';

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden animate-fade-in transition-colors">
        {/* Header */}
        <div className="bg-french-dark dark:bg-slate-950 text-white p-8 relative">
            <button onClick={goBack} className="absolute top-8 left-8 p-2 text-slate-400 hover:text-white transition-colors">
                <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <div className="text-center mt-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider mb-3 uppercase 
                    ${isVerb ? 'bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'}`}>
                    {d.type}
                </span>
                <h1 className="text-5xl font-serif font-bold mb-2 capitalize">{d.word}</h1>
                <p className="text-xl opacity-90 font-light">{d.translation}</p>
            </div>
            {isVerb && (
                <div className="flex justify-center gap-4 mt-6 text-sm text-slate-400">
                    {d.verb_group && <span>Group: <span className="text-white">{d.verb_group}</span></span>}
                    {d.auxiliary_verb && <span>Aux: <span className="text-white">{d.auxiliary_verb}</span></span>}
                </div>
            )}
        </div>

        <div className="p-8">
            {/* Definition & Examples */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800">
                    <h3 className="font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-4 flex items-center gap-2">
                        <BookOpenIcon className="w-4 h-4" /> Definition
                    </h3>
                    <p className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed mb-4">{d.definition}</p>
                    {d.exceptions_or_notes && (
                        <div className="text-sm text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/50">
                            <strong>Note:</strong> {d.exceptions_or_notes}
                        </div>
                    )}
                </div>
                <div className="space-y-4">
                     <h3 className="font-bold text-slate-400 dark:text-slate-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" /> Examples
                    </h3>
                    {d.examples.map((ex, i) => (
                        <div key={i} className="pl-4 border-l-2 border-french-blue dark:border-blue-500">
                            <p className="text-slate-800 dark:text-slate-200 font-medium italic">"{ex.french}"</p>
                            <p className="text-slate-500 dark:text-slate-400 text-sm">{ex.english}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Verb Conjugations */}
            {isVerb && d.tenses && (
                <div>
                    <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">Conjugations</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {d.tenses.map((tense) => (
                            <div key={tense.name} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 dark:bg-slate-800 p-3 border-b border-slate-200 dark:border-slate-700 font-bold text-center text-slate-700 dark:text-slate-300">
                                    {tense.name}
                                </div>
                                <div className="p-4">
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {tense.conjugations.map((c, idx) => (
                                                <tr key={idx} className="border-b border-slate-50 dark:border-slate-800 last:border-0">
                                                    <td className="py-2 text-slate-400 dark:text-slate-500 w-1/3 text-right pr-4 font-medium">{c.pronoun}</td>
                                                    <td className="py-2 text-slate-800 dark:text-blue-300 font-bold">{c.form}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Noun/Adjective Forms */}
            {!isVerb && d.forms && (
                <div>
                    <h3 className="text-2xl font-serif font-bold text-slate-800 dark:text-slate-100 mb-6 border-b border-slate-100 dark:border-slate-800 pb-2">Variations</h3>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm max-w-lg">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-left">
                                    <th className="p-4 font-medium">Form</th>
                                    <th className="p-4 font-medium">Spelling</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {d.forms.masculine_singular && (
                                    <tr>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">Masculine Singular</td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-blue-300">{d.forms.masculine_singular}</td>
                                    </tr>
                                )}
                                {d.forms.feminine_singular && (
                                    <tr>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">Feminine Singular</td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-blue-300">{d.forms.feminine_singular}</td>
                                    </tr>
                                )}
                                {d.forms.masculine_plural && (
                                    <tr>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">Masculine Plural</td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-blue-300">{d.forms.masculine_plural}</td>
                                    </tr>
                                )}
                                {d.forms.feminine_plural && (
                                    <tr>
                                        <td className="p-4 text-slate-500 dark:text-slate-400">Feminine Plural</td>
                                        <td className="p-4 font-bold text-slate-800 dark:text-blue-300">{d.forms.feminine_plural}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
