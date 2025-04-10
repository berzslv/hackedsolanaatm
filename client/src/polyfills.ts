// Polyfills for Web3/Crypto libraries
import 'react-app-polyfill/stable';
import 'react-app-polyfill/ie11';

// Make sure global and Buffer are defined
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.global = window;
}