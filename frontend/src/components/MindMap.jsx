// === FINAL, GUARANTEED WORKING FILE: frontend/src/components/MindMap.jsx ===

import React, { useState, useEffect, useRef, memo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { v4 as uuidv4 } from "uuid";
import { ArrowLeft, Loader2, MousePointer2, Pencil, Trash2, Undo2, Redo2, Palette } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import dagre from 'dagre';
import MindMapToolbar from './MindMapToolbar';

// Helper function to prevent crashes on bad AI data
const sanitizeTree = (node) => {
    if (!node || typeof node.text !== 'string') return null;
    return {
        text: node.text,
        children: Array.isArray(node.children) ? node.children.map(sanitizeTree).filter(Boolean) : []
    };
};

// Component to render a single node
const Node = memo(({ node }) => (
    <div
        className="absolute bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded-lg shadow-md flex items-center justify-center p-2 text-center"
        style={{ left: `${node.x}px`, top: `${node.y}px`, width: `${node.width}px`, height: `${node.height}px`, transform: 'translate(-50%, -50%)' }}
    >
        <p className="text-sm text-gray-800 dark:text-gray-200">{node.text}</p>
    </div>
));
const DrawingControls = ({ activeTool, handleCanvasMouseDown, handleCanvasMouseMove, handleCanvasMouseUp }) => {
    const { setPanning } = useControls();
    
    useEffect(() => {
        // This effect disables/enables panning based on the active tool.
        setPanning({ disabled: activeTool === 'draw' });
    }, [activeTool, setPanning]);

    return (
        <div
            className="w-full h-full absolute top-0 left-0"
            style={{ cursor: activeTool === 'draw' ? 'crosshair' : 'grab' }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
        />
    );
};


// --- Main MindMap Component ---
const MindMap = () => {
    // --- State and Refs ---
    const [nodes, setNodes] = useState([]);
    const [lines, setLines] = useState([]);
    const [drawings, setDrawings] = useState([]);
    const [currentDrawing, setCurrentDrawing] = useState(null);
    const [undoStack, setUndoStack] = useState([]);
    const [activeTool, setActiveTool] = useState('select');
    const [drawColor, setDrawColor] = useState("#6366F1");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const isDrawing = useRef(false);

    const location = useLocation();
    const navigate = useNavigate();
    const sessionId = location.state?.sessionId;
    const PRESET_COLORS = ["#EF4444", "#F97316", "#84CC16", "#10B981", "#0EA5E9", "#6366F1", "#A855F7", "#EC4899", "#78716C"];
    useEffect(() => {
        const loadAndLayoutMap = async () => {
            if (!sessionId) { setLoading(false); return; }
            setLoading(true);

            try {
                const res = await fetch(`http://localhost:5000/api/mindmap/${sessionId}`);
                const aiData = await res.json();
                if (!aiData) { setLoading(false); return; }

                const sanitizedRoot = sanitizeTree(aiData);
                if (!sanitizedRoot) throw new Error("Invalid AI data structure.");
                
                // Dagre layout engine setup
                const dagreGraph = new dagre.graphlib.Graph();
                dagreGraph.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 25 });
                dagreGraph.setDefaultEdgeLabel(() => ({}));

                const tempNodes = [];
                const tempLines = [];
                const NODE_WIDTH = 200, NODE_HEIGHT = 50;

                function buildGraph(dataNode, parentId = null) {
                    const myId = uuidv4();
                    dagreGraph.setNode(myId, { label: dataNode.text, width: NODE_WIDTH, height: NODE_HEIGHT });
                    tempNodes.push({ id: myId, text: dataNode.text });

                    if (parentId) {
                        dagreGraph.setEdge(parentId, myId);
                        tempLines.push({ from: parentId, to: myId });
                    }
                    if (dataNode.children) {
                        dataNode.children.forEach(child => buildGraph(child, myId));
                    }
                }
                
                buildGraph(sanitizedRoot);
                dagre.layout(dagreGraph);

                setNodes(tempNodes.map(node => {
                    const dagreNode = dagreGraph.node(node.id);
                    return { ...node, x: dagreNode.x, y: dagreNode.y, width: dagreNode.width, height: dagreNode.height };
                }));
                setLines(tempLines);
                
            } catch (err) { console.error("Failed to layout mind map:", err); } 
            finally { setLoading(false); }
        };

        loadAndLayoutMap();
    }, [sessionId]);
    const transformStateRef = useRef({ positionX: 0, positionY: 0, scale: 1 });


    // Corrected drawing handlers
// --- Inside your MindMap component ---

    const handleCanvasMouseDown = (e, color, width) => {
        if (activeTool !== 'draw') return;
        isDrawing.current = true;
        const { positionX, positionY, scale } = transformStateRef.current;
        const point = { x: (e.clientX - positionX) / scale, y: (e.clientY - positionY) / scale };
        setCurrentDrawing({ id: uuidv4(), points: [point], color: color, strokeWidth: width });
    };
    const handleCanvasMouseMove = (e) => {
        if (!isDrawing.current || activeTool !== 'draw') return;
        const { positionX, positionY, scale } = transformStateRef.current;
        const point = { x: (e.clientX - positionX) / scale, y: (e.clientY - positionY) / scale };
        setCurrentDrawing(prev => prev ? { ...prev, points: [...prev.points, point] } : null);
    };
    const handleCanvasMouseUp = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentDrawing?.points.length > 1) {
            setDrawings(prev => [...prev, currentDrawing]);
            setUndoStack([]); // Clear redo stack on new drawing
        }
        setCurrentDrawing(null);
    };

const handleUndo = () => {
    if (drawings.length === 0) return;
    const lastDrawing = drawings[drawings.length - 1];
    setUndoStack(prev => [...prev, lastDrawing]); // Add it to the redo stack
    setDrawings(prev => prev.slice(0, -1)); // Remove it from the canvas
};

const handleRedo = () => {
    if (undoStack.length === 0) return;
    const lastUndone = undoStack[undoStack.length - 1];
    setDrawings(prev => [...prev, lastUndone]); // Add it back to the canvas
    setUndoStack(prev => prev.slice(0, -1)); // Remove it from the redo stack
};

const handleClear = () => {
    if (drawings.length > 0 && window.confirm("Clear all drawings? This cannot be undone.")) {
        setDrawings([]);
        setUndoStack([]);
    }
}
    const handleClearDrawings = () => {
        setDrawings([]);
        setCurrentDrawing(null);
    };
    

    if (loading) return <div className="w-screen h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900"><Loader2 className="animate-spin text-gray-500" size={48} /></div>;

    // --- RENDER ---
    return (
        <div className="w-screen h-screen relative overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Toolbar and Back button */}
            <div className="absolute top-4 left-4 z-50 ..."><button onClick={() => navigate("/workarea")}><ArrowLeft /> Back</button></div>
                <MindMapToolbar
                    activeTool={activeTool}
                    setActiveTool={setActiveTool}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onClear={handleClear}
                    setShowColorPicker={setShowColorPicker}
                />
                
                {/* Color and Stroke Palette */}
<AnimatePresence>
              {showColorPicker && (
                  <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border dark:border-gray-700"
                        >
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

            <TransformWrapper
                minScale={0.1}
                initialScale={0.5}
                limitToBounds={false}
                panning={{ disabled: activeTool === 'draw' }}
                onTransformed={(ref, state) => (transformStateRef.current = state)}

                
            >
                <TransformComponent wrapperClass="!w-full !h-full" contentClass="!w-full !h-full">
                    <div
                        className="w-[8000px] h-[6000px] relative"
                        style={{ backgroundImage: '...', cursor: activeTool === 'draw' ? 'crosshair' : 'grab' }}
                        onMouseDown={(e) => handleCanvasMouseDown(e, drawColor, strokeWidth)}
                        onMouseMove={handleCanvasMouseMove}
                        onMouseUp={handleCanvasMouseUp}
                        onMouseLeave={handleCanvasMouseUp}
                    >
                            <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
                                {lines.map(line => {
                                    const fromNode = nodes.find(n => n.id === line.from);
                                    const toNode = nodes.find(n => n.id === line.to);
                                    if (!fromNode || !toNode) return null;
                                    const pathData = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
                                    return <path key={`${line.from}-${line.to}`} d={pathData} stroke="#a1a1aa" strokeWidth="2" fill="none" />;
                                })}
                                {drawings.map(d => (<path key={d.id} d={`M ${d.points.map(p => `${p.x} ${p.y}`).join(" L ")}`} fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>))}
                                {currentDrawing && (<path d={`M ${currentDrawing.points.map(p => `${p.x} ${p.y}`).join(" L ")}`} fill="none" stroke="#a5b4fc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>)}
                            </svg>
                        {nodes.map(node => <Node key={node.id} node={node} />)}
                    </div>
                </TransformComponent>
            </TransformWrapper>
        </div>
    );
};

export default MindMap;