// Host type validation only. All parsing, transitions, search and replay are MoonBit.
import { analyze as coreAnalyze, replay as coreReplay, query as coreQuery, compareFences as coreCompareFences } from './engine.raw.mjs';

function invalid(code, message) {
  return JSON.stringify({status: 'error', exitCode: 2, error: {code, message, line: 0, column: 0}});
}

export function analyze(source, model, strategy, maxStates, maxOutcomes) {
  if (typeof source !== 'string' || typeof model !== 'string' || typeof strategy !== 'string') {
    return invalid('InvalidType', 'source, model and strategy must be strings');
  }
  if (!Number.isInteger(maxStates) || !Number.isInteger(maxOutcomes) ||
      maxStates < 1 || maxStates > 100000 || maxOutcomes < 1 || maxOutcomes > 1024) {
    return invalid('InvalidBudget', 'maxStates must be an integer in 1..100000 and maxOutcomes in 1..1024');
  }
  return coreAnalyze(source, model, strategy, maxStates, maxOutcomes);
}

export function replay(source, model, witness) {
  if (typeof source !== 'string' || typeof model !== 'string' || typeof witness !== 'string') {
    return invalid('InvalidType', 'source, model and witness must be strings');
  }
  return coreReplay(source, model, witness);
}


function experimentArguments(source, model, strategy, maxStates, maxOutcomes, target) {
  if ([source, model, strategy, target].some(value => typeof value !== 'string')) {
    return invalid('InvalidType', 'source, model, strategy and target must be strings');
  }
  if (!Number.isInteger(maxStates) || !Number.isInteger(maxOutcomes) ||
      maxStates < 1 || maxStates > 100000 || maxOutcomes < 1 || maxOutcomes > 1024) {
    return invalid('InvalidBudget', 'maxStates must be an integer in 1..100000 and maxOutcomes in 1..1024');
  }
  return null;
}

export function query(source, model, strategy, maxStates, maxOutcomes, target) {
  return experimentArguments(source, model, strategy, maxStates, maxOutcomes, target) ??
    coreQuery(source, model, strategy, maxStates, maxOutcomes, target);
}

export function compareFences(source, model, strategy, maxStates, maxOutcomes, target, fences) {
  const error = experimentArguments(source, model, strategy, maxStates, maxOutcomes, target);
  if (error) return error;
  if (typeof fences !== 'string') return invalid('InvalidType', 'fences must be a string');
  return coreCompareFences(source, model, strategy, maxStates, maxOutcomes, target, fences);
}
