let modulePromise;

const loadModule = () => {
  if (!modulePromise) {
    modulePromise = import("./analyzer.js");
  }
  return modulePromise;
};

const proxy = (method) => async (...args) => {
  const mod = await loadModule();
  if (typeof mod[method] !== "function") {
    throw new Error(`analyzer: method ${method} is not available`);
  }
  return mod[method](...args);
};

module.exports = {
  analyzeReport: proxy("analyzeReport"),
  analyzeWithGemini: proxy("analyzeWithGemini"),
  analyzeWithOpenAI: proxy("analyzeWithOpenAI"),
  runOcr: proxy("runOcr"),
  analyzeSymptoms: proxy("analyzeSymptoms"),
};

