import React, { useState } from 'react';
import NetworkVisualizer from './components/NetworkVisualizer';
import TrainingLab from './components/TrainingLab';
import { ModelType, StepInfo } from './types';

// Steps configuration from the original HTML logic
const STEPS_DATA: Record<ModelType, StepInfo[]> = {
  fnn: [
    { 
      title: "FNN 架构预览", 
      desc: "全连接神经网络(Fully Connected Neural Network)：数据单向流动，层与层之间所有节点相互连接。适用于简单的模式匹配，但在处理长序列文本（如长对联）时缺乏上下文记忆。", 
      formula: "y = f(x; θ)",
      formulaDesc: "输入 x 经过参数 θ 变换得到输出 y",
      highlightIds: [] 
    },
    { 
      title: "输入层激活 (Input)", 
      desc: "数据（上联的字词向量）从左侧 Input Layer 进入网络。每个节点代表一个特征。", 
      formula: "x = [x₁, x₂, ..., xₙ]",
      formulaDesc: "将文字转换为计算机能理解的数字向量",
      highlightIds: ["fnn-node-l0"] 
    },
    { 
      title: "前向传播 (Hidden)", 
      desc: "数据经过中间的 Hidden Layers。全连接层提取复杂的语义特征，计算加权和并经过激活函数。", 
      formula: "h = σ(W·x + b)",
      formulaDesc: "权重 × 输入 + 偏置，再通过激活函数非线性变换",
      highlightIds: ["fnn-node-l1", "fnn-node-l2", "fnn-link-l0", "fnn-link-l1"] 
    },
    { 
      title: "输出结果 (Output)", 
      desc: "最终到达右侧 Output Layer，生成预测的下联字词概率分布。", 
      formula: "y = softmax(V·h + c)",
      formulaDesc: "将数值转化为下联每个字的预测概率",
      highlightIds: ["fnn-node-l3", "fnn-link-l2"] 
    }
  ],
  rnn: [
    { 
      title: "RNN 折叠视图 (Loop)", 
      desc: "RNN (Recurrent Neural Network) 的核心是自循环：单元 A 把当前的输出传给下一刻的自己。当前时刻的状态 h_t 由当前输入 x_t 和上一时刻状态 h_{t-1} 共同决定。", 
      view: "folded", 
      formula: "hₜ = tanh(Wₕ·hₜ₋₁ + Wₓ·xₜ)",
      formulaDesc: "今日记忆 = tanh(昨日记忆 + 今日输入)",
      highlightIds: ["path-rf-loop", "rnn-f-cell"] 
    },
    { 
      title: "RNN 展开视图 (Time)", 
      desc: "按时间展开后，RNN 变成了一个链式结构，适合处理像对联这样的序列文字。", 
      view: "unfolded", 
      formula: "Cost = Σ Loss(yₜ, ŷₜ)",
      formulaDesc: "总误差是每一个时间步预测误差的累加",
      highlightIds: [] 
    },
    { 
      title: "记忆功能 (Memory)", 
      desc: "高亮的横向箭头代表记忆（Hidden State）：上联第一个字的信息可以一路传到最后。", 
      view: "unfolded", 
      formula: "h₀ → h₁ → h₂ → ... → hₜ",
      formulaDesc: "记忆状态沿着时间轴一步步向后传递",
      highlightIds: ["rnn-mem-arrow"] 
    },
    { 
      title: "问题：梯度消失", 
      desc: "当链条太长，反向传播时梯度在远处（左侧）会趋近于 0，导致网络‘忘记’开头的文字，无法做到前后呼应。", 
      view: "unfolded", 
      formula: "∂E/∂W ≈ 0 (Gradient Vanishing)",
      formulaDesc: "误差传不回去，导致前面的参数无法有效更新（即忘记了开头）",
      highlightIds: ["rnn-step-4"], 
      fadeIds: ["rnn-step-0", "rnn-step-1", "rnn-step-2"] 
    }
  ],
  lstm: [
    { 
      title: "LSTM 解决方案", 
      desc: "LSTM (Long Short-Term Memory) 引入了顶部的‘细胞状态’(Cell State) C_t 高速路，这就像传送带，让信息能无损流动，解决梯度消失。", 
      formula: "Cₜ = fₜ·Cₜ₋₁ + iₜ·C̃ₜ",
      formulaDesc: "新状态 = 旧状态保留部分 + 新输入添加部分",
      highlightIds: ["lstm-path-c"] 
    },
    { 
      title: "1. 遗忘门 (Forget)", 
      desc: "Sigmoid 层输出 0 到 1 的数值，决定‘丢弃’多少旧信息。例如：如果上联语境变了，就忘记之前的临时主语。", 
      formula: "fₜ = σ(W_f · [hₜ₋₁, xₜ] + b_f)",
      formulaDesc: "输出 0~1 的系数，0代表完全遗忘，1代表完全保留",
      highlightIds: ["lstm-forget-gate", "lstm-forget-path"] 
    },
    { 
      title: "2. 输入门 (Input)", 
      desc: "Sigmoid 决定更新哪些值，Tanh 创建新的候选值向量。两者结合决定‘添加’多少新信息到细胞状态。", 
      formula: "iₜ = σ(...) , C̃ₜ = tanh(...)",
      formulaDesc: "决定哪些新信息是重要的，并加入到长期记忆中",
      highlightIds: ["lstm-input-gate", "lstm-input-path"] 
    },
    { 
      title: "3. 输出门 (Output)", 
      desc: "基于细胞状态和当前输入，计算最终的隐藏状态 h(t)，用于预测下一个字。", 
      formula: "hₜ = oₜ · tanh(Cₜ)",
      formulaDesc: "基于当前的长期记忆，决定这一刻输出什么内容",
      highlightIds: ["lstm-output-gate", "lstm-output-path", "lstm-path-out"] 
    }
  ]
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ModelType>('fnn');
  const [stepIndex, setStepIndex] = useState(0);

  const handleTabChange = (type: ModelType) => {
    setActiveTab(type);
    setStepIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      
      {/* Navbar */}
      <nav className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                {/* Neural Network / Spark Icon */}
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800 tracking-tight">宋城对联智能生成系统</h1>
                <p className="text-xs text-gray-500">基于神经网络 (FNN/RNN/LSTM) 的深度学习教学平台</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Model Selectors */}
        <div className="flex justify-center mb-8">
          <div className="bg-white p-1.5 rounded-full shadow-sm border border-gray-200 inline-flex">
            {(['fnn', 'rnn', 'lstm'] as ModelType[]).map((type) => (
              <button
                key={type}
                onClick={() => handleTabChange(type)}
                className={`px-8 py-2 rounded-full text-sm font-bold transition-all duration-200 ${
                  activeTab === type 
                    ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {type.toUpperCase()} 模型
              </button>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
          
          {/* Area 1: Visualization (Top) */}
          <section className="h-[550px]">
            <NetworkVisualizer 
              modelType={activeTab} 
              stepIndex={stepIndex} 
              setStepIndex={setStepIndex}
              steps={STEPS_DATA[activeTab]} 
            />
          </section>

          {/* Area 2: Training Lab (Bottom) */}
          <section className="h-[700px]">
            <TrainingLab modelType={activeTab} />
          </section>

        </div>
      </main>
    </div>
  );
};

export default App;