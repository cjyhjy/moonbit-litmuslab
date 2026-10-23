import { createExperiment, createResultBundle, parseExperiment, MAX_CONFIG_BYTES, MAX_SOURCE_POINTS, DEFAULT_TARGET, DEFAULT_FENCES } from './experiment.mjs';

const $ = (id) => document.getElementById(id);
const state = { worker: null, requestId: 0, exampleId: 0, importId: 0, pending: null, examples: [], results: {}, experiment: null, source: '', selected: null, replay: null, step: 0, started: 0, ready: false };

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function status(message, kind = '') {
  $('status').className = `status-box ${kind}`;
  $('status').textContent = message;
}

function setBusy(busy) {
  $('run').disabled = busy || !state.ready;
  $('cancel').hidden = !busy;
  $('run').replaceChildren(element('span', '', busy ? '◌' : '▶'), document.createTextNode(busy ? ' 正在搜索…' : ' 运行分析'));
  $('example').disabled = busy;
  $('source').readOnly = busy;
  for (const id of ['model', 'strategy', 'max-states', 'max-outcomes', 'mode', 'target', 'fences']) $(id).disabled = busy;
  $('outcomes').querySelectorAll('button').forEach((button) => { button.disabled = busy; });
  $('target-results').querySelectorAll('button').forEach((button) => { button.disabled = busy; });
  $('export-results').disabled = busy || !state.experiment || !Object.keys(state.results).length;
}

function startWorker(announce = false) {
  state.ready = false;
  const worker = new Worker(new URL('./engine-worker.mjs', import.meta.url), { type: 'module' });
  state.worker = worker;
  setBusy(false);
  worker.addEventListener('message', ({ data }) => {
    if (worker !== state.worker) return;
    if (data.ready) {
      state.ready = true;
      setBusy(Boolean(state.pending));
      if (announce && !state.pending && !Object.keys(state.results).length) status('引擎已就绪。运行分析，比较结果并重放每一种调度见证。');
      return;
    }
    if (!state.pending || data.id !== state.pending.id) return;
    const pending = state.pending;
    state.pending = null;
    setBusy(false);
    if (data.error) return showError(data.error);
    if (data.command === 'replay') showReplay(data.result, pending.selection);
    else if (data.command === 'analyze') showResults(data.results);
    else showTargetResults(data.results, data.command);
  });
  worker.addEventListener('error', (event) => {
    if (worker !== state.worker) return;
    state.pending = null;
    state.ready = false;
    setBusy(false);
    status(`核心引擎加载或执行失败。请先运行 npm run build，并通过 npm run serve 打开页面。${event.message ? ` ${event.message}` : ''}`, 'error');
    $('results-badge').textContent = '引擎不可用';
  });
}

function showError(error) {
  const location = error.line > 0 ? `第 ${error.line} 行，第 ${error.column} 列：` : '';
  status(`${location}${error.message} [${error.code}]`, 'error');
  $('results-badge').textContent = '输入错误';
  $('results-badge').className = 'pill incomplete';
  if (['target', 'fences'].includes(error.input)) {
    $(error.input).focus();
    $(error.input).select();
  } else if (error.line > 0) {
    const lines = $('source').value.split('\n');
    const offset = lines.slice(0, error.line - 1).reduce((n, line) => n + line.length + 1, 0);
    const column = [...(lines[error.line - 1] || '')].slice(0, Math.max(0, error.column - 1)).join('').length;
    $('source').focus();
    $('source').setSelectionRange(offset + column, offset + column + 1);
  }
}

function clearTrace() {
  state.replay = null;
  state.selected = null;
  $('trace-content').hidden = true;
  $('trace-empty').hidden = false;
  $('trace-badge').textContent = '暂无见证';
}

function updateLineCount() {
  const count = $('source').value.split('\n').length;
  $('line-count').textContent = `${count} lines`;
}

function invalidate(message = '程序或配置已修改。请重新运行分析。') {
  state.results = {};
  state.experiment = null;
  $('export-results').disabled = true;
  $('metrics').replaceChildren();
  $('target-results').replaceChildren();
  $('target-results').hidden = true;
  $('outcomes').hidden = false;
  $('outcomes').replaceChildren(element('div', 'trace-empty', message));
  $('results-badge').textContent = '待重新运行';
  $('results-badge').className = 'pill';
  clearTrace();
  status(message);
}

function currentExperiment() {
  return createExperiment($('source').value, { model: $('model').value, strategy: $('strategy').value, maxStates: Number($('max-states').value), maxOutcomes: Number($('max-outcomes').value), mode: $('mode').value, target: $('target').value, fences: $('fences').value });
}

function updateMode() {
  const mode = $('mode').value;
  $('target-fields').hidden = mode === 'analyze';
  $('fence-fields').hidden = mode !== 'compare-fences';
  $('mode-help').textContent = mode === 'analyze' ? '枚举模型允许的最终结果，并选择一条见证重放。'
    : mode === 'query' ? '找到一条匹配见证即可判定可达；搜索不完整且未找到时只能判定未知。'
    : '为原程序插入指定屏障，分别检查目标可达性、集合差异和旧见证是否仍可执行。';
}

function fileStatus(message, error = false) {
  $('file-status').textContent = message;
  $('file-status').classList.toggle('error', error);
}

function downloadJSON(value, filename) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function stopCurrentWorker() {
  state.worker?.terminate();
  state.worker = null;
  state.pending = null;
  state.requestId += 1;
}

async function importConfiguration(file) {
  const request = ++state.importId;
  if (!file) return;
  try {
    if (file.size > MAX_CONFIG_BYTES) throw new Error('配置文件不能超过 256 KiB。');
    const configuration = parseExperiment(new Uint8Array(await file.arrayBuffer()));
    if (request !== state.importId) return;
    stopCurrentWorker();
    state.exampleId += 1;
    $('source').value = configuration.source;
    $('model').value = configuration.options.model;
    $('strategy').value = configuration.options.strategy;
    $('max-states').value = configuration.options.maxStates;
    $('max-outcomes').value = configuration.options.maxOutcomes;
    $('mode').value = configuration.options.mode || 'analyze';
    $('target').value = configuration.options.target ?? DEFAULT_TARGET;
    $('fences').value = configuration.options.fences ?? DEFAULT_FENCES;
    updateMode();
    $('example').value = '';
    $('example-title').textContent = '已导入实验配置';
    $('example-description').textContent = '已恢复源程序、模型、搜索顺序和预算。点击运行分析，重新生成可验证结果。';
    $('example-focus').textContent = `配置版本 ${configuration.version} · 结果需重新计算`;
    updateLineCount();
    invalidate('配置已导入；旧搜索、结果与见证已清空。请运行分析。');
    startWorker();
    fileStatus(`已导入 ${file.name}；尚未运行。`);
  } catch (error) {
    if (request === state.importId) fileStatus(`导入失败：${error.message} 当前实验保持原样。`, true);
  } finally {
    $('config-file').value = '';
  }
}

async function loadExample(id) {
  const request = ++state.exampleId;
  state.importId += 1;
  const example = state.examples.find((item) => item.id === id);
  if (!example) return;
  const response = await fetch(`/examples/${example.file}`);
  if (!response.ok) throw new Error('无法读取本地案例');
  const source = await response.text();
  if (request !== state.exampleId) return;
  $('source').value = source;
  $('example-title').textContent = example.title;
  $('example-description').textContent = example.description;
  $('example-focus').textContent = example.focus;
  updateLineCount();
  invalidate('案例已载入。运行分析，开始比较 SC / TSO 的允许结果。');
}

function analyzeProgram() {
  if (state.pending || !state.ready) return;
  state.exampleId += 1;
  state.importId += 1;
  const source = $('source').value;
  if ([...source].length > MAX_SOURCE_POINTS) return showError({ code: 'SOURCE_TOO_LARGE', message: `程序不能超过 ${MAX_SOURCE_POINTS.toLocaleString()} 个 Unicode 码点。` });
  for (const id of ['max-states', 'max-outcomes']) if (!$(id).reportValidity()) return;
  let experiment;
  try { experiment = currentExperiment(); }
  catch (error) { return showError({ code: 'CONFIG_ERROR', message: error.message }); }
  const models = experiment.options.model === 'both' ? ['SC', 'TSO'] : [experiment.options.model];
  state.source = source;
  state.experiment = experiment;
  state.results = {};
  clearTrace();
  $('metrics').replaceChildren();
  $('target-results').replaceChildren();
  $('target-results').hidden = true;
  $('outcomes').hidden = false;
  $('outcomes').replaceChildren(element('div', 'trace-empty', '正在枚举可达状态；可以随时取消。'));
  $('results-badge').textContent = '搜索中';
  $('results-badge').className = 'pill';
  const id = ++state.requestId;
  const command = experiment.options.mode;
  state.pending = { id, command };
  state.started = performance.now();
  setBusy(true);
  status(`正在运行 ${models.join(' + ')} / ${$('strategy').value.toUpperCase()}。预算按每个模型分别计算。`);
  state.worker.postMessage({ id, command, source, models, ...experiment.options });
}

function summarizeOutcome(outcome) {
  const registers = Object.entries(outcome.registers).flatMap(([thread, values]) => Object.entries(values).map(([key, value]) => `${thread}.${key}=${value}`));
  return { registers: registers.join(' · ') || '无寄存器', memory: Object.entries(outcome.memory).map(([key, value]) => `${key}=${value}`).join(' · ') };
}

const verdictLabels = { reachable: 'reachable / 可达', unreachable: 'unreachable / 不可达', unknown: 'unknown / 未知' };

function verdictNode(verdict) {
  const node = element('span', `verdict ${verdict}`, verdictLabels[verdict] || verdict);
  node.dataset.verdict = verdict;
  return node;
}

function querySummary(result) {
  if (result.verdict === 'reachable') return '已找到满足全部目标条件的见证。';
  if (result.verdict === 'unreachable') return '搜索完整，当前程序与模型下没有满足目标的最终结果。';
  return '搜索尚未完整且没有找到匹配见证；不能判定目标不可达。';
}

function searchSummary(search) {
  return `${search.status} · ${search.stats.visitedStates.toLocaleString()} 状态 · ${search.stats.outcomes} 个已发现结果${search.reason ? ` · ${search.reason}` : ''}`;
}

function replayButton(model, outcome, source, label) {
  const button = element('button', '', `${label}见证重放`);
  button.type = 'button';
  button.setAttribute('aria-label', `${model} ${label}见证重放`);
  button.addEventListener('click', () => requestReplay(model, outcome, source, label));
  return button;
}

function querySide(result, model, source, label) {
  const side = element('div', 'comparison-side');
  side.dataset.side = label === '插入前' ? 'before' : 'after';
  side.append(element('h4', '', label), verdictNode(result.verdict), element('p', 'query-detail', querySummary(result)), element('p', 'query-count', searchSummary(result.search)));
  if (result.match) {
    const buttons = element('div', 'query-witnesses');
    buttons.append(replayButton(model, result.match, source, label));
    side.append(buttons);
  }
  return side;
}

function showTargetResults(results, mode) {
  const error = Object.values(results).find((result) => result.status === 'error');
  if (error) { $('outcomes').replaceChildren(); return showError(error.error); }
  state.results = results;
  $('export-results').disabled = false;
  $('metrics').replaceChildren();
  $('outcomes').hidden = true;
  $('target-results').replaceChildren();
  $('target-results').hidden = false;
  const complete = Object.values(results).every((result) => mode === 'query' ? result.search.status === 'complete' : result.status === 'complete');
  $('results-badge').textContent = complete ? 'complete / 搜索完整' : 'incomplete / 搜索未完整';
  $('results-badge').className = `pill ${complete ? 'complete' : 'incomplete'}`;
  status(mode === 'query'
    ? '目标可达性由核心逐模型判定。找到匹配见证即可确认可达；只有完整搜索才能确认不可达。'
    : '分别阅读目标判定、结果集合和旧见证的变化。阻断一条旧见证，不代表整个目标已不可达。', complete ? '' : 'warning');
  for (const [model, result] of Object.entries(results)) {
    const card = element('section', 'query-card');
    card.dataset.model = model;
    const heading = element('div', 'query-heading');
    heading.append(element('h3', '', `${model} · ${mode === 'query' ? '指定结果查询' : '屏障前后对照'}`));
    if (mode === 'query') heading.append(verdictNode(result.verdict));
    card.append(heading, element('div', 'query-target', result.target));
    if (mode === 'query') {
      card.append(element('p', 'query-detail', querySummary(result)), element('p', 'query-count', searchSummary(result.search)));
      if (result.match) {
        const summary = summarizeOutcome(result.match);
        card.append(element('p', 'query-detail', `匹配结果：${summary.registers}；内存 ${summary.memory}`));
        const buttons = element('div', 'query-witnesses');
        buttons.append(replayButton(model, result.match, state.source, '目标'));
        card.append(buttons);
      }
    } else {
      const sides = element('div', 'before-after');
      sides.append(querySide(result.before, model, state.source, '插入前'), querySide(result.after, model, result.afterSource, '插入后'));
      card.append(sides);
      const difference = element('div', `comparison-difference${result.sets.complete ? '' : ' unknown'}`);
      difference.dataset.complete = String(result.sets.complete);
      difference.textContent = result.sets.complete
        ? `结果集合已完整比较：移除 ${result.sets.removed.length} 个，新增 ${result.sets.added.length} 个，共同 ${result.sets.commonObserved.length} 个。`
        : `集合差异未定：两侧至少一侧搜索不完整。目前仅插入前发现 ${result.sets.beforeOnlyObserved.length} 个，仅插入后发现 ${result.sets.afterOnlyObserved.length} 个；不能据此断言移除或新增。`;
      card.append(difference);
      const mapping = result.mapping;
      const witness = element('div', 'blocked-witness');
      witness.dataset.mapping = mapping.status;
      if (mapping.status === 'blocked') {
        const block = mapping.firstBlock;
        witness.textContent = `旧见证被阻断：${block.thread} 到达边界 ${block.boundary} 的屏障时，FIFO 尚有 ${block.pendingWrites.length} 笔待排空写入。这只说明保留原动作顺序的这一条路径受阻。${result.after.verdict === 'reachable' ? ' 目标仍然可达，请重放插入后的其他见证。' : result.after.verdict === 'unknown' ? ' 目标整体是否不可达仍未知。' : ' 插入后的完整搜索另行确认了目标不可达。'}`;
      } else if (mapping.status === 'preserved') {
        witness.textContent = '旧见证顺序仍可保留：在原动作之间加入屏障后，这条路径仍可执行。';
      } else witness.textContent = '没有插入前的匹配见证，无法比较某一条旧路径是否被屏障阻断。';
      card.append(witness);
      if (mapping.status === 'preserved' && mapping.outcome) {
        const buttons = element('div', 'query-witnesses');
        buttons.append(replayButton(model, { ...mapping.outcome, witness: mapping.witness }, result.afterSource, '保留原顺序'));
        card.append(buttons);
      }
      const details = element('details', 'after-source');
      details.append(element('summary', '', '查看并应用插入屏障后的程序'), element('pre', '', result.afterSource));
      const apply = element('button', '', '应用到编辑器并清空旧结果');
      apply.type = 'button';
      apply.setAttribute('aria-label', `${model} 应用插入屏障后的程序`);
      apply.addEventListener('click', () => {
        state.exampleId += 1;
        state.importId += 1;
        $('source').value = result.afterSource;
        $('example').value = '';
        $('example-title').textContent = '已应用屏障后的程序';
        $('example-description').textContent = '编辑器现在是核心生成的新程序；已切换为查询模式，重新运行以检查目标。';
        $('example-focus').textContent = '新程序 · 旧结果已失效';
        $('mode').value = 'query';
        updateMode();
        updateLineCount();
        invalidate('已应用插入屏障后的程序。旧结果与见证已清空；请重新运行查询。');
      });
      details.append(apply);
      card.append(details);
    }
    $('target-results').append(card);
  }
  $('result-note').textContent = mode === 'query'
    ? 'reachable 可以在部分搜索中成立；unreachable 需要完整搜索；unknown 不代表安全或禁止。'
    : '旧见证保序映射只检查这一条调度；目标可达性和结果集合完整性由各自的核心字段分别给出。';
}

function showResults(results) {
  const error = Object.values(results).find((result) => result.status === 'error');
  if (error) { $('outcomes').replaceChildren(); return showError(error.error); }
  state.results = results;
  $('export-results').disabled = false;
  const models = Object.keys(results);
  const complete = Object.values(results).every((result) => result.status === 'complete');
  const elapsed = Math.round(performance.now() - state.started);
  $('results-badge').textContent = complete ? 'complete / 搜索完整' : 'incomplete / 搜索未完整';
  $('results-badge').className = `pill ${complete ? 'complete' : 'incomplete'}`;
  const incomplete = models.filter((model) => results[model].status === 'incomplete').map((model) => `${model} 达到${results[model].reason === 'max_states' ? '状态' : '结果'}预算`);
  status(complete ? `已遍历当前程序在所选模型下的全部可达状态 · ${elapsed} ms。点击结果中的模型按钮，逐步检查见证。` : `incomplete：${incomplete.join('；')}。当前只显示已发现结果，未发现的结果仍未确定。增大预算后重试。`, complete ? '' : 'warning');
  $('metrics').replaceChildren();
  for (const model of models) {
    const result = results[model];
    const card = element('div', `metric-card ${result.status}`);
    const left = element('div');
    left.append(element('div', 'metric-model', model));
    const value = element('div', 'metric-value', String(result.outcomes.length));
    value.append(element('span', '', '种结果'));
    left.append(value, element('div', 'metric-detail', `${result.stats.visitedStates.toLocaleString()} 状态 · ${result.stats.transitions.toLocaleString()} 次转移`));
    card.append(left, element('span', 'metric-status', result.status === 'complete' ? '✓ 搜索完整' : '△ 未完整'));
    $('metrics').append(card);
  }
  const union = new Map();
  for (const model of models) for (const outcome of results[model].outcomes) {
    if (!union.has(outcome.id)) union.set(outcome.id, { outcome, models: {} });
    union.get(outcome.id).models[model] = outcome;
  }
  // Differences are highlighted only after both model searches finish completely.
  const rows = [...union.entries()].sort((a, b) => {
    const aUnique = complete && models.length === 2 && Object.keys(a[1].models).length === 1;
    const bUnique = complete && models.length === 2 && Object.keys(b[1].models).length === 1;
    return Number(bUnique) - Number(aUnique) || a[0].localeCompare(b[0]);
  });
  $('outcomes').replaceChildren();
  const count = element('div', 'outcome-count');
  count.append(element('span', '', `已发现 ${rows.length} 个不同最终结果`), element('span', '', complete && models.length === 2 ? '金色 = 单一模型独有' : '点击模型以重放'));
  $('outcomes').append(count);
  if (!rows.length) {
    $('outcomes').append(element('div', 'trace-empty', complete ? '核心没有返回最终结果。' : '当前预算下还没有发现最终结果。请增加状态预算。'));
    return;
  }
  const table = element('table', 'outcome-table');
  table.setAttribute('aria-label', '模型允许的最终结果比较');
  const head = element('tr');
  const outcomeHeading = element('th', '', '最终寄存器 / 内存'); outcomeHeading.scope = 'col'; head.append(outcomeHeading);
  for (const model of models) { const th = element('th', '', model); th.scope = 'col'; head.append(th); }
  const thead = element('thead'); thead.append(head); table.append(thead);
  const tbody = element('tbody');
  for (const [id, item] of rows) {
    const row = element('tr');
    const signature = summarizeOutcome(item.outcome);
    const cell = element('td', 'outcome-signature', signature.registers);
    cell.append(element('span', '', `内存 ${signature.memory}`));
    row.append(cell);
    for (const model of models) {
      const modelCell = element('td');
      if (item.models[model]) {
        const unique = complete && models.length === 2 && Object.keys(item.models).length === 1;
        const button = element('button', `outcome-button${unique ? ' unique' : ''}`, `${model} ↗`);
        button.type = 'button';
        button.setAttribute('aria-label', `重放 ${model}：${signature.registers}；内存 ${signature.memory}`);
        button.dataset.model = model;
        button.dataset.outcome = id;
        button.addEventListener('click', () => requestReplay(model, item.models[model]));
        modelCell.append(button);
      } else if (results[model].status === 'complete') {
        const absent = element('span', 'absent', '不允许');
        modelCell.append(absent);
      } else modelCell.append(element('span', 'unknown', '未确定'));
      row.append(modelCell);
    }
    tbody.append(row);
  }
  table.append(tbody); $('outcomes').append(table);
  $('result-note').textContent = complete ? '每个按钮都对应 MoonBit 核心生成、可独立重放的一条见证。最终状态要求所有线程结束且写缓冲排空。' : 'incomplete 不代表安全，也不代表结果集合完整；“未确定”不能解释为“不允许”。';
}

function requestReplay(model, outcome, source = state.source, label = '') {
  if (state.pending) return;
  state.exampleId += 1;
  const id = ++state.requestId;
  const selection = { model, outcome, source, label };
  state.pending = { id, command: 'replay', selection };
  setBusy(true);
  $('trace-badge').textContent = '校验见证…';
  state.worker.postMessage({ id, command: 'replay', source, model, witness: outcome.witness });
}

function showReplay(result, selection) {
  if (result.status === 'error') return showError(result.error);
  state.replay = result;
  state.selected = selection;
  state.step = 0;
  $('trace-empty').hidden = true;
  $('trace-content').hidden = false;
  $('trace-badge').textContent = `${selection.model}${selection.label ? ` · ${selection.label}` : ''} / ${result.trace.length - 1} 步`;
  $('trace-badge').className = 'pill complete';
  $('step-slider').max = String(result.trace.length - 1);
  $('witness-text').value = selection.outcome.witness;
  const originalFile = state.examples.find((example) => example.id === $('example').value)?.file;
  const file = selection.source !== state.source ? 'after.litmus' : originalFile ? `examples/${originalFile}` : 'program.litmus';
  $('replay-command').textContent = `${selection.source !== state.source ? '# 先将对照后的程序保存为 after.litmus\n' : ''}node bin/litmuslab.mjs replay ${file} --model ${selection.model} --witness '${selection.outcome.witness}'`;
  $('copy-status').textContent = '';
  $('outcomes').querySelectorAll('button').forEach((button) => {
    const active = button.dataset.model === selection.model && button.dataset.outcome === selection.outcome.id;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  renderStep();
}

function renderStep() {
  if (!state.replay) return;
  const trace = state.replay.trace;
  state.step = Math.max(0, Math.min(trace.length - 1, state.step));
  const current = trace[state.step];
  const previous = trace[state.step - 1];
  $('step-slider').value = String(state.step);
  $('step-label').textContent = `${state.step} / ${trace.length - 1}`;
  $('first-step').disabled = $('prev-step').disabled = state.step === 0;
  $('last-step').disabled = $('next-step').disabled = state.step === trace.length - 1;
  $('step-description').textContent = state.step === 0 ? '初始状态 · 还没有执行任何操作' : `${String(state.step).padStart(2, '0')} · ${current.action} · ${current.description}${current.terminal ? ' · 最终状态' : ''}`;
  const effect = current.effect;
  $('step-effect').hidden = !effect;
  if (effect) {
    let description = '';
    if (effect.kind === 'load') description = effect.source === 'buffer'
      ? `缓冲转发：从 ${effect.thread} 的 FIFO 第 ${effect.bufferIndex + 1} 项读取 ${effect.address}=${effect.value} → ${effect.register}。动作前队首索引为 0，本项索引为 ${effect.bufferIndex}。`
      : `共享内存读取：${effect.address}=${effect.value} → ${effect.thread}.${effect.register}。`;
    else if (effect.kind === 'store') description = effect.destination === 'buffer'
      ? `缓冲写入：${effect.thread} 将 ${effect.address}=${effect.value} 加入 FIFO 队尾（索引 ${effect.bufferIndex}）。`
      : `立即写入：${effect.thread} 将 ${effect.address}=${effect.value} 写入共享内存。`;
    else if (effect.kind === 'flush') description = `缓冲排空：${effect.thread} 的 FIFO 队头 ${effect.address}=${effect.value} 写入共享内存。`;
    else if (effect.kind === 'fence') description = `屏障通过：${effect.thread} 的写缓冲已为空。`;
    $('step-effect').textContent = description;
    $('step-effect').dataset.kind = effect.kind;
    $('step-effect').dataset.source = effect.source || effect.destination || '';
  }
  $('thread-states').replaceChildren();
  for (const [index, thread] of current.threads.entries()) {
    const active = current.action === `t${index}` || current.action === `f${index}`;
    const card = element('div', `thread-card${active ? ' active' : ''}`);
    const title = element('div', 'thread-title');
    const instructionCount = state.replay.program.threads[index].instructions.length;
    title.append(element('span', '', thread.name), element('span', 'thread-pc', `PC ${thread.pc}/${instructionCount}`));
    card.append(title, element('div', `instruction-line${thread.next === null ? ' done' : ''}`, thread.next === null ? '✓ 指令已执行完毕' : `→ ${thread.next}`));
    card.append(element('div', 'state-label', '寄存器'));
    const registers = Object.entries(thread.registers).map(([name, value]) => `${name}=${value}`).join(' · ');
    card.append(element('div', `register-list${registers ? '' : ' empty-registers'}`, registers || '— 无寄存器'));
    const label = element('div', 'state-label', 'FIFO 写缓冲'); label.append(element('span', '', '队头 → 队尾')); card.append(label);
    const buffer = element('div', 'buffer-list');
    if (thread.buffer.length) thread.buffer.forEach((entry, position) => {
      const readSource = effect?.kind === 'load' && effect.source === 'buffer' && effect.thread === thread.name && effect.bufferIndex === position;
      buffer.append(element('span', `buffer-item${position === 0 ? ' buffer-head' : ''}${readSource ? ' read-source' : ''}`, `${entry.address}=${entry.value}`));
    });
    else buffer.append(element('span', 'buffer-empty', state.selected.model === 'SC' ? 'SC 无写缓冲' : '空'));
    card.append(buffer); $('thread-states').append(card);
  }
  $('memory-state').replaceChildren();
  for (const [name, value] of Object.entries(current.memory)) {
    const changed = previous && previous.memory[name] !== value;
    const readSource = effect?.kind === 'load' && effect.source === 'memory' && effect.address === name;
    $('memory-state').append(element('span', `memory-cell${changed ? ' changed' : ''}${readSource ? ' read-source' : ''}`, `${name} = ${value}`));
  }
}

$('run').addEventListener('click', analyzeProgram);
$('cancel').addEventListener('click', () => {
  stopCurrentWorker();
  invalidate('分析已取消；未生成完整性结论。');
  startWorker();
});
$('example').addEventListener('change', () => loadExample($('example').value).catch((error) => showError({ code: 'EXAMPLE_ERROR', message: error.message })));
$('source').addEventListener('input', () => {
  state.exampleId += 1;
  state.importId += 1;
  updateLineCount();
  $('example').value = '';
  $('example-title').textContent = '自定义程序';
  $('example-description').textContent = '使用有限 DSL 编辑程序。结果由 MoonBit 核心的操作语义计算。';
  $('example-focus').textContent = '重新运行以检查修改后的程序';
  invalidate();
});
for (const id of ['model', 'strategy', 'max-states', 'max-outcomes', 'mode', 'target', 'fences']) $(id).addEventListener('input', () => {
  state.importId += 1;
  if (id === 'mode') updateMode();
  invalidate('分析配置已修改。请重新运行分析。');
});
$('export-config').addEventListener('click', () => {
  try { downloadJSON(currentExperiment(), 'litmuslab-experiment.json'); fileStatus('已请求下载实验配置；文件包含源程序和分析选项。'); }
  catch (error) { fileStatus(`无法下载：${error.message}`, true); }
});
$('import-config').addEventListener('click', () => $('config-file').click());
$('config-file').addEventListener('change', () => importConfiguration($('config-file').files[0]));
$('export-results').addEventListener('click', () => {
  try { downloadJSON(createResultBundle(state.experiment, state.results), 'litmuslab-results.json'); fileStatus('已请求下载结果 JSON；complete / incomplete 状态已保留。'); }
  catch (error) { fileStatus(`无法下载：${error.message}`, true); }
});
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); analyzeProgram(); }
});
for (const [id, action] of [['first-step', () => 0], ['prev-step', () => state.step - 1], ['next-step', () => state.step + 1], ['last-step', () => state.replay.trace.length - 1]]) $(id).addEventListener('click', () => { if (!state.replay) return; state.step = action(); renderStep(); });
$('step-slider').addEventListener('input', () => { state.step = Number($('step-slider').value); renderStep(); });
$('copy-witness').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('witness-text').value); $('copy-status').textContent = '已复制'; }
  catch { $('witness-text').focus(); $('witness-text').select(); $('copy-status').textContent = '请使用系统复制快捷键'; }
});

startWorker(true);
const initialExampleId = state.exampleId;
try {
  const response = await fetch('/examples/manifest.json');
  if (!response.ok) throw new Error('无法读取案例列表');
  state.examples = await response.json();
  $('example').replaceChildren();
  const custom = element('option', '', '自定义程序'); custom.value = ''; $('example').append(custom);
  for (const example of state.examples) { const option = element('option', '', example.label); option.value = example.id; $('example').append(option); }
  if (state.exampleId === initialExampleId) {
    $('example').value = 'store-buffering';
    await loadExample('store-buffering');
  }
} catch (error) { showError({ code: 'EXAMPLE_ERROR', message: error.message }); }
