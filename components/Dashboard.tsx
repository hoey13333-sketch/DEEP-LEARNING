import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell } from 'recharts';
import { getStats, getTrends, getWeaknessAnalysis, getReviewItems, markReviewComplete } from '../services/storageService';
import { UserStats, LearningTrend, WeaknessAnalysis, ReviewTask } from '../types';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [trends, setTrends] = useState<LearningTrend[]>([]);
  const [weakness, setWeakness] = useState<WeaknessAnalysis | null>(null);
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([]);
  const [dueCount, setDueCount] = useState(0);

  useEffect(() => {
    setStats(getStats());
    setTrends(getTrends());
    setWeakness(getWeaknessAnalysis());
    refreshReviews();
  }, []);

  const refreshReviews = () => {
      const items = getReviewItems();
      setReviewTasks(items);
      const now = Date.now();
      const count = items.filter(i => i.nextReviewAt <= now).length;
      setDueCount(count);
  };

  const handleStartReview = () => {
      // Simulate completing all due items
      const now = Date.now();
      const dueItems = reviewTasks.filter(i => i.nextReviewAt <= now);
      
      dueItems.forEach(item => {
          markReviewComplete(item.id, item.type);
      });
      
      alert(`已完成 ${dueItems.length} 项复习任务！记忆曲线已更新。`);
      refreshReviews();
  };

  const getDueLabel = (timestamp: number) => {
      const diff = timestamp - Date.now();
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      if (diff <= 0) return '今天';
      if (days === 1) return '明天';
      return `${days}天后`;
  };

  if (!stats || !weakness) return null;

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 max-w-7xl mx-auto fade-in">
      {/* Header */}
      <header className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900">学习看板</h2>
            <p className="text-sm md:text-base text-gray-500 mt-1">追踪学习进度，攻克薄弱环节。</p>
        </div>
        <div className="text-left md:text-right w-full md:w-auto bg-white md:bg-transparent p-4 md:p-0 rounded-xl md:rounded-none shadow-sm md:shadow-none">
            <p className="text-sm text-gray-400">连续坚持</p>
            <div className="flex items-center gap-2 text-orange-500 font-bold text-xl">
                <span>🔥</span> {stats.streakDays} 天
            </div>
        </div>
      </header>

      {/* 1. Core Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard 
            title="今日学习" 
            value={`${stats.todayMinutes}分钟`} 
            subtitle="目标: 60分钟" 
            color="bg-blue-500"
            icon="⏱️"
        />
        <StatCard 
            title="完成材料" 
            value={stats.materialsCompleted.toString()} 
            subtitle="累计完成" 
            color="bg-purple-500"
            icon="✅"
        />
        <StatCard 
            title="词汇积累" 
            value="142" 
            subtitle="本周新增 +12" 
            color="bg-green-500"
            icon="📚"
        />
        <StatCard 
            title="总时长" 
            value={`${stats.totalHours}小时`} 
            subtitle="沉浸时长" 
            color="bg-indigo-500"
            icon="⏳"
        />
      </div>

      {/* 2. Progress Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dual Line Chart: Accuracy vs Fluency */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 min-h-[320px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
            <div>
                <h3 className="text-lg font-bold text-gray-800">学习趋势</h3>
                <p className="text-xs text-gray-400">听写准确率 vs 口语流利度</p>
            </div>
            <div className="flex gap-4 text-xs font-medium">
                <span className="flex items-center gap-1 text-[#6a11cb]"><span className="w-2 h-2 rounded-full bg-[#6a11cb]"></span> 听写准确率</span>
                <span className="flex items-center gap-1 text-[#2575fc]"><span className="w-2 h-2 rounded-full bg-[#2575fc]"></span> 口语流利度</span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                />
                <Line type="monotone" dataKey="accuracy" stroke="#6a11cb" strokeWidth={3} dot={{r: 4, fill: '#6a11cb', strokeWidth: 0}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="fluency" stroke="#2575fc" strokeWidth={3} dot={{r: 4, fill: '#2575fc', strokeWidth: 0}} activeDot={{r: 6}} />
                </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Ebbinghaus Review Visual */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
             <div className="flex justify-between items-start mb-1">
                 <h3 className="text-lg font-bold text-gray-800">今日复习</h3>
                 {dueCount > 0 && (
                     <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full">{dueCount} 待复习</span>
                 )}
             </div>
             <p className="text-xs text-gray-400 mb-6">基于艾宾浩斯记忆曲线</p>
             
             <div className="flex-1 flex flex-col justify-start space-y-4 overflow-y-auto max-h-[300px] custom-scrollbar pr-2">
                 {reviewTasks.slice(0, 5).map((item) => (
                     <ReviewItem 
                        key={item.id}
                        title={item.title} 
                        type={item.type} 
                        due={getDueLabel(item.nextReviewAt)} 
                     />
                 ))}
                 {reviewTasks.length === 0 && (
                     <p className="text-center text-gray-400 text-sm py-4">暂无复习任务</p>
                 )}
             </div>
             
             <button 
                onClick={handleStartReview}
                disabled={dueCount === 0}
                className="w-full mt-6 py-3 bg-gray-50 text-[#6a11cb] font-semibold rounded-xl text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             >
                 {dueCount > 0 ? `开始复习 (${dueCount}项)` : '今日已完成'}
             </button>
        </div>
      </div>

      {/* 3. Weakness Analysis Reports */}
      <h3 className="text-xl font-bold text-gray-900 mt-8">弱点分析报告</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vocab Weakness */}
          <WeaknessCard
              title="高频拼写错误"
              subtitle="需要重点记忆"
              icon="🅰️"
              color="bg-red-50 text-red-500"
              detailsType="vocab"
          >
              <div className="space-y-3">
                  {weakness.errorWords.map((item, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50">
                          <span className="font-medium text-gray-700">{item.word}</span>
                          <span className="text-xs font-bold text-red-400">{item.count} 次错误</span>
                      </div>
                  ))}
              </div>
          </WeaknessCard>

          {/* Pronunciation Weakness */}
          <WeaknessCard
              title="发音难点"
              subtitle="平均得分较低的音素"
              icon="🎤"
              color="bg-orange-50 text-orange-500"
              detailsType="pronunciation"
          >
              <div className="space-y-4">
                  {weakness.pronunciation.map((item, i) => (
                      <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                              <span className="font-medium text-gray-700">{item.phoneme}</span>
                              <span className="text-orange-500 font-bold">{item.score}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                              <div className="bg-orange-400 h-2 rounded-full" style={{width: `${item.score}%`}}></div>
                          </div>
                      </div>
                  ))}
              </div>
          </WeaknessCard>

          {/* Grammar Weakness */}
          <WeaknessCard
              title="语法薄弱点"
              subtitle="听写中最常出错的语法"
              icon="🔍"
              color="bg-blue-50 text-blue-500"
              detailsType="grammar"
          >
              <div className="space-y-3">
                  {weakness.grammarPoints.map((item, i) => (
                      <div key={i} className="flex items-center gap-3">
                          <span className="text-blue-500 font-bold text-sm">#{i+1}</span>
                          <div className="flex-1 border-b border-gray-100 pb-2">
                              <p className="text-sm font-medium text-gray-700">{item.rule}</p>
                              <p className="text-xs text-gray-400">{item.frequency} 次错误记录</p>
                          </div>
                      </div>
                  ))}
              </div>
          </WeaknessCard>
      </div>
    </div>
  );
};

const WeaknessCard = ({ title, subtitle, icon, color, children, detailsType }: { 
    title: string; 
    subtitle: string; 
    icon: string; 
    color: string; 
    children: React.ReactNode; 
    detailsType: 'vocab' | 'pronunciation' | 'grammar';
}) => {
    const [isExpanded, setIsExpanded] = React.useState(false);

    const getDetails = () => {
        switch(detailsType) {
            case 'vocab':
                return (
                    <div className="mt-4 p-3 bg-red-50/50 rounded-lg text-xs text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-2">
                        <strong>示例句子：</strong><br/>
                        1. The hotel can <em>accommodate</em> up to 500 guests.<br/>
                        2. This is a rare natural <em>phenomenon</em>.<br/>
                        <div className="mt-2 text-red-500 font-medium cursor-pointer hover:underline">查看更多例句 →</div>
                    </div>
                );
            case 'pronunciation':
                return (
                    <div className="mt-4 p-3 bg-orange-50/50 rounded-lg text-xs text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-2">
                        <strong>发音技巧：</strong><br/>
                        • /θ/: 舌尖轻触上齿，气流从舌齿间通过。<br/>
                        • /v/: 上齿轻咬下唇，声带振动。<br/>
                        <div className="mt-2 text-orange-500 font-medium cursor-pointer hover:underline">观看发音教程 →</div>
                    </div>
                );
            case 'grammar':
                return (
                    <div className="mt-4 p-3 bg-blue-50/50 rounded-lg text-xs text-gray-600 leading-relaxed animate-in fade-in slide-in-from-top-2">
                        <strong>知识点解析：</strong><br/>
                        • 现在完成时：Have/Has + Past Participle.<br/>
                        • 虚拟语气：If I had known, I would have...<br/>
                        <div className="mt-2 text-blue-500 font-medium cursor-pointer hover:underline">做专项练习 →</div>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-xl`}>{icon}</div>
                <div>
                    <h4 className="font-bold text-gray-900">{title}</h4>
                    <p className="text-xs text-gray-400">{subtitle}</p>
                </div>
            </div>
            <div className="flex-1">
                {children}
            </div>
            
            {/* Expansion Content */}
            {isExpanded && getDetails()}

            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full mt-4 py-2 text-sm text-gray-500 font-medium bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-1"
            >
                {isExpanded ? '收起详情' : '查看详情'} 
                <span className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>
        </div>
    );
};

const StatCard = ({ title, value, subtitle, color, icon }: any) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-5 transition-transform hover:-translate-y-1">
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white text-2xl shadow-md shrink-0`}>
        {icon}
    </div>
    <div>
      <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</p>
      <p className="text-xs text-gray-400">{subtitle}</p>
    </div>
  </div>
);

const ReviewItem = ({ title, type, due }: any) => (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer group">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${type === 'word' ? 'bg-green-400' : type === 'grammar' ? 'bg-blue-400' : 'bg-purple-400'}`}></div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{title}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-md ${due === '今天' ? 'bg-red-50 text-red-500 font-bold' : 'bg-gray-100 text-gray-500'}`}>
            {due}
        </span>
    </div>
);

export default Dashboard;