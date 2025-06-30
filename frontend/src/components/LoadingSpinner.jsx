// frontend/src/components/LoadingSpinner.jsx
const LoadingSpinner = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);
export default LoadingSpinner;