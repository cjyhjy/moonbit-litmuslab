import { analyze, replay } from '../dist/engine.mjs';

// All program semantics are provided by the compiled MoonBit module.
self.onmessage = ({ data }) => {
  try {
    if (data.command === 'analyze') {
      const results = {};
      for (const model of data.models) {
        results[model] = JSON.parse(analyze(data.source, model, data.strategy, data.maxStates, data.maxOutcomes));
        if (results[model].status === 'error') break;
      }
      self.postMessage({ id: data.id, command: data.command, results });
    } else if (data.command === 'replay') {
      self.postMessage({ id: data.id, command: data.command, result: JSON.parse(replay(data.source, data.model, data.witness)) });
    } else {
      throw new Error('Unknown worker command');
    }
  } catch (error) {
    self.postMessage({ id: data.id, error: { code: 'WORKER_ERROR', message: String(error.message || error) } });
  }
};
self.postMessage({ ready: true });
