import React, { useEffect, useState } from 'react';
import { getVocabulary, getGrammar } from '../services/storageService';
import { VocabularyItem, GrammarItem } from '../types';

const VocabularyLab: React.FC<{view: 'vocabulary' | 'grammar'}> = ({ view }) => {
  const [vocabList, setVocabList] = useState<VocabularyItem[]>([]);
  const [grammarList, setGrammarList] = useState<GrammarItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (view === 'vocabulary') {
        setVocabList(getVocabulary());
    } else {
        setGrammarList(getGrammar());
    }
  }, [view]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto fade-in">
        <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-gray-900">
            {view === 'vocabulary' ? '我的词汇库' : '语法句型库'}
        </h2>
        
        <div className="space-y-4">
            {(view === 'vocabulary' ? vocabList : grammarList).map((item: any) => (
                <div 
                    key={item.id} 
                    className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                >
                    <div className="p-4 md:p-5 flex justify-between items-center">
                        <div className="overflow-hidden">
                            <h3 className="text-lg font-bold text-gray-800 truncate">
                                {view === 'vocabulary' ? item.word : item.sentence}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1 truncate">
                                来源: {view === 'vocabulary' ? item.context : item.explanation}
                            </p>
                        </div>
                        <div className={`transform transition-transform duration-300 ml-4 ${expandedId === item.id ? 'rotate-180' : ''}`}>
                            ▼
                        </div>
                    </div>
                    
                    {/* Expanded Detail View */}
                    <div 
                        className={`bg-gray-50 border-t border-gray-100 transition-all duration-300 ease-in-out ${
                            expandedId === item.id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                    >
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                             <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">英文释义 / 规则</h4>
                                 <p className="text-gray-800 leading-relaxed text-sm md:text-base">
                                    {view === 'vocabulary' ? item.definition : item.rule}
                                 </p>
                             </div>
                             <div>
                                 <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">中文翻译 / 笔记</h4>
                                 <p className="text-gray-800 leading-relaxed text-sm md:text-base">
                                     {view === 'vocabulary' ? item.translation : item.explanation}
                                 </p>
                             </div>
                             <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-200/50 mt-2">
                                 <button className="text-sm text-gray-500 hover:text-red-500 transition-colors">删除</button>
                                 <button className="text-sm text-[#6a11cb] font-medium hover:underline">去复习 →</button>
                             </div>
                        </div>
                    </div>
                </div>
            ))}
            
            {(view === 'vocabulary' ? vocabList : grammarList).length === 0 && (
                <div className="text-center py-20 text-gray-400">
                    <p className="text-xl mb-2">暂无内容</p>
                    <p className="text-sm px-4">在听力练习中遇到生词或难句时，选中即可添加到这里。</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default VocabularyLab;