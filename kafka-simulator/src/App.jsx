import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Plus, Database, Server, ArrowRight, MessageSquare, Trash2, RefreshCw, Layers, Sparkles, BrainCircuit, Loader2 } from 'lucide-react';

// --- Configuration ---
const apiKey = ""; // System will provide the key at runtime

// --- Components ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-slate-200 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const baseStyle = "px-3 py-1.5 rounded text-sm font-medium transition-colors flex items-center gap-2 justify-center";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:bg-slate-50",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 disabled:bg-red-50",
    outline: "border border-slate-300 text-slate-600 hover:bg-slate-50",
    magic: "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-600 hover:to-fuchsia-600 disabled:opacity-50"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    purple: "bg-purple-100 text-purple-800",
    orange: "bg-orange-100 text-orange-800",
    pink: "bg-pink-100 text-pink-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
};

export default function KafkaSimulator() {
  // --- State ---
  const [topics, setTopics] = useState([
    { id: 'orders', name: 'orders_topic', partitions: [[], [], []] } // 3 partitions default
  ]);
  
  const [consumers, setConsumers] = useState([
    { id: 'g1', name: 'Shipping Service', groupId: 'group_shipping', topicId: 'orders', offsets: [0, 0, 0], active: false, color: 'blue' },
    { id: 'g2', name: 'Analytics Svc', groupId: 'group_analytics', topicId: 'orders', offsets: [0, 0, 0], active: false, color: 'purple' }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('orders');
  const [logs, setLogs] = useState([]);
  const [autoProduce, setAutoProduce] = useState(false);
  
  // AI State
  const [aiScenario, setAiScenario] = useState('E-commerce Orders');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [topicAnalysis, setTopicAnalysis] = useState(null);

  // --- Helpers ---
  const addLog = (text) => {
    // Fix: Ensure ID is unique even if called multiple times in same millisecond
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setLogs(prev => [{ id: uniqueId, text, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 50));
  };

  const produceMessage = (msgContent = null) => {
    const topicIndex = topics.findIndex(t => t.id === selectedTopic);
    if (topicIndex === -1) return;

    const content = msgContent || newMessage || `Event-${Math.floor(Math.random() * 1000)}`;
    const newTopics = [...topics];
    
    // Round-robin partition selection logic simulation
    const currentTopic = newTopics[topicIndex];
    const totalMsgs = currentTopic.partitions.flat().length;
    const partitionIndex = totalMsgs % currentTopic.partitions.length;

    const offsetId = currentTopic.partitions[partitionIndex].length;
    
    currentTopic.partitions[partitionIndex].push({
      offset: offsetId,
      content: content,
      timestamp: Date.now()
    });

    setTopics(newTopics);
    if (!msgContent) setNewMessage(''); // Only clear if manual entry
    addLog(`PRODUCER: Sent "${content}" to Topic "${currentTopic.name}" [Partition ${partitionIndex}]`);
  };

  const toggleConsumer = (consumerId) => {
    setConsumers(consumers.map(c => 
      c.id === consumerId ? { ...c, active: !c.active } : c
    ));
  };

  // --- Gemini Integrations ---

  const generateSmartMessages = async () => {
    if (!aiScenario) return;
    setIsGenerating(true);
    addLog(`AI: Generating messages for scenario "${aiScenario}"...`);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate 5 short, realistic, varied Kafka message payloads (JSON or string format) for a system handling: "${aiScenario}". Keep them concise (max 10 words each). Return ONLY the 5 messages separated by a pipe character "|". Example output: {"id":1, "status":"ok"} | {"id":2, "status":"fail"}`
            }]
          }]
        })
      });

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      
      const messages = generatedText.split('|').map(m => m.trim()).filter(m => m);
      
      if (messages.length > 0) {
        messages.forEach((msg, i) => {
          setTimeout(() => produceMessage(msg), i * 600); // Stagger them slightly for visual effect
        });
        addLog(`AI: Successfully generated ${messages.length} smart messages.`);
      } else {
        addLog("AI: Failed to generate valid messages.");
      }
    } catch (error) {
      console.error(error);
      addLog("AI: Error connecting to Gemini.");
    } finally {
      setIsGenerating(false);
    }
  };

  const analyzeTopicData = async (topicId) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    // Gather last 10 messages from all partitions
    const allMessages = topic.partitions.flat()
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 15)
      .map(m => m.content);

    if (allMessages.length === 0) {
      setTopicAnalysis("No data to analyze yet.");
      return;
    }

    setIsAnalyzing(true);
    setTopicAnalysis(null);

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Here is a sample of recent messages from a Kafka topic: ${JSON.stringify(allMessages)}. Analyze this traffic pattern in 1 short sentence. Identify the type of data (e.g., e-commerce, sensors) and any potential anomalies or trends. Be professional but brief.`
            }]
          }]
        })
      });

      const data = await response.json();
      const insight = data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not analyze data.";
      setTopicAnalysis(insight);
      addLog(`AI: Analysis complete for topic ${topic.name}`);

    } catch (error) {
      console.error(error);
      setTopicAnalysis("Error analyzing topic.");
    } finally {
      setIsAnalyzing(false);
    }
  };


  // --- Simulation Effects ---

  // Auto-produce effect
  useEffect(() => {
    let interval;
    if (autoProduce) {
      interval = setInterval(() => {
        produceMessage(`Auto-Order #${Math.floor(Math.random() * 9000) + 1000}`);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [autoProduce, topics, selectedTopic]);

  // Consumer effect (The "Poll" Loop)
  useEffect(() => {
    const interval = setInterval(() => {
      setConsumers(prevConsumers => {
        return prevConsumers.map(consumer => {
          if (!consumer.active) return consumer;

          const topic = topics.find(t => t.id === consumer.topicId);
          if (!topic) return consumer;

          const newOffsets = [...consumer.offsets];
          let consumedSomething = false;

          topic.partitions.forEach((partition, pIndex) => {
            const currentOffset = newOffsets[pIndex];
            if (currentOffset < partition.length) {
              newOffsets[pIndex] = currentOffset + 1;
              consumedSomething = true;
            }
          });

          return { ...consumer, offsets: newOffsets };
        });
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [topics]);


  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-orange-600" />
            Apache Kafka Simulator
          </h1>
          <p className="text-slate-500 mt-1">Interactive demonstration of Topics, Partitions, and Consumer Groups</p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" onClick={() => window.location.reload()}>
             <RefreshCw className="w-4 h-4" /> Reset Demo
           </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6">
        
        {/* --- LEFT: PRODUCER --- */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <Card className="p-4 border-l-4 border-l-blue-500">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Server className="w-5 h-5 text-blue-500" />
              Producer
            </h2>
            
            <div className="space-y-4">
              {/* Standard Producer */}
              <div className="space-y-2 pb-4 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Manual Entry</label>
                <select 
                  className="w-full p-2 border rounded bg-slate-50 text-sm"
                  value={selectedTopic}
                  onChange={(e) => setSelectedTopic(e.target.value)}
                >
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 p-2 border rounded text-sm"
                    placeholder="e.g. Order #101"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && produceMessage()}
                  />
                  <Button onClick={() => produceMessage()} className="px-3">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* AI Smart Producer */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-fuchsia-500 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Smart Producer
                </label>
                <input 
                  type="text"
                  className="w-full p-2 border border-fuchsia-200 rounded text-sm bg-fuchsia-50 focus:ring-fuchsia-500 focus:border-fuchsia-500"
                  placeholder="e.g. IoT Sensor Failures"
                  value={aiScenario}
                  onChange={(e) => setAiScenario(e.target.value)}
                />
                <Button 
                  variant="magic" 
                  onClick={generateSmartMessages} 
                  disabled={isGenerating || !aiScenario}
                  className="w-full"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {isGenerating ? "Generating..." : "Generate AI Data"}
                </Button>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoProduce} 
                    onChange={(e) => setAutoProduce(e.target.checked)} 
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm text-slate-600">Auto-generate simple traffic</span>
                </label>
              </div>
            </div>
          </Card>

          {/* Logs */}
          <Card className="p-4 flex-1 h-96 overflow-hidden flex flex-col">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">System Logs</h2>
            <div className="flex-1 overflow-y-auto space-y-2 font-mono text-xs">
              {logs.length === 0 && <p className="text-slate-300 italic">System ready...</p>}
              {logs.map(log => (
                <div key={log.id} className="border-b border-slate-50 pb-1">
                  <span className="text-slate-400 mr-2">[{log.time}]</span>
                  <span className={`break-words ${log.text.startsWith('AI:') ? 'text-fuchsia-600' : 'text-slate-700'}`}>
                    {log.text}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* --- MIDDLE: CLUSTER / TOPICS --- */}
        <div className="col-span-12 lg:col-span-6 space-y-6">
          {topics.map(topic => (
            <Card key={topic.id} className="p-1 overflow-hidden">
              <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-slate-700">Topic: {topic.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="secondary" 
                    className="!py-1 !px-2 !text-xs" 
                    onClick={() => analyzeTopicData(topic.id)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <BrainCircuit className="w-3 h-3 text-fuchsia-600" />}
                    Analyze Traffic
                  </Button>
                  <Badge color="orange">{topic.partitions.length} Partitions</Badge>
                </div>
              </div>

              {/* Analysis Result Banner */}
              {topicAnalysis && (
                 <div className="bg-fuchsia-50 p-3 border-b border-fuchsia-100 flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
                    <Sparkles className="w-4 h-4 text-fuchsia-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-fuchsia-700 uppercase">AI Insight: </span>
                      <span className="text-sm text-fuchsia-900">{topicAnalysis}</span>
                    </div>
                    <button onClick={() => setTopicAnalysis(null)} className="ml-auto text-fuchsia-400 hover:text-fuchsia-600">
                      <Trash2 className="w-3 h-3" />
                    </button>
                 </div>
              )}
              
              <div className="p-4 space-y-4 bg-slate-50/50">
                {topic.partitions.map((partition, pIndex) => (
                  <div key={pIndex} className="relative">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-400 uppercase">Partition {pIndex}</span>
                    </div>
                    
                    {/* Partition Log / Stream Visual */}
                    <div className="h-16 bg-white border border-slate-300 rounded-md flex items-center overflow-x-auto overflow-y-hidden px-2 gap-1 shadow-inner relative">
                      {partition.length === 0 && (
                        <span className="text-slate-300 text-xs italic w-full text-center select-none">Empty Partition</span>
                      )}
                      {partition.map((msg, mIndex) => (
                        <div 
                          key={mIndex} 
                          className="flex-shrink-0 w-8 h-10 bg-orange-100 border border-orange-200 rounded flex items-center justify-center text-xs font-bold text-orange-800 shadow-sm group relative cursor-default"
                          title={`Offset: ${msg.offset}\nContent: ${msg.content}`}
                        >
                          {msg.offset}
                          
                          {/* Hover Tooltip */}
                          <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                            {msg.content.substring(0, 20)}{msg.content.length > 20 ? '...' : ''}
                          </div>
                        </div>
                      ))}
                      
                      {/* Consumer Heads (Cursors) */}
                      {consumers.filter(c => c.topicId === topic.id && c.active).map((consumer, cIdx) => {
                         const offset = consumer.offsets[pIndex];
                         const leftPos = (offset * 36) + 8; // 8px padding
                         
                         return (
                           <div 
                            key={consumer.id}
                            className="absolute top-0 bottom-0 w-0.5 z-20 transition-all duration-300"
                            style={{ 
                              left: `${Math.min(leftPos, 1000)}px`,
                              backgroundColor: consumer.color === 'blue' ? '#2563eb' : '#9333ea'
                            }}
                           >
                             <div className={`absolute -top-3 -left-3 ${consumer.color === 'blue' ? 'bg-blue-600' : 'bg-purple-600'} text-white text-[9px] px-1 rounded shadow-lg whitespace-nowrap`}>
                               {consumer.name}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
          
          <div className="text-center">
             <p className="text-sm text-slate-400 italic">
               Note: Messages are appended to the end of partitions. Consumers read from left to right.
             </p>
          </div>
        </div>

        {/* --- RIGHT: CONSUMERS --- */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            Consumer Groups
          </h2>

          {consumers.map(consumer => (
            <Card key={consumer.id} className={`p-4 transition-all ${consumer.active ? 'ring-2 ring-offset-2' : 'opacity-75'}`} style={{ ringColor: consumer.color }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{consumer.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{consumer.groupId}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${consumer.active ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`}></div>
              </div>

              <div className="mb-4 space-y-1">
                 <p className="text-xs text-slate-500 uppercase font-bold">Current Offsets:</p>
                 <div className="grid grid-cols-3 gap-1">
                   {consumer.offsets.map((off, idx) => (
                     <div key={idx} className="bg-slate-100 text-center py-1 rounded text-xs font-mono border border-slate-200">
                       P{idx}: <span className="font-bold">{off}</span>
                     </div>
                   ))}
                 </div>
              </div>

              <Button 
                onClick={() => toggleConsumer(consumer.id)}
                variant={consumer.active ? "danger" : "primary"}
                className={`w-full justify-center ${consumer.color === 'purple' && !consumer.active ? '!bg-purple-600 hover:!bg-purple-700' : ''}`}
              >
                {consumer.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {consumer.active ? "Stop Consumer" : "Start Consumer"}
              </Button>
            </Card>
          ))}
        </div>

      </div>
    </div>
  );
}