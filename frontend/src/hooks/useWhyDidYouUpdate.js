import { useEffect, useRef } from 'react';

function useWhyDidYouUpdate(name, props) {
  // Get a mutable ref object where we can store props for comparison.
  const previousProps = useRef();

  useEffect(() => {
    if (previousProps.current) {
      // Get all keys from both previous and current props
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      // Use this object to keep track of changed props
      const changesObj = {};
      // Iterate over keys
      allKeys.forEach(key => {
        // If previous is different from current
        if (previousProps.current[key] !== props[key]) {
          // Add to changesObj
          changesObj[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      // If changesObj is not empty, log to console
      if (Object.keys(changesObj).length) {
        console.log('[Why-Did-You-Update]', name, changesObj);
      }
    }

    // Finally update previousProps with current props for next hook call
    previousProps.current = props;
  });
}

export default useWhyDidYouUpdate;