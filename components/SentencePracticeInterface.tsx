import React, { useState, useEffect } from 'react';
import { SentenceCategory, SentenceLength, SentenceDifficulty, SentencePrompt, SentenceEvaluation } from '../types';
import { generateSentencePrompts, evaluateSentenceTranslation, generateSpeech, pcmToAudioBuffer } from '../services/geminiService';
import { getTopWeakConcepts, updateWeakConcepts } from '../services/progressService';
import { ArrowLeftIcon, PlayCircleIcon, PlusIcon, CheckCircleIcon, ExclamationTriangleIcon, LightBulbIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface SentencePracticeInterfaceProps {
    onGoBack: () => void;
}

export const SentencePracticeInterface: React.FC<SentencePracticeInterfaceProps> = ({ onGoBack }) => {
    const [category, setCategory] = useState<SentenceCategory>('describe_self');
    const [length, setLength] = useState<SentenceLength>('short');
    const [difficulty, setDifficulty] = useState<SentenceDifficulty>('easy');
    
    const [prompts, setPrompts] = useState<SentencePrompt[]>([]);
    const [loadingPrompts, setLoadingPrompts] = useState<boolean>(false);
    
    const [currentPromptIndex, setCurrentPromptIndex] = useState<number>(0);
    const [userTranslation, setUserTranslation] = useState<string>('');
    const [evaluation, setEvaluation] = useState<SentenceEvaluation | null>(null);
    const [evaluating, setEvaluating] = useState<boolean>(false);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);

    const handleGeneratePrompts = async () => {
        setLoadingPrompts(true);
        setEvaluation(null);
        setUserTranslation('');
        try {
            const weakConcepts = await getTopWeakConcepts(2);
            const newPrompts = await generateSentencePrompts(category, length, difficulty, weakConcepts);
            setPrompts(newPrompts);
            setCurrentPromptIndex(0);
        } catch (error: any) {
            console.error("Failed to generate prompts", error);
            if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429')) {
                alert("The AI is currently receiving too many requests. Please wait a moment and try again.");
            } else {
                alert("Failed to load prompts. Please try again.");
            }
        } finally {
            setLoadingPrompts(false);
        }
    };

    const handleEvaluate = async () => {
        if (!userTranslation.trim()) return;
        setEvaluating(true);
        try {
            const currentPrompt = prompts[currentPromptIndex];
            const evalResult = await evaluateSentenceTranslation(currentPrompt.english_prompt, userTranslation, difficulty);
            setEvaluation(evalResult);
            
            // Track weak concepts
            const conceptsToTrack = new Set<string>(evalResult.grammatical_concepts);
            if (currentPrompt.targeted_concept) {
                conceptsToTrack.add(currentPrompt.targeted_concept);
            }
            if (conceptsToTrack.size > 0) {
                await updateWeakConcepts(Array.from(conceptsToTrack), evalResult.is_correct);
            }
        } catch (error: any) {
            console.error("Failed to evaluate", error);
            if (error?.status === 'RESOURCE_EXHAUSTED' || error?.message?.includes('429')) {
                alert("The AI is currently receiving too many requests. Please wait a moment and try again.");
            } else {
                alert("Failed to evaluate. Please try again.");
            }
        } finally {
            setEvaluating(false);
        }
    };

    const handleNext = () => {
        if (currentPromptIndex < prompts.length - 1) {
            setCurrentPromptIndex(prev => prev + 1);
            setUserTranslation('');
            setEvaluation(null);
        } else {
            handleGeneratePrompts();
        }
    };

    const playAudio = async (text: string) => {
        if (isPlaying) return;
        setIsPlaying(true);
        try {
            const pcmData = await generateSpeech(text);
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const audioBuffer = await pcmToAudioBuffer(pcmData, audioContext);
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);

            source.onended = () => {
                setIsPlaying(false);
            };
        } catch (err) {
            console.error("Speech generation error:", err);
            setIsPlaying(false);
        }
    };

    return (
        <div className="w-full flex flex-col h-full overflow-hidden max-w-4xl mx-auto">
            <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 shrink-0">
                <button
                    onClick={onGoBack}
                    className="p-1 sm:p-2 -ml-1 sm:-ml-2 rounded-full hover:bg-slate-100 dark:bg-slate-800 hover:text-slate-700 text-slate-500 transition-colors"
                >
                    <ArrowLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-french-blue to-french-red bg-clip-text text-transparent leading-tight">
                        TCF Sentence Builder
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Master phrasing for expression orale</p>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-4 mb-4 sm:mb-6 shrink-0">
                <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as SentenceCategory)}
                    className="col-span-2 sm:col-span-1 flex-1 p-2 sm:p-3 bg-white dark:bg-slate-800 border items-center border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-french-blue text-sm dark:text-slate-200"
                >
                    <option value="describe_self">Describe Yourself</option>
                    <option value="ask_question">Ask a Question</option>
                    <option value="express_opinion">Express an Opinion</option>
                </select>
                <select
                    value={length}
                    onChange={(e) => setLength(e.target.value as SentenceLength)}
                    className="flex-1 p-2 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-french-blue text-sm dark:text-slate-200"
                >
                    <option value="short">Short Sentences</option>
                    <option value="medium">Medium Sentences</option>
                    <option value="long">Long Sentences</option>
                </select>
                <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as SentenceDifficulty)}
                    className="flex-1 p-2 sm:p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-french-blue text-sm dark:text-slate-200"
                >
                    <option value="easy">Easy (A1/A2)</option>
                    <option value="medium">Medium (B1)</option>
                    <option value="hard">Hard (B2/C1)</option>
                </select>
                <button
                    onClick={handleGeneratePrompts}
                    disabled={loadingPrompts}
                    className="col-span-2 sm:col-span-1 px-4 sm:px-6 py-2 sm:py-3 bg-french-blue hover:bg-blue-700 text-white font-medium rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                    {loadingPrompts ? 'Generating...' : prompts.length === 0 ? 'Start Practice' : 'New Batch'}
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 sm:pr-2 pb-4 sm:pb-8 space-y-4 sm:space-y-6">
                {prompts.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6 flex flex-col min-h-0">
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                            <h3 className="text-base sm:text-lg font-semibold text-slate-800 dark:text-white">
                                Prompt {currentPromptIndex + 1} of {prompts.length}
                            </h3>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl mb-6 border border-slate-100 dark:border-slate-800">
                            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium mb-1 uppercase tracking-wider">Translate to French:</p>
                            <p className="text-xl text-slate-900 dark:text-slate-100 font-medium">
                                "{prompts[currentPromptIndex].english_prompt}"
                            </p>
                            {prompts[currentPromptIndex].targeted_concept && !evaluation && (
                                <div className="mt-4 flex items-start gap-2 bg-french-blue/10 dark:bg-french-blue/20 p-3 rounded-lg border border-french-blue/20 dark:border-french-blue/30">
                                    <SparklesIcon className="w-5 h-5 text-french-blue shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-medium text-french-blue dark:text-blue-300">Personalized Challenge</p>
                                        <p className="text-sm text-french-blue/80 dark:text-blue-200/80">This prompt tests a concept you've struggled with previously: <span className="font-semibold">{prompts[currentPromptIndex].targeted_concept}</span>.</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mb-4 sm:mb-6 flex-1">
                            <textarea
                                value={userTranslation}
                                onChange={(e) => setUserTranslation(e.target.value)}
                                placeholder="Type your French translation here..."
                                disabled={evaluating || evaluation !== null}
                                className="w-full h-24 sm:h-32 p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl resize-none outline-none focus:border-french-blue text-slate-800 dark:text-slate-200 disabled:opacity-75 disabled:cursor-not-allowed text-base sm:text-lg"
                            />
                        </div>

                        {!evaluation ? (
                            <button
                                onClick={handleEvaluate}
                                disabled={evaluating || !userTranslation.trim()}
                                className="w-full py-3 sm:py-4 bg-french-red/90 hover:bg-french-red text-white font-medium rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {evaluating ? 'Evaluating...' : 'Check Translation'}
                            </button>
                        ) : (
                            <button
                                onClick={handleNext}
                                className="w-full py-3 sm:py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-xl transition-all shadow-sm active:scale-95"
                            >
                                {currentPromptIndex < prompts.length - 1 ? 'Next Prompt' : 'Generate More Prompts'}
                            </button>
                        )}
                    </div>
                )}

                {evaluation && (
                    <div className="space-y-4 sm:space-y-6 animate-fade-in">
                        <div className={`p-4 sm:p-6 rounded-2xl shadow-sm border ${evaluation.is_correct ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-rose-50 border-rose-200 dark:bg-rose-900/20 dark:border-rose-800'}`}>
                            <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                {evaluation.is_correct ? (
                                    <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400" />
                                ) : (
                                    <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400" />
                                )}
                                <h3 className={`font-semibold text-base sm:text-lg ${evaluation.is_correct ? 'text-emerald-800 dark:text-emerald-300' : 'text-rose-800 dark:text-rose-300'}`}>
                                    Score: {evaluation.score}/10
                                </h3>
                            </div>
                            <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300">{evaluation.feedback}</p>
                        </div>

                        {evaluation.mistakes && evaluation.mistakes.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                                <h4 className="font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                                    <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" /> Errors & Corrections
                                </h4>
                                <ul className="space-y-3 sm:space-y-4">
                                    {evaluation.mistakes.map((m, i) => (
                                        <li key={i} className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30">
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                                <span className="line-through text-rose-500 font-medium">{m.mistake}</span>
                                                <span className="hidden sm:inline text-slate-400">→</span>
                                                <span className="font-medium text-emerald-600 dark:text-emerald-400">{m.correction}</span>
                                            </div>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{m.explanation}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {evaluation.better_variations && evaluation.better_variations.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                                <h4 className="font-semibold text-slate-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                                    <LightBulbIcon className="w-4 h-4 sm:w-5 sm:h-5 text-french-blue" /> Better Ways to Say It
                                </h4>
                                <ul className="space-y-3">
                                    {evaluation.better_variations.map((v, i) => (
                                        <li key={i} className="flex flex-col flex-wrap sm:flex-row sm:items-start justify-between p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30 gap-3 sm:gap-4">
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800 dark:text-slate-200 mb-1">{v.variation}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 italic">{v.nuance}</p>
                                            </div>
                                            <button 
                                                onClick={() => playAudio(v.variation)}
                                                className="self-start sm:self-center shrink-0 flex items-center justify-center p-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-french-blue transition-colors text-french-blue shadow-sm"
                                                title="Listen"
                                            >
                                                <PlayCircleIcon className="w-6 h-6" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {evaluation.grammatical_concepts && evaluation.grammatical_concepts.length > 0 && (
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
                                <h4 className="font-semibold text-sm sm:text-base text-slate-800 dark:text-white mb-2 sm:mb-3">Concepts to Remember</h4>
                                <div className="flex flex-wrap gap-2">
                                    {evaluation.grammatical_concepts.map((c, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm border border-slate-200 dark:border-slate-600">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {prompts.length === 0 && !loadingPrompts && (
                    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-3xl mb-4 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                            <PlusIcon className="w-8 h-8 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">Ready to Practice?</h3>
                        <p className="text-slate-500 dark:text-slate-400 max-w-md">
                            Select your preferences above and click "Start Practice" to get a batch of sentences for TCF speaking prep.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
