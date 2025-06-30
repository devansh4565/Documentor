// in frontend/src/components/DrawingToolbar.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { MousePointer2, Pencil, Trash2, Undo2, Redo2, Palette } from 'lucide-react';

const ToolButton = ({ icon: Icon, title, isActive, ...props }) => (
    <motion.button
        title={title}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`p-3 rounded-lg transition-colors duration-200 
                   ${isActive ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
        {...props}
    >
        <Icon size={20} />
    </motion.button>
);

const MindMapToolbar = ({ activeTool, setActiveTool, onClear, onUndo, onRedo, setShowColorPicker }) => {
    return (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50">
            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-2 rounded-xl shadow-2xl border dark:border-gray-700"
            >
                <ToolButton icon={MousePointer2} isActive={activeTool === 'select'} onClick={() => setActiveTool('select')} title="Select/Pan" />
                <ToolButton icon={Pencil} isActive={activeTool === 'draw'} onClick={() => setActiveTool('draw')} title="Draw" />
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <ToolButton icon={Undo2} onClick={onUndo} title="Undo" />
                <ToolButton icon={Redo2} onClick={onRedo} title="Redo" />
                <ToolButton icon={Trash2} onClick={onClear} title="Clear All Drawings" />
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <ToolButton icon={Palette} onClick={() => setShowColorPicker(p => !p)} title="Color" />
            </motion.div>
        </div>
    );
};

export default MindMapToolbar;