
import React, { useState, useRef, useEffect } from 'react';
import { StoryData } from '../types';
import { InteractiveText } from './InteractiveText';
import { ArrowLeftIcon, PlayCircleIcon, PauseCircleIcon, SpeakerWaveIcon } from '@heroicons/react/24/solid';
import { generateSpeech, pcmToAudioBuffer } from '../services/geminiService';

interface StoryInterfaceProps {
  story: StoryData;
  onBack: () => void;
}

export const StoryInterface: React.FC<StoryInterfaceProps> = ({ story, onBack }) => {
  const paragraphs = story.content.split('\n').filter(p => p.trim() !== '');
  
  // Audio State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Refs for AudioContext management
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  // Cleanup audio object on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const toggleAudio = async () => {
    // 1. PAUSE: If running, suspend context
    if (isPlaying && audioContextRef.current?.state === 'running') {
      await audioContextRef.current.suspend();
      setIsPlaying(false);
      return;
    }

    // 2. RESUME: If suspended, resume context
    if (!isPlaying && audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
      setIsPlaying(true);
      return;
    }

    // 3. START/RESTART: If no context or ended, fetch/create and play
    setIsLoadingAudio(true);
    try {
      let buffer = bufferRef.current;
      
      // If we haven't fetched audio yet, do it now
      if (!buffer) {
        const base64 = await generateSpeech(story.content);
        
        // Initialize AudioContext (24kHz is Gemini's native rate)
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
             audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        
        buffer = pcmToAudioBuffer(base64, audioContextRef.current);
        bufferRef.current = buffer;
      }
      
      // Re-check context (it might be closed if we re-play after finish)
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        // We let the context stay open or we could close it. 
        // Keeping it open allows for simpler "replay" logic if we implemented a seek bar.
      };
      
      source.start();
      audioSourceRef.current = source;
      setIsPlaying(true);

    } catch (error) {
      console.error("Failed to generate/play audio", error);
      alert("Could not play audio. Please try again.");
    } finally {
      setIsLoadingAudio(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-visible animate-fade-in relative z-10 transition-colors">
       {/* Header */}
       <div className="bg-french-blue dark:bg-slate-800 text-white p-8 relative rounded-t-2xl transition-colors">
           <div className="flex justify-between items-start">
               <button 
                 onClick={onBack}
                 className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
               >
                  <ArrowLeftIcon className="w-5 h-5 text-white" />
               </button>

               <button
                  onClick={toggleAudio}
                  disabled={isLoadingAudio}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold transition-all shadow-lg ${
                      isLoadingAudio 
                        ? 'bg-white/20 cursor-wait opacity-80' 
                        : 'bg-white text-french-blue hover:bg-blue-50'
                  }`}
               >
                  {isLoadingAudio ? (
                    <>
                       <div className="w-5 h-5 border-2 border-french-blue border-t-transparent rounded-full animate-spin"></div>
                       <span>Loading Audio...</span>
                    </>
                  ) : isPlaying ? (
                    <>
                       <PauseCircleIcon className="w-6 h-6" />
                       <span>Pause Story</span>
                    </>
                  ) : (
                    <>
                       <PlayCircleIcon className="w-6 h-6" />
                       <span>Listen to Story</span>
                    </>
                  )}
               </button>
           </div>
           
           <div className="text-center mt-4">
               <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider mb-3 uppercase">
                  {story.cefr_level} • {story.sub_difficulty}
               </span>
               <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">{story.title}</h1>
               <p className="opacity-80 text-lg font-medium">{story.topic}</p>
           </div>
       </div>

       {/* Content */}
       <div className="p-8 md:p-12 space-y-8">
           <div className="flex items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500 italic border-b border-slate-100 dark:border-slate-800 pb-4">
               <SpeakerWaveIcon className="w-4 h-4" />
               <span>Click a word to hear pronunciation. Hover for meaning.</span>
           </div>
           
           {paragraphs.map((para, idx) => (
               <p key={idx} className="text-xl md:text-2xl leading-loose text-slate-800 dark:text-slate-200 font-serif text-justify">
                   <InteractiveText text={para} glossary={story.glossary} level={story.cefr_level} className="inline" />
               </p>
           ))}
       </div>
    </div>
  )
}
