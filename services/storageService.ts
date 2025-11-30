import { Material, VocabularyItem, GrammarItem, UserStats, LearningTrend, WeaknessAnalysis, ReviewTask } from '../types';

const KEYS = {
  MATERIALS: 'del_materials',
  VOCABULARY: 'del_vocabulary',
  GRAMMAR: 'del_grammar',
  STATS: 'del_stats',
  SPEAKING: 'del_speaking_sentences'
};

// Initial Mock Data
const MOCK_MATERIALS: Material[] = [
  {
    id: '1',
    title: 'The Future of AI Technology',
    type: 'audio',
    duration: '3:45',
    source: 'Tech Daily',
    difficulty: 'intermediate',
    topic: 'Technology',
    thumbnail: 'https://picsum.photos/400/300?random=1',
    audioUrl: '', 
    transcript: "00:00 Artificial Intelligence is rapidly changing the world we live in. 00:05 From self-driving cars to personalized medicine, the possibilities seem endless.",
    createdAt: Date.now()
  },
  {
    id: '2',
    title: 'Business Negotiation Tips',
    type: 'video',
    duration: '5:20',
    source: 'BizWorld',
    difficulty: 'advanced',
    topic: 'Business',
    thumbnail: 'https://picsum.photos/400/300?random=2',
    transcript: "00:00 When entering a negotiation, it is crucial to understand your counterpart's position. 00:06 Always aim for a win-win situation.",
    createdAt: Date.now() - 86400000
  },
  {
    id: '3',
    title: 'Daily Conversation: At the Cafe',
    type: 'audio',
    duration: '1:30',
    source: 'Daily English',
    difficulty: 'beginner',
    topic: 'Culture',
    thumbnail: 'https://picsum.photos/400/300?random=3',
    transcript: "00:00 Hi, I would like to order a medium latte with oat milk, please. 00:05 Sure, would you like anything else to eat?",
    createdAt: Date.now() - 172800000
  }
];

const MOCK_VOCABULARY: VocabularyItem[] = [
    {
        id: 'v1',
        word: 'Phenomenon',
        context: 'Natural Science',
        definition: 'A fact or situation that is observed to exist or happen.',
        translation: '现象',
        addedAt: Date.now() - 86400000 * 2,
        nextReviewAt: Date.now() - 10000, // Due now
        stage: 1
    },
    {
        id: 'v2',
        word: 'Simultaneously',
        context: 'Tech Daily',
        definition: 'At the same time.',
        translation: '同时地',
        addedAt: Date.now() - 86400000,
        nextReviewAt: Date.now() + 86400000 * 2, // Due in 2 days
        stage: 2
    },
    {
        id: 'v3',
        word: 'Accommodate',
        context: 'Travel Guide',
        definition: 'Provide lodging or sufficient space for.',
        translation: '容纳',
        addedAt: Date.now() - 86400000 * 5,
        nextReviewAt: Date.now() - 5000, // Due now
        stage: 3
    }
];

const MOCK_GRAMMAR: GrammarItem[] = [
    {
        id: 'g1',
        sentence: 'If I had known, I would have called you.',
        rule: 'Third Conditional',
        explanation: 'Used to talk about imaginary situations in the past.',
        addedAt: Date.now() - 86400000 * 1,
        nextReviewAt: Date.now() - 2000, // Due now
        stage: 1
    },
    {
        id: 'g2',
        sentence: 'She is used to waking up early.',
        rule: 'Be used to + V-ing',
        explanation: 'Familiar with something.',
        addedAt: Date.now(),
        nextReviewAt: Date.now() + 86400000, // Due tomorrow
        stage: 0
    }
];

const MOCK_TRENDS: LearningTrend[] = [
  { date: 'Mon', accuracy: 65, fluency: 70 },
  { date: 'Tue', accuracy: 68, fluency: 72 },
  { date: 'Wed', accuracy: 75, fluency: 68 },
  { date: 'Thu', accuracy: 72, fluency: 75 },
  { date: 'Fri', accuracy: 80, fluency: 78 },
  { date: 'Sat', accuracy: 85, fluency: 82 },
  { date: 'Sun', accuracy: 88, fluency: 85 },
];

const MOCK_WEAKNESS: WeaknessAnalysis = {
  errorWords: [
    { word: 'Accommodate', count: 12 },
    { word: 'Phenomenon', count: 8 },
    { word: 'Lieutenant', count: 5 }
  ],
  pronunciation: [
    { phoneme: '/θ/ (think)', score: 65 },
    { phoneme: '/v/ (very)', score: 72 },
    { phoneme: '/r/ (red)', score: 78 }
  ],
  grammarPoints: [
    { rule: 'Present Perfect', frequency: 15 },
    { rule: 'Third Conditional', frequency: 8 },
    { rule: 'Articles (a/an/the)', frequency: 22 }
  ]
};

const DEFAULT_SPEAKING_SENTENCES = [
    "00:00 The quick brown fox jumps over the lazy dog.",
    "00:05 Artificial intelligence is transforming industries worldwide.",
    "00:10 I would like to schedule a meeting for next Tuesday."
];

// Intervals in days for Ebbinghaus: 1, 2, 4, 7, 15, 30
const REVIEW_INTERVALS = [1, 2, 4, 7, 15, 30];

export const getMaterials = (): Material[] => {
  const data = localStorage.getItem(KEYS.MATERIALS);
  if (!data) {
    localStorage.setItem(KEYS.MATERIALS, JSON.stringify(MOCK_MATERIALS));
    return MOCK_MATERIALS;
  }
  return JSON.parse(data);
};

export const saveMaterial = (material: Material) => {
  const materials = getMaterials();
  const newMaterials = [material, ...materials];
  localStorage.setItem(KEYS.MATERIALS, JSON.stringify(newMaterials));
  return newMaterials;
};

export const updateMaterial = (updatedMaterial: Material) => {
  const materials = getMaterials();
  const newMaterials = materials.map(m => m.id === updatedMaterial.id ? updatedMaterial : m);
  localStorage.setItem(KEYS.MATERIALS, JSON.stringify(newMaterials));
  return newMaterials;
};

export const getVocabulary = (): VocabularyItem[] => {
  const data = localStorage.getItem(KEYS.VOCABULARY);
  if (!data) {
      localStorage.setItem(KEYS.VOCABULARY, JSON.stringify(MOCK_VOCABULARY));
      return MOCK_VOCABULARY;
  }
  return JSON.parse(data);
};

export const addVocabulary = (item: Partial<VocabularyItem>) => {
  const list = getVocabulary();
  const newItem: VocabularyItem = {
      id: item.id || crypto.randomUUID(),
      word: item.word || '',
      context: item.context || '',
      definition: item.definition || '',
      translation: item.translation || '',
      addedAt: Date.now(),
      nextReviewAt: Date.now() + 86400000, // Due in 1 day by default
      stage: 0
  };
  localStorage.setItem(KEYS.VOCABULARY, JSON.stringify([newItem, ...list]));
};

export const getGrammar = (): GrammarItem[] => {
  const data = localStorage.getItem(KEYS.GRAMMAR);
  if (!data) {
      localStorage.setItem(KEYS.GRAMMAR, JSON.stringify(MOCK_GRAMMAR));
      return MOCK_GRAMMAR;
  }
  return JSON.parse(data);
};

export const addGrammar = (item: Partial<GrammarItem>) => {
  const list = getGrammar();
  const newItem: GrammarItem = {
      id: item.id || crypto.randomUUID(),
      sentence: item.sentence || '',
      rule: item.rule || '',
      explanation: item.explanation || '',
      addedAt: Date.now(),
      nextReviewAt: Date.now() + 86400000, // Due in 1 day by default
      stage: 0
  };
  localStorage.setItem(KEYS.GRAMMAR, JSON.stringify([newItem, ...list]));
};

// Ebbinghaus Logic
export const getReviewItems = (): ReviewTask[] => {
    const vocab = getVocabulary();
    const grammar = getGrammar();
    
    const vocabTasks: ReviewTask[] = vocab.map(v => ({
        id: v.id,
        title: v.word,
        type: 'word',
        nextReviewAt: v.nextReviewAt
    }));

    const grammarTasks: ReviewTask[] = grammar.map(g => ({
        id: g.id,
        title: g.rule,
        type: 'grammar',
        nextReviewAt: g.nextReviewAt
    }));

    return [...vocabTasks, ...grammarTasks].sort((a, b) => a.nextReviewAt - b.nextReviewAt);
};

export const markReviewComplete = (id: string, type: 'word' | 'grammar') => {
    const now = Date.now();
    if (type === 'word') {
        const list = getVocabulary();
        const updated = list.map(item => {
            if (item.id === id) {
                const nextStage = Math.min(item.stage + 1, REVIEW_INTERVALS.length - 1);
                const daysToAdd = REVIEW_INTERVALS[nextStage];
                return {
                    ...item,
                    stage: nextStage,
                    nextReviewAt: now + (daysToAdd * 86400000)
                };
            }
            return item;
        });
        localStorage.setItem(KEYS.VOCABULARY, JSON.stringify(updated));
    } else {
        const list = getGrammar();
        const updated = list.map(item => {
            if (item.id === id) {
                const nextStage = Math.min(item.stage + 1, REVIEW_INTERVALS.length - 1);
                const daysToAdd = REVIEW_INTERVALS[nextStage];
                return {
                    ...item,
                    stage: nextStage,
                    nextReviewAt: now + (daysToAdd * 86400000)
                };
            }
            return item;
        });
        localStorage.setItem(KEYS.GRAMMAR, JSON.stringify(updated));
    }
};

export const getStats = (): UserStats => {
  const data = localStorage.getItem(KEYS.STATS);
  return data ? JSON.parse(data) : {
    totalHours: 12.5,
    materialsCompleted: 24,
    streakDays: 5,
    todayMinutes: 24
  };
};

export const getTrends = (): LearningTrend[] => {
    return MOCK_TRENDS;
};

export const getWeaknessAnalysis = (): WeaknessAnalysis => {
    return MOCK_WEAKNESS;
};

export const getSpeakingSentences = (): string[] => {
    const data = localStorage.getItem(KEYS.SPEAKING);
    return data ? JSON.parse(data) : DEFAULT_SPEAKING_SENTENCES;
};

export const addSpeakingSentences = (sentences: string[]) => {
    const current = getSpeakingSentences();
    const uniqueNew = sentences.filter(s => !current.includes(s));
    const updated = [...uniqueNew, ...current];
    localStorage.setItem(KEYS.SPEAKING, JSON.stringify(updated));
    return updated;
};