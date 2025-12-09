import React from 'react';
import { ModelType, StepInfo } from '../types';

interface Props {
  modelType: ModelType;
  stepIndex: number;
  setStepIndex: (idx: number) => void;
  steps: StepInfo[];
}

const NetworkVisualizer: React.FC<Props> = ({ modelType, stepIndex, setStepIndex, steps }) => {
  const currentStep = steps[stepIndex];

  // Helper to check if an element should be highlighted
  const isHighlighted = (id: string) => currentStep.highlightIds.includes(id);
  const isFaded = (id: string) => currentStep.fadeIds?.includes(id);

  // === SVG Styles & Attributes ===
  
  // Base transition for smooth effects
  const baseClass = "transition-all duration-300 ease-out";
  
  // Node styles (Circles, Rects)
  // CRITICAL FIX: added style={{ transformBox: 'fill-box' }} in JSX to ensure origin-center works on SVG elements
  const nodeBase = `${baseClass} stroke-gray-600 stroke-2 cursor-pointer origin-center hover:scale-110 hover:stroke-blue-500 hover:fill-blue-50`;
  
  // Path styles (Lines, Curves)
  const pathBase = `${baseClass} fill-none stroke-gray-300 stroke-2 cursor-pointer hover:stroke-blue-400`;
  
  // Highlight Styles
  const highlightNode = "!stroke-orange-500 !stroke-[4px] filter drop-shadow-md scale-110 !fill-orange-50";
  const highlightPath = "!stroke-orange-500 !stroke-[4px] filter drop-shadow-md opacity-100";
  
  // Faded Styles
  const fadedClass = "opacity-20 grayscale filter";

  const getNodeClass = (id: string) => 
    `${nodeBase} ${isHighlighted(id) ? highlightNode : ''} ${isFaded(id) ? fadedClass : ''}`;
  
  const getPathClass = (id: string) => 
    `${pathBase} ${isHighlighted(id) ? highlightPath : ''} ${isFaded(id) ? fadedClass : ''}`;

  // Helper to determine which marker to use based on highlight state
  const getMarker = (id: string) => isHighlighted(id) ? "url(#arrowHighlight)" : "url(#arrowGray)";

  // Common style for proper scaling center
  const transformStyle = { transformBox: 'fill-box' } as React.CSSProperties;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="w-2 h-6 bg-blue-500 rounded-full"></span>
          原理可视化演示
        </h2>
        <div className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
            步骤: <span className="text-blue-600">{stepIndex + 1}</span> / {steps.length}
        </div>
      </div>

      {/* SVG Container */}
      <div className="flex-1 relative bg-slate-50/50 flex items-center justify-center p-4 group">
        <svg viewBox="0 0 800 420" className="w-full h-full max-w-4xl select-none overflow-visible">
          <defs>
            <marker id="arrowGray" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#ccc" />
            </marker>
            <marker id="arrowHighlight" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <path d="M0,0 L0,6 L9,3 z" fill="#F97316" />
            </marker>
          </defs>

          {/* === FNN VIEW === */}
          {modelType === 'fnn' && (
            <g className="animate-fade-in">
              <text x="400" y="20" textAnchor="middle" className="text-lg font-bold fill-blue-600/80 tracking-widest">FNN 全连接神经网络</text>
              <text x="400" y="40" textAnchor="middle" className="text-xs fill-blue-400 font-sans tracking-wider">Fully Connected Neural Network</text>
              {/* Layers generation */}
              {[4, 5, 5, 3].map((count, layerIdx, arr) => {
                const startX = 150; 
                const startY = 80;
                const gapX = 160;
                const layerX = startX + layerIdx * gapX;
                
                return (
                  <g key={layerIdx}>
                    {/* Connections to next layer */}
                    {layerIdx < arr.length - 1 && Array.from({ length: count }).map((_, i) => (
                      Array.from({ length: arr[layerIdx + 1] }).map((__, j) => {
                        const y1 = startY + (300 - count * 50) / 2 + i * 50;
                        const y2 = startY + (300 - arr[layerIdx + 1] * 50) / 2 + j * 50;
                        const linkId = `fnn-link-l${layerIdx}`;
                        return (
                          <line 
                            key={`${i}-${j}`} 
                            x1={layerX} y1={y1} x2={layerX + gapX} y2={y2} 
                            className={getPathClass(linkId)} 
                          />
                        );
                      })
                    ))}
                    
                    {/* Nodes */}
                    {Array.from({ length: count }).map((_, i) => {
                      const cy = startY + (300 - count * 50) / 2 + i * 50;
                      const nodeId = `fnn-node-l${layerIdx}`;
                      const baseFill = layerIdx === 0 ? '#bbdefb' : (layerIdx === arr.length - 1 ? '#fff9c4' : '#e1bee7');
                      return (
                        <circle 
                          key={i} 
                          cx={layerX} cy={cy} r="15" 
                          fill={baseFill} 
                          className={getNodeClass(nodeId)}
                          style={transformStyle}
                        />
                      );
                    })}
                  </g>
                );
              })}
              <text x="150" y="380" textAnchor="middle" className="fill-gray-500 font-mono text-sm tracking-wide">输入层 (上联)</text>
              <text x="630" y="380" textAnchor="middle" className="fill-gray-500 font-mono text-sm tracking-wide">输出层 (下联)</text>
            </g>
          )}

          {/* === RNN VIEW === */}
          {modelType === 'rnn' && (
            <g className="animate-fade-in">
              {currentStep.view !== 'unfolded' ? (
                <g id="rnn-folded">
                  <text x="400" y="20" textAnchor="middle" className="text-lg font-bold fill-blue-600/80 tracking-widest">RNN 循环神经网络</text>
                  <text x="400" y="40" textAnchor="middle" className="text-xs fill-blue-400 font-sans tracking-wider">Recurrent Neural Network (Folded)</text>
                  <rect id="rnn-f-cell" x="360" y="160" width="80" height="60" rx="8" fill="#c8e6c9" className={getNodeClass('rnn-f-cell')} style={transformStyle} />
                  <text x="400" y="195" textAnchor="middle" className="font-bold fill-gray-700 pointer-events-none select-none">A</text>
                  
                  <circle cx="400" cy="300" r="25" fill="#bbdefb" className={getNodeClass('rnn-f-input')} style={transformStyle} />
                  <text x="400" y="305" textAnchor="middle" className="fill-gray-700 pointer-events-none text-sm font-serif italic">X<tspan dy="5">t</tspan></text>
                  
                  <circle cx="400" cy="80" r="25" fill="#e1bee7" className={getNodeClass('rnn-f-output')} style={transformStyle} />
                  <text x="400" y="85" textAnchor="middle" className="fill-gray-700 pointer-events-none text-sm font-serif italic">h<tspan dy="5">t</tspan></text>

                  <path d="M400 275 L400 220" className={getPathClass('path-rf-in')} markerEnd={getMarker('path-rf-in')} />
                  <path d="M400 160 L400 105" className={getPathClass('path-rf-out')} markerEnd={getMarker('path-rf-out')} />
                  <path id="path-rf-loop" d="M440 190 L500 190 L500 130 L400 130 L400 150" fill="none" className={getPathClass('path-rf-loop')} markerEnd={getMarker('path-rf-loop')} />
                </g>
              ) : (
                <g id="rnn-unfolded">
                   <text x="400" y="20" textAnchor="middle" className="text-lg font-bold fill-blue-600/80 tracking-widest">RNN 循环神经网络</text>
                   <text x="400" y="40" textAnchor="middle" className="text-xs fill-blue-400 font-sans tracking-wider">Recurrent Neural Network (Unfolded)</text>
                   {Array.from({ length: 5 }).map((_, i) => {
                     const x = 100 + i * 130;
                     const stepId = `rnn-step-${i}`;
                     return (
                       <g key={i}>
                         {/* Memory Arrow (shifted down by 30) */}
                         {i < 4 && (
                           <path d={`M${x+40} 210 L${x+130-40} 210`} className={getPathClass(`rnn-mem-arrow`)} style={{strokeWidth: 3}} markerEnd={getMarker('rnn-mem-arrow')} />
                         )}
                         {/* Input (shifted down by 30) */}
                         <circle cx={x} cy="350" r="20" fill="#bbdefb" className={getNodeClass(stepId)} style={transformStyle} />
                         <text x={x} y="390" textAnchor="middle" className="fill-gray-500 text-xs font-mono">X{i}</text>
                         <path d={`M${x} 330 L${x} 250`} className={getPathClass(stepId)} markerEnd={getMarker(stepId)} />
                         {/* Cell A (shifted down by 30) */}
                         <rect x={x-30} y="180" width="60" height="60" rx="5" fill="#c8e6c9" className={getNodeClass(stepId)} style={transformStyle} />
                         <text x={x} y="215" textAnchor="middle" className="font-bold fill-gray-700 pointer-events-none">A</text>
                         {/* Output (shifted down by 30) */}
                         <circle cx={x} cy="110" r="20" fill="#e1bee7" className={getNodeClass(stepId)} style={transformStyle} />
                         <text x={x} y="80" textAnchor="middle" className="fill-gray-500 text-xs font-mono">h{i}</text>
                         <path d={`M${x} 180 L${x} 130`} className={getPathClass(stepId)} markerEnd={getMarker(stepId)} />
                       </g>
                     )
                   })}
                </g>
              )}
            </g>
          )}

          {/* === LSTM VIEW === */}
          {modelType === 'lstm' && (
            <g className="animate-fade-in">
              <text x="400" y="20" textAnchor="middle" className="text-lg font-bold fill-blue-600/80 tracking-widest">LSTM 长短期记忆网络</text>
              <text x="400" y="40" textAnchor="middle" className="text-xs fill-blue-400 font-sans tracking-wider">Long Short-Term Memory</text>
              <rect x="150" y="80" width="500" height="260" rx="15" fill="#e3f2fd" stroke="#1976D2" strokeWidth="2" className="shadow-lg" />
              <text x="600" y="110" className="fill-blue-800 font-bold opacity-50">LSTM Cell</text>

              {/* Cell State Line */}
              <path id="lstm-path-c" d="M100 120 L700 120" className={getPathClass('lstm-path-c')} style={{strokeWidth: 4}} markerEnd={getMarker('lstm-path-c')} />
              
              {/* Inputs */}
              <path d="M100 300 L180 300 L180 260" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />
              <text x="90" y="305" textAnchor="middle" className="fill-gray-600 font-serif italic">h<tspan dy="4" fontSize="10">t-1</tspan></text>
              
              <path d="M220 380 L220 300" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />
              <text x="220" y="400" textAnchor="middle" className="fill-gray-600 font-serif italic">X<tspan dy="4" fontSize="10">t</tspan></text>

              {/* Forget Gate */}
              <g id="lstm-forget" className="group/forget">
                  <rect x="250" y="220" width="40" height="30" fill="#fff9c4" className={getNodeClass('lstm-forget-gate')} style={transformStyle} />
                  <text x="270" y="240" textAnchor="middle" className="pointer-events-none fill-gray-700 font-serif">σ</text>
                  <text x="270" y="210" textAnchor="middle" fontSize="12" className="fill-gray-500 font-bold">遗忘门</text>
                  
                  <path d="M180 300 L270 300 L270 250" className={getPathClass('lstm-forget-path')} markerEnd={getMarker('lstm-forget-path')} />
                  <path d="M270 220 L270 135" className={getPathClass('lstm-forget-path')} markerEnd={getMarker('lstm-forget-path')} />
                  
                  <circle cx="270" cy="120" r="12" fill="#e1bee7" className={getNodeClass('lstm-forget-gate')} style={transformStyle} />
                  <text x="270" y="125" textAnchor="middle" className="pointer-events-none text-sm font-bold">×</text>
              </g>

              {/* Input Gate */}
              <g id="lstm-input">
                  <rect x="350" y="220" width="40" height="30" fill="#fff9c4" className={getNodeClass('lstm-input-gate')} style={transformStyle} />
                  <text x="370" y="240" textAnchor="middle" className="pointer-events-none fill-gray-700 font-serif">σ</text>
                  <rect x="420" y="220" width="40" height="30" fill="#fff9c4" className={getNodeClass('lstm-input-gate')} style={transformStyle} />
                  <text x="440" y="240" textAnchor="middle" className="pointer-events-none fill-gray-700 text-xs font-serif">tanh</text>
                  <text x="395" y="210" textAnchor="middle" fontSize="12" className="fill-gray-500 font-bold">输入门</text>
                  
                  <path d="M270 300 L440 300 L440 250" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />
                  <path d="M370 300 L370 250" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />
                  
                  <circle cx="400" cy="170" r="12" fill="#e1bee7" className={getNodeClass('lstm-input-gate')} style={transformStyle} />
                  <text x="400" y="175" textAnchor="middle" className="pointer-events-none text-sm font-bold">×</text>
                  
                  <path d="M370 220 L370 170 L388 170" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />
                  <path d="M440 220 L440 170 L412 170" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />

                  <circle cx="400" cy="120" r="12" fill="#e1bee7" className={getNodeClass('lstm-input-gate')} style={transformStyle} />
                  <text x="400" y="125" textAnchor="middle" className="pointer-events-none text-sm font-bold">+</text>
                  <path d="M400 158 L400 132" className={getPathClass('lstm-input-path')} markerEnd={getMarker('lstm-input-path')} />
              </g>

              {/* Output Gate */}
              <g id="lstm-output">
                  <rect x="520" y="220" width="40" height="30" fill="#fff9c4" className={getNodeClass('lstm-output-gate')} style={transformStyle} />
                  <text x="540" y="240" textAnchor="middle" className="pointer-events-none fill-gray-700 font-serif">σ</text>
                  <text x="540" y="210" textAnchor="middle" fontSize="12" className="fill-gray-500 font-bold">输出门</text>
                  <path d="M440 300 L540 300 L540 250" className={getPathClass('lstm-output-path')} markerEnd={getMarker('lstm-output-path')} />

                  <rect x="580" y="160" width="40" height="25" fill="#fff9c4" className={getNodeClass('lstm-output-gate')} style={transformStyle} />
                  <text x="600" y="177" textAnchor="middle" className="pointer-events-none fill-gray-700 text-xs font-serif">tanh</text>
                  <path d="M550 120 L600 120 L600 160" className={getPathClass('lstm-output-path')} markerEnd={getMarker('lstm-output-path')} />

                  <circle cx="600" cy="220" r="12" fill="#e1bee7" className={getNodeClass('lstm-output-gate')} style={transformStyle} />
                  <text x="600" y="225" textAnchor="middle" className="pointer-events-none text-sm font-bold">×</text>
                  
                  <path d="M540 220 L588 220" className={getPathClass('lstm-output-path')} markerEnd={getMarker('lstm-output-path')} />
                  <path d="M600 185 L600 208" className={getPathClass('lstm-output-path')} markerEnd={getMarker('lstm-output-path')} />
                  
                  <path d="M612 220 L680 220 L680 100" className={getPathClass('lstm-path-out')} markerEnd={getMarker('lstm-path-out')} />
                  <text x="700" y="105" textAnchor="middle" className="fill-gray-600 font-serif italic">h<tspan dy="4" fontSize="10">t</tspan></text>
              </g>
            </g>
          )}

        </svg>
      </div>

      {/* Control Bar & Explanation */}
      <div className="bg-white p-6 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6 h-auto min-h-[140px] z-10 relative shadow-[0_-5px_15px_rgba(0,0,0,0.02)] shrink-0">
        <button 
          onClick={() => setStepIndex(stepIndex - 1)} 
          disabled={stepIndex === 0}
          className="px-6 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold text-gray-600 hover:text-gray-800 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          上一步
        </button>
        
        <div className="flex-1 text-center max-w-3xl px-4 flex flex-col items-center">
          <h3 className="text-xl font-bold text-blue-700 mb-2 font-serif tracking-tight">{currentStep.title}</h3>
          <p className="text-gray-600 leading-relaxed text-sm md:text-base">{currentStep.desc}</p>
          
          {currentStep.formula && (
            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm shadow-sm inline-block text-left">
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3">
                <div className="font-mono text-slate-800 font-semibold tracking-wide border-b md:border-b-0 md:border-r border-slate-300 pb-1 md:pb-0 md:pr-3 mb-1 md:mb-0">
                   <span className="text-slate-400 mr-2 select-none font-sans font-normal">公式:</span>
                   {currentStep.formula}
                </div>
                {currentStep.formulaDesc && (
                   <div className="text-slate-500 text-xs italic">
                      {currentStep.formulaDesc}
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={() => setStepIndex(stepIndex + 1)} 
          disabled={stepIndex === steps.length - 1}
          className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-semibold shadow-lg shadow-blue-200 hover:shadow-blue-300 flex items-center gap-2"
        >
          下一步
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
};

export default NetworkVisualizer;