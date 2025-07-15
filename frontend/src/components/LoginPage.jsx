import React from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileText, BrainCircuit, MessageSquare, ShieldCheck } from 'lucide-react';
import { auth } from '../firebase';

// A simple component for the logo
const Logo = () => (
  <div className="flex items-center gap-2 mb-8">
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" className="stroke-indigo-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14 2V8H20" className="stroke-indigo-400" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 18L12 12" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 16H14" className="stroke-white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    <span className="text-2xl font-bold text-white">Documentor</span>
  </div>
);

// A component for each feature highlight
const Feature = ({ icon, title, description }) => (
  <motion.div
    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
    className="flex items-start gap-4"
  >
    <div className="bg-indigo-500/20 p-2 rounded-lg">{icon}</div>
    <div>
      <h3 className="font-semibold text-white">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  </motion.div>
);

const LoginPage = () => {
    const navigate = useNavigate();

    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            navigate('/workarea');
        } catch (error) {
            console.error("Login failed:", error);
            alert(`Login failed: ${error.message}`);
        }
    };

    const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: { staggerChildren: 0.2 }
      }
    };

    return (
        <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
            {/* --- Left Branding Panel --- */}
            <div className="hidden lg:flex flex-col justify-between p-12 bg-gray-900 text-white">
                <Logo />
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-6"
                >
                    <Feature
                        icon={<MessageSquare className="text-indigo-300" />}
                        title="Chat with your Documents"
                        description="Ask questions, get summaries, and find information instantly from any PDF."
                    />
                    <Feature
                        icon={<BrainCircuit className="text-indigo-300" />}
                        title="Generate AI Mind Maps"
                        description="Automatically create structured mind maps to visualize key concepts and connections."
                    />
                    <Feature
                        icon={<FileText className="text-indigo-300" />}
                        title="Multi-File Analysis"
                        description="Synthesize information and compare insights across multiple documents at once."
                    />
                </motion.div>
                <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Documentor. All rights reserved.</p>
            </div>

            {/* --- Right Login Panel --- */}
            <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-800">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                  className="p-10 bg-white dark:bg-gray-900 rounded-lg shadow-2xl text-center w-full max-w-sm"
                >
                    <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Get Started</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-8">Sign in to unlock your AI assistant.</p>
                    <button
                        onClick={handleGoogleLogin}
                        className="flex items-center justify-center w-full px-4 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition-transform hover:scale-105"
                    >
                        <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
                            <path fill="#4285F4" d="M24 9.5c3.9 0 6.9 1.6 9.1 3.7l6.9-6.9C35.2 2.5 30.1 0 24 0 14.8 0 7.2 5.3 4.4 12.6l8.3 6.5C14.1 13.4 18.6 9.5 24 9.5z"></path>
                            <path fill="#34A853" d="M46.2 25.4c0-1.7-.2-3.3-.5-4.9H24v9.4h12.4c-.5 3.1-2.9 5.7-5.9 7.5l7.9 6.1c4.6-4.2 7.3-10.4 7.3-18.1z"></path>
                            <path fill="#FBBC05" d="M14.1 28.5c-.7-2.1-.7-4.4 0-6.5l-8.3-6.5C2.9 19.4 1.2 24.5 1.2 30c0 5.5 1.7 10.6 4.6 14.5l8.3-6.5c-1.3-3.8-1.3-8.2 0-12z"></path>
                            <path fill="#EA4335" d="M24 48c6.1 0 11.2-2 14.9-5.4l-7.9-6.1c-2 1.3-4.5 2.1-7 2.1-5.4 0-9.9-3.9-11.5-9.2L4.4 37.4C7.2 44.7 14.8 48 24 48z"></path>
                        </svg>
                        Sign in with Google
                    </button>
                    <p className="text-xs text-gray-500 mt-6">
                        By signing in, you agree to our <a href="#" className="underline">Terms of Service</a>.
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default LoginPage;