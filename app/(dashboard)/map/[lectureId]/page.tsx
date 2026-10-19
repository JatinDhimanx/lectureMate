"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  ReactFlow,
  Node, Edge, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Play, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemoLectureData } from "@/lib/db/mock-data";

type Concept = DemoLectureData["concepts"][0];

function getMasteryColor(score: number): string {
  if (score > 0.8) return "#10B981"; // emerald
  if (score > 0.5) return "#F59E0B"; // amber
  return "#6366F1"; // indigo (low/unstudied)
}

function getMasteryGlow(score: number): string {
  if (score > 0.8) return "0 0 20px -4px rgba(16,185,129,0.5)";
  if (score > 0.5) return "0 0 20px -4px rgba(245,158,11,0.5)";
  return "0 0 20px -4px rgba(99,102,241,0.5)";
}

export default function ConceptMapPage() {
  const params = useParams();
  const [lecture, setLecture] = useState<DemoLectureData | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedConcept, setSelectedConcept] = useState<Concept | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const id = (params.lectureId as string) || "d9e8f7a6-b5c4-4d3e-2f1a-0b9c8d7e6f5a";
      try {
        const res = await fetch(`/api/lectures/${id}`);
        if (res.ok) {
          const data: DemoLectureData = await res.json();
          setLecture(data);

          // Layout nodes in a circular arrangement
          const n = data.concepts.length;
          const flowNodes: Node[] = data.concepts.map((c, i) => {
            const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
            const radius = n > 4 ? 280 : 180;
            const x = Math.cos(angle) * radius + 400;
            const y = Math.sin(angle) * radius + 280;
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
                border: `2px solid ${color}55`,
                borderRadius: 12,
                padding: "10px 16px",
                color: "#F3F4F6",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: glow,
                cursor: "pointer",
                minWidth: 140,
                textAlign: "center",
              },
            };
          });

          const flowEdges: Edge[] = data.conceptEdges.map((e) => ({
            id: e.id,
            source: e.sourceConceptId,
            target: e.targetConceptId,
            animated: false,
            style: { stroke: "rgba(255,255,255,0.15)", strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.25)" },
            label: e.relationType,
            labelStyle: { fontSize: 9, fill: "rgba(255,255,255,0.3)", fontFamily: "monospace" },
          }));

          setNodes(flowNodes);
          setEdges(flowEdges);
        }
      } catch {}
      setLoading(false);
    }
    load();
  }, [params.lectureId]);

  const onNodeClick = useCallback((_: unknown, node: Node) => {
    const concept = (node.data as { concept: Concept }).concept;
    setSelectedConcept(concept);
  }, []);

  const conceptCards = lecture?.cards.filter(
    (c) => c.conceptId === selectedConcept?.id
  );

  return (
    <div className="relative h-full">
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Brain className="w-10 h-10 text-indigo-400 animate-pulse" />
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="absolute top-4 left-4 z-10 rounded-xl border border-white/[0.08] bg-[#12151D]/90 backdrop-blur px-4 py-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">Mastery</p>
            <div className="space-y-1.5">
              {[
                { color: "#6366F1", label: "Unstudied / Struggling" },
                { color: "#F59E0B", label: "Learning (50–80%)" },
                { color: "#10B981", label: "Mastered (>80%)" },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
            fitViewOptions={{ padding: 0.2 }}
          >
            <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.04)" gap={24} />
            <Controls style={{ background: "#12151D", border: "1px solid rgba(255,255,255,0.08)" }} />
            <MiniMap
              style={{ background: "#12151D", border: "1px solid rgba(255,255,255,0.08)" }}
              nodeColor={(n) => getMasteryColor((n.data as { concept: Concept })?.concept?.masteryScore ?? 0)}
            />
          </ReactFlow>

          {/* Concept inspector drawer */}
          <AnimatePresence>
            {selectedConcept && (
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 22 }}
                className="absolute top-0 right-0 h-full w-80 bg-[#12151D] border-l border-white/[0.08] z-20 flex flex-col shadow-2xl"
              >
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getMasteryColor(selectedConcept.masteryScore) }}
                    />
                    <span className="text-sm font-semibold text-white">{selectedConcept.name}</span>
                    {selectedConcept.examCue && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">
                        exam
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => setSelectedConcept(null)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Definition</p>
                    <p className="text-sm text-slate-300 leading-relaxed">{selectedConcept.definition}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Mastery</p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${selectedConcept.masteryScore * 100}%`,
                            backgroundColor: getMasteryColor(selectedConcept.masteryScore),
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: getMasteryColor(selectedConcept.masteryScore) }}>
                        {(selectedConcept.masteryScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                      Cards ({conceptCards?.length ?? 0})
                    </p>
                    {conceptCards && conceptCards.length > 0 ? (
                      <div className="space-y-2">
                        {conceptCards.slice(0, 3).map((c) => (
                          <div key={c.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <p className="text-xs text-slate-300 line-clamp-2">{c.front}</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded",
                                c.fsrsState === "New" ? "bg-slate-500/15 text-slate-400" :
                                c.fsrsState === "Learning" ? "bg-amber-500/15 text-amber-400" :
                                "bg-emerald-500/15 text-emerald-400"
                              )}>{c.fsrsState}</span>
                              <span className="text-[10px] text-slate-600 capitalize">{c.bloomLevel}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">No cards for this concept.</p>
                    )}
                  </div>
                  <div className="pt-2 border-t border-white/[0.06]">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Source</p>
                    <div className="rounded-xl bg-[#181C26] border border-indigo-500/20 p-3">
                      <p className="text-xs font-mono text-indigo-300/80 leading-relaxed">
                        "{selectedConcept.sourceSpan?.quote?.slice(0, 150)}..."
                      </p>
                    </div>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-medium hover:opacity-90 transition-opacity">
                    <Play className="w-3.5 h-3.5" /> Study This Concept
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
