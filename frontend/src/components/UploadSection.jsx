import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { Moon, Sun, FileText, BrainCircuit, MessageSquare } from 'lucide-react';
import Spline from '@splinetool/react-spline'; // Use the standard import

// === Header Component ===
const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/50 dark:bg-purple-950/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-purple-600 dark:stroke-purple-400">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xl font-bold text-gray-800 dark:text-white">Documentor</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/login')} className="font-semibold text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Sign In
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-purple-900 hover:bg-gray-300 dark:hover:bg-purple-800 transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

// === Hero Section Component ===
const HeroSection = () => {
  const navigate = useNavigate();
  return (
    // ✅ Set section to relative and full screen height
    <section className="relative w-full h-screen flex items-center justify-center text-center overflow-hidden">
      {/* ✅ Spline background component */}
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Spline scene="https://prod.spline.design/DhwClmo-4uW5VzKw/scene.splinecode" />
      </div>

      {/* ✅ Content container with higher z-index */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 px-4"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Unlock Insights from <span className="text-purple-600 dark:text-purple-400">Your Documents</span>
        </h1>
        <p className="max-w-3xl mx-auto mt-6 text-lg text-gray-600 dark:text-gray-300">
          Documentor is an intelligent platform that transforms your static PDFs into interactive sources of knowledge. Ask questions, generate mind maps, and discover connections like never before.
        </p>
        <div className="mt-10">
          <button
            onClick={() => navigate('/workarea')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105"
          >
            Start Here
          </button>
        </div>
      </motion.div>
    </section>
  );
};

// === Feature Section Component ===
const Feature = ({ icon, title, description }) => (
  <div className="bg-white dark:bg-purple-900/50 p-6 rounded-lg shadow-md border border-gray-200 dark:border-purple-800">
    <div className="text-purple-600 dark:text-purple-400 mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400">{description}</p>
  </div>
);

const FeaturesSection = () => (
    // ✅ Updated theme background color
  <section className="py-20 bg-gray-50 dark:bg-purple-950">
    <div className="container mx-auto px-6">
      <h2 className="text-4xl font-bold text-center mb-12 text-gray-900 dark:text-white">Everything You Need to Analyze</h2>
      <div className="grid md:grid-cols-3 gap-8">
        <Feature
          icon={<MessageSquare size={32} />}
          title="Conversational Q&A"
          description="Chat directly with your documents. Get instant, context-aware answers without manual searching."
        />
        <Feature
          icon={<BrainCircuit size={32} />}
          title="AI-Powered Mind Maps"
          description="Automatically generate visual mind maps from any document to understand its core structure and ideas at a glance."
        />
        <Feature
          icon={<FileText size={32} />}
          title="Multi-Document Insights"
          description="Synthesize information across multiple files to uncover patterns, compare data, and get a holistic view."
        />
      </div>
    </div>
  </section>
);


// === Main Homepage Component ===
const Homepage = () => {
  const { theme } = useTheme();

  return (
    <div className={`w-full min-h-screen transition-colors duration-500 ${
      theme === 'light' ? 'bg-white' : 'bg-purple-950' // ✅ Updated theme background color
    }`}>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
      </main>
    </div>
  );
};

export default Homepage;