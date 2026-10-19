"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  BackgroundVariant,
  Connection,
  addEdge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Brain,
  Play,
  Plus,
  Trash2,
  Save,
  Link2,
  Sparkles,
  ChevronRight,
  Info,
  Check,
  RefreshCw,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";

type Concept = DemoLectureData["concepts"][0];

function getMasteryColor(score: number): string {
  if (score > 0.8) return "#10B981"; // emerald
  if (score > 0.5) return "#F59E0B"; // amber
  return "#6366F1"; // indigo
}

function getMasteryGlow(score: number): string {
  if (score > 0.8) return "0 0 20px -4px rgba(16,185,129,0.5)";
  if (score > 0.5) return "0 0 20px -4px rgba(245,158,11,0.5)";
  return "0 0 20px -4px rgba(99,102,241,0.5)";
}

export default function ConceptMapPage() {
  const params = useParams();
  const router = useRouter();
  const [lecture, setLecture] = useState<DemoLectureData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New Node Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newNodeName, setNewNodeName] = useState("");
  const [newNodeDef, setNewNodeDef] = useState("");
  const [newNodeExamCue, setNewNodeExamCue] = useState(false);

  const lectureId = useMemo(() => {
    return (params.lectureId as string) || "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a";
  }, [params.lectureId]);

  // Load Lecture & Build Graph
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/lectures/${lectureId}`);
        if (res.ok) {
          const data: DemoLectureData = await res.json();
          setLecture(data);

          const n = data.concepts.length;
          const flowNodes: Node[] = data.concepts.map((c, i) => {
            const angle = (i / Math.max(n, 1)) * 2 * Math.PI - Math.PI / 2;
            const radius = n > 5 ? 320 : 200;
            const x = Math.cos(angle) * radius + 460;
            const y = Math.sin(angle) * radius + 320;
            const color = getMasteryColor(c.masteryScore);
            const glow = getMasteryGlow(c.masteryScore);

            return {
              id: c.id,
              data: {
                label: c.name,
                concept: c,
              },
              position: { x, y },
              style: {
                background: "rgba(18, 21, 29, 0.95)",
                border: `2px solid ${color}`,
                borderRadius: 14,
                padding: "12px 18px",
                color: "#F8FAFC",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: glow,
                cursor: "pointer",
                minWidth: 150,
                textAlign: "center",
              },
            };
          });

          const flowEdges: Edge[] = data.conceptEdges.map((e) => ({
            id: e.id,
            source: e.sourceConceptId,
            target: e.targetConceptId,
            animated: true,
            style: { stroke: "#6366F1", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#6366F1" },
            label: e.relationType,
            labelStyle: { fontSize: 10, fill: "#94A3B8", fontWeight: 500 },
          }));

          setNodes(flowNodes);
          setEdges(flowEdges);
        }
      } catch (err) {
        console.error("Failed to load lecture map:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [lectureId, setNodes, setEdges]);

  // Connect two nodes (drag line between handles)
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        id: `edge-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        animated: true,
        style: { stroke: "#818CF8", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "#818CF8" },
        label: "prerequisite",
        labelStyle: { fontSize: 10, fill: "#94A3B8", fontWeight: 500 },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Click on Node
  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const concept = (node.data as { concept: Concept }).concept;
    setSelectedConcept(concept);
    setSelectedEdgeId(null);
  }, []);

  // Click on Edge
  const onEdgeClick = useCallback((_: unknown, edge: Edge) => {
    setSelectedEdgeId(edge.id);
  }, []);

  // Create New Node
  const handleCreateNode = () => {
    if (!newNodeName.trim()) return;

    const newId = `concept-${Date.now()}`;
    const newConcept: Concept = {
      id: newId,
      name: newNodeName.trim(),
      definition: newNodeDef.trim() || `Core concept: ${newNodeName.trim()}`,
      importanceScore: 0.8,
      examCue: newNodeExamCue,
      masteryScore: 0.1,
      sourceSpan: {
        startChar: 0,
        endChar: 0,
        quote: newNodeDef.trim() || newNodeName.trim(),
      },
    };

    // Calculate spawn position near center with random offset
    const x = 400 + (Math.random() - 0.5) * 200;
    const y = 300 + (Math.random() - 0.5) * 200;
    const color = getMasteryColor(newConcept.masteryScore);

    const newNode: Node = {
      id: newId,
      data: {
        label: newConcept.name,
        concept: newConcept,
      },
      position: { x, y },
      style: {
        background: "rgba(18, 21, 29, 0.95)",
        border: `2px solid ${color}`,
        borderRadius: 14,
        padding: "12px 18px",
        color: "#F8FAFC",
        fontSize: 13,
        fontWeight: 600,
        boxShadow: getMasteryGlow(newConcept.masteryScore),
        cursor: "pointer",
        minWidth: 150,
        textAlign: "center",
      },
    };

    setNodes((nds) => [...nds, newNode]);
    if (lecture) {
      setLecture({
        ...lecture,
        concepts: [...lecture.concepts, newConcept],
      });
    }

    setNewNodeName("");
    setNewNodeDef("");
    setNewNodeExamCue(false);
    setShowAddModal(false);
  };

  // Delete Selected Concept Node
  const handleDeleteConcept = (conceptId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== conceptId));
    setEdges((eds) => eds.filter((e) => e.source !== conceptId && e.target !== conceptId));
    if (lecture) {
      setLecture({
        ...lecture,
        concepts: lecture.concepts.filter((c) => c.id !== conceptId),
        conceptEdges: lecture.conceptEdges.filter(
          (e) => e.sourceConceptId !== conceptId && e.targetConceptId !== conceptId
        ),
      });
    }
    if (selectedConcept?.id === conceptId) {
      setSelectedConcept(null);
    }
  };

  // Delete Selected Edge
  const handleDeleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  // Save Graph State to Backend
  const handleSaveMap = async () => {
    if (!lecture) return;
    setSaving(true);
    try {
      const activeConcepts: Concept[] = nodes.map((n) => {
        const c = (n.data as { concept: Concept }).concept;
        return c;
      });

      const activeEdges = edges.map((e) => ({
        id: e.id,
        sourceConceptId: e.source,
        targetConceptId: e.target,
        relationType: (e.label as string) || "prerequisite",
        weight: 1,
      }));

      const res = await fetch(`/api/lectures/${lectureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concepts: activeConcepts,
          conceptEdges: activeEdges,
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Save map error:", err);
    } finally {
      setSaving(false);
    }
  };

  const conceptCards = lecture?.cards.filter(
    (c) => c.conceptId === selectedConcept?.id
  );

  return (
    <div className="relative h-screen w-full bg-[#0B0F19] overflow-hidden select-none">
      {loading ? (
        <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
          <Brain className="w-10 h-10 text-indigo-400 animate-pulse" />
          <p className="text-sm font-medium">Loading interactive concept tree...</p>
        </div>
      ) : (
        <>
          {/* Top Floating Control Bar */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
            <div className="pointer-events-auto flex items-center gap-2 bg-[#121622]/90 backdrop-blur border border-white/10 rounded-2xl px-4 py-2.5 shadow-xl">
              <button
                onClick={() => router.push(`/lectures/${lectureId}`)}
                className="text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <BookOpen className="w-3.5 h-3.5" /> Back to Lecture
              </button>
              <span className="text-slate-600">/</span>
              <h2 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                {lecture?.title || "Concept Map"}
              </h2>
            </div>

            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
              >
                <Plus className="w-4 h-4" /> Add Concept
              </button>

              {selectedEdgeId && (
                <button
                  onClick={handleDeleteSelectedEdge}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all animate-bounce"
                >
                  <Trash2 className="w-4 h-4" /> Remove Selected Link
                </button>
              )}

              <button
                onClick={handleSaveMap}
                disabled={saving}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-semibold transition-all shadow-lg",
                  saveSuccess
                    ? "bg-emerald-600 shadow-emerald-600/30"
                    : "bg-slate-800 hover:bg-slate-700 border border-white/10"
                )}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Graph"}</span>
              </button>
            </div>
          </div>

          {/* Interactive Help & Mastery Legend */}
          <div className="absolute bottom-6 left-6 z-10 rounded-2xl border border-white/10 bg-[#121622]/90 backdrop-blur p-4 shadow-2xl max-w-xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Full Graph Interactivity</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              • <strong>Connect:</strong> Drag from one node's handle to another to link prerequisites.<br />
              • <strong>Move:</strong> Drag any node freely to reposition.<br />
              • <strong>Inspect:</strong> Click any node for cards & details.
            </p>
            <div className="pt-2 border-t border-white/5 space-y-1">
              {[
                { color: "#6366F1", label: "Unstudied / New" },
                { color: "#F59E0B", label: "Learning (50–80%)" },
                { color: "#10B981", label: "Mastered (>80%)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* React Flow Canvas */}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            fitView
            fitViewOptions={{ padding: 0.25 }}
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.08)" gap={24} />
            <Controls style={{ background: "#121622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }} />
            <MiniMap
              style={{ background: "#121622", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12 }}
              nodeColor={(n) => getMasteryColor((n.data as { concept: Concept })?.concept?.masteryScore ?? 0)}
            />
          </ReactFlow>

          {/* Create Concept Modal */}
          <AnimatePresence>
            {showAddModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-[#121622] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Plus className="w-4 h-4 text-indigo-400" /> Create Concept Node
                    </h3>
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 mb-1 block">
                        Concept Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Paxos Consensus"
                        value={newNodeName}
                        onChange={(e) => setNewNodeName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                        autoFocus
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-400 mb-1 block">
                        Definition / Overview
                      </label>
                      <textarea
                        rows={3}
                        placeholder="e.g., A protocol for reaching consensus in an asynchronous network of unreliable nodes."
                        value={newNodeDef}
                        onChange={(e) => setNewNodeDef(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={newNodeExamCue}
                        onChange={(e) => setNewNodeExamCue(e.target.checked)}
                        className="rounded bg-white/10 border-white/20 text-indigo-600 focus:ring-0"
                      />
                      <span>Mark as High-Priority / Exam Focus</span>
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateNode}
                      disabled={!newNodeName.trim()}
                      className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white shadow-lg shadow-indigo-600/30"
                    >
                      Create Node
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Concept Inspector Drawer */}
          <AnimatePresence>
            {selectedConcept && (
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute top-0 right-0 h-full w-88 max-w-full bg-[#121622]/95 backdrop-blur-md border-l border-white/10 z-30 flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5 truncate">
                    <div
                      className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getMasteryColor(selectedConcept.masteryScore) }}
                    />
                    <span className="text-sm font-bold text-white truncate">
                      {selectedConcept.name}
                    </span>
                    {selectedConcept.examCue && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                        Exam Focus
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedConcept(null)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Academic Definition
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed bg-white/5 p-3.5 rounded-xl border border-white/5">
                      {selectedConcept.definition}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Mastery Score
                    </p>
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selectedConcept.masteryScore * 100}%`,
                            backgroundColor: getMasteryColor(selectedConcept.masteryScore),
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-bold font-mono"
                        style={{ color: getMasteryColor(selectedConcept.masteryScore) }}
                      >
                        {(selectedConcept.masteryScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                      Associated Cards ({conceptCards?.length ?? 0})
                    </p>
                    {conceptCards && conceptCards.length > 0 ? (
                      <div className="space-y-2">
                        {conceptCards.map((c) => (
                          <div
                            key={c.id}
                            className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1.5"
                          >
                            <p className="text-xs font-medium text-slate-200 line-clamp-2">
                              {c.front}
                            </p>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                                  c.fsrsState === "New"
                                    ? "bg-slate-500/20 text-slate-400"
                                    : c.fsrsState === "Learning"
                                    ? "bg-amber-500/20 text-amber-300"
                                    : "bg-emerald-500/20 text-emerald-300"
                                )}
                              >
                                {c.fsrsState}
                              </span>
                              <span className="text-[10px] text-slate-500 capitalize">
                                {c.bloomLevel}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 italic">No cards associated with this concept.</p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/10 flex flex-col gap-2">
                    <button
                      onClick={() => router.push(`/study`)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 hover:opacity-95 transition-opacity"
                    >
                      <Play className="w-3.5 h-3.5" /> Practice Flashcards
                    </button>
                    <button
                      onClick={() => handleDeleteConcept(selectedConcept.id)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Concept Node
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
