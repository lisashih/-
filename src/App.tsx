/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Image as ImageIcon, 
  Download, 
  RefreshCw, 
  Settings2, 
  ChevronRight, 
  Sparkles,
  Coffee,
  TrendingUp,
  Eye,
  Zap,
  Gift,
  AlertCircle,
  Loader2
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import { VISUAL_PLANS } from "./constants";
import { VisualPlan, ImageSize } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default function App() {
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1K");
  const [showMockup, setShowMockup] = useState<Record<number, boolean>>({});
  const [generatedImages, setGeneratedImages] = useState<Record<number, string>>({});
  const [loadingStates, setLoadingStates] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [editablePlans, setEditablePlans] = useState<VisualPlan[]>(VISUAL_PLANS);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);

  const handlePlanChange = (id: number, field: keyof VisualPlan, value: string) => {
    setEditablePlans(prev => prev.map(plan => plan.id === id ? { ...plan, [field]: value } : plan));
  };

  const handleCustomGenerate = async () => {
    if (!customPrompt.trim()) return;
    setIsGeneratingCustom(true);
    setError(null);

    // Create a new visual plan based on the custom prompt
    const newId = Date.now();
    const newPlan: VisualPlan = {
      id: newId,
      title: `【自定義企劃】`,
      concept: "使用者自定義",
      visualDescription: customPrompt,
      headline: "在此輸入您的標題",
      subHeadline: "在此輸入您的副標題",
      style: "自定義風格",
      prompt: customPrompt
    };

    setEditablePlans(prev => [newPlan, ...prev]);
    setCustomPrompt("");
    setIsGeneratingCustom(false);
    
    // Automatically trigger image generation for the new plan
    await generateImage(newPlan);
  };

  const toggleMockup = (id: number) => {
    setShowMockup(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const generateImage = async (plan: VisualPlan, isHighQuality = false, retryCount = 0) => {
    setLoadingStates(prev => ({ ...prev, [plan.id]: true }));
    setError(null);

    try {
      const modelToUse = isHighQuality ? 'gemini-3.1-flash-image-preview' : 'gemini-2.5-flash-image';
      const response = await ai.models.generateContent({
        model: modelToUse,
        contents: {
          parts: [
            {
              text: `${plan.prompt} The image should be minimalist, high-quality, professional, with crimson red and gold accents on a textured off-white or neutral background. No text in the image.`,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            ...(isHighQuality ? { imageSize: selectedSize } : {})
          },
        },
      });

      let imageUrl = "";
      for (const part of response.candidates?.[0]?.content.parts || []) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }

      if (imageUrl) {
        setGeneratedImages(prev => ({ ...prev, [plan.id]: imageUrl }));
        if (isHighQuality) {
          setError(null);
        }
      } else {
        throw new Error("No image data returned from API");
      }
    } catch (err: any) {
      console.error("Image generation failed:", err);
      const isPermissionError = err?.message?.includes("403") || err?.message?.includes("permission");
      const isQuotaError = err?.message?.includes("429") || err?.message?.includes("quota") || err?.message?.includes("RESOURCE_EXHAUSTED");
      
      if (isHighQuality && isPermissionError) {
        setError("高畫質模型 (3.1 Flash) 權限不足：請在 Settings 中設定您的 API Key。已自動嘗試標準模型。");
        await generateImage(plan, false);
      } else if (isQuotaError && retryCount < 2) {
        // Exponential backoff retry for 429
        const delay = Math.pow(2, retryCount) * 2000;
        setError(`額度暫時用盡，正在進行第 ${retryCount + 1} 次重試 (等待 ${delay/1000} 秒)...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        await generateImage(plan, isHighQuality, retryCount + 1);
      } else if (isPermissionError) {
        setError("權限不足 (403)：請點擊右上角「Settings」>「Secrets」，確保已設定您的 GEMINI_API_KEY。");
      } else if (isQuotaError) {
        setError("API 使用額度已達上限 (429)：請稍候再試，或在右上角「Settings」中設定您自己的 API Key 以獲得更高額度。");
      } else {
        setError("圖片生成失敗，請稍後再試或檢查網路連線。");
      }
    } finally {
      setLoadingStates(prev => ({ ...prev, [plan.id]: false }));
    }
  };

  const getIcon = (id: number) => {
    switch (id) {
      case 1: return <RefreshCw className="w-5 h-5" />;
      case 2: return <Coffee className="w-5 h-5" />;
      case 3: return <TrendingUp className="w-5 h-5" />;
      case 4: return <Eye className="w-5 h-5" />;
      case 5: return <Zap className="w-5 h-5" />;
      case 6: return <Gift className="w-5 h-5" />;
      case 7: return <AlertCircle className="w-5 h-5" />;
      case 8: return <Download className="w-5 h-5" />;
      case 9: return <RefreshCw className="w-5 h-5" />;
      default: return <ImageIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-[#1a1a1a] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-[#1a1a1a]/10 bg-[#f5f2ed]/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#A51C30] rounded-full flex items-center justify-center">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">PMax 視覺企劃工具</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-[#1a1a1a]/5">
              <Settings2 className="w-4 h-4 text-[#1a1a1a]/60" />
              <span className="text-xs font-medium text-[#1a1a1a]/60 uppercase tracking-wider">解析度:</span>
              <Select value={selectedSize} onValueChange={(v) => setSelectedSize(v as ImageSize)}>
                <SelectTrigger className="h-7 w-20 border-none bg-transparent focus:ring-0 text-xs font-bold p-0">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1K">1K</SelectItem>
                  <SelectItem value="2K">2K</SelectItem>
                  <SelectItem value="4K">4K</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Custom Prompt Input */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 max-w-3xl mx-auto"
        >
          <div className="bg-white p-6 rounded-2xl shadow-xl border border-[#A51C30]/10">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-[#A51C30]/10 rounded-full flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-[#A51C30]" />
              </div>
              <h2 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-widest">AI 創意生成窗</h2>
            </div>
            <div className="flex gap-3">
              <textarea 
                placeholder="描述您想要的視覺畫面（例如：一個人在星空下思考投資...）"
                className="flex-1 p-4 rounded-xl bg-[#f5f2ed] border-none focus:ring-2 focus:ring-[#A51C30]/20 text-sm resize-none h-24"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
              <Button 
                className="h-24 px-8 bg-[#A51C30] hover:bg-[#8B1829] text-white rounded-xl flex flex-col gap-2 transition-all active:scale-95"
                onClick={handleCustomGenerate}
                disabled={isGeneratingCustom || !customPrompt.trim()}
              >
                {isGeneratingCustom ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Sparkles className="w-5 h-5" />
                )}
                <span className="font-bold">生成視覺</span>
              </Button>
            </div>
            <p className="mt-3 text-[10px] text-[#1a1a1a]/40 text-center uppercase tracking-widest">
              輸入描述後，AI 將為您新增一組專屬的圖文企劃
            </p>
          </div>
        </motion.div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700"
          >
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {editablePlans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="overflow-hidden border-[#1a1a1a]/10 shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="border-[#A51C30]/20 text-[#A51C30] bg-[#A51C30]/5">
                      企劃 {plan.id}
                    </Badge>
                    <div className="text-[#A51C30]/40">
                      {getIcon(plan.id)}
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-[#1a1a1a]">{plan.title}</CardTitle>
                  <CardDescription className="text-[#1a1a1a]/60 italic">
                    風格：{plan.style}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <div className="aspect-square relative rounded-xl overflow-hidden bg-[#f9f7f4] border border-[#1a1a1a]/5 group">
                    <AnimatePresence mode="wait">
                      {generatedImages[plan.id] ? (
                        <div className="relative w-full h-full">
                          <motion.img
                            key="image"
                            src={generatedImages[plan.id]}
                            alt={plan.title}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          
                          {/* Mockup Overlay */}
                          <AnimatePresence>
                            {showMockup[plan.id] && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 flex flex-col justify-end p-6 bg-gradient-to-t from-black/60 via-black/20 to-transparent text-white"
                              >
                                <motion.div
                                  initial={{ y: 20, opacity: 0 }}
                                  animate={{ y: 0, opacity: 1 }}
                                  transition={{ delay: 0.2 }}
                                >
                                  <h3 className="text-2xl font-bold mb-2 leading-tight drop-shadow-lg">
                                    {plan.headline}
                                  </h3>
                                  <p className="text-sm font-medium opacity-90 leading-relaxed drop-shadow-md">
                                    {plan.subHeadline}
                                  </p>
                                  <div className="mt-4 flex items-center gap-2">
                                    <div className="w-6 h-6 bg-[#A51C30] rounded-full flex items-center justify-center">
                                      <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                    <span className="text-[10px] font-bold uppercase tracking-widest">投資理財 Investment & Wealth</span>
                                  </div>
                                </motion.div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ) : (
                        <motion.div
                          key="placeholder"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
                        >
                          <div className="w-16 h-16 mb-4 rounded-full bg-[#A51C30]/5 flex items-center justify-center text-[#A51C30]/20">
                            <ImageIcon className="w-8 h-8" />
                          </div>
                          <p className="text-sm text-[#1a1a1a]/40 max-w-[240px]">
                            {plan.visualDescription}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {loadingStates[plan.id] && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-10">
                        <Loader2 className="w-8 h-8 text-[#A51C30] animate-spin mb-2" />
                        <p className="text-xs font-medium text-[#A51C30] animate-pulse">AI 正在構思視覺中...</p>
                      </div>
                    )}

                    {generatedImages[plan.id] && !loadingStates[plan.id] && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="bg-white hover:bg-white/90"
                          onClick={() => generateImage(plan)}
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          重新生成
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className={`${showMockup[plan.id] ? 'bg-[#A51C30] text-white hover:bg-[#8B1829]' : 'bg-white hover:bg-white/90'}`}
                          onClick={() => toggleMockup(plan.id)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          {showMockup[plan.id] ? '隱藏圖文' : '預覽圖文'}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#A51C30] uppercase tracking-widest">廣告大標</label>
                      <textarea 
                        className="w-full p-3 rounded-lg bg-[#f5f2ed] border-l-4 border-[#A51C30] font-bold text-lg leading-tight resize-none focus:outline-none focus:ring-1 focus:ring-[#A51C30]/20"
                        rows={2}
                        value={plan.headline}
                        onChange={(e) => handlePlanChange(plan.id, 'headline', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-[#1a1a1a]/40 uppercase tracking-widest">廣告小標</label>
                      <textarea 
                        className="w-full p-3 rounded-lg bg-white border border-[#1a1a1a]/5 text-sm text-[#1a1a1a]/80 leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-[#1a1a1a]/10"
                        rows={3}
                        value={plan.subHeadline}
                        onChange={(e) => handlePlanChange(plan.id, 'subHeadline', e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-0">
                  {!generatedImages[plan.id] && (
                    <Button 
                      className="w-full bg-[#A51C30] hover:bg-[#8B1829] text-white py-6 rounded-xl text-md font-bold"
                      onClick={() => generateImage(plan)}
                      disabled={loadingStates[plan.id]}
                    >
                      {loadingStates[plan.id] ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          生成中...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 mr-2" />
                          生成視覺素材
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      <footer className="py-12 border-t border-[#1a1a1a]/10 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-medium text-[#1a1a1a]/40 uppercase tracking-[0.2em]">
            PMax Visual Planner × Google Gemini AI
          </p>
          <p className="mt-2 text-xs text-[#1a1a1a]/30">
            本工具僅供內部視覺企劃參考，最終素材請以設計團隊產出為準。
          </p>
        </div>
      </footer>
    </div>
  );
}
