import { useTheme } from "../context/ThemeContext";
import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";

const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.1, rotate: 10 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="absolute top-4 right-4 z-50 p-2 rounded-full bg-purple-600 text-white hover:bg-purple-700 shadow-xl transition-all"
      title="Toggle theme"
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </motion.button>
  );
};

export default ThemeToggle;
