try {
  require('@testing-library/jest-dom/extend-expect');
} catch (e) {
  // Module not found, skip
}

// Polyfill for TextEncoder and TextDecoder in Jest environment
import { TextEncoder, TextDecoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
