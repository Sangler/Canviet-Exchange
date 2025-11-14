declare global {
  interface Window {
    initMapAutocomplete?: () => void;
  }
  // Loosely type google to avoid TS errors when using Maps JS
  var google: any;
}

export {};
