// File-format validation only. Program syntax and semantics belong to MoonBit.
export const EXPERIMENT_VERSION = 1;
export const MAX_CONFIG_BYTES = 256 * 1024;
export const MAX_SOURCE_POINTS = 32768;

function exactObject(value, keys, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} 必须是对象。`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new Error(`${label} 字段不符合版本 1 格式；不接受额外字段或导入结果。`);
}

export function validateExperiment(value) {
  exactObject(value, ['kind', 'version', 'source', 'options'], '配置');
  if (value.kind !== 'litmuslab.experiment') throw new Error('请选择实验配置文件；结果 JSON 不能作为配置导入。');
  if (value.version !== EXPERIMENT_VERSION) throw new Error('不支持该配置版本；当前仅支持 version: 1。');
  if (typeof value.source !== 'string') throw new Error('source 必须是程序文本。');
  if ([...value.source].length > MAX_SOURCE_POINTS) throw new Error('程序超过 32,768 个 Unicode 码点。');
  // Unpaired surrogate code units cannot round-trip as valid UTF-8 source.
  if (/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/u.test(value.source)) throw new Error('程序包含无效的 Unicode 代理字符。');
  exactObject(value.options, ['model', 'strategy', 'maxStates', 'maxOutcomes'], 'options');
  const { model, strategy, maxStates, maxOutcomes } = value.options;
  if (!['both', 'SC', 'TSO'].includes(model)) throw new Error('model 必须是 SC、TSO 或 both。');
  if (!['bfs', 'dfs'].includes(strategy)) throw new Error('strategy 必须是 bfs 或 dfs。');
  if (!Number.isSafeInteger(maxStates) || maxStates < 1 || maxStates > 100000) throw new Error('maxStates 必须是 1–100000 的整数。');
  if (!Number.isSafeInteger(maxOutcomes) || maxOutcomes < 1 || maxOutcomes > 1024) throw new Error('maxOutcomes 必须是 1–1024 的整数。');
  return { kind: 'litmuslab.experiment', version: EXPERIMENT_VERSION, source: value.source, options: { model, strategy, maxStates, maxOutcomes } };
}

export function parseExperiment(bytes) {
  if (!(bytes instanceof Uint8Array)) throw new Error('配置必须作为 UTF-8 字节读取。');
  if (bytes.byteLength > MAX_CONFIG_BYTES) throw new Error('配置文件不能超过 256 KiB。');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { throw new Error('配置文件不是有效的 UTF-8 文本。'); }
  let value;
  try { value = JSON.parse(text); }
  catch { throw new Error('配置文件不是有效的 JSON。'); }
  return validateExperiment(value);
}

export function createExperiment(source, options) {
  return validateExperiment({ kind: 'litmuslab.experiment', version: EXPERIMENT_VERSION, source, options });
}

export function createResultBundle(experiment, results) {
  const validated = validateExperiment(experiment);
  const models = validated.options.model === 'both' ? ['SC', 'TSO'] : [validated.options.model];
  // This function receives in-memory worker results, never imported file results.
  if (!results || Object.keys(results).length !== models.length || models.some((model) => !['complete', 'incomplete'].includes(results[model]?.status) || results[model]?.model !== model)) throw new Error('请先运行当前实验，完成或达到预算后再下载结果。');
  return { kind: 'litmuslab.results', version: EXPERIMENT_VERSION, source: validated.source, options: validated.options, results };
}
