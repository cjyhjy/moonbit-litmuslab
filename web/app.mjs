const $ = (id) => document.getElementById(id);
const state = { worker: null, requestId: 0, exampleId: 0, pending: null, examples: [], results: {}, source: '', selected: null, replay: null, step: 0, started: 0, ready: false };
const MAX_SOURCE_POINTS = 32768;

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
  for (const id of ['model', 'strategy', 'max-states', 'max-outcomes']) $(id).disabled = busy;
  $('outcomes').querySelectorAll('button').forEach((button) => { button.disabled = busy; });
}

function startWorker() {
  state.ready = false;
  state.worker = new Worker(new URL('./engine-worker.mjs', import.meta.url), { type: 'module' });
  setBusy(false);
  state.worker.addEventListener('message', ({ data }) => {
    if (data.ready) {
      state.ready = true;
      setBusy(Boolean(state.pending));
      if (!state.pending && !Object.keys(state.results).length) status('引擎已就绪。运行分析，比较结果并重放每一种调度见证。');
      return;
    }
    if (!state.pending || data.id !== state.pending.id) return;
    const pending = state.pending;
    state.pending = null;
    setBusy(false);
    if (data.error) return showError(data.error);
    if (data.command === 'analyze') showResults(data.results);
    else showReplay(data.result, pending.selection);
  });
  state.worker.addEventListener('error', (event) => {
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
  if (error.line > 0) {
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
  $('metrics').replaceChildren();
  $('outcomes').replaceChildren(element('div', 'trace-empty', message));
  $('results-badge').textContent = '待重新运行';
  $('results-badge').className = 'pill';
  clearTrace();
  status(message);
}

async function loadExample(id) {
  const request = ++state.exampleId;
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
  const source = $('source').value;
  if ([...source].length > MAX_SOURCE_POINTS) return showError({ code: 'SOURCE_TOO_LARGE', message: `程序不能超过 ${MAX_SOURCE_POINTS.toLocaleString()} 个 Unicode 码点。` });
  for (const id of ['max-states', 'max-outcomes']) if (!$(id).reportValidity()) return;
  const models = $('model').value === 'both' ? ['SC', 'TSO'] : [$('model').value];
  state.source = source;
  state.results = {};
  clearTrace();
  $('metrics').replaceChildren();
  $('outcomes').replaceChildren(element('div', 'trace-empty', '正在枚举可达状态；可以随时取消。'));
  $('results-badge').textContent = '搜索中';
  $('results-badge').className = 'pill';
  const id = ++state.requestId;
  state.pending = { id, command: 'analyze' };
  state.started = performance.now();
  setBusy(true);
  status(`正在运行 ${models.join(' + ')} / ${$('strategy').value.toUpperCase()}。预算按每个模型分别计算。`);
  state.worker.postMessage({ id, command: 'analyze', source, models, strategy: $('strategy').value, maxStates: Number($('max-states').value), maxOutcomes: Number($('max-outcomes').value) });
}

function summarizeOutcome(outcome) {
  const registers = Object.entries(outcome.registers).flatMap(([thread, values]) => Object.entries(values).map(([key, value]) => `${thread}.${key}=${value}`));
  return { registers: registers.join(' · ') || '无寄存器', memory: Object.entries(outcome.memory).map(([key, value]) => `${key}=${value}`).join(' · ') };
}

function showResults(results) {
  const error = Object.values(results).find((result) => result.status === 'error');
  if (error) { $('outcomes').replaceChildren(); return showError(error.error); }
  state.results = results;
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

function requestReplay(model, outcome) {
  if (state.pending) return;
  const id = ++state.requestId;
  const selection = { model, outcome };
  state.pending = { id, command: 'replay', selection };
  setBusy(true);
  $('trace-badge').textContent = '校验见证…';
  state.worker.postMessage({ id, command: 'replay', source: state.source, model, witness: outcome.witness });
}

function showReplay(result, selection) {
  if (result.status === 'error') return showError(result.error);
  state.replay = result;
  state.selected = selection;
  state.step = 0;
  $('trace-empty').hidden = true;
  $('trace-content').hidden = false;
  $('trace-badge').textContent = `${selection.model} / ${result.trace.length - 1} 步`;
  $('trace-badge').className = 'pill complete';
  $('step-slider').max = String(result.trace.length - 1);
  $('witness-text').value = selection.outcome.witness;
  const file = state.examples.find((example) => example.id === $('example').value)?.file || 'program.litmus';
  $('replay-command').textContent = `node bin/litmuslab.mjs replay examples/${file} --model ${selection.model} --witness '${selection.outcome.witness}'`;
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
    if (thread.buffer.length) thread.buffer.forEach((entry, position) => buffer.append(element('span', `buffer-item${position === 0 ? ' buffer-head' : ''}`, `${entry.address}=${entry.value}`)));
    else buffer.append(element('span', 'buffer-empty', state.selected.model === 'SC' ? 'SC 无写缓冲' : '空'));
    card.append(buffer); $('thread-states').append(card);
  }
  $('memory-state').replaceChildren();
  for (const [name, value] of Object.entries(current.memory)) {
    const changed = previous && previous.memory[name] !== value;
    $('memory-state').append(element('span', `memory-cell${changed ? ' changed' : ''}`, `${name} = ${value}`));
  }
}

$('run').addEventListener('click', analyzeProgram);
$('cancel').addEventListener('click', () => {
  state.worker.terminate();
  state.pending = null;
  invalidate('分析已取消；未生成完整性结论。');
  startWorker();
});
$('example').addEventListener('change', () => loadExample($('example').value).catch((error) => showError({ code: 'EXAMPLE_ERROR', message: error.message })));
$('source').addEventListener('input', () => {
  state.exampleId += 1;
  updateLineCount();
  $('example').value = '';
  $('example-title').textContent = '自定义程序';
  $('example-description').textContent = '使用有限 DSL 编辑程序。结果由 MoonBit 核心的操作语义计算。';
  $('example-focus').textContent = '重新运行以检查修改后的程序';
  invalidate();
});
for (const id of ['model', 'strategy', 'max-states', 'max-outcomes']) $(id).addEventListener('change', () => invalidate('分析配置已修改。请重新运行分析。'));
document.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); analyzeProgram(); }
});
for (const [id, action] of [['first-step', () => 0], ['prev-step', () => state.step - 1], ['next-step', () => state.step + 1], ['last-step', () => state.replay.trace.length - 1]]) $(id).addEventListener('click', () => { if (!state.replay) return; state.step = action(); renderStep(); });
$('step-slider').addEventListener('input', () => { state.step = Number($('step-slider').value); renderStep(); });
$('copy-witness').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText($('witness-text').value); $('copy-status').textContent = '已复制'; }
  catch { $('witness-text').focus(); $('witness-text').select(); $('copy-status').textContent = '请使用系统复制快捷键'; }
});

startWorker();
try {
  const response = await fetch('/examples/manifest.json');
  if (!response.ok) throw new Error('无法读取案例列表');
  state.examples = await response.json();
  $('example').replaceChildren();
  const custom = element('option', '', '自定义程序'); custom.value = ''; $('example').append(custom);
  for (const example of state.examples) { const option = element('option', '', example.label); option.value = example.id; $('example').append(option); }
  $('example').value = 'store-buffering';
  await loadExample('store-buffering');
} catch (error) { showError({ code: 'EXAMPLE_ERROR', message: error.message }); }
