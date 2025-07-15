import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Loader2, Search, Plus, Minus, MousePointer2, Pencil, Trash2, Undo2, Redo2, Palette } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import dagre from 'dagre';
import axios from '../api/axiosConfig';

// --- SUB-COMPONENTS ---

const MindMapToolbar = ({ activeTool, setActiveTool, onUndo, onRedo, onClear, setShowColorPicker }) => (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border dark:border-gray-700">
        <button title="Select Tool" onClick={() => setActiveTool('select')} className={`p-2 rounded-lg ${activeTool === 'select' ? 'bg-purple-200 dark:bg-purple-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><MousePointer2 size={20} /></button>
        <button title="Draw Tool" onClick={() => setActiveTool('draw')} className={`p-2 rounded-lg ${activeTool === 'draw' ? 'bg-purple-200 dark:bg-purple-700' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}><Pencil size={20} /></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button title="Color Palette" onClick={() => setShowColorPicker(p => !p)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><Palette size={20} /></button>
        <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
        <button title="Undo" onClick={onUndo} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><Undo2 size={20} /></button>
        <button title="Redo" onClick={onRedo} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"><Redo2 size={20} /></button>
        <button title="Clear Drawings" onClick={onClear} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-red-500"><Trash2 size={20} /></button>
    </div>
);

const Edge = memo(({ fromNode, toNode }) => {
  if (!fromNode || !toNode) return null;
  const pathData = `M ${fromNode.x} ${fromNode.y} C ${(fromNode.x + toNode.x) / 2} ${fromNode.y}, ${(fromNode.x + toNode.x) / 2} ${toNode.y}, ${toNode.x} ${toNode.y}`;
  return <path d={pathData} className="stroke-gray-300 dark:stroke-gray-600" strokeWidth="2" fill="none" />;
});

const Node = memo(({ node, onToggleCollapse, isCollapsed, isHighlighted }) => (
  <motion.div
    layout
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    transition={{ duration: 0.3, type: "spring" }}
    className={`absolute flex items-center justify-center p-3 rounded-lg shadow-lg border cursor-pointer transition-all duration-200 ${isHighlighted ? 'bg-purple-200 dark:bg-purple-700 border-purple-500 scale-105 ring-2 ring-purple-400' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}
    style={{ left: node.x, top: node.y, width: node.width, height: node.height, transform: 'translate(-50%, -50%)' }}
  >
    <p className="text-sm text-center text-gray-800 dark:text-gray-100 px-4">{node.text}</p>
    {node.hasChildren && (
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCollapse(node.id); }}
        className="absolute -right-3 -top-3 w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 z-10"
      >
        {isCollapsed ? <Plus size={16} /> : <Minus size={16} />}
      </button>
    )}
  </motion.div>
));


// --- Main MindMap Component ---
const MindMap = () => {
    // State for mind map data
    const [allNodes, setAllNodes] = useState([]);
    const [allEdges, setAllEdges] = useState([]);
    const [collapsedNodes, setCollapsedNodes] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedNodes, setHighlightedNodes] = useState(new Set());
    const [loading, setLoading] = useState(true);

    // State for drawing functionality
    const [drawings, setDrawings] = useState([]);
    const [currentDrawing, setCurrentDrawing] = useState(null);
    const [undoStack, setUndoStack] = useState([]);
    const [activeTool, setActiveTool] = useState('select');
    const [drawColor, setDrawColor] = useState("#6366F1");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [showColorPicker, setShowColorPicker] = useState(false);
    
    // Refs
    const isDrawing = useRef(false);
    const transformStateRef = useRef(null);

    // Router hooks
    const location = useLocation();
    const navigate = useNavigate();
    const { fileId } = location.state || {};
    
    const PRESET_COLORS = ["#EF4444", "#F97316", "#84CC16", "#10B981", "#0EA5E9", "#6366F1", "#A855F7", "#EC4899", "#78716C"];

    // Data loading and layout effect
    useEffect(() => {
        const loadAndLayoutMap = async () => {
            if (!fileId) { setLoading(false); return; }
            setLoading(true);
            try {
                const res = await axios.get(`/api/mindmap/file/${fileId}`);
                const aiData = res.data;
                if (!aiData) { setLoading(false); return; }

                const dagreGraph = new dagre.graphlib.Graph();
                dagreGraph.setGraph({ rankdir: 'LR', ranksep: 100, nodesep: 30 });
                dagreGraph.setDefaultEdgeLabel(() => ({}));

                const tempNodes = [];
                const tempEdges = [];
                const NODE_WIDTH = 220, NODE_HEIGHT = 60;

                function buildGraph(dataNode, parentId = null) {
                    if (!dataNode || typeof dataNode.text !== 'string') return;
                    const myId = uuidv4();
                    const hasChildren = Array.isArray(dataNode.children) && dataNode.children.length > 0;
                    dagreGraph.setNode(myId, { label: dataNode.text, width: NODE_WIDTH, height: NODE_HEIGHT });
                    tempNodes.push({ id: myId, parentId, text: dataNode.text, hasChildren });

                    if (parentId) {
                        dagreGraph.setEdge(parentId, myId);
                        tempEdges.push({ from: parentId, to: myId });
                    }
                    if (hasChildren) {
                        dataNode.children.forEach(child => buildGraph(child, myId));
                    }
                }
                
                buildGraph(aiData);
                dagre.layout(dagreGraph);

                const laidOutNodes = tempNodes.map(node => {
                    const dagreNode = dagreGraph.node(node.id);
                    return { ...node, x: dagreNode.x, y: dagreNode.y, width: dagreNode.width, height: dagreNode.height };
                });

                setAllNodes(laidOutNodes);
                setAllEdges(tempEdges);
            } catch (err) { console.error("Failed to load or layout mind map:", err); } 
            finally { setLoading(false); }
        };
        loadAndLayoutMap();
    }, [fileId]);

    // Handlers for new features
    const handleToggleCollapse = useCallback((nodeId) => {
        setCollapsedNodes(prev => {
            const newSet = new Set(prev);
            newSet.has(nodeId) ? newSet.delete(nodeId) : newSet.add(nodeId);
            return newSet;
        });
    }, []);
    
    // Handlers for drawing
    const handleCanvasMouseDown = (e) => {
        if (activeTool !== 'draw' || !transformStateRef.current) return;
        isDrawing.current = true;
        const { positionX, positionY, scale } = transformStateRef.current;
        const point = { x: (e.clientX - positionX) / scale, y: (e.clientY - positionY) / scale };
        setCurrentDrawing({ id: uuidv4(), points: [point], color: drawColor, strokeWidth: strokeWidth });
    };
    const handleCanvasMouseMove = (e) => {
        if (!isDrawing.current || activeTool !== 'draw' || !transformStateRef.current) return;
        const { positionX, positionY, scale } = transformStateRef.current;
        const point = { x: (e.clientX - positionX) / scale, y: (e.clientY - positionY) / scale };
        setCurrentDrawing(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
    };
    const handleCanvasMouseUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentDrawing?.points.length > 1) {
            setDrawings(prev => [...prev, currentDrawing]);
            setUndoStack([]);
        }
        setCurrentDrawing(null);
    };
    const handleUndo = () => {
        if (drawings.length === 0) return;
        const lastDrawing = drawings[drawings.length - 1];
        setUndoStack(prev => [...prev, lastDrawing]);
        setDrawings(prev => prev.slice(0, -1));
    };
    const handleRedo = () => {
        if (undoStack.length === 0) return;
        const lastUndone = undoStack[undoStack.length - 1];
        setDrawings(prev => [...prev, lastUndone]);
        setUndoStack(prev => prev.slice(0, -1));
    };
    const handleClear = () => {
        if (drawings.length > 0 && window.confirm("Clear all drawings? This cannot be undone.")) {
            setDrawings([]);
            setUndoStack([]);
        }
    }

    // Memoized calculation for visible nodes/edges
    const visibleNodesAndEdges = useMemo(() => {
        if (allNodes.length === 0) return { visibleNodes: [], visibleEdges: [] };
        const visibleNodeIds = new Set();
        const queue = allNodes.filter(n => !n.parentId);
        while(queue.length > 0) {
            const node = queue.shift();
            visibleNodeIds.add(node.id);
            if (!collapsedNodes.has(node.id) && node.hasChildren) {
                allNodes.filter(n => n.parentId === node.id).forEach(child => queue.push(child));
            }
        }
        const visibleNodes = allNodes.filter(n => visibleNodeIds.has(n.id));
        const visibleEdges = allEdges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
        return { visibleNodes, visibleEdges };
    }, [allNodes, allEdges, collapsedNodes]);

    // Effect for search highlighting
    useEffect(() => {
        if (!searchQuery) { setHighlightedNodes(new Set()); return; }
        const newHighlightedNodes = new Set();
        allNodes.forEach(node => {
            if (node.text.toLowerCase().includes(searchQuery.toLowerCase())) {
                newHighlightedNodes.add(node.id);
                let current = node;
                while(current.parentId) {
                    newHighlightedNodes.add(current.parentId);
                    current = allNodes.find(n => n.id === current.parentId);
                }
            }
        });
        setHighlightedNodes(newHighlightedNodes);
    }, [searchQuery, allNodes]);

    if (loading) return <div className="w-screen h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><Loader2 className="animate-spin text-gray-500" size={48} /></div>;

    return (
        <div className="w-screen h-screen relative overflow-hidden bg-gray-100 dark:bg-gray-900">
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <button onClick={() => navigate("/workarea")} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <ArrowLeft size={18} /> Back
                </button>
                <div className="relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search map..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-4 py-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-md focus:ring-2 focus:ring-purple-500 outline-none"/>
                </div>
            </div>

            <MindMapToolbar activeTool={activeTool} setActiveTool={setActiveTool} onUndo={handleUndo} onRedo={handleRedo} onClear={handleClear} setShowColorPicker={setShowColorPicker} />
            <AnimatePresence>
                {showColorPicker && (
                    <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border dark:border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                                {PRESET_COLORS.map(color => (<button key={color} onClick={() => setDrawColor(color)} style={{ backgroundColor: color }} className={`w-6 h-6 rounded-full border-2 ${drawColor === color ? 'border-black' : 'border-transparent'}`} />))}
                            </div>
                            <div className="w-px h-6 bg-gray-300" />
                            <input type="range" min="2" max="20" value={strokeWidth} onChange={e => setStrokeWidth(Number(e.target.value))} className="w-24" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <TransformWrapper minScale={0.1} initialScale={0.5} limitToBounds={false} panning={{ disabled: activeTool === 'draw' }} onTransformed={(ref, state) => (transformStateRef.current = state)}>
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <div className="w-[8000px] h-[6000px] relative" style={{ cursor: activeTool === 'draw' ? 'crosshair' : 'grab' }}
                        onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}>
                        
                        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                            {visibleNodesAndEdges.visibleEdges.map(edge => (<Edge key={`${edge.from}-${edge.to}`} fromNode={allNodes.find(n => n.id === edge.from)} toNode={allNodes.find(n => n.id === edge.to)} />))}
                            
                            {drawings.map(d => (<path key={d.id} d={`M ${d.points.map(p => `${p.x} ${p.y}`).join(" L ")}`} fill="none" stroke={d.color} strokeWidth={d.strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>))}
                            {currentDrawing && (<path d={`M ${currentDrawing.points.map(p => `${p.x} ${p.y}`).join(" L ")}`} fill="none" stroke={drawColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"/>)}
                        </svg>
                        
                        {visibleNodesAndEdges.visibleNodes.map(node => (<Node key={node.id} node={node} onToggleCollapse={handleToggleCollapse} isCollapsed={collapsedNodes.has(node.id)} isHighlighted={highlightedNodes.has(node.id)} />))}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
};

export default MindMap;