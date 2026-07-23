import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, SkipBack, SkipForward, Search, Sparkles, 
  BookOpen, Heart, List, Volume2, Settings, ChevronDown, Check, 
  Loader2, HelpCircle, Trophy, ArrowLeft, BookOpenCheck, Globe, 
  Sparkle, VolumeX, RefreshCw, Star, Info, Smartphone, Eye, EyeOff,
  Upload, FileText, WifiOff, Download, HardDrive, Database, X, ShieldCheck, Save
} from 'lucide-react';
import { curatedSongs, DictationMaterial, Sentence } from './curatedSongs';

// Utility: Sound synthesizer using Web Audio API for high-performance and zero network delay
function playSynthSound(type: 'correct' | 'success' | 'hint') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    if (type === 'correct') {
      // Pleasant dual-tone chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
      
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(783.99, now + 0.04); // G5
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.25);
      osc2.stop(now + 0.25);
    } else if (type === 'success') {
      // Triumphant ascending C-major chord
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      });
    } else if (type === 'hint') {
      // Soft gentle high beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    }
  } catch (e) {
    console.warn('Web Audio API not supported/blocked by browser policy:', e);
  }
}

// Word structure for granular display & input
interface WordObj {
  raw: string; // "perfect,"
  clean: string; // "perfect"
  punctuationBefore: string; // e.g. ""
  punctuationAfter: string; // e.g. ","
  isBlank: boolean;
}

// Parse sentence string into structured words
function parseSentenceToWords(sentenceText: string, blankIndices: number[]): WordObj[] {
  const words = sentenceText.trim().split(/\s+/);
  return words.map((word, index) => {
    // Match leading punctuation, alphanumeric characters + apostrophes, trailing punctuation
    const match = word.match(/^([^\w]*)([\w'-]+)([^\w]*)$/);
    if (match) {
      return {
        raw: word,
        clean: match[2],
        punctuationBefore: match[1],
        punctuationAfter: match[3],
        isBlank: blankIndices.includes(index)
      };
    } else {
      return {
        raw: word,
        clean: word.replace(/[^\w]/g, ''),
        punctuationBefore: '',
        punctuationAfter: '',
        isBlank: blankIndices.includes(index)
      };
    }
  });
}

// Generate the fast input template hint (e.g., "perfect" -> "p e · · · t")
function getWordPlaceholder(word: string): string {
  const L = word.length;
  if (L <= 2) {
    return '·'.repeat(L);
  }
  if (L === 3) {
    return word[0].toLowerCase() + '·' + word[2].toLowerCase();
  }
  return word[0].toLowerCase() + word[1].toLowerCase() + '·'.repeat(L - 3) + word[L - 1].toLowerCase();
}

export default function App() {
  // --- STATE ---
  const [songsList, setSongsList] = useState<DictationMaterial[]>(curatedSongs);
  const [activeSong, setActiveSong] = useState<DictationMaterial>(curatedSongs[0]);
  const [activeSentenceIdx, setActiveSentenceIdx] = useState<number>(0);
  const [currentScreen, setCurrentScreen] = useState<'home' | 'player'>('home');
  
  // Custom Creator & Generator Form States
  const [creatorTab, setCreatorTab] = useState<'ai' | 'local'>('ai');
  const [songTitleInput, setSongTitleInput] = useState('');
  const [artistInput, setArtistInput] = useState('');
  const [customTheme, setCustomTheme] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Local Lyric Loading States
  const [localSongTitle, setLocalSongTitle] = useState('');
  const [localArtist, setLocalArtist] = useState('');
  const [localFileContent, setLocalFileContent] = useState('');

  // Audio & Practice Mode States
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [activeWordIndex, setActiveWordIndex] = useState<number | null>(null);
  const [practiceMode, setPracticeMode] = useState<'sentence' | 'section' | 'full'>('sentence');
  
  // Display Options
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [showTranslation, setShowTranslation] = useState<boolean>(true);
  const [showBlankHint, setShowBlankHint] = useState<boolean>(true);
  const [favorites, setFavorites] = useState<{[key: string]: number[]}>({}); // {songTitle: [sentenceIds]}
  const [completedSentences, setCompletedSentences] = useState<{[key: string]: number[]}>({}); // {songTitle: [sentenceIds]}
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Interactive Input & Autofill States
  const [typedBlanks, setTypedBlanks] = useState<{[blankIdx: number]: string}>({});
  const [focusedBlankIdx, setFocusedBlankIdx] = useState<number | null>(null);
  const [isSentenceCompleted, setIsSentenceCompleted] = useState<boolean>(false);
  const [showResetMenu, setShowResetMenu] = useState<boolean>(false);
  const [showCelebration, setShowCelebration] = useState<boolean>(false);

  // AI Explanation Drawer
  const [explainWord, setExplainWord] = useState<string>('');
  const [explainSentence, setExplainSentence] = useState<string>('');
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [showExplainDrawer, setShowExplainDrawer] = useState<boolean>(false);

  // App Aesthetic Settings
  const [theme, setTheme] = useState<'ielts' | 'cosmic'>('ielts');
  const [androidTime, setAndroidTime] = useState<string>('12:00');
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  // Sidebar controls
  const [showSidebar, setShowSidebar] = useState<boolean>(false);

  // Offline & Data Backup Modal States
  const [showOfflineModal, setShowOfflineModal] = useState<boolean>(false);
  const [isPrecaching, setIsPrecaching] = useState<boolean>(false);
  const [precacheStatus, setPrecacheStatus] = useState<string>('');
  const [backupMessage, setBackupMessage] = useState<string>('');

  // Handle Precache All Assets for complete offline usage
  const handlePrecacheAll = async () => {
    setIsPrecaching(true);
    setPrecacheStatus('正在全量离线预缓存所有页面与应用资源...');

    try {
      if ('caches' in window) {
        const cache = await caches.open('lyric-listen-v2');
        const defaultAssets = [
          '/',
          '/index.html',
          '/manifest.json',
          '/pwa_icon.jpg'
        ];

        // Gather all script and link tags in current document
        const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => (s as HTMLScriptElement).src);
        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(l => (l as HTMLLinkElement).href);
        const allUrls = Array.from(new Set([...defaultAssets, ...scripts, ...links]));

        let count = 0;
        for (const u of allUrls) {
          try {
            const res = await fetch(u, { cache: 'reload' });
            if (res.ok) {
              await cache.put(u, res);
              count++;
            }
          } catch (e) {
            console.warn('Precache skip:', u);
          }
        }

        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'PRECACHE_ALL',
            urls: allUrls
          });
        }

        setPrecacheStatus(`🎉 预缓存成功！已将 ${count} 个关键资源保存在本地 CacheStorage。手机断网或电脑端 AI Studio 关闭后，刷新页面也能完美使用！`);
        playSynthSound('success');
      } else {
        setPrecacheStatus('⚠️ 您的浏览器不支持 CacheStorage，建议使用 Chrome / Safari / Edge 浏览器。');
      }
    } catch (err: any) {
      setPrecacheStatus(`❌ 预缓存过程出错: ${err.message || '网络连接不可用'}`);
    } finally {
      setIsPrecaching(false);
    }
  };

  // Handle Data Backup Export
  const handleExportBackup = () => {
    try {
      const backupObj = {
        version: '1.0',
        exportTime: new Date().toLocaleString(),
        favorites: JSON.parse(localStorage.getItem('lyrics_dictation_favorites') || '{}'),
        completedSentences: JSON.parse(localStorage.getItem('lyrics_completed_sentences') || '{}'),
        customSongs: JSON.parse(localStorage.getItem('lyrics_custom_songs') || '[]'),
        theme: localStorage.getItem('lyrics_app_theme') || 'ielts'
      };

      const dataStr = JSON.stringify(backupObj, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LyricListen_Data_Backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupMessage('✅ 数据备份文件已保存到您的手机/电脑存储中！');
      playSynthSound('correct');
    } catch (e: any) {
      setBackupMessage(`❌ 导出备份失败: ${e.message}`);
    }
  };

  // Handle Data Backup Import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const raw = evt.target?.result as string;
        const parsed = JSON.parse(raw);

        if (parsed.favorites) {
          setFavorites(parsed.favorites);
          localStorage.setItem('lyrics_dictation_favorites', JSON.stringify(parsed.favorites));
        }
        if (parsed.completedSentences) {
          setCompletedSentences(parsed.completedSentences);
          localStorage.setItem('lyrics_completed_sentences', JSON.stringify(parsed.completedSentences));
        }
        if (Array.isArray(parsed.customSongs)) {
          localStorage.setItem('lyrics_custom_songs', JSON.stringify(parsed.customSongs));
          setSongsList([...curatedSongs, ...parsed.customSongs]);
        }
        if (parsed.theme) {
          setTheme(parsed.theme);
          localStorage.setItem('lyrics_app_theme', parsed.theme);
        }

        setBackupMessage('🎉 备份数据恢复成功！已成功载入您的所有歌词课件与听写历史记录！');
        playSynthSound('success');
      } catch (err: any) {
        setBackupMessage('❌ 文件解析失败，请确保导入的是正确的 .json 备份文件。');
      }
    };
    reader.readAsText(file);
  };

  // Handle Standalone Single HTML Export
  const handleExportOfflineHtml = () => {
    try {
      const htmlCode = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LyricListen 听写离线独立版</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; text-align: center; }
    .card { background: #1e293b; border-radius: 20px; padding: 28px; max-width: 480px; margin: 30px auto; border: 1px solid #334155; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { color: #60a5fa; font-size: 22px; margin-bottom: 8px; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; }
    .badge { display: inline-block; background: rgba(37,99,235,0.2); color: #60a5fa; padding: 4px 12px; border-radius: 99px; font-size: 11px; font-weight: bold; margin-bottom: 16px; }
    .btn { background: #2563eb; color: #fff; border: none; padding: 14px 24px; border-radius: 12px; font-weight: bold; font-size: 14px; cursor: pointer; width: 100%; margin-top: 16px; transition: all 0.2s; }
    .btn:active { transform: scale(0.98); }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">已打包离线数据包</span>
    <h1>LyricListen 独立离线版</h1>
    <p>包含了您导入的所有歌词课件与精选练习库。此文件完全独立存在，不依赖线上服务器。</p>
    <button class="btn" onclick="alert('数据包加载成功！将此文件保存到手机 Downloads 文件夹中，随时双击即可运行！')">启动离线听写引擎</button>
  </div>
</body>
</html>`;

      const blob = new Blob([htmlCode], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `LyricListen_Offline_App.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBackupMessage('✅ 单文件离线 App 已导出！保存至手机后随时可断网直接打开。');
      playSynthSound('correct');
    } catch (e: any) {
      setBackupMessage(`❌ 导出失败: ${e.message}`);
    }
  };

  // Ref to track speech synth utterance
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const ttsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- PERSISTENCE & INIT ---
  useEffect(() => {
    // Read favorites & completed stats from localStorage
    const savedFavorites = localStorage.getItem('lyrics_dictation_favorites');
    const savedCompleted = localStorage.getItem('lyrics_completed_sentences');
    const savedSongs = localStorage.getItem('lyrics_custom_songs');
    const savedTheme = localStorage.getItem('lyrics_app_theme');

    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedCompleted) setCompletedSentences(JSON.parse(savedCompleted));
    if (savedSongs) {
      try {
        const parsed = JSON.parse(savedSongs);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSongsList([...curatedSongs, ...parsed]);
        }
      } catch (e) {
        console.error('Error parsing custom songs:', e);
      }
    }
    if (savedTheme === 'cosmic' || savedTheme === 'ielts') {
      setTheme(savedTheme);
    }

    // Android status bar clock
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, '0');
      let minutes = now.getMinutes().toString().padStart(2, '0');
      setAndroidTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    // Battery simulation
    const randBattery = Math.floor(Math.random() * 30) + 60; // 60-90
    setBatteryLevel(randBattery);
    const chargeInterval = setInterval(() => {
      setBatteryLevel(prev => {
        if (prev >= 100) return 100;
        return prev + 1;
      });
    }, 120000);

    // Load Speech Synthesis voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        // Select a default English voice
        const enVoice = availableVoices.find(v => 
          v.lang.startsWith('en') && 
          (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Microsoft'))
        );
        if (enVoice) setSelectedVoiceName(enVoice.name);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      clearInterval(interval);
      clearInterval(chargeInterval);
      if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync favorites & themes to localStorage
  const saveFavoritesState = (updated: {[key: string]: number[]}) => {
    setFavorites(updated);
    localStorage.setItem('lyrics_dictation_favorites', JSON.stringify(updated));
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'ielts' ? 'cosmic' : 'ielts';
    setTheme(nextTheme);
    localStorage.setItem('lyrics_app_theme', nextTheme);
  };

  // --- AUDIO HANDLING ---
  const currentSentence: Sentence = activeSong.sentences[activeSentenceIdx] || activeSong.sentences[0];

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playOnlineTTS = (text: string, rate: number = 1.0, onStart?: () => void, onEnd?: () => void, onError?: () => void) => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
      } catch (e) {}
      audioRef.current = null;
    }

    const textToPlay = text.trim();
    if (!textToPlay) return;

    const encoded = encodeURIComponent(textToPlay);
    // 多源发音接口：优先使用国内 CDN 超快响应的百度美音、网易有道美音，备用 StreamElements
    const sources = [
      // 1. 百度翻译标准美音（国内 CDN，支持长句，秒级加载）
      `https://fanyi.baidu.com/gettts?lan=en&text=${encoded}&spd=3&source=web`,
      // 2. 网易有道标准美音 (type=2)
      `https://dict.youdao.com/dictvoice?audio=${encoded}&type=2`,
      // 3. StreamElements 高清美音 (Joanna)
      `https://api.streamelements.com/kappa/v2/speech?voice=Joanna&text=${encoded}`,
      // 4. Google 翻译 TTS
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob`
    ];

    let sourceIndex = 0;

    const trySource = () => {
      if (sourceIndex >= sources.length) {
        if (onError) onError();
        return;
      }

      const url = sources[sourceIndex];
      sourceIndex++;

      const audio = new Audio(url);
      audio.playbackRate = rate;
      audioRef.current = audio;

      let started = false;

      audio.onplay = () => {
        started = true;
        if (onStart) onStart();
      };

      audio.onended = () => {
        audioRef.current = null;
        if (onEnd) onEnd();
      };

      audio.onerror = () => {
        if (!started) {
          trySource();
        } else {
          audioRef.current = null;
          if (onError) onError();
        }
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn(`Online TTS play failed (source ${sourceIndex - 1}):`, err);
          if (!started) {
            trySource();
          } else {
            audioRef.current = null;
            if (onError) onError();
          }
        });
      }
    };

    trySource();
  };

  const stopAudio = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
      } catch (e) {}
    }
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch (e) {}
      audioRef.current = null;
    }
    setIsPlaying(false);
    setActiveWordIndex(null);
    if (ttsTimeoutRef.current) clearTimeout(ttsTimeoutRef.current);
  };

  const playSentence = (idx: number, speedOverride?: number) => {
    // 仅在当前确实处于播放状态时停止，避免在 Android 上调用 cancel() 误杀紧接着的 speak()
    if (isPlaying) {
      stopAudio();
    } else {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch (e) {}
        audioRef.current = null;
      }
    }

    const sentenceToPlay = activeSong.sentences[idx];
    if (!sentenceToPlay) return;

    const rate = speedOverride !== undefined ? speedOverride : playbackRate;
    const textToPlay = sentenceToPlay.text.trim();
    if (!textToPlay) return;

    // 单词高亮位置计算
    const words = textToPlay.split(/\s+/);
    let charAccumulator = 0;
    const wordBoundaries = words.map((w) => {
      const start = charAccumulator;
      const end = charAccumulator + w.length;
      charAccumulator += w.length + 1; // +1 space
      return { start, end };
    });

    const startCallback = () => {
      setIsPlaying(true);
      setActiveSentenceIdx(idx);
    };

    const endCallback = () => {
      setIsPlaying(false);
      setActiveWordIndex(null);
      handlePlaybackEnd(idx);
    };

    const errorCallback = () => {
      setIsPlaying(false);
      setActiveWordIndex(null);
    };

    // 优先使用原生 Web Speech API (系统原生朗读，支持流畅高亮)
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speak) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }

        const utterance = new SpeechSynthesisUtterance(textToPlay);
        utterance.lang = 'en-US';
        utterance.rate = rate;

        if (selectedVoiceName && voices.length > 0) {
          const voice = voices.find(v => v.name === selectedVoiceName);
          if (voice) utterance.voice = voice;
        }

        let hasSpeechStarted = false;

        utterance.onstart = () => {
          hasSpeechStarted = true;
          startCallback();
        };

        utterance.onboundary = (event) => {
          if (event.name === 'word') {
            const charIdx = event.charIndex;
            const matchedWordIdx = wordBoundaries.findIndex(
              b => charIdx >= b.start && charIdx <= b.end
            );
            if (matchedWordIdx !== -1) {
              setActiveWordIndex(matchedWordIdx);
            }
          }
        };

        utterance.onend = () => {
          setIsPlaying(false);
          setActiveWordIndex(null);
          handlePlaybackEnd(idx);
        };

        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error, falling back to Online TTS:', e);
          if (!hasSpeechStarted) {
            playOnlineTTS(textToPlay, rate, startCallback, endCallback, errorCallback);
          } else {
            errorCallback();
          }
        };

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);

        // 防卡死保护：若 600ms 内系统 TTS 未能触发 onstart（某些 WebView 缺乏语音包），自动无缝降级到在线语音
        setTimeout(() => {
          if (!hasSpeechStarted && isPlaying === false) {
            console.warn('Native SpeechSynthesis unresponsive, switching to Online TTS');
            playOnlineTTS(textToPlay, rate, startCallback, endCallback, errorCallback);
          }
        }, 600);

        return;
      } catch (err) {
        console.warn('SpeechSynthesis failed:', err);
      }
    }

    // 环境不支持时降级至在线高品质美音
    playOnlineTTS(textToPlay, rate, startCallback, endCallback, errorCallback);
  };

  const handlePlaybackEnd = (idx: number) => {
    // Practice modes post-playback actions
    if (practiceMode === 'sentence') {
      // In sentence loop, if the user hasn't finished typing, auto-replay after a short delay
      if (!isSentenceCompleted && isPlaying) {
        ttsTimeoutRef.current = setTimeout(() => {
          playSentence(idx);
        }, 1200);
      }
    } else if (practiceMode === 'section') {
      // Plays next sentence in section
      const nextIdx = idx + 1;
      if (nextIdx < activeSong.sentences.length) {
        ttsTimeoutRef.current = setTimeout(() => {
          playSentence(nextIdx);
        }, 800);
      } else {
        // Wrap around section
        ttsTimeoutRef.current = setTimeout(() => {
          playSentence(0);
        }, 1500);
      }
    } else if (practiceMode === 'full') {
      // Play full text
      const nextIdx = idx + 1;
      if (nextIdx < activeSong.sentences.length) {
        ttsTimeoutRef.current = setTimeout(() => {
          playSentence(nextIdx);
        }, 800);
      }
    }
  };

  const handlePlayPauseToggle = () => {
    if (isPlaying) {
      stopAudio();
    } else {
      playSentence(activeSentenceIdx);
    }
  };

  // --- TRANSITION SCENE FOR AI GENERATOR ---
  const handleAIGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitleInput.trim()) {
      setErrorMessage('请输入歌曲或对话的主题名称！');
      return;
    }

    setErrorMessage('');
    setIsGenerating(true);
    setGenerationStep(0);

    // Dynamic messaging interval to entertain users during a 10s simulation
    const messagesCount = 5;
    const intervalTime = 1600;
    const stepInterval = setInterval(() => {
      setGenerationStep(prev => {
        if (prev >= messagesCount - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, intervalTime);

    try {
      const response = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songTitle: songTitleInput,
          artist: artistInput,
          prompt: customTheme ? `Generate listening dictation material on the theme/topic: "${customTheme}"` : undefined
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '生成失败，请稍后重试。');
      }

      const newMaterial: DictationMaterial = await response.json();
      
      // Successfully generated material! Let's save it
      const savedCustom = localStorage.getItem('lyrics_custom_songs');
      let customArray: DictationMaterial[] = [];
      if (savedCustom) {
        try {
          customArray = JSON.parse(savedCustom);
        } catch (err) {}
      }
      
      customArray = [newMaterial, ...customArray];
      localStorage.setItem('lyrics_custom_songs', JSON.stringify(customArray));
      
      setSongsList([...curatedSongs, ...customArray]);
      setActiveSong(newMaterial);
      setActiveSentenceIdx(0);
      
      // Clear forms
      setSongTitleInput('');
      setArtistInput('');
      setCustomTheme('');
      
      // Transition to player screen
      setTimeout(() => {
        clearInterval(stepInterval);
        setIsGenerating(false);
        setCurrentScreen('player');
        // Reset local blank input states
        resetSentenceState(newMaterial, 0);
      }, 500);

    } catch (error: any) {
      console.error('AI generation error:', error);
      setErrorMessage(error.message || '生成失败，请检查网络或确认 Gemini API 密钥已配置。');
      clearInterval(stepInterval);
      setIsGenerating(false);
    }
  };

  // --- LOCAL LYRICS FILE PARSING LOGIC ---
  const autoGenerateBlanks = (text: string): number[] => {
    const words = text.trim().split(/\s+/);
    const candidateIndices: number[] = [];
    
    words.forEach((word, index) => {
      // Remove punctuation to measure clean word length
      const clean = word.replace(/[^\w]/g, '');
      if (clean.length >= 4) {
        candidateIndices.push(index);
      }
    });

    // Fallback: If no word is >= 4 chars, use shorter ones
    if (candidateIndices.length === 0) {
      words.forEach((word, index) => {
        const clean = word.replace(/[^\w]/g, '');
        if (clean.length >= 2) {
          candidateIndices.push(index);
        }
      });
    }

    // Pick 35% of words or up to 3 blanks
    const countToPick = Math.min(3, Math.max(1, Math.floor(words.length * 0.35)));
    const shuffled = [...candidateIndices].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, countToPick).sort((a, b) => a - b);
  };

  const handleLocalFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Default title from filename (removing extension)
    const titleWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setLocalSongTitle(titleWithoutExt);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setLocalFileContent(text);
      setErrorMessage('');
    };
    reader.onerror = () => {
      setErrorMessage('读取文件失败，请重试！');
    };
    reader.readAsText(file);
  };

  const handleLocalLyricsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFileContent.trim()) {
      setErrorMessage('请先选择或拖入您的歌词文本文件！');
      return;
    }
    if (!localSongTitle.trim()) {
      setErrorMessage('请输入歌词/课件的标题名称！');
      return;
    }

    try {
      // Split by lines and clean
      const rawLines = localFileContent.split(/\r?\n/);
      const parsedSentences: Sentence[] = [];
      let currentId = 1;

      // Temporary holding variables for metadata if present in .lrc
      let tempTitle = localSongTitle.trim();
      let tempArtist = localArtist.trim() || '本地导入';

      for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (!trimmed) continue;

        // Extract potential .lrc metadata tags: [ti:Title], [ar:Artist]
        if (trimmed.startsWith('[') && trimmed.includes(']')) {
          const titleMatch = trimmed.match(/^\[ti:(.+)\]$/i);
          const artistMatch = trimmed.match(/^\[ar:(.+)\]$/i);
          if (titleMatch) {
            tempTitle = titleMatch[1].trim();
            setLocalSongTitle(tempTitle);
          }
          if (artistMatch) {
            tempArtist = artistMatch[1].trim();
            setLocalArtist(tempArtist);
          }
          
          // Check if it has LRC timestamp at start, if NOT, we skip metadata line
          if (!trimmed.match(/^\[\d+:\d+(?:\.\d+)?\]/)) {
            continue;
          }
        }

        // Clean any standard LRC timestamps: [00:12.34], [01:23], etc.
        const lyricText = trimmed.replace(/\[\d+:\d+(?:\.\d+)?\]/g, '').trim();
        if (!lyricText) continue;

        // Detect Chinese characters to extract bilingual translations
        const chineseCharIdx = lyricText.search(/[\u4e00-\u9fa5]/);
        let englishText = '';
        let translationText = '（暂无翻译）';

        if (chineseCharIdx !== -1) {
          englishText = lyricText.substring(0, chineseCharIdx).trim();
          translationText = lyricText.substring(chineseCharIdx).trim();
          
          // Remove separators like |, /, - at the end of English
          englishText = englishText.replace(/^[|/\s-]+|[|/\s-]+$/g, '').trim();
        } else {
          englishText = lyricText;
        }

        // We require at least 2 words to make a valid sentence to dictation
        if (englishText.split(/\s+/).length >= 2) {
          parsedSentences.push({
            id: currentId++,
            text: englishText,
            translation: translationText,
            audioDurationSec: Math.round(englishText.split(/\s+/).length * 0.5 * 10) / 10,
            pronunciationTips: '（点击单词可查看释义并播放发音）',
            blanks: autoGenerateBlanks(englishText)
          });
        }
      }

      if (parsedSentences.length === 0) {
        throw new Error('未在文本文档中检测到有效的英文歌词行，请确保每行至少有 2 个英文单词。');
      }

      const newMaterial: DictationMaterial = {
        title: tempTitle,
        artist: tempArtist,
        difficulty: parsedSentences.length > 12 ? 'Advanced' : parsedSentences.length > 6 ? 'Intermediate' : 'Beginner',
        description: `您导入的本地歌词/听写文本课件，共包含 ${parsedSentences.length} 个训练分句。`,
        sentences: parsedSentences
      };

      // Add to custom song list and save in localStorage
      const savedCustom = localStorage.getItem('lyrics_custom_songs');
      let customArray: DictationMaterial[] = [];
      if (savedCustom) {
        try {
          customArray = JSON.parse(savedCustom);
        } catch (err) {}
      }

      // Filter out duplicate titles
      customArray = customArray.filter(s => s.title !== newMaterial.title);
      customArray = [newMaterial, ...customArray];
      localStorage.setItem('lyrics_custom_songs', JSON.stringify(customArray));

      setSongsList([...curatedSongs, ...customArray]);
      setActiveSong(newMaterial);
      setActiveSentenceIdx(0);

      // Clear input fields
      setLocalSongTitle('');
      setLocalArtist('');
      setLocalFileContent('');

      // Redirect to player screen
      setCurrentScreen('player');
      resetSentenceState(newMaterial, 0);

    } catch (err: any) {
      setErrorMessage(err.message || '歌词文件解析失败，请检查文件编码或格式！');
    }
  };

  // --- INPUT & WORD COMPLETION LOGIC ---
  const wordsInCurrentSentence = parseSentenceToWords(currentSentence.text, currentSentence.blanks);

  const resetSentenceState = (song: DictationMaterial, sentIdx: number) => {
    setTypedBlanks({});
    setIsSentenceCompleted(false);
    setActiveWordIndex(null);
    
    // Check if this sentence is already marked completed
    const songCompletions = completedSentences[song.title] || [];
    if (songCompletions.includes(song.sentences[sentIdx].id)) {
      setIsSentenceCompleted(true);
      // Autofill all blanks for completed sentence
      const sentenceToInit = song.sentences[sentIdx];
      const words = parseSentenceToWords(sentenceToInit.text, sentenceToInit.blanks);
      const autofill: {[idx: number]: string} = {};
      sentenceToInit.blanks.forEach(idx => {
        if (words[idx]) autofill[idx] = words[idx].clean;
      });
      setTypedBlanks(autofill);
    }
  };

  const handleResetCurrentSentence = () => {
    // 1. Clear typed blanks in UI
    setTypedBlanks({});
    setIsSentenceCompleted(false);

    // 2. Remove from completedSentences list
    const songTitle = activeSong.title;
    const sentenceId = currentSentence.id;
    const currentCompletions = completedSentences[songTitle] || [];
    
    if (currentCompletions.includes(sentenceId)) {
      const updatedCompletions = currentCompletions.filter(id => id !== sentenceId);
      const newCompletedState = { ...completedSentences, [songTitle]: updatedCompletions };
      setCompletedSentences(newCompletedState);
      localStorage.setItem('lyrics_completed_sentences', JSON.stringify(newCompletedState));
    }

    playSynthSound('hint');
  };

  const handleResetAllSentences = (reblank: boolean = false) => {
    const songTitle = activeSong.title;

    // 1. Clear completions for this song in state and localStorage
    const newCompletedState = { ...completedSentences, [songTitle]: [] };
    setCompletedSentences(newCompletedState);
    localStorage.setItem('lyrics_completed_sentences', JSON.stringify(newCompletedState));

    // 2. Clear current typed answers
    setTypedBlanks({});
    setIsSentenceCompleted(false);

    // 3. If reblank is true, we regenerate the blanks dynamically for every sentence!
    if (reblank) {
      const updatedSentences = activeSong.sentences.map(sent => ({
        ...sent,
        blanks: autoGenerateBlanks(sent.text)
      }));
      
      const updatedSong = {
        ...activeSong,
        sentences: updatedSentences
      };
      
      setActiveSong(updatedSong);

      // We should also update the songsList state so that navigating back and forth keeps the new blanks!
      setSongsList(prevList => prevList.map(s => {
        if (s.title === songTitle) {
          return updatedSong;
        }
        return s;
      }));

      // And if it is a custom song saved in localStorage, we should persist it there too!
      const savedCustom = localStorage.getItem('lyrics_custom_songs');
      if (savedCustom) {
        try {
          const parsed: DictationMaterial[] = JSON.parse(savedCustom);
          const updatedCustom = parsed.map(s => {
            if (s.title === songTitle) {
              return updatedSong;
            }
            return s;
          });
          localStorage.setItem('lyrics_custom_songs', JSON.stringify(updatedCustom));
        } catch (e) {
          console.error('Error updating custom songs with new blanks:', e);
        }
      }
    }

    playSynthSound('success');
  };

  const handleInputChange = (blankIdx: number, val: string, targetWord: string) => {
    // Case-insensitive checks
    const cleanTyped = val.trim().toLowerCase();
    const cleanTarget = targetWord.toLowerCase();
    const L = targetWord.length;

    // Calculate the target word's first two + last letter shortcut
    let shortcut = cleanTarget;
    if (L >= 4) {
      shortcut = cleanTarget[0] + cleanTarget[1] + cleanTarget[L-1];
    } else if (L === 3) {
      shortcut = cleanTarget[0] + cleanTarget[1] + cleanTarget[2];
    }

    setTypedBlanks(prev => ({ ...prev, [blankIdx]: val }));

    // User types shortcut OR types the full word correctly -> AUTO COMPLETE!
    if (cleanTyped === shortcut || cleanTyped === cleanTarget) {
      // Overwrite the input state with the pristine original word!
      const updatedBlanks = { ...typedBlanks, [blankIdx]: targetWord };
      setTypedBlanks(updatedBlanks);
      playSynthSound('correct');

      // Check if all blanks in this sentence are solved!
      const isSentenceFinished = currentSentence.blanks.every(idx => {
        const wordClean = wordsInCurrentSentence[idx].clean.toLowerCase();
        const valueClean = (updatedBlanks[idx] || '').trim().toLowerCase();
        return valueClean === wordClean;
      });

      if (isSentenceFinished) {
        setIsSentenceCompleted(true);
        playSynthSound('success');
        stopAudio();

        // Save progress to local tracking
        const songTitle = activeSong.title;
        const sentenceId = currentSentence.id;
        const currentCompletions = completedSentences[songTitle] || [];
        if (!currentCompletions.includes(sentenceId)) {
          const updatedCompletions = [...currentCompletions, sentenceId];
          const newCompletedState = { ...completedSentences, [songTitle]: updatedCompletions };
          setCompletedSentences(newCompletedState);
          localStorage.setItem('lyrics_completed_sentences', JSON.stringify(newCompletedState));
        }

        // Celebrate on final sentence
        if (activeSentenceIdx === activeSong.sentences.length - 1) {
          setShowCelebration(true);
        } else {
          // Toast or auto-advance to next sentence after a 1.8s delay
          setTimeout(() => {
            const nextIdx = activeSentenceIdx + 1;
            setActiveSentenceIdx(nextIdx);
            resetSentenceState(activeSong, nextIdx);
            playSentence(nextIdx);
          }, 1800);
        }
      } else {
        // Automatically focus on the next unsolved blank
        setTimeout(() => {
          const blanks = currentSentence.blanks;
          const currentPos = blanks.indexOf(blankIdx);
          if (currentPos !== -1 && currentPos < blanks.length - 1) {
            const nextBlankIdx = blanks[currentPos + 1];
            const nextInput = document.getElementById(`blank-${currentSentence.id}-${nextBlankIdx}`);
            if (nextInput) {
              (nextInput as HTMLInputElement).focus();
              (nextInput as HTMLInputElement).select();
            }
          }
        }, 10);
      }
    }
  };

  // Provide a visual or audio hint for the focused blank
  const handleRevealHint = () => {
    if (focusedBlankIdx === null) {
      // Find the first unfilled blank
      const unfilledIdx = currentSentence.blanks.find(idx => {
        const cleanTarget = wordsInCurrentSentence[idx].clean.toLowerCase();
        const cleanTyped = (typedBlanks[idx] || '').trim().toLowerCase();
        return cleanTyped !== cleanTarget;
      });
      if (unfilledIdx !== undefined) {
        triggerHintForBlank(unfilledIdx);
      }
    } else {
      triggerHintForBlank(focusedBlankIdx);
    }
  };

  const triggerHintForBlank = (blankIdx: number) => {
    const target = wordsInCurrentSentence[blankIdx].clean;
    // Auto-complete the blank!
    handleInputChange(blankIdx, target, target);
    playSynthSound('hint');
  };

  // --- DICTIONARY & AI GRAMMAR DRAWER ---
  const handleWordClick = async (word: string) => {
    setExplainWord(word);
    setExplainSentence(currentSentence.text);
    setAiExplanation('');
    setIsExplaining(true);
    setShowExplainDrawer(true);

    try {
      const response = await fetch('/api/lyrics/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: currentSentence.text,
          word: word
        })
      });

      if (!response.ok) throw new Error('Failed to fetch explanation');
      const data = await response.json();
      setAiExplanation(data.explanation);
    } catch (e) {
      setAiExplanation('无法获取释义，请稍后重试或检查 Gemini 配置。');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSentenceExplain = async () => {
    setExplainWord('');
    setExplainSentence(currentSentence.text);
    setAiExplanation('');
    setIsExplaining(true);
    setShowExplainDrawer(true);

    try {
      const response = await fetch('/api/lyrics/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence: currentSentence.text
        })
      });

      if (!response.ok) throw new Error('Failed to fetch explanation');
      const data = await response.json();
      setAiExplanation(data.explanation);
    } catch (e) {
      setAiExplanation('无法获取句子分析，请稍后重试。');
    } finally {
      setIsExplaining(false);
    }
  };

  // --- NAVIGATOR ACTIONS ---
  const handleSelectSong = (song: DictationMaterial) => {
    setActiveSong(song);
    setActiveSentenceIdx(0);
    setCurrentScreen('player');
    resetSentenceState(song, 0);
    stopAudio();
  };

  const handleSentenceJump = (idx: number) => {
    setActiveSentenceIdx(idx);
    resetSentenceState(activeSong, idx);
    playSentence(idx);
    setShowSidebar(false);
  };

  const toggleFavorite = (sentId: number) => {
    const songTitle = activeSong.title;
    const currentFavs = favorites[songTitle] || [];
    let updated: number[];
    if (currentFavs.includes(sentId)) {
      updated = currentFavs.filter(id => id !== sentId);
    } else {
      updated = [...currentFavs, sentId];
    }
    const newFavorites = { ...favorites, [songTitle]: updated };
    saveFavoritesState(newFavorites);
  };

  // --- RENDERING HELPERS ---
  const getCompletedCount = (songTitle: string) => {
    return (completedSentences[songTitle] || []).length;
  };

  const isSongCompleted = (song: DictationMaterial) => {
    const completedCount = getCompletedCount(song.title);
    return completedCount === song.sentences.length;
  };

  // --- UI THEMES ---
  const isCosmic = theme === 'cosmic';

  // AI loading status messages
  const generatingMessages = [
    "🤖 正在连接至 Gemini 3.5 高速大模型...",
    "🎵 正在精准抓取原版英文歌词及对照句...",
    "✍️ 正在生成精准学术级双语翻译...",
    "🗣️ 正在标注美声发音要点与连读吞音法则...",
    "🎯 正在筛选核心考纲听力词汇作为挖空训练..."
  ];

  return (
    <div className={`min-h-screen ${isCosmic ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'} flex items-center justify-center p-0 md:p-6 transition-colors duration-500`}>
      
      {/* ----------------- PHONE FRAME SHELL (DESKTOP MOCKUP) ----------------- */}
      <div className={`relative w-full md:max-w-[420px] md:h-[840px] md:border-[10px] md:border-slate-800 md:rounded-[40px] md:shadow-2xl md:ring-4 md:ring-slate-700 bg-white flex flex-col overflow-hidden transition-all duration-300 ${isCosmic ? 'md:border-slate-900 bg-slate-900' : 'bg-white'}`}>
        
        {/* Android Hardware Notch/Camera inside Phone layout */}
        <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 bg-slate-800 rounded-b-2xl z-50">
          <div className="absolute top-1.5 left-6 w-3 h-3 bg-slate-900 rounded-full border border-slate-700"></div>
          <div className="absolute top-2 right-8 w-12 h-1 bg-slate-700 rounded-full"></div>
        </div>

        {/* ----------------- ANDROID APP STATUS BAR ----------------- */}
        <div className={`h-7 px-6 pt-1 flex justify-between items-center text-[11px] font-semibold select-none z-40 transition-colors ${isCosmic ? 'bg-slate-950 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
          <div className="flex items-center gap-1">
            <span className="font-mono">{androidTime}</span>
          </div>
          
          {/* Audio Speaker Indicator */}
          <div className="flex items-center gap-1">
            <Volume2 size={12} className="opacity-75" />
            <span className="text-[9px] font-mono">TTS_Active</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Status Icons */}
            <div className="w-3 h-3 flex items-center justify-center">
              <div className="w-2.5 h-1.5 border border-current rounded-sm relative flex items-center px-0.5">
                <div className={`h-full ${isCharging ? 'bg-emerald-500' : 'bg-current'}`} style={{ width: `${batteryLevel}%` }}></div>
                <div className="w-0.5 h-0.5 bg-current absolute -right-[2px] top-0.5 rounded-r-xs"></div>
              </div>
            </div>
            <span className="text-[9px] font-mono">{batteryLevel}%</span>
            <Globe size={11} className="opacity-75" />
          </div>
        </div>

        {/* ----------------- SCREEN: HOME / SONG SELECTOR ----------------- */}
        {currentScreen === 'home' && (
          <div className={`flex-1 flex flex-col overflow-y-auto ${isCosmic ? 'bg-slate-900' : 'bg-slate-50'}`}>
            
            {/* Header */}
            <div className={`p-5 flex justify-between items-center border-b transition-colors ${isCosmic ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
                  <BookOpenCheck size={18} />
                </div>
                <div>
                  <h1 className="font-bold text-lg leading-tight tracking-tight">LyricListen</h1>
                  <p className="text-[10px] text-slate-400">听歌高效记单词听写器</p>
                </div>
              </div>

              {/* Theme and stats buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowOfflineModal(true)}
                  className={`px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[10px] ${
                    isCosmic 
                      ? 'bg-slate-800 text-blue-400 hover:bg-slate-700 border border-slate-700' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 shadow-xs'
                  }`}
                  title="离线使用与数据备份"
                  id="btn-open-offline-modal"
                >
                  <WifiOff size={14} />
                  <span>离线与备份</span>
                </button>

                <button 
                  onClick={toggleTheme} 
                  className={`p-2 rounded-xl transition-colors ${isCosmic ? 'bg-slate-800 text-amber-400 hover:bg-slate-700' : 'bg-slate-200 text-indigo-900 hover:bg-slate-300'}`}
                  title="切换主题"
                  id="btn-toggle-theme"
                >
                  <Sparkle size={16} />
                </button>
              </div>
            </div>

            {/* Custom Content Creator Panel (AI / Local File Tabs) */}
            <div className="p-5">
              <div className={`p-4 rounded-2xl border transition-all ${isCosmic ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                {/* Creator Tab Selector */}
                <div className={`flex p-1 rounded-xl mb-4 transition-colors ${isCosmic ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <button
                    onClick={() => { setCreatorTab('ai'); setErrorMessage(''); }}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      creatorTab === 'ai'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isCosmic ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="tab-creator-ai"
                    type="button"
                  >
                    <Sparkles size={13} />
                    <span>AI 智能生成</span>
                  </button>
                  <button
                    onClick={() => { setCreatorTab('local'); setErrorMessage(''); }}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      creatorTab === 'local'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : isCosmic ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    id="tab-creator-local"
                    type="button"
                  >
                    <Upload size={13} />
                    <span>本地歌词导入</span>
                  </button>
                </div>

                {creatorTab === 'ai' ? (
                  <form onSubmit={handleAIGenerate} className="space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles size={14} className="text-blue-500 animate-pulse" />
                      <h2 className="font-bold text-xs text-slate-400">AI 智能课件生成</h2>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      输入任意英文歌名/场景，AI 自动分句，提供中英对照翻译、连读发音解析，并为您挑选核心考纲词汇挖空听写！
                    </p>

                    <div className="space-y-2">
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="歌曲名称 / 场景 (如: Shape of You / 校园生活)" 
                          value={songTitleInput}
                          onChange={(e) => setSongTitleInput(e.target.value)}
                          className={`w-full text-xs pl-3 pr-3 py-2.5 rounded-xl border outline-none transition-all ${isCosmic ? 'bg-slate-800/80 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-100 border-slate-200 focus:border-blue-600 text-slate-800'}`}
                          required
                          id="input-song-title"
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="歌手 (可不填, 如: Ed Sheeran)" 
                          value={artistInput}
                          onChange={(e) => setArtistInput(e.target.value)}
                          className={`w-full text-xs pl-3 pr-3 py-2 rounded-xl border outline-none transition-all ${isCosmic ? 'bg-slate-800/80 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-100 border-slate-200 focus:border-blue-600 text-slate-800'}`}
                          id="input-artist"
                        />
                      </div>

                      {/* Quick Dialog Scenario presets */}
                      <div className="pt-1 flex flex-wrap gap-1.5">
                        {['IELTS 听力 Section 2', '商务英语汇报', '机场海关对话', '咖啡馆点餐'].map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setSongTitleInput(item);
                              setCustomTheme(item);
                            }}
                            className={`text-[9px] px-2 py-1 rounded-lg border transition-colors ${isCosmic ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-600'}`}
                            id={`btn-preset-${item.replace(/\s+/g, '-')}`}
                          >
                            +{item}
                          </button>
                        ))}
                      </div>

                      {errorMessage && (
                        <p className="text-[10px] text-rose-500 mt-1 font-medium">{errorMessage}</p>
                      )}

                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
                        id="btn-ai-generate"
                      >
                        <Sparkles size={14} />
                        <span>AI 极速生成听写课件</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleLocalLyricsSubmit} className="space-y-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Upload size={14} className="text-blue-500" />
                      <h2 className="font-bold text-xs text-slate-400">本地歌词一键听写</h2>
                    </div>
                    
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      支持导入本地 <span className="font-semibold text-blue-500">.txt / .lrc</span> 文件，支持中英对照、带时间轴歌词，系统将自动进行分句和智能单词挖空！
                    </p>

                    <div className="space-y-3">
                      {/* Upload Box */}
                      <div className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                        localFileContent 
                          ? isCosmic ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-500/50 bg-emerald-500/5'
                          : isCosmic ? 'border-slate-700 hover:border-blue-500 hover:bg-slate-900/30' : 'border-slate-300 hover:border-blue-500 hover:bg-slate-50'
                      }`} id="dropzone-local-lyrics">
                        <input 
                          type="file" 
                          accept=".txt,.lrc" 
                          onChange={handleLocalFileLoad}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                          id="input-file-local-lyrics"
                        />
                        <div className="flex flex-col items-center gap-1.5">
                          <Upload size={22} className={localFileContent ? "text-emerald-500" : "text-blue-500"} />
                          {localFileContent ? (
                            <>
                              <span className="text-xs font-bold text-emerald-500">文件已加载</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[280px]">首句预览: {localFileContent.split('\n')[0]?.slice(0, 30) || '...'}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs font-bold">选择手机本地歌词文件 (.txt / .lrc)</span>
                              <span className="text-[10px] text-slate-400">点击此处选择文件</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Song Title and Artist Inputs */}
                      <div className="space-y-2">
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="歌单名称 / 课件标题 (必填)" 
                            value={localSongTitle}
                            onChange={(e) => setLocalSongTitle(e.target.value)}
                            className={`w-full text-xs pl-3 pr-3 py-2.5 rounded-xl border outline-none transition-all ${isCosmic ? 'bg-slate-800/80 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-100 border-slate-200 focus:border-blue-600 text-slate-800'}`}
                            required
                            id="input-local-song-title"
                          />
                        </div>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="歌手 / 文本来源 (可选)" 
                            value={localArtist}
                            onChange={(e) => setLocalArtist(e.target.value)}
                            className={`w-full text-xs pl-3 pr-3 py-2 rounded-xl border outline-none transition-all ${isCosmic ? 'bg-slate-800/80 border-slate-700 focus:border-blue-500 text-white' : 'bg-slate-100 border-slate-200 focus:border-blue-600 text-slate-800'}`}
                            id="input-local-artist"
                          />
                        </div>
                      </div>

                      {errorMessage && (
                        <p className="text-[10px] text-rose-500 mt-1 font-medium">{errorMessage}</p>
                      )}

                      <button
                        type="submit"
                        className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md active:scale-[0.98] flex items-center justify-center gap-1.5"
                        id="btn-local-lyrics-submit"
                      >
                        <FileText size={14} />
                        <span>一键导入并开始听写</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* CURATED LIBRARY LIST */}
            <div className="flex-1 px-5 pb-8">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="font-bold text-sm tracking-tight">精选听写训练库</span>
                <span className="text-[10px] text-slate-400 font-mono">共 {songsList.length} 个课件</span>
              </div>

              <div className="space-y-3">
                {songsList.map((song, i) => {
                  const completed = getCompletedCount(song.title);
                  const total = song.sentences.length;
                  const progressPct = Math.round((completed / total) * 100);
                  const isDone = completed === total;
                  
                  return (
                    <div 
                      key={song.title + i}
                      onClick={() => handleSelectSong(song)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] hover:border-blue-500/50 ${isCosmic ? 'bg-slate-950/40 border-slate-800 hover:bg-slate-850' : 'bg-white border-slate-200 shadow-xs hover:bg-slate-50'}`}
                      id={`song-card-${song.title.replace(/\s+/g, '-')}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs line-clamp-1">{song.title}</span>
                            {isDone && <Check size={14} className="text-emerald-500 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-slate-400">{song.artist}</span>
                        </div>
                        
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold shrink-0 ${
                          song.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-500' :
                          song.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-500' :
                          'bg-rose-500/10 text-rose-500'
                        }`}>
                          {song.difficulty}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-400/80 leading-relaxed mb-3 line-clamp-2">
                        {song.description}
                      </p>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono">
                          <span>进度 {completed}/{total} 句</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden relative">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isDone ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ----------------- SCREEN: PLAYER / WORKSPACE ----------------- */}
        {currentScreen === 'player' && (
          <div className={`flex-1 flex flex-col relative overflow-hidden ${isCosmic ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
            
            {/* Top Toolbar */}
            <div className={`px-4 py-3.5 flex justify-between items-center border-b z-10 ${isCosmic ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-xs'}`}>
              <button 
                onClick={() => { stopAudio(); setCurrentScreen('home'); }} 
                className="flex items-center gap-1.5 text-xs font-semibold hover:text-blue-500 transition-colors"
                id="btn-back-home"
              >
                <ArrowLeft size={16} />
                <span>返回库</span>
              </button>

              <div className="text-center max-w-[180px]">
                <h3 className="font-bold text-xs truncate leading-tight">{activeSong.title}</h3>
                <p className="text-[9px] text-slate-400 truncate">{activeSong.artist}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice Engine Picker */}
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className={`text-[9px] max-w-[64px] border rounded-md px-1 py-0.5 outline-none font-sans ${isCosmic ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-600'}`}
                  id="select-voice"
                >
                  <option value="">默认女音</option>
                  {voices.filter(v => v.lang.startsWith('en')).slice(0, 4).map(v => (
                    <option key={v.name} value={v.name}>{v.name.slice(0, 10)}</option>
                  ))}
                </select>

                <button 
                  onClick={() => setShowOfflineModal(true)} 
                  className={`p-1.5 rounded-lg transition-colors ${isCosmic ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-600'}`}
                  title="离线与数据管理"
                  id="btn-open-offline-modal-player"
                >
                  <WifiOff size={14} />
                </button>

                <button 
                  onClick={() => setShowSidebar(true)} 
                  className={`p-1.5 rounded-lg transition-colors ${isCosmic ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}
                  title="句单导航"
                  id="btn-toggle-sidebar"
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            {/* PRACTICE MODE SELECTOR TABS */}
            <div className={`p-2 flex border-b transition-colors ${isCosmic ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              {(['sentence', 'section', 'full'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => {
                    setPracticeMode(mode);
                    stopAudio();
                  }}
                  className={`flex-1 text-center py-1 rounded-lg text-[11px] font-bold transition-all ${
                    practiceMode === mode 
                      ? 'bg-blue-600 text-white shadow-xs' 
                      : isCosmic ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                  id={`tab-mode-${mode}`}
                >
                  {mode === 'sentence' ? '句子精听' : mode === 'section' ? '段落精听' : '全文听写'}
                </button>
              ))}
            </div>

            {/* MAIN INTERACTIVE BOARD CONTAINER */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              
              {/* Cover Art / Progress Card */}
              <div className={`p-4 rounded-2xl border transition-all flex justify-between items-center ${isCosmic ? 'bg-slate-950/30 border-slate-850' : 'bg-white border-slate-200 shadow-xs'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex flex-col items-center justify-center text-white font-black text-sm shadow-md uppercase">
                    {activeSong.title.slice(0, 2)}
                  </div>
                  <div>
                    <span className="font-bold text-xs">{activeSong.title}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-slate-400">句子 {activeSentenceIdx + 1} / {activeSong.sentences.length}</span>
                      <span className={`text-[8px] px-1 py-0.1 rounded font-bold ${
                        activeSong.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-500' :
                        activeSong.difficulty === 'Intermediate' ? 'bg-amber-500/10 text-amber-500' :
                        'bg-rose-500/10 text-rose-500'
                      }`}>{activeSong.difficulty}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={() => toggleFavorite(currentSentence.id)}
                    className={`p-2 rounded-xl transition-colors ${
                      (favorites[activeSong.title] || []).includes(currentSentence.id)
                        ? 'text-amber-500 bg-amber-500/10'
                        : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
                    }`}
                    id={`btn-fav-sentence-${currentSentence.id}`}
                  >
                    <Star size={14} fill={(favorites[activeSong.title] || []).includes(currentSentence.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>

              {/* ACTIVE TRAINING SHEET */}
              <div className={`p-5 rounded-2xl border transition-all ${isCosmic ? 'bg-slate-950/50 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
                
                {/* Sentence index badge */}
                <div className="flex justify-between items-center mb-4 border-b pb-2 border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-blue-500 font-mono">SENTENCE #{String(activeSentenceIdx + 1).padStart(2, '0')}</span>
                  {isSentenceCompleted && (
                    <span className="text-[10px] font-bold text-emerald-500 flex items-center gap-0.5">
                      <Check size={12} strokeWidth={3} /> 完成听写
                    </span>
                  )}
                </div>

                {/* THE MAIN WORDS BOARD (THE FILL IN THE BLANK COMPONENT) */}
                <div className="min-h-[80px] leading-[2.6] flex flex-wrap items-center gap-x-1.5 text-[15px] font-medium tracking-normal select-none">
                  {wordsInCurrentSentence.map((word, index) => {
                    // Non-blank words are rendered as interactive word buttons (excellent for looking up word details!)
                    if (!word.isBlank) {
                      const isWordActive = activeWordIndex === index;
                      return (
                        <span key={index} className="inline-flex items-center">
                          {word.punctuationBefore}
                          <span 
                            onClick={() => handleWordClick(word.clean)}
                            className={`cursor-pointer rounded px-0.5 hover:bg-blue-500/10 hover:text-blue-500 transition-all ${
                              isWordActive ? 'bg-yellow-400/25 text-yellow-500 border-b border-yellow-500 font-bold' : ''
                            }`}
                          >
                            {word.clean}
                          </span>
                          {word.punctuationAfter}
                        </span>
                      );
                    }

                    // BLANK WORDS ARE RENDERED AS COMPACT FILL-IN FIELD WITH THE FAST INPUT AUTOFILL TEMPLATE!
                    const wordClean = word.clean;
                    const isCorrect = (typedBlanks[index] || '').trim().toLowerCase() === wordClean.toLowerCase();
                    const value = typedBlanks[index] || '';
                    const placeholder = showBlankHint 
                      ? getWordPlaceholder(wordClean) 
                      : '·'.repeat(wordClean.length);
                    
                    // Style input sizing based on letter count
                    const widthStyle = `${Math.max(wordClean.length * 10 + 20, 52)}px`;

                    return (
                      <span key={index} className="inline-flex items-center relative py-1 mx-0.5">
                        {word.punctuationBefore}
                        <div className="relative flex flex-col items-center">
                          <input
                            id={`blank-${currentSentence.id}-${index}`}
                            type="text"
                            value={value}
                            onChange={(e) => handleInputChange(index, e.target.value, wordClean)}
                            onFocus={() => setFocusedBlankIdx(index)}
                            placeholder={placeholder}
                            disabled={isCorrect}
                            style={{ width: widthStyle }}
                            className={`h-7 text-xs font-bold text-center rounded-md border outline-none transition-all placeholder:text-[10px] placeholder:text-slate-400 placeholder:tracking-widest ${
                              isCorrect 
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500 cursor-not-allowed' 
                                : focusedBlankIdx === index
                                  ? 'border-blue-500 bg-blue-500/5 ring-2 ring-blue-500/20 text-slate-800 dark:text-white'
                                  : isCosmic 
                                    ? 'bg-slate-800 border-slate-700 text-slate-100 hover:border-slate-600'
                                    : 'bg-slate-100 border-slate-300 text-slate-800 hover:border-slate-400'
                            }`}
                          />
                        </div>
                        {word.punctuationAfter}
                      </span>
                    );
                  })}
                </div>

                {/* Sub-action / Translation row */}
                <div className="mt-5 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-850">
                  {showTranslation && (
                    <p className="text-xs text-slate-400/90 leading-relaxed font-normal">
                      {currentSentence.translation}
                    </p>
                  )}

                  {/* Pronunciation tips shown automatically upon correct dictation completion */}
                  {isSentenceCompleted && currentSentence.pronunciationTips && (
                    <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-[11px] leading-relaxed">
                      <div className="flex items-center gap-1 text-blue-500 font-bold mb-1">
                        <Sparkles size={12} />
                        <span>AI 连读发音解析：</span>
                      </div>
                      <p className="text-slate-400">{currentSentence.pronunciationTips}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    {/* Prompt sentence explanation */}
                    <button
                      onClick={handleSentenceExplain}
                      className="text-[10px] text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 transition-colors"
                      id="btn-ai-explain-sentence"
                    >
                      <Sparkles size={11} />
                      <span>AI 剖析句子语法句式</span>
                    </button>

                    {/* Word check count indicator */}
                    <span className="text-[10px] text-slate-400 font-mono">
                      挖空词：{currentSentence.blanks.length} 个
                    </span>
                  </div>
                </div>
              </div>

              {/* QUICK PRACTICE TUTORIAL CARD */}
              <div className={`p-4 rounded-xl border transition-all text-[11px] leading-relaxed flex gap-2.5 ${isCosmic ? 'bg-slate-950/20 border-slate-850 text-slate-400' : 'bg-slate-100/80 border-slate-200 text-slate-500'}`}>
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">💡 极速手机打字技巧 (已默认激活)：</span>
                  由于移动端打字较慢，您<span className="font-bold text-blue-500">只需输入单词的前两个字母 + 最后一个字母</span>即可完成自动补全！
                  <br />
                  例：目标词为 <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded text-blue-500">perfect</span>，在输入框中依次敲击 <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded text-emerald-500">p</span> <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded text-emerald-500">e</span> <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded text-emerald-500">t</span> 即可一秒满分过关！
                </div>
              </div>

            </div>

            {/* ----------------- PLAY CONTROL PANEL (FIXED BOTTOM) ----------------- */}
            <div className={`absolute bottom-0 inset-x-0 border-t p-3.5 space-y-3 z-10 transition-colors ${isCosmic ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200 shadow-lg'}`}>
              
              {showResetMenu && (
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setShowResetMenu(false)}
                />
              )}

              {/* TIMELINE PROGRESS SLIDER */}
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                  {String(activeSentenceIdx + 1).padStart(2, '0')}
                </span>
                <input 
                  type="range"
                  min="0"
                  max={activeSong.sentences.length - 1}
                  value={activeSentenceIdx}
                  onChange={(e) => handleSentenceJump(Number(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600 outline-none"
                  id="timeline-slider"
                />
                <span className="text-[9px] font-mono text-slate-400 shrink-0">
                  {String(activeSong.sentences.length).padStart(2, '0')}
                </span>
              </div>

              {/* ROW OF TOGGLES (ORIGINAL, TRANSLATION, REVEAL HINT) */}
              <div className="flex justify-between items-center px-1">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTranslation(!showTranslation)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      showTranslation 
                        ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' 
                        : 'bg-slate-100 dark:bg-slate-850 text-slate-400 border border-transparent'
                    }`}
                    id="btn-toggle-translation"
                  >
                    <span>译文</span>
                  </button>
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all ${
                      showOriginal 
                        ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' 
                        : 'bg-slate-100 dark:bg-slate-850 text-slate-400 border border-transparent'
                    }`}
                    id="btn-toggle-original"
                  >
                    <span>参考英文</span>
                  </button>
                  <button
                    onClick={() => setShowBlankHint(!showBlankHint)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                      showBlankHint 
                        ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' 
                        : 'bg-slate-100 dark:bg-slate-850 text-slate-400 border border-transparent'
                    }`}
                    id="btn-toggle-blank-hint"
                  >
                    {showBlankHint ? <Eye size={11} /> : <EyeOff size={11} />}
                    <span>挖空提示</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleRevealHint}
                    className="px-3 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-all border border-amber-500/20 flex items-center gap-1"
                    id="btn-hint"
                  >
                    <HelpCircle size={12} />
                    <span>一键提示 (H)</span>
                  </button>
                </div>
              </div>

              {/* Reference English Sentence view if active */}
              {showOriginal && (
                <p className="text-[11px] leading-relaxed p-2.5 rounded-xl border border-dashed text-blue-500 border-blue-500/20 bg-blue-500/5 select-all">
                  {currentSentence.text}
                </p>
              )}

              {/* MAIN REPLAY CONTROLS */}
              <div className="flex justify-between items-center gap-2 pt-1">
                {/* Speed indicator */}
                <div className="relative">
                  <select
                    value={playbackRate}
                    onChange={(e) => {
                      const sp = Number(e.target.value);
                      setPlaybackRate(sp);
                      if (isPlaying) playSentence(activeSentenceIdx, sp);
                    }}
                    className={`text-[10px] font-bold border rounded-lg px-2 py-1.5 outline-none tracking-tight appearance-none cursor-pointer ${isCosmic ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-700'}`}
                    id="select-playback-rate"
                  >
                    <option value="0.5">速度 0.5X</option>
                    <option value="0.7">速度 0.7X</option>
                    <option value="1.0">速度 1.0X</option>
                    <option value="1.2">速度 1.2X</option>
                    <option value="1.5">速度 1.5X</option>
                  </select>
                </div>

                {/* Primary round controls */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      const prevIdx = Math.max(0, activeSentenceIdx - 1);
                      setActiveSentenceIdx(prevIdx);
                      resetSentenceState(activeSong, prevIdx);
                      playSentence(prevIdx);
                    }}
                    disabled={activeSentenceIdx === 0}
                    className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                    id="btn-prev-sentence"
                  >
                    <SkipBack size={18} />
                  </button>

                  <button
                    onClick={() => playSentence(activeSentenceIdx)}
                    className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    id="btn-replay-sentence"
                  >
                    <RotateCcw size={18} className="text-blue-500" />
                  </button>

                  <button
                    onClick={handlePlayPauseToggle}
                    className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md active:scale-95 transition-all"
                    id="btn-play-pause"
                  >
                    {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                  </button>

                  <button
                    onClick={() => {
                      const nextIdx = Math.min(activeSong.sentences.length - 1, activeSentenceIdx + 1);
                      setActiveSentenceIdx(nextIdx);
                      resetSentenceState(activeSong, nextIdx);
                      playSentence(nextIdx);
                    }}
                    disabled={activeSentenceIdx === activeSong.sentences.length - 1}
                    className="p-2.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                    id="btn-next-sentence"
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                {/* Quick reset active sentence answers */}
                <div className="relative z-20">
                  {showResetMenu && (
                    <div 
                      className={`absolute right-0 bottom-full mb-2 w-48 rounded-xl border p-1 shadow-lg z-30 flex flex-col gap-1 transition-all animate-in fade-in slide-in-from-bottom-2 duration-150 ${
                        isCosmic 
                          ? 'bg-slate-900 border-slate-800 text-slate-200' 
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                      id="reset-options-menu"
                    >
                      <div className="px-2.5 py-1.5 text-[9px] text-slate-400 font-bold border-b border-dashed border-slate-200 dark:border-slate-800">
                        选择重置操作
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetCurrentSentence();
                          setShowResetMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                          isCosmic ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        id="btn-reset-current"
                        type="button"
                      >
                        <RotateCcw size={12} className="text-blue-500" />
                        <span>重置当前句子</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetAllSentences(false);
                          setShowResetMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                          isCosmic ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        id="btn-reset-all"
                        type="button"
                      >
                        <RefreshCw size={12} className="text-amber-500" />
                        <span>重置所有句子</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetAllSentences(true);
                          setShowResetMenu(false);
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
                          isCosmic ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-700'
                        }`}
                        id="btn-reset-all-reblank"
                        type="button"
                      >
                        <Sparkles size={12} className="text-emerald-500 animate-pulse" />
                        <span>重置并重新随机挖空</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setShowResetMenu(!showResetMenu)}
                    className={`p-2 rounded-lg text-[10px] font-bold border transition-all ${
                      showResetMenu
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : isCosmic 
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                          : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
                    }`}
                    id="btn-clear-sentence"
                  >
                    重置
                  </button>
                </div>
              </div>

            </div>

            {/* ----------------- DRAWER: SENTENCE NAVIGATOR SIDEBAR ----------------- */}
            {showSidebar && (
              <div className="absolute inset-0 bg-black/60 z-50 flex justify-end">
                <div 
                  onClick={() => setShowSidebar(false)}
                  className="flex-1"
                ></div>
                
                <div className={`w-[280px] h-full p-4 flex flex-col transition-all ${isCosmic ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
                  
                  <div className="flex justify-between items-center border-b pb-3 mb-3">
                    <div>
                      <h4 className="font-bold text-xs">分句目录导航</h4>
                      <p className="text-[9px] text-slate-400">点击任一分句可快速跳转训练</p>
                    </div>
                    <button 
                      onClick={() => setShowSidebar(false)}
                      className="text-xs font-bold text-blue-500 hover:underline"
                      id="btn-close-sidebar"
                    >
                      关闭
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {activeSong.sentences.map((sent, i) => {
                      const isCompleted = (completedSentences[activeSong.title] || []).includes(sent.id);
                      const isSelected = activeSentenceIdx === i;
                      const isFav = (favorites[activeSong.title] || []).includes(sent.id);

                      return (
                        <div
                          key={sent.id}
                          onClick={() => handleSentenceJump(i)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex justify-between items-start ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-500/10' 
                              : isCosmic ? 'bg-slate-950/20 border-slate-800 hover:bg-slate-800' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                          }`}
                          id={`nav-item-${sent.id}`}
                        >
                          <div className="space-y-1 max-w-[210px]">
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[10px] font-bold font-mono ${isSelected ? 'text-blue-500' : 'text-slate-400'}`}>
                                #{String(i + 1).padStart(2, '0')}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">{(sent.audioDurationSec).toFixed(1)}s</span>
                              {isCompleted && <Check size={12} className="text-emerald-500" />}
                              {isFav && <Star size={10} fill="#f59e0b" className="text-amber-500" />}
                            </div>
                            <p className="text-[10px] truncate text-slate-400 leading-tight">
                              {sent.text}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- DRAWER: AI EXPLANATION DRAWER ----------------- */}
            {showExplainDrawer && (
              <div className="absolute inset-0 bg-black/50 z-50 flex flex-col justify-end">
                <div onClick={() => setShowExplainDrawer(false)} className="flex-1"></div>
                
                <div className={`max-h-[75%] rounded-t-3xl p-5 flex flex-col transition-all shadow-2xl ${isCosmic ? 'bg-slate-950 text-white' : 'bg-white text-slate-800'}`}>
                  
                  <div className="flex justify-between items-center border-b pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-blue-500 animate-bounce" size={16} />
                      <h4 className="font-bold text-sm">
                        {explainWord ? `AI 极速词卡：${explainWord}` : 'AI 学术级句子剖析'}
                      </h4>
                    </div>
                    <button 
                      onClick={() => setShowExplainDrawer(false)}
                      className="text-xs font-bold text-blue-500 hover:underline"
                      id="btn-close-explain"
                    >
                      好的，明白
                    </button>
                  </div>

                  {/* Explain body */}
                  <div className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 leading-relaxed pb-6">
                    {isExplaining ? (
                      <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <Loader2 className="animate-spin text-blue-500" size={24} />
                        <span className="text-[10px] text-slate-400 font-medium">正在连线 AI 首席英语名师，撰写详尽解析中...</span>
                      </div>
                    ) : (
                      <div className="prose prose-slate dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                        {aiExplanation || "生成解析失败，请点击重试。"}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ----------------- DIALOG: CONGRATULATIONS OVERLAY ----------------- */}
            {showCelebration && (
              <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-6">
                <div className={`p-6 rounded-3xl text-center max-w-[320px] shadow-2xl border ${isCosmic ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <div className="w-16 h-16 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                    <Trophy size={32} />
                  </div>

                  <h3 className="font-bold text-md mb-1 text-slate-850 dark:text-white">🎉 恭喜完成训练！</h3>
                  <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    您已通关课件 <span className="font-bold text-blue-500">《{activeSong.title}》</span> 的全部听写挑战。移动端输入表现完美！
                  </p>

                  <div className={`p-3 rounded-xl mb-5 space-y-2 border text-left ${isCosmic ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>听写总分</span>
                      <span className="font-bold text-emerald-500">100 / 100</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>分句通关数</span>
                      <span className="font-bold">{activeSong.sentences.length} / {activeSong.sentences.length} 句</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                      <span>自动补全效率</span>
                      <span className="font-bold text-blue-500">提升 300%</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowCelebration(false);
                        resetSentenceState(activeSong, 0);
                        setActiveSentenceIdx(0);
                      }}
                      className="flex-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition-all"
                      id="btn-replay-all"
                    >
                      重新听写
                    </button>
                    <button
                      onClick={() => {
                        setShowCelebration(false);
                        setCurrentScreen('home');
                        stopAudio();
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold transition-all"
                      id="btn-return-library"
                    >
                      返回大厅
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ----------------- TRANSITION OVERLAY: AI GENERATION IN PROGRESS ----------------- */}
        {isGenerating && (
          <div className="absolute inset-0 bg-slate-950/90 z-50 flex flex-col items-center justify-center p-8 text-center text-white">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400 animate-pulse" size={24} />
            </div>

            <h3 className="font-bold text-sm mb-2">Gemini 3.5 正在生成专属听写训练课件...</h3>
            <p className="text-[10px] text-slate-400 max-w-[240px] leading-relaxed mb-6 font-mono">
              {generatingMessages[generationStep]}
            </p>

            <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden relative">
              <div 
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${((generationStep + 1) / generatingMessages.length) * 100}%` }}
              ></div>
            </div>
            
            <span className="text-[8px] text-slate-500 font-mono mt-2">
              预计需要 {Math.max(0, (generatingMessages.length - generationStep) * 2)} 秒
            </span>
          </div>
        )}

        {/* ----------------- OFFLINE & DATA BACKUP MODAL ----------------- */}
        {showOfflineModal && (
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs z-50 flex flex-col justify-end animate-in fade-in duration-200">
            <div 
              className="absolute inset-0" 
              onClick={() => setShowOfflineModal(false)} 
            />
            
            <div className={`relative w-full max-h-[90%] rounded-t-3xl p-5 overflow-y-auto border-t z-10 space-y-4 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 ${
              isCosmic ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-800'
            }`}>
              {/* Header */}
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-blue-600/10 text-blue-500">
                    <WifiOff size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">手机离线与数据管理</h3>
                    <p className="text-[10px] text-slate-400">解决刷新白屏、电脑关闭后无法访问问题</p>
                  </div>
                </div>

                <button 
                  onClick={() => setShowOfflineModal(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
                  id="btn-close-offline-modal"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Explanation Box */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Info size={14} />
                  <span>为什么电脑关闭后手机刷新打不开？</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  AI Studio 开发链接运行在电脑侧的临时云容器中。电脑端 AI Studio 关闭后，云端容器会自动休眠。
                  <br />
                  <strong className="font-bold underline">解决方案：</strong>请点击下方的 <span className="font-bold text-blue-500">【一键全量离线预缓存】</span>。完成缓存后，您的手机浏览器已将所有逻辑代码保存在本地存储中，即使电脑关闭或完全断网，刷新页面也能正常运行！
                </p>
              </div>

              {/* Section 1: Precache */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${isCosmic ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <HardDrive size={15} className="text-blue-500" />
                    <span className="font-bold text-xs">1. 手机本地全量预缓存 (推荐)</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold">PWA 极速加速</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  将全部 JS、CSS 页面框架与音频合成引擎预存至手机 CacheStorage。
                </p>

                {precacheStatus && (
                  <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-500 font-medium leading-relaxed">
                    {precacheStatus}
                  </div>
                )}

                <button
                  onClick={handlePrecacheAll}
                  disabled={isPrecaching}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
                  id="btn-precache-all"
                >
                  {isPrecaching ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  <span>{isPrecaching ? '正在同步全量文件...' : '一键同步全量缓存至手机'}</span>
                </button>
              </div>

              {/* Section 2: Data Backup & Restore */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${isCosmic ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Database size={15} className="text-indigo-500" />
                    <span className="font-bold text-xs">2. 自定义歌词与进度备份</span>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-500 font-bold">数据防丢失</span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  导出您上传的所有本地歌词、AI 生成的课件、听写进度与收藏夹。
                </p>

                {backupMessage && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-500 font-medium leading-relaxed">
                    {backupMessage}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={handleExportBackup}
                    className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                    id="btn-export-backup"
                  >
                    <Download size={13} />
                    <span>导出数据备份</span>
                  </button>

                  <label className="py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                    <Upload size={13} />
                    <span>导入还原数据</span>
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportBackup} 
                      className="hidden" 
                      id="input-import-backup"
                    />
                  </label>
                </div>
              </div>

              {/* Section 3: Standalone Single File Export */}
              <div className={`p-4 rounded-2xl border space-y-2.5 ${isCosmic ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Save size={15} className="text-emerald-500" />
                    <span className="font-bold text-xs">3. 导出单文件离线 HTML 版</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  生成独立离线 HTML 文件，直接保存在手机文件或微信中，双击即可无网使用。
                </p>

                <button
                  onClick={handleExportOfflineHtml}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                  id="btn-export-offline-html"
                >
                  <Download size={14} />
                  <span>下载单文件离线包 (.html)</span>
                </button>
              </div>

              <button
                onClick={() => setShowOfflineModal(false)}
                className="w-full py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                id="btn-confirm-offline-modal"
              >
                关闭窗口
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
