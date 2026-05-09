import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from "@google/genai";
import { pcmToAudioBuffer } from '../services/geminiService';
import { MicrophoneIcon, PlayIcon, StopIcon } from '@heroicons/react/24/outline';

interface ConversationInterfaceProps {
  onGoBack: () => void;
}

const PRESETS = [
    { id: 'casual', title: 'Casual Chat', prompt: 'You are a warm, encouraging French language tutor. Engage in a natural, casual conversation completely in French. Ask simple questions about my day, hobbies, or interests. Keep your responses short (1-2 sentences) so I have time to speak. Gently correct any major errors but prioritize keeping the conversation flowing smoothly.' },
    { id: 'bakery', title: 'At the Bakery', prompt: 'Act as a friendly French baker working at a traditional boulangerie in Paris. I am a customer trying to buy bread and pastries. Start by saying "Bonjour, qu\'est-ce qu\'il vous faudra ?" and guide me through the transaction in French. Keep responses short and authentic.' },
    { id: 'hotel', title: 'Hotel Check-in', prompt: 'Act as a receptionist at a boutique hotel in France. I am a guest arriving to check in. Ask for my name, reservation details, and if I need help with my bags. Keep responses brief and realistic.' }
];

export const ConversationInterface: React.FC<ConversationInterfaceProps> = ({ onGoBack }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);
    const [activePreset, setActivePreset] = useState(PRESETS[0]);
    const [speakingPace, setSpeakingPace] = useState<'slow' | 'normal' | 'fast'>('normal');
    
    const [error, setError] = useState<string | null>(null);
    const [transcript, setTranscript] = useState<{role: 'user' | 'model', text: string}[]>([]);
    const [latestFeedback, setLatestFeedback] = useState<{ correction?: string, better_ways?: string[], points_awarded?: number, next_suggested_english_response?: string } | null>(null);
    const [totalScore, setTotalScore] = useState<number>(0);

    const transcriptEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll transcript when it updates
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [transcript]);

    const aiRef = useRef<any>(null);
    const sessionRef = useRef<any>(null);
    
    const audioCtxRef = useRef<AudioContext | null>(null); // For playback (24kHz)
    const micCtxRef = useRef<AudioContext | null>(null); // For recording (16kHz)
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const nextStartTimeRef = useRef<number>(0);
    const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    useEffect(() => {
        // Initialize GenAI
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
           aiRef.current = new GoogleGenAI({ apiKey });
        }
        
        return () => {
            stopConversation();
        }
    }, []);

    const stopPlayback = () => {
        activeSourcesRef.current.forEach(source => {
            try { source.stop(); } catch(e) {}
            source.disconnect();
        });
        activeSourcesRef.current = [];
        if (audioCtxRef.current) {
             nextStartTimeRef.current = audioCtxRef.current.currentTime;
        }
    };

    const playAudioChunk = (base64: string) => {
        if (!audioCtxRef.current) return;
        try {
            const audioBuffer = pcmToAudioBuffer(base64, audioCtxRef.current, 24000);
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtxRef.current.destination);
            
            const currentTime = audioCtxRef.current.currentTime;
            if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
            }
            
            source.start(nextStartTimeRef.current);
            nextStartTimeRef.current += audioBuffer.duration;
            
            activeSourcesRef.current.push(source);
            source.onended = () => {
                activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
            };
        } catch (err) {
            console.error("Failed to play audio chunk", err);
        }
    };

    const getPaceInstruction = () => {
        switch(speakingPace) {
            case 'slow':
                return "\n\nCRITICAL INSTRUCTION FOR AUDIO PACING: You MUST speak EXTREMELY SLOWLY and clearly. Enunciate every single syllable. Leave slight pauses between sentences. This is for a complete beginner who needs extra time to process the spoken language.";
            case 'fast':
                return "\n\nCRITICAL INSTRUCTION FOR AUDIO PACING: Speak at a fast, entirely natural, native French speed. Do not slow down your pacing at all.";
            default:
                return "\n\nCRITICAL INSTRUCTION FOR AUDIO PACING: Speak at a moderate, clear, conversational pace.";
        }
    };

    const startConversation = async () => {
        if (!aiRef.current) {
            setError("API key not configured.");
            return;
        }

        setIsConnecting(true);
        setError(null);
        setTranscript([]);
        setLatestFeedback(null);
        setTotalScore(0);

        try {
            // Setup Microphone (16kHz for Gemini input)
            const stream = await navigator.mediaDevices.getUserMedia({ audio: {
                channelCount: 1,
                sampleRate: 16000
            } });
            mediaStreamRef.current = stream;
            
            const micCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            micCtxRef.current = micCtx;
            
            const source = micCtx.createMediaStreamSource(stream);
            const processor = micCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            source.connect(processor);
            
            // Connect to a GainNode with gain 0 so it doesn't feedback through speakers
            const gainNode = micCtx.createGain();
            gainNode.gain.value = 0;
            processor.connect(gainNode);
            gainNode.connect(micCtx.destination);

            // Setup Playback Context (24kHz)
            audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            nextStartTimeRef.current = audioCtxRef.current.currentTime;

            const sessionPromise = aiRef.current.live.connect({
                model: "gemini-3.1-flash-live-preview",
                config: {
                    responseModalities: ["AUDIO"],
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } // Charon / Zephyr / Puck
                    },
                    systemInstruction: activePreset.prompt + getPaceInstruction() + "\n\nCRITICAL INSTRUCTION: During the conversation, YOU MUST secretly call the 'report_feedback' tool ON EVERY TURN to evaluate what the user just said, award them points from 0 to 10 for their French accuracy, and suggest an English sentence they should try to translate into French for their NEXT turn. DO NOT speak the literal feedback, points, or the English suggestion out loud. Only speak your natural response to what they said, but USE THE TOOL concurrently.",
                    // Enable transcriptions
                    outputAudioTranscription: {}, 
                    inputAudioTranscription: {}, 
                    tools: [
                        {
                            functionDeclarations: [
                                {
                                    name: "report_feedback",
                                    description: "Use this tool on every turn to secretly provide helpful feedback, award points, and give a suggested next response in English.",
                                    parameters: {
                                        type: Type.OBJECT,
                                        properties: {
                                            correction: { type: Type.STRING, description: "A grammatical correction of what the user just said, if they made a mistake (otherwise empty)." },
                                            better_ways: { type: Type.ARRAY, items: { type: Type.STRING }, description: "1 to 3 more natural, native-sounding ways to say what they just said." },
                                            points_awarded: { type: Type.INTEGER, description: "Award 0 to 10 points based on the fluency and accuracy of what the user just said. 10 for perfect/native-like, 5 for understandable but flawed, 0 for incomprehensible." },
                                            next_suggested_english_response: { type: Type.STRING, description: "A suggestion in English of what the user could say next to keep the conversation going. They will try to translate this into French." }
                                        },
                                        required: ["better_ways", "points_awarded", "next_suggested_english_response"]
                                    }
                                }
                            ]
                        }
                    ]
                },
                callbacks: {
                    onopen: () => {
                        console.log("Live API connected!");
                        setIsConnected(true);
                        setIsConnecting(false);
                    },
                    onmessage: (message: any) => {
                        // Handle Interruption
                        if (message.serverContent?.interrupted) {
                            stopPlayback();
                        }
                        
                        // Handle Tool Call
                        if (message.toolCall) {
                            const functionCalls = message.toolCall.functionCalls;
                            if (functionCalls && functionCalls.length > 0) {
                                const toolResponses: any[] = [];
                                for (const call of functionCalls) {
                                    if (call.name === "report_feedback") {
                                
                                        setLatestFeedback(call.args);
                                        if (call.args.points_awarded !== undefined && typeof call.args.points_awarded === 'number') {
                                            setTotalScore(prev => prev + call.args.points_awarded);
                                        }
                                        
                                        toolResponses.push({
                                            id: call.id,
                                            name: call.name,
                                            response: { status: "success" }
                                        });
                                    }
                                }
                                if (toolResponses.length > 0 && sessionRef.current) {
                                    sessionRef.current.then((s: any) => {
                                        s.sendToolResponse({ functionResponses: toolResponses });
                                    });
                                }
                            }
                        }
                        
                        // Handle Audio Output
                        const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                        if (base64Audio) {
                            playAudioChunk(base64Audio);
                        }

                        // Handle Transcriptions
                        const inputTranscription = message.serverContent?.inputTranscription;
                        if (inputTranscription && inputTranscription.text) {
                            setTranscript(prev => {
                                const newTranscript = [...prev];
                                if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].role === 'user') {
                                    newTranscript[newTranscript.length - 1].text += " " + inputTranscription.text;
                                } else {
                                    newTranscript.push({ role: 'user', text: inputTranscription.text });
                                }
                                return newTranscript;
                            });
                        }

                        // Handle Output Transcription (Model's words)
                        // It can come from outputTranscription OR we fall back to text parts.
                        const outputTranscription = message.serverContent?.outputTranscription;
                        if (outputTranscription && outputTranscription.text) {
                            setTranscript(prev => {
                                const newTranscript = [...prev];
                                if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].role === 'model') {
                                    newTranscript[newTranscript.length - 1].text += " " + outputTranscription.text;
                                } else {
                                    newTranscript.push({ role: 'model', text: outputTranscription.text });
                                }
                                return newTranscript;
                            });
                        } else {
                            const parts = message.serverContent?.modelTurn?.parts;
                            if (parts) {
                                const textPart = parts.find((p: any) => p.text);
                                if (textPart && textPart.text.trim().length > 0) {
                                    setTranscript(prev => {
                                        const newTranscript = [...prev];
                                        if (newTranscript.length > 0 && newTranscript[newTranscript.length - 1].role === 'model') {
                                            newTranscript[newTranscript.length - 1].text += " " + textPart.text;
                                        } else {
                                            newTranscript.push({ role: 'model', text: textPart.text });
                                        }
                                        return newTranscript;
                                    });
                                }
                            }
                        }
                    },
                    onerror: (err: any) => {
                        console.error("Live API Error:", err);
                        setError(err.message || "An error occurred with Live API");
                        stopConversation();
                    },
                    onclose: () => {
                        console.log("Live API connection closed");
                        stopConversation();
                    }
                }
            });

            sessionRef.current = sessionPromise;

            // Send audio chunks to Gemini
            processor.onaudioprocess = (e) => {
                if (!sessionRef.current) return;
                
                const inputData = e.inputBuffer.getChannelData(0);
                const pcm16 = new Int16Array(inputData.length);
                for(let i=0; i<inputData.length; i++) {
                   pcm16[i] = Math.max(-1, Math.min(1, inputData[i])) * 32767;
                }
                
                const buffer = new Uint8Array(pcm16.buffer);
                let binary = '';
                for (let i = 0; i < buffer.byteLength; i += 1024) {
                    binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(i, i + 1024)));
                }
                // Convert remainder
                const remainder = buffer.length % 1024;
                if (remainder > 0) {
                   binary += String.fromCharCode.apply(null, Array.from(buffer.subarray(buffer.length - remainder)));
                }

                const base64 = btoa(binary);

                sessionPromise.then((s: any) => {
                   try {
                     s.sendRealtimeInput({
                         audio: { data: base64, mimeType: 'audio/pcm;rate=16000' }
                     });
                   } catch(e) {
                     // Might fail if socket disconnected before we clean up
                   }
                });
            };

        } catch (err: any) {
            console.error("Mic setup failed:", err);
            setError(err.message || "Could not access microphone.");
            setIsConnecting(false);
            stopConversation();
        }
    };

    const stopConversation = () => {
        setIsConnected(false);
        setIsConnecting(false);
        
        stopPlayback();
        
        if (scriptProcessorRef.current && micCtxRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (micCtxRef.current) {
            try { micCtxRef.current.close(); } catch(e){}
            micCtxRef.current = null;
        }
        
        if (audioCtxRef.current) {
            try { audioCtxRef.current.close(); } catch(e){}
            audioCtxRef.current = null;
            nextStartTimeRef.current = 0;
        }

        if (sessionRef.current) {
            sessionRef.current.then((s: any) => {
                try { s.close(); } catch(e){}
            });
            sessionRef.current = null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                   <h1 className="text-3xl font-bold font-serif text-french-blue dark:text-blue-400">🗣️ Conversation Practice</h1>
                   <p className="text-slate-600 dark:text-slate-300 mt-2">Real-time spoken French practice.</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 p-4 rounded-xl mb-6">
                    {error}
                </div>
            )}

            {!isConnected && !isConnecting && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {PRESETS.map(preset => (
                        <div 
                           key={preset.id}
                           onClick={() => setActivePreset(preset)}
                           className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${
                               activePreset.id === preset.id 
                               ? 'border-french-blue bg-blue-50 dark:bg-blue-900/20' 
                               : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-slate-900'
                           }`}
                        >
                            <h3 className="text-xl font-bold mb-2 dark:text-white">{preset.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
                                {preset.prompt}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-8 text-center overflow-hidden relative">
                
                {/* Background Animation when connected */}
                {isConnected && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-10">
                        <div className="w-[400px] h-[400px] bg-french-blue rounded-full mix-blend-multiply filter blur-3xl animate-[pulse_3s_ease-in-out_infinite]"></div>
                        <div className="w-[400px] h-[400px] bg-french-red rounded-full mix-blend-multiply filter blur-3xl animate-[pulse_4s_ease-in-out_infinite] ml-[-100px]"></div>
                    </div>
                )}

                <div className="relative z-10">
                    <div className="mb-8">
                       <div className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center border-4 transition-colors duration-500 ${
                           isConnected 
                           ? 'bg-blue-100 dark:bg-blue-900/50 border-french-blue animate-pulse' 
                           : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                       }`}>
                           <MicrophoneIcon className={`w-16 h-16 ${isConnected ? 'text-french-blue dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                       </div>
                    </div>

                    <h2 className="text-2xl font-bold mb-2 dark:text-white">
                        {isConnecting ? "Connecting..." : isConnected ? `Speaking: ${activePreset.title}` : "Ready to Practice"}
                    </h2>
                    
                    {isConnected && (
                        <div className="mb-4 inline-flex items-center justify-center bg-yellow-100 dark:bg-yellow-900/40 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-800 dark:text-yellow-300 px-6 py-2 rounded-full font-bold text-lg shadow-sm transition-all hover:scale-105">
                            <span className="mr-2">⭐</span> Score: {totalScore}
                            {latestFeedback && latestFeedback.points_awarded !== undefined && (
                                <span className={`ml-2 text-sm font-medium ${latestFeedback.points_awarded > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-500'} animate-fade-in-up`}>
                                    (+{latestFeedback.points_awarded})
                                </span>
                            )}
                        </div>
                    )}

                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg mx-auto">
                        {isConnected 
                          ? "The tutor is listening. Speak clearly into your microphone in French." 
                          : "Select a scenario above and click Start to begin a real-time voice conversation."}
                    </p>

                    {/* Speed Control */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                            Tutor Speaking Speed
                        </label>
                        <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 shadow-inner">
                            {(['slow', 'normal', 'fast'] as const).map(pace => (
                                <button
                                    key={pace}
                                    onClick={() => setSpeakingPace(pace)}
                                    className={`px-6 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                                        speakingPace === pace 
                                        ? 'bg-white dark:bg-slate-700 text-french-blue dark:text-blue-400 shadow-sm' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                    disabled={isConnected || isConnecting}
                                >
                                    {pace}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                        {!isConnected && !isConnecting ? (
                            <button
                                onClick={startConversation}
                                className="flex items-center px-8 py-3 bg-french-blue text-white rounded-xl hover:bg-blue-700 transition-colors font-semibold"
                            >
                                <PlayIcon className="w-5 h-5 mr-2" />
                                Start Conversation
                            </button>
                        ) : (
                            <button
                                onClick={stopConversation}
                                className="flex items-center px-8 py-3 bg-french-red text-white rounded-xl hover:bg-red-700 transition-colors font-semibold shadow-[0_0_20px_rgba(239,65,53,0.3)]"
                            >
                                <StopIcon className="w-5 h-5 mr-2" />
                                End Conversation
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Transcript (if any parts received) */}
            {transcript.length > 0 && (
                <div className="mt-8 bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
                    <h3 className="text-lg font-bold mb-4 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-2">Conversation Log</h3>
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                        {transcript.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl ${
                                    msg.role === 'user' 
                                    ? 'bg-french-blue text-white rounded-br-sm' 
                                    : 'bg-slate-100 dark:bg-slate-800 dark:text-slate-200 rounded-bl-sm'
                                }`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        ))}
                        <div ref={transcriptEndRef} />
                    </div>
                </div>
            )}

            {/* Live Feedback */}
            {latestFeedback && (
                <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 animate-fade-in">
                    <h3 className="text-xl font-bold mb-4 text-french-blue dark:text-blue-400 flex items-center">
                        <span className="mr-2">💡</span> Tutor Feedback
                    </h3>
                    
                    <div className="space-y-4">
                        {latestFeedback.correction && (
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Correction:</h4>
                                <p className="text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mt-1">
                                    {latestFeedback.correction}
                                </p>
                            </div>
                        )}
                        
                        {latestFeedback.better_ways && latestFeedback.better_ways.length > 0 && (
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300">More natural ways to say it:</h4>
                                <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-600 dark:text-slate-400">
                                    {latestFeedback.better_ways.map((way: string, idx: number) => (
                                        <li key={idx} className="bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-700 mb-1 list-none">
                                            {way}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {latestFeedback.next_suggested_english_response && (
                            <div>
                                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Try saying this next:</h4>
                                <p className="text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800 mt-1">
                                    "{latestFeedback.next_suggested_english_response}"
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
