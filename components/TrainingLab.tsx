import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ModelType, TrainingMetric, CoupletResult, TrainingParams } from '../types';
import { generateCouplet } from '../services/geminiService';

interface Props {
  modelType: ModelType;
}

const PRESET_COUPLETS = [
  "宋城千古情", // Short
  "西湖美景三月天", // Medium
  "春风吹柳绿", // Short simple
  "断桥残雪寻芳迹", // Medium
  "八百里湖山知是何年图画", // Long (Classic)
  "烟雨迷蒙锁西湖，断桥伞下觅情缘", // Long (Complex Context)
  "看今朝宋城盛世，忆往昔临安繁华" // Long (Contrast/Memory heavy)
];

const TrainingLab: React.FC<Props> = ({ modelType }) => {
  // === State Management ===
  const [params, setParams] = useState<TrainingParams>({ epochs: 50, learningRate: 0.01 });
  const [status, setStatus] = useState<'idle' | 'training' | 'completed'>('idle');
  
  // Training Data
  const [metrics, setMetrics] = useState<TrainingMetric[]>([]);
  const [progress, setProgress] = useState(0);
  const [finalLoss, setFinalLoss] = useState<number>(1.0);

  // Testing Data
  const [testInput, setTestInput] = useState('宋城千古情');
  const [isGenerating, setIsGenerating] = useState(false);
  const [testResult, setTestResult] = useState<CoupletResult | null>(null);

  const trainingRef = useRef<number | undefined>(undefined);

  // Reset when model changes
  useEffect(() => {
    resetLab();
  }, [modelType]);

  // When parameters change, we must force re-training to test
  const handleParamChange = (newParams: Partial<TrainingParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
    if (status === 'completed') {
      setStatus('idle'); // Invalidate previous training
      setTestResult(null);
    }
  };

  const resetLab = () => {
    setStatus('idle');
    setMetrics([]);
    setProgress(0);
    setTestResult(null);
    setFinalLoss(1.0);
    if (trainingRef.current) clearTimeout(trainingRef.current);
  };

  // === Phase 1: Training Simulation Logic ===
  const startTraining = () => {
    setStatus('training');
    setMetrics([]);
    setTestResult(null);
    setProgress(0);
    
    let currentEpoch = 0;
    const totalEpochs = params.epochs;
    
    // Simulation Parameters based on User Input
    // Optimal LR is around 0.01. 
    // Too high (0.1) -> Jittery, higher final loss. 
    // Too low (0.001) -> Slow convergence.
    const lrFactor = params.learningRate === 0.01 ? 1.0 : params.learningRate > 0.05 ? 0.5 : 0.8; 
    const targetLoss = 0.05 + (Math.random() * 0.1) + (params.learningRate > 0.05 ? 0.2 : 0); // High LR = higher min loss
    
    const trainStep = () => {
      currentEpoch++;
      
      // Calculate Loss
      // Formula creates a curve that drops fast then plateaus
      const progressRatio = currentEpoch / totalEpochs;
      const decay = Math.exp(-progressRatio * 5 * lrFactor); 
      
      // Add noise based on Learning Rate
      const noiseMagnitude = params.learningRate * 2; 
      const noise = (Math.random() - 0.5) * noiseMagnitude;
      
      let currentLoss = targetLoss + (decay * (1 - targetLoss)) + noise;
      currentLoss = Math.max(0, Math.min(1, currentLoss)); // Clamp 0-1

      // Model specific quirks
      if (modelType === 'rnn' && progressRatio > 0.5) {
        currentLoss += (Math.random() * 0.05); // RNN slight instability
      }

      setMetrics(prev => {
        const newMetrics = [...prev, { 
          epoch: currentEpoch, 
          loss: parseFloat(currentLoss.toFixed(3)),
          accuracy: parseFloat((1 - currentLoss).toFixed(3))
        }];
        // Keep chart readable, max 50 points
        if (newMetrics.length > 50) return newMetrics.slice(newMetrics.length - 50);
        return newMetrics;
      });
      
      setProgress((currentEpoch / totalEpochs) * 100);

      if (currentEpoch < totalEpochs) {
        // Speed varies by model complexity simulation
        const speed = modelType === 'fnn' ? 30 : modelType === 'rnn' ? 50 : 60;
        trainingRef.current = window.setTimeout(trainStep, speed);
      } else {
        // Finished
        setStatus('completed');
        setFinalLoss(currentLoss);
      }
    };

    trainStep();
  };

  // === Phase 2: Testing Logic ===
  const handleGenerate = async () => {
    if (!testInput.trim()) return;
    setIsGenerating(true);
    setTestResult(null);

    // Call Gemini with the context of how well we trained
    const result = await generateCouplet(testInput, modelType, {
      loss: finalLoss,
      epochs: params.epochs
    });

    setTestResult(result);
    setIsGenerating(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
          模型训练实验室
        </h2>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
          status === 'completed' 
            ? 'bg-green-100 text-green-700 border-green-200' 
            : status === 'training'
            ? 'bg-blue-100 text-blue-700 border-blue-200'
            : 'bg-gray-100 text-gray-600 border-gray-200'
        }`}>
          状态: {status === 'idle' ? '待训练' : status === 'training' ? '训练中...' : '训练完成'}
        </div>
      </div>

      <div className="flex flex-col md:flex-row h-full overflow-hidden">
        
        {/* LEFT COLUMN: Configuration & Training */}
        <div className="w-full md:w-1/3 p-6 border-r border-gray-100 bg-gray-50/30 flex flex-col gap-6 overflow-y-auto">
          
          {/* 1. Parameter Config */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              1. 参数配置
            </h3>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">训练轮次 (Epochs)</label>
                  <span className="text-sm text-blue-600 font-bold">{params.epochs}</span>
                </div>
                <input 
                  type="range" min="10" max="100" step="10"
                  value={params.epochs}
                  onChange={(e) => handleParamChange({ epochs: Number(e.target.value) })}
                  disabled={status === 'training'}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                  <p className="mb-1"><span className="font-bold text-gray-700">定义：</span>模型完整浏览所有训练数据的次数。</p>
                  <ul className="list-disc list-inside space-y-0.5 text-gray-500">
                    <li><strong>太少：</strong>模型学得不充分（欠拟合）。</li>
                    <li><strong>太多：</strong>浪费时间且可能死记硬背（过拟合）。</li>
                  </ul>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">学习率 (Learning Rate)</label>
                <div className="grid grid-cols-3 gap-2">
                  {[0.1, 0.01, 0.001].map(lr => (
                    <button
                      key={lr}
                      onClick={() => handleParamChange({ learningRate: lr })}
                      disabled={status === 'training'}
                      className={`py-2 text-xs font-bold rounded border transition-all ${
                        params.learningRate === lr
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {lr}
                    </button>
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-100">
                  <p className="mb-1"><span className="font-bold text-gray-700">定义：</span>模型每次修正错误的幅度。</p>
                  <ul className="space-y-1">
                    <li className={`${params.learningRate === 0.1 ? "text-red-600 font-bold" : ""}`}>• 0.1 (过大)：步子太大，Loss 易震荡。</li>
                    <li className={`${params.learningRate === 0.01 ? "text-green-600 font-bold" : ""}`}>• 0.01 (适中)：稳步下降 (推荐)。</li>
                    <li className={`${params.learningRate === 0.001 ? "text-yellow-600 font-bold" : ""}`}>• 0.001 (过小)：步子太小，收敛极慢。</li>
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={startTraining}
              disabled={status === 'training'}
              className={`w-full py-3 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
                status === 'training' 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md'
              }`}
            >
              {status === 'training' ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  训练中...
                </>
              ) : status === 'completed' ? '重新训练' : '开始训练'}
            </button>
          </div>

          {/* 2. Loss Chart */}
          <div className="flex-1 min-h-[200px] flex flex-col">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">2. 训练监控</h3>
            <div className="bg-white p-2 rounded-lg shadow-sm border border-gray-200 flex-1 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="epoch" hide />
                  <YAxis domain={[0, 1]} hide />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', fontSize: '12px' }}
                    labelFormatter={(label) => `轮次: ${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="loss" 
                    stroke="#EF4444" 
                    strokeWidth={2} 
                    dot={false} 
                    isAnimationActive={false}
                    name="Loss (损失)"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="absolute top-2 right-2 text-xs font-mono text-gray-400">
                Loss: {metrics.length > 0 ? metrics[metrics.length-1].loss.toFixed(3) : '-.--'}
              </div>
            </div>
            
            {/* Progress Bar */}
            {status === 'training' && (
              <div className="mt-2 h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Testing Area */}
        <div className="w-full md:w-2/3 p-6 flex flex-col relative overflow-hidden bg-white">
          
          <div className={`transition-all duration-500 flex flex-col h-full ${status !== 'completed' ? 'opacity-50 blur-[1px] pointer-events-none select-none' : 'opacity-100'}`}>
             <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center justify-between">
                <span>3. 结果测试</span>
                {status === 'completed' && <span className="text-xs normal-case font-normal text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">模型已就绪 (Loss: {finalLoss.toFixed(3)})</span>}
             </h3>

             {/* Input Area with Presets */}
             <div className="mb-6">
                <div className="flex gap-4 mb-3">
                  <input 
                    type="text" 
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    placeholder="输入上联，例如：西湖美景三月天"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg shadow-sm"
                  />
                  <button 
                    onClick={handleGenerate}
                    disabled={isGenerating || status !== 'completed'}
                    className="px-8 py-3 bg-orange-500 text-white rounded-xl font-bold shadow-md hover:bg-orange-600 disabled:bg-gray-300 transition-all shrink-0"
                  >
                    {isGenerating ? '生成中...' : '生成下联'}
                  </button>
                </div>
                
                {/* Preset Chips */}
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-gray-400 mr-1">推荐上联 (建议尝试长句以区分 RNN/LSTM):</span>
                  {PRESET_COUPLETS.map((text) => (
                    <button
                      key={text}
                      onClick={() => setTestInput(text)}
                      className="px-3 py-1 bg-gray-50 hover:bg-blue-50 hover:text-blue-600 border border-gray-200 rounded-full text-xs text-gray-600 transition-all cursor-pointer"
                    >
                      {text}
                    </button>
                  ))}
                </div>
             </div>

             {/* Result Stage */}
             <div className="flex-1 bg-orange-50/50 rounded-2xl border-2 border-dashed border-orange-100 flex flex-col items-center justify-center p-8 relative overflow-y-auto">
               
               {!testResult ? (
                 <div className="text-center text-gray-400">
                   <div className="mb-4 text-4xl opacity-20">🪶</div>
                   <p>请在左侧完成训练后<br/>在此处测试模型效果</p>
                 </div>
               ) : (
                 <div className="w-full max-w-2xl animate-fade-in flex flex-col gap-8">
                    
                    {/* Quality Indicator */}
                    <div className="flex justify-center">
                       <div className={`px-4 py-1 rounded-full text-sm font-bold flex items-center gap-2 border ${
                         (testResult.qualityScore || 0) > 80 ? 'bg-green-100 text-green-700 border-green-200' :
                         (testResult.qualityScore || 0) > 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                         'bg-red-100 text-red-700 border-red-200'
                       }`}>
                          <span>模型表现评分: {testResult.qualityScore}</span>
                       </div>
                    </div>

                    {/* Couplet Display */}
                    <div className="flex flex-row justify-center gap-12 md:gap-20">
                      {/* Upper */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs font-serif mb-2 shadow-lg">上联</div>
                        <div className="bg-white px-5 py-6 rounded-lg shadow-sm border-l-4 border-gray-700 text-2xl font-serif writing-mode-vertical min-h-[200px] text-gray-800 tracking-widest">
                          {testResult.upper}
                        </div>
                      </div>

                      {/* Lower */}
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-orange-600 text-white flex items-center justify-center text-xs font-serif mb-2 shadow-lg">下联</div>
                        <div className="bg-white px-5 py-6 rounded-lg shadow-md border-l-4 border-orange-600 text-2xl font-serif writing-mode-vertical min-h-[200px] text-gray-800 tracking-widest">
                          {testResult.lower}
                        </div>
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 text-sm text-gray-600 leading-relaxed mt-4">
                      <span className="text-orange-600 font-bold block mb-1">🔍 神经网络分析:</span>
                      {testResult.explanation}
                    </div>
                 </div>
               )}
             </div>
          </div>

          {/* Locked Overlay */}
          {status !== 'completed' && (
             <div className="absolute inset-0 flex items-center justify-center z-10">
               <div className="bg-white/90 backdrop-blur-sm px-8 py-6 rounded-2xl shadow-xl text-center border border-gray-100 max-w-sm mx-auto">
                 <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                 </div>
                 <h3 className="text-lg font-bold text-gray-800 mb-1">测试区已锁定</h3>
                 <p className="text-gray-500 text-sm">请先在左侧配置参数并完成模型训练，才能解锁下联生成功能。</p>
               </div>
             </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default TrainingLab;