import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { motion } from 'framer-motion';
import { Moon, Sun, FileText, BrainCircuit, MessageSquare, UploadCloud, Search, Target, Twitter, Linkedin, Github } from 'lucide-react';
import Spline from '@splinetool/react-spline'; // Use the standard import

// === Header Component ===
// Homepage.jsx

// === Header Component ===
const Header = () => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    // ✅ a) Make the main header container ignore mouse events
    <header className={`
      fixed top-0 left-0 right-0 z-50 w-full transition-all duration-300 pointer-events-none
      ${scrolled
        ? 'py-3 bg-white/95 dark:bg-purple-950/90 shadow-md backdrop-blur-lg'
        : 'py-3 bg-transparent'
      }
    `}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* This div remains as is, as it's just for layout */}
        <div className="flex items-center gap-2">
           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="stroke-purple-600 dark:stroke-purple-400">
            <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 2V8H20" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-xl font-bold text-gray-800 dark:text-white">Documentor</span>
        </div>
        
        {/* ✅ b) Make the button container accept mouse events again */}
        <div className="flex items-center gap-4 pointer-events-auto">
          <button onClick={() => navigate('/login')} className="font-semibold text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            Sign In
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 bg-gray-200/50 dark:bg-purple-900/50 hover:bg-gray-300/80 dark:hover:bg-purple-800/80 transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

// === Hero Section Component ===
// Homepage.jsx

const HeroSection = () => {
  const navigate = useNavigate();
  return (
    <section className="relative w-full h-screen flex items-center justify-center text-center overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full z-0">
        <Spline  scene="https://prod.spline.design/DhwClmo-4uW5VzKw/scene.splinecode"/>
      </div>

      {/* ✅ Add `pointer-events-none` to the content container */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 px-4 pointer-events-none"
      >
        <h1 className="text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          Unlock Insights from <span className="text-purple-600 dark:text-purple-400">Your Documents</span>
        </h1>
        <p className="max-w-3xl mx-auto mt-6 text-lg text-gray-600 dark:text-gray-300">
          Documentor is an intelligent platform that transforms your static PDFs into interactive sources of knowledge. Ask questions, generate mind maps, and discover connections like never before.
        </p>
        <div className="mt-10">
          {/* ✅ Add `pointer-events-auto` to the button to make it clickable again */}
          <button
            onClick={() => navigate('/workarea')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition-transform transform hover:scale-105 pointer-events-auto"
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

const HowItWorksSection = () => {
  const steps = [
    { icon: <UploadCloud size={32} />, title: "1. Upload Your Document", description: "Securely upload any PDF file. Your data is processed and prepared for analysis." },
    { icon: <Search size={32} />, title: "2. Interact & Analyze", description: "Ask direct questions, request summaries, or generate an interactive mind map." },
    { icon: <Target size={32} />, title: "3. Discover Insights", description: "Receive instant answers, visualizations, and key insights, saving you hours of work." },
  ];

  const fadeInAnimation = {
    initial: { opacity: 0, y: 30 },
    animate: (index) => ({
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.2, duration: 0.5 }
    }),
  };

  return (
    <section className="py-20">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-4xl font-bold mb-12 text-gray-900 dark:text-white">A Simple Workflow</h2>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connecting Dashed Line for Desktop */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-full -translate-y-1/2">
            <svg width="100%" height="100%" className="absolute">
              <line x1="25%" y1="50%" x2="75%" y2="50%" strokeDasharray="10, 10" className="stroke-gray-300 dark:stroke-gray-700" strokeWidth="2" />
            </svg>
          </div>

          {steps.map((step, index) => (
            <motion.div
              key={index}
              className="relative bg-white dark:bg-purple-900/50 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-purple-800 flex flex-col items-center z-10 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300"
              variants={fadeInAnimation}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              custom={index}
            >
              <div className="text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900 p-4 rounded-full mb-6">
                {step.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// === Testimonials Section ===
const TestimonialsSection = () => {
    const testimonials = [
        { quote: "Documentor has revolutionized how I approach my research papers. The mind map feature alone saves me hours of work.", name: "Sarah J.", role: "PhD Student" },
        { quote: "As a legal analyst, sifting through long contracts is my daily routine. Being able to ask direct questions to a PDF is an absolute game-changer.", name: "Michael R.", role: "Legal Analyst" },
        { quote: "We use Documentor to quickly synthesize reports from multiple departments. The ability to get a high-level summary across documents is invaluable.", name: "Emily K.", role: "Project Manager" }
    ];

    return(
        <section className="py-20 bg-gray-50 dark:bg-purple-950">
            <div className="container mx-auto px-6 text-center">
                <h2 className="text-4xl font-bold mb-12 text-gray-900 dark:text-white">Trusted by Professionals</h2>
                <div className="grid md:grid-cols-3 gap-8">
                    {testimonials.map((testimonial, index) => (
                         <motion.div
                            key={index}
                            className="bg-white dark:bg-purple-900/50 p-8 rounded-lg shadow-lg border border-gray-200 dark:border-purple-800 text-left"
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                         >
                            <p className="text-gray-600 dark:text-gray-300 italic">"{testimonial.quote}"</p>
                            <p className="mt-4 font-bold text-gray-900 dark:text-white">{testimonial.name}</p>
                            <p className="text-sm text-purple-600 dark:text-purple-400">{testimonial.role}</p>
                         </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// === Footer Component ===
const Footer = () => (
    <footer className="bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-purple-900 py-8">
        <div className="container mx-auto px-6 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} Documentor. All Rights Reserved.</p>
            <div className="flex justify-center gap-6 mt-4">
                <a href="#" className="hover:text-purple-500 transition-colors"><Twitter /></a>
                <a href="#" className="hover:text-purple-500 transition-colors"><Github /></a>
                <a href="#" className="hover:text-purple-500 transition-colors"><Linkedin /></a>
            </div>
        </div>
    </footer>
)

// === Main Homepage Component ===
const Homepage = () => {
  const { theme } = useTheme();

  return (
    <div className={`w-full min-h-screen transition-colors duration-500 ${
      theme === 'light' ? 'bg-white' : 'bg-purple-950'
    }`}>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
      </main>
      <Footer />
    </div>
  );
};


export default Homepage;