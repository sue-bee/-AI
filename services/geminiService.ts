import { ModelType, CoupletResult } from "../types";

// Google Gemini API Configuration (REST)
// Using gemini-2.5-flash as per latest guidelines
const MODEL_NAME = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`;

export const generateCouplet = async (
  upper: string,
  modelType: ModelType,
  trainingContext?: { loss: number; epochs: number }
): Promise<CoupletResult> => {
  try {
    // Default to good performance if no context provided
    const loss = trainingContext?.loss ?? 0.1;
    const isConverged = loss < 0.2;
    const isUnderfitted = loss > 0.4;
    
    let systemPrompt = `你是一个神经网络模拟器，正在模拟一个针对“杭州宋城景区”训练的中文对联生成模型。
    
    用户输入上联: "${upper}"
    字数: ${upper.length}
    
    当前模型配置状态:
    - 架构类型: ${modelType.toUpperCase()}
    - 训练状态: ${isUnderfitted ? "欠拟合 (High Loss, 训练不足)" : isConverged ? "收敛良好 (Low Loss, 训练充分)" : "部分训练 (训练一般)"}
    - 最终 Loss 值: ${loss.toFixed(3)}
    
    请根据【架构类型】和【训练状态】生成对应的下联和解释（解释必须用中文）。
    `;

    // Base logic for training quality
    if (isUnderfitted) {
      systemPrompt += `
      【通用表现 - 训练不足】：
      1. 生成一个下联，内容要有明显瑕疵。
      2. 瑕疵可以是：平仄完全不对、词性不工整、或者用词非常直白毫无文采。
      3. 【解释】：指出Loss较高（${loss.toFixed(3)}），网络参数尚未优化，输出混乱。
      `;
    } else if (isConverged) {
      systemPrompt += `
      【通用表现 - 训练充分】：
      1. 原则上生成高质量下联。
      2. 【解释】：指出Loss较低（${loss.toFixed(3)}），模型已收敛。
      `;
    } else {
      systemPrompt += `
      【通用表现 - 训练一般】：
      1. 生成合格下联，但不够惊艳。
      2. 【解释】：处于训练中期。
      `;
    }

    // Specific Architecture nuances - CRITICAL for distinction
    if (modelType === 'fnn') {
      systemPrompt += `
      \n【FNN 架构特性模拟】：
      FNN 没有时间序列概念，它单独处理每个位置的词。
      - 如果是长句（>7字）：请生成一个“词不达意”的下联。虽然每个词单独看可能和上联对应位置有关，但连起来读非常生硬，缺乏连贯性。
      - 解释：强调 FNN 缺乏“序列记忆”，只关注了局部词语的映射，忽略了整句的通顺。
      `;
    } else if (modelType === 'rnn') {
      systemPrompt += `
      \n【RNN 架构特性模拟】：
      RNN 擅长序列，但存在严重的“梯度消失”问题。
      - 关键指令：如果上联较长（>7字），且训练状态不是极度完美，请务必模拟“梯度消失”！
      - 具体表现：生成一个【虎头蛇尾】或【前言不搭后语】的下联。即：下联的后半部分（最近的时间步）可能对应得还不错，但前半部分（较远的时间步）对应得很差，或者忘了上联开头的意境。
      - 解释：必须明确提到“梯度消失”现象。解释说：因为句子较长，RNN 在反向传播时梯度消失，导致模型“忘记”了上联开头的输入信息，只根据最近的词生成了结尾。
      `;
    } else if (modelType === 'lstm') {
      systemPrompt += `
      \n【LSTM 架构特性模拟】：
      LSTM 引入了细胞状态（Cell State）和门控机制，完美解决了梯度消失。
      - 关键指令：即使是长句（>7字），只要训练Loss不极高，都要生成非常工整、意境深远、前后呼应的下联。
      - 表现：体现出对长距离依赖的完美捕捉。
      - 解释：解释中强调 LSTM 的“长短期记忆”能力和“门控机制”，指出它成功记住了长距离的上下文信息，避免了 RNN 的梯度消失问题。
      `;
    }

    // Call Google Gemini API (REST)
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key is missing");
    }

    const response = await fetch(`${API_URL}?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: `请基于上述设定，为上联“${upper}”生成下联。请严格返回 JSON 格式: { "lower": "下联内容", "explanation": "中文解释内容" }` }]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) throw new Error("No response from Gemini API");

    const result = JSON.parse(text);
    return {
      upper,
      lower: result.lower || "生成失败",
      explanation: result.explanation || "无法解释",
      qualityScore: Math.max(0, Math.min(100, Math.round((1 - loss) * 100)))
    };
  } catch (error) {
    console.error("API Error:", error);
    return {
      upper,
      lower: "调用失败",
      explanation: `请确保已配置 Google Gemini API Key。错误详情: ${(error as Error).message}`,
      qualityScore: 0
    };
  }
};