import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import localforage from 'localforage';
import { DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, ArrowLeftIcon, TrashIcon, SpeakerWaveIcon } from '@heroicons/react/24/outline';
import { explainWordInContext, translateParagraphs, generateSpeech, pcmToAudioBuffer } from '../services/geminiService';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface SavedDocument {
    id: string;
    name: string;
    pages: string[][];
    timestamp: number;
    currentPage?: number;
}

interface ReaderInterfaceProps {
    onGoBack?: () => void;
}

export const ReaderInterface: React.FC<ReaderInterfaceProps> = ({ onGoBack }) => {
    const [view, setView] = useState<'list' | 'reader'>('list');
    const [documents, setDocuments] = useState<SavedDocument[]>([]);
    const [currentDocId, setCurrentDocId] = useState<string | null>(null);

    const [pages, setPages] = useState<string[][]>([]);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [pageTranslations, setPageTranslations] = useState<Record<number, string[]>>({});
    const [isTranslating, setIsTranslating] = useState(false);

    // Dictionary State
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [definitionLoading, setDefinitionLoading] = useState(false);
    const [definitionData, setDefinitionData] = useState<any>(null);
    
    // Audio State
    const [playingParagraphIdx, setPlayingParagraphIdx] = useState<number | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        loadSavedDocuments();
        return () => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            stopAudio();
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(console.error);
            }
        };
    }, []);

    const stopAudio = () => {
        if (audioSourceRef.current) {
            audioSourceRef.current.stop();
            audioSourceRef.current.disconnect();
            audioSourceRef.current = null;
        }
        setPlayingParagraphIdx(null);
    };

    const playLineAudio = async (text: string, pIdx: number) => {
        if (playingParagraphIdx === pIdx) {
            stopAudio();
            return;
        }
        
        stopAudio();
        setPlayingParagraphIdx(pIdx);

        try {
            const base64Audio = await generateSpeech(text);
            
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
            }

            const audioBuffer = pcmToAudioBuffer(base64Audio, audioContextRef.current, 24000);
            const source = audioContextRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current.destination);
            source.onended = () => {
                setPlayingParagraphIdx(prev => prev === pIdx ? null : prev);
            };
            audioSourceRef.current = source;
            source.start();
        } catch (error) {
            console.error("Failed to play audio:", error);
            setPlayingParagraphIdx(null);
            alert("Failed to generate audio for this line.");
        }
    };

    const loadSavedDocuments = async () => {
        const docs: SavedDocument[] = [];
        await localforage.iterate((value: SavedDocument, key: string) => {
            if (key.startsWith('doc_')) {
                docs.push(value);
            }
        });
        docs.sort((a, b) => b.timestamp - a.timestamp);
        setDocuments(docs);
    };

    const deleteDocument = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await localforage.removeItem(id);
        loadSavedDocuments();
    };

    const openDocument = (doc: SavedDocument) => {
        setPages(doc.pages);
        setFileName(doc.name);
        setCurrentPage(doc.currentPage || 0);
        setCurrentDocId(doc.id);
        setPageTranslations({});
        setSelectedWord(null);
        setDefinitionData(null);
        setView('reader');
    };

    // Save current page progress
    useEffect(() => {
        if (currentDocId && pages.length > 0) {
            localforage.getItem<SavedDocument>(currentDocId).then(doc => {
                if (doc) {
                    doc.currentPage = currentPage;
                    localforage.setItem(currentDocId, doc);
                }
            });
        }
    }, [currentPage, currentDocId, pages]);

    useEffect(() => {
        if (pages.length === 0) return;
        const fetchTranslation = async () => {
            if (pageTranslations[currentPage] || isTranslating) return;
            setIsTranslating(true);
            try {
                const translated = await translateParagraphs(pages[currentPage]);
                setPageTranslations(prev => ({ ...prev, [currentPage]: translated }));
            } catch (e) {
                console.error("Failed to translate page", e);
            } finally {
                setIsTranslating(false);
            }
        };
        fetchTranslation();
    }, [currentPage, pages]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setFileName(file.name);
        setPages([]);
        setCurrentPage(0);
        setPageTranslations({});
        setSelectedWord(null);
        setDefinitionData(null);

        try {
            let extractedPages: string[][] = [];
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    
                    let pageText = '';
                    let lastY: number | null = null;
                    for (const item of textContent.items as any[]) {
                        const fontSize = item.transform[0] || 12;
                        const currY = item.transform[5];
                        if (lastY !== null) {
                            const yDiff = Math.abs(lastY - currY);
                            if (yDiff > fontSize * 1.5) {
                                pageText += '\n\n';
                            } else if (yDiff > fontSize * 0.4) {
                                pageText += '\n';
                            }
                        }
                        pageText += item.str;
                        lastY = currY;
                    }
                    
                    const trimmed = pageText.trim();
                    if (trimmed.match(/[.!?»"']$/)) {
                        fullText += pageText + '\n\n';
                    } else {
                        fullText += pageText + '\n';
                    }
                }
                extractedPages = paginateText(fullText);
            } else {
                const text = await file.text();
                extractedPages = paginateText(text);
            }

            const newDoc: SavedDocument = {
                id: `doc_${Date.now()}`,
                name: file.name,
                pages: extractedPages,
                timestamp: Date.now(),
                currentPage: 0
            };

            await localforage.setItem(newDoc.id, newDoc);
            await loadSavedDocuments();
            openDocument(newDoc);
        } catch (error) {
            console.error("Failed to parse file", error);
            alert("Failed to read file.");
        } finally {
            setLoading(false);
        }
    };

    const paginateText = (text: string): string[][] => {
        const rawParagraphs = text.split(/\n\s*\n/).filter(Boolean);
        
        const paragraphs: string[] = [];
        for (const p of rawParagraphs) {
            const cleaned = p.replace(/-\n/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
            if (!cleaned) continue;
            
            if (cleaned.length > 1200) {
                // Fallback: split huge chunks into sentences to prevent massive UI blocks
                const sentences = cleaned.match(/(?:[^.!?]+[.!?]+|[^.!?]+$)/g) || [cleaned];
                let tempPara = '';
                for (const sentence of sentences) {
                    if (tempPara.length + sentence.length > 800 && tempPara.length > 0) {
                        paragraphs.push(tempPara.trim());
                        tempPara = sentence + ' ';
                    } else {
                        tempPara += sentence + ' ';
                    }
                }
                if (tempPara.trim()) paragraphs.push(tempPara.trim());
            } else {
                paragraphs.push(cleaned);
            }
        }

        const newPages: string[][] = [];
        let currentParagraphs: string[] = [];
        let currentLength = 0;

        for (const p of paragraphs) {
            if (currentLength + p.length > 2000 && currentParagraphs.length > 0) {
                newPages.push(currentParagraphs);
                currentParagraphs = [p];
                currentLength = p.length;
            } else {
                currentParagraphs.push(p);
                currentLength += p.length;
            }
        }
        if (currentParagraphs.length > 0) {
            newPages.push(currentParagraphs);
        }

        return newPages.length > 0 ? newPages : [["No text found."]];
    };

    const handleWordInteraction = async (word: string, fullPageText: string, indexOffset: number) => {
        const cleanWord = word.trim().replace(/[.,;:?!'”"«»()]+/, '');
        if (!cleanWord || cleanWord.length < 2) return;

        setSelectedWord(cleanWord);
        setDefinitionLoading(true);
        setDefinitionData(null);

        // Get context: ~100 chars before and after
        const start = Math.max(0, indexOffset - 100);
        const end = Math.min(fullPageText.length, indexOffset + 100);
        const contextObj = fullPageText.substring(start, end);

        try {
            const def = await explainWordInContext(cleanWord, contextObj);
            setDefinitionData(def);
        } catch (e) {
            console.error("Error explaining word", e);
            setDefinitionData({ error: 'Failed to look up word.' });
        } finally {
            setDefinitionLoading(false);
        }
    };

    const closeDictionary = () => {
        setSelectedWord(null);
        setDefinitionData(null);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 animate-fade-in-up">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-french-blue mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400">Loading document...</p>
            </div>
        );
    }

    if (view === 'list') {
        return (
            <div className="flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto animate-fade-in-up">
                <DocumentTextIcon className="w-16 h-16 text-french-blue dark:text-blue-400 mb-6" />
                <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Immersion Reader</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-lg text-center">
                    Upload a French book, story, or article (PDF or TXT). Read with Kindle-like features like meaning on hover, dual translation, and grammatical explanation.
                </p>

                <div className="w-full flex-col items-center flex">
                    <label className="cursor-pointer inline-flex items-center px-6 py-3 bg-french-blue text-white font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm mb-12">
                        <span>Upload New Document</span>
                        <input type="file" className="hidden" accept=".pdf,.txt,text/plain,application/pdf" onChange={handleFileUpload} />
                    </label>

                    {documents.length > 0 && (
                        <div className="w-full text-left">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Your Library</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {documents.map(doc => (
                                    <div 
                                        key={doc.id} 
                                        onClick={() => openDocument(doc)}
                                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-col cursor-pointer hover:shadow-md transition-shadow group relative"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <DocumentTextIcon className="w-8 h-8 text-french-blue/60 dark:text-blue-400/60" />
                                            <button 
                                                onClick={(e) => deleteDocument(doc.id, e)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all rounded-md hover:bg-red-50 dark:hover:bg-red-900/30"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-2" title={doc.name}>
                                            {doc.name}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-auto pt-2">
                                            {new Date(doc.timestamp).toLocaleDateString()} • {Math.round(((doc.currentPage || 0) / Math.max(1, doc.pages.length - 1)) * 100)}% read
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const pageText = pages[currentPage];

    return (
        <div className="flex flex-col max-w-7xl mx-auto h-[85vh] lg:h-[80vh] bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up relative">
            
            {/* Reading Area */}
            <div className="flex-1 flex flex-col h-full">
                
                {/* Header */}
                <div className="flex items-center justify-between p-3 md:p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center space-x-3 overflow-hidden pr-4">
                        <button 
                            onClick={() => { setView('list'); setPages([]); }}
                            className="p-1.5 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0"
                            title="Back to library"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                        </button>
                        <h3 className="font-medium text-slate-700 dark:text-slate-300 truncate" title={fileName || ''}>{fileName}</h3>
                    </div>
                    <div className="flex items-center space-x-2 md:space-x-4 shrink-0">
                        <button 
                            disabled={currentPage === 0} 
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                        >
                            <ChevronLeftIcon className="w-6 h-6 md:w-5 md:h-5" />
                        </button>
                        <span className="text-sm font-medium text-slate-500 tabular-nums">
                            {currentPage + 1} / {pages.length}
                        </span>
                        <button 
                            disabled={currentPage === pages.length - 1} 
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
                        >
                            <ChevronRightIcon className="w-6 h-6 md:w-5 md:h-5" />
                        </button>
                    </div>
                </div>

                {/* Text Content */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 pb-32">
                    <div className="max-w-5xl mx-auto">
                        {pages[currentPage]?.map((paragraph, pIdx) => {
                            const englishPara = pageTranslations[currentPage]?.[pIdx] || '';
                            const isLoadingTranslation = isTranslating && !pageTranslations[currentPage];
                            const parts = paragraph.split(/([^a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]+)/);
                            let offsetCounter = 0;

                            return (
                                <div key={pIdx} className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-8 items-start mb-10 pb-10 border-b border-slate-100 dark:border-slate-800/50 last:border-0 last:pb-0 relative group">
                                    {/* French Side */}
                                    <div className="font-serif text-[1.1rem] md:text-xl leading-relaxed md:leading-loose text-slate-800 dark:text-slate-100 relative pl-10 md:pl-12">
                                        <button 
                                            onClick={() => playLineAudio(paragraph, pIdx)}
                                            className={`absolute left-0 top-1.5 md:top-2 p-1.5 md:p-2 rounded-full transition-all ${playingParagraphIdx === pIdx ? 'bg-french-blue text-white shadow-md animate-pulse' : 'text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-french-blue dark:hover:text-blue-400 opacity-50 group-hover:opacity-100'}`}
                                            title="Read aloud"
                                        >
                                            <SpeakerWaveIcon className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                        {parts.map((part, i) => {
                                            const currentOffset = offsetCounter;
                                            offsetCounter += part.length;

                                            if (/^[a-zA-ZàâäéèêëïîôöùûüÿçÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]+$/.test(part)) {
                                                return (
                                                    <span 
                                                        key={i} 
                                                        onClick={() => {
                                                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                            handleWordInteraction(part, paragraph, currentOffset);
                                                        }}
                                                        onMouseEnter={() => {
                                                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                            hoverTimeoutRef.current = setTimeout(() => {
                                                                if (selectedWord !== part.trim().replace(/[.,;:?!'”"«»()]+/, '')) {
                                                                    handleWordInteraction(part, paragraph, currentOffset);
                                                                }
                                                            }, 600); // 600ms hover delay
                                                        }}
                                                        onMouseLeave={() => {
                                                            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                        }}
                                                        className="cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-sm transition-colors decoration-slate-300 dark:decoration-slate-700 underline-offset-4"
                                                    >
                                                        {part}
                                                    </span>
                                                );
                                            }
                                            return <span key={i}>{part}</span>;
                                        })}
                                    </div>
                                    {/* English Side */}
                                    <div className="font-serif text-sm md:text-lg leading-relaxed md:leading-loose text-slate-500 dark:text-slate-400 lg:border-l border-slate-200 dark:border-slate-700 lg:pl-8 pt-2 lg:pt-0">
                                        {isLoadingTranslation ? (
                                            <div className="animate-pulse space-y-3 mt-2">
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                                                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
                                            </div>
                                        ) : (
                                            englishPara
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Dictionary / Vocabulary Panel (Floating/Fixed on Mobile, Sidebar on Desktop) */}
            {selectedWord && (
                <>
                    {/* Backdrop for mobile */}
                    <div 
                        className="fixed inset-0 bg-slate-900/20 dark:bg-slate-900/60 z-20 xl:hidden backdrop-blur-sm animate-fade-in"
                        onClick={closeDictionary}
                    />

                    <div className="absolute xl:relative bottom-0 left-0 right-0 xl:right-auto xl:bottom-auto w-full xl:w-96 min-h-[50vh] xl:min-h-full xl:border-l border-t xl:border-t-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl xl:shadow-none p-6 flex flex-col shrink-0 z-30 transform transition-transform xl:translate-y-0 rounded-t-3xl xl:rounded-none animate-slide-up xl:animate-none">
                        <div className="flex items-center justify-between mb-4 xl:mb-6">
                            <h4 className="text-sm font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">Contextual Dictionary</h4>
                            <button onClick={closeDictionary} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-2 rounded-full xl:bg-transparent xl:p-0">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 pb-8">
                            <h2 className="text-3xl font-serif font-bold text-french-blue dark:text-blue-400 mb-2">
                                {definitionData?.word || selectedWord}
                            </h2>

                            {definitionLoading ? (
                                <div className="flex items-center justify-center py-10">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-french-blue"></div>
                                </div>
                            ) : definitionData ? (
                                definitionData.error ? (
                                    <p className="text-red-500 text-sm">{definitionData.error}</p>
                                ) : (
                                    <div className="space-y-4 xl:space-y-5 mt-4">
                                        <div>
                                            <span className="inline-block px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-md mb-3">
                                                {definitionData.partOfSpeech}
                                            </span>
                                            <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium text-lg">
                                                <strong>Meaning here:</strong> {definitionData.contextualMeaning}
                                            </p>
                                        </div>
                                        
                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Literal Translation:</p>
                                            <p className="text-slate-800 dark:text-slate-200 font-medium">{definitionData.literalTranslation}</p>
                                        </div>

                                        {definitionData.grammarNotes && (
                                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Grammar Note:</p>
                                                <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm leading-relaxed">
                                                    {definitionData.grammarNotes}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            ) : null}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
