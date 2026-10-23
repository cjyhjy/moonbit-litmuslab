#!/usr/bin/env node
/** Reproducible Tabbit QA. Uses the real compiled engine; only file/network timing is observed or delayed. */
import {spawn, spawnSync} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp, rm, copyFile, readdir, stat} from 'node:fs/promises';
import {homedir, tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const launcher=join(homedir(),'.local','bin','tabbit-cli');
const task=`LitmusLab QA ${new Date().toISOString().replace(/[:.]/g,'-')}`;
const started=new Date().toISOString();
const temporary=await mkdtemp(join(tmpdir(),'litmuslab-browser-'));
const checks=[]; const stages=[]; const screenshots=[];
let server, evidence, evidenceAfter, failure;
const snapshot=()=>{const p=spawnSync('python3',['tools/evidence.py','snapshot','browser'],{cwd:root,encoding:'utf8'});if(p.status!==0)throw new Error(p.stderr);return JSON.parse(p.stdout);};
function invoke(args,input){const p=spawnSync(launcher,args,{cwd:root,encoding:'utf8',input,timeout:80000,maxBuffer:4*1024*1024});if(!p.stdout)throw new Error(p.stderr||p.error?.message||'Tabbit produced no result');return JSON.parse(p.stdout);}
function stage(id,code){let result=invoke(['nodejs','--task',task,'--request-id',id],code);while(['running','queued'].includes(result.status))result=invoke(['receipt','--task',task,'--request-id',id,'--wait-ms','60000']);if(result.status!=='succeeded'){stages.push({id,status:result.status,error:result.result?.error});throw new Error(`${id}: ${result.result?.error||JSON.stringify(result)}`);}const value=result.result.value;stages.push({id,status:'succeeded'});if(value?.checks)checks.push(...value.checks.map(name=>({name,passed:true,requestId:id})));return value;}
async function startPreview(){const probe=createServer();await new Promise((ok,no)=>{probe.once('error',no);probe.listen(0,'127.0.0.1',ok);});const port=probe.address().port;await new Promise(ok=>probe.close(ok));server=spawn(process.execPath,['tools/serve.mjs','--port',String(port)],{cwd:root,stdio:['ignore','pipe','pipe']});await new Promise((ok,no)=>{let text='';const timer=setTimeout(()=>no(new Error('Preview start timeout')),10000);server.once('error',no);server.once('exit',code=>no(new Error(`Preview exited ${code}: ${text}`)));server.stderr.on('data',chunk=>text+=chunk);server.stdout.on('data',chunk=>{text+=chunk;if(text.includes('local preview:')){clearTimeout(timer);ok();}});});return `http://127.0.0.1:${port}/`;}
async function saveScreenshot(value,name){const path=`reports/screenshots/${name}`;await mkdir(join(root,'reports/screenshots'),{recursive:true});await copyFile(value.path,join(root,path));const data=await readFile(join(root,path));screenshots.push({path,width:value.width,height:value.height,sha256:createHash('sha256').update(data).digest('hex'),visuallyInspected:false});}
const projectVersion=JSON.parse(await readFile(join(root,'package.json'),'utf8')).version;
const supportsModes=Number(projectVersion.split('.')[0])>0||Number(projectVersion.split('.')[1])>=3;
const source=await readFile(join(root,'examples/store-buffering.litmus'),'utf8');
const config={kind:'litmuslab.experiment',version:1,source,options:{model:'both',strategy:'bfs',maxStates:20000,maxOutcomes:256}};
const exportOptions=supportsModes?{...config.options,mode:'analyze',target:'reg.P0.r0=0 && reg.P1.r1=0',fences:'P0:1,P1:1'}:config.options;
const modeConfiguration={...config,version:2,options:{...exportOptions,mode:'compare-fences'}};
const fixturePaths={};
for(const [name,value]of Object.entries({valid:config,wrongVersion:{...config,version:3},extraResults:{...config,results:{}},stringBudget:{...config,options:{...config.options,maxStates:'20000'}},resultPackage:{...config,kind:'litmuslab.results'}})){fixturePaths[name]=join(temporary,`${name}.json`);await writeFile(fixturePaths[name],JSON.stringify(value));}
for(const [name,bytes]of [['malformed',Buffer.from('{')],['utf8',Buffer.from([255])],['oversized',Buffer.alloc(262145,32)]]){fixturePaths[name]=join(temporary,`${name}.json`);await writeFile(fixturePaths[name],bytes);}
if(supportsModes){fixturePaths.mode=join(temporary,'mode-v2.json');await writeFile(fixturePaths.mode,JSON.stringify(modeConfiguration));}
const downloadsBefore=new Set(await readdir(join(homedir(),'Downloads')).catch(()=>[]));
let payloads=[]; let observedDownloads=[];
try{
 evidence=snapshot();
 const url=await startPreview();
 invoke(['create','--task',task]);
 stage('open',String.raw`await page.goto(${JSON.stringify(url)},{waitUntil:'domcontentloaded'});await expect(page.getByRole('button',{name:'运行分析',exact:false})).toBeEnabled();globalThis.errors=[];page.on('pageerror',error=>globalThis.errors.push(error.message));return await tabbit.observe({frames:'none',maxChars:3000});`);
 const initial=stage('downloads-and-core',String.raw`
 const checks=[];
 await page.evaluate(()=>{window.__downloadPayloads=[];const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=original(blob);window.__downloadPayloads.push(blob.text());return url;};});
 await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();
 await page.getByRole('button',{name:'下载配置',exact:false}).click();
 const config=await page.evaluate(async()=>JSON.parse(await window.__downloadPayloads[0]));
 expect(config.kind).toBe('litmuslab.experiment');expect(config.version).toBe(${supportsModes?2:1});expect(config.source).toBe(${JSON.stringify(source)});expect(config.options).toEqual(${JSON.stringify(exportOptions)});
 checks.push('configuration download payload contains versioned source and options');
 await page.getByRole('button',{name:'运行分析',exact:false}).click();
 await expect(page.locator('.metric-value')).toHaveText(['3种结果','4种结果']);
 checks.push('actual MoonBit worker returns SC3 TSO4');
 await page.getByRole('button',{name:'下载结果 JSON',exact:false}).click();
 const results=await page.evaluate(async()=>JSON.parse(await window.__downloadPayloads[1]));
 expect(results.kind).toBe('litmuslab.results');expect(results.source).toBe(config.source);expect(results.options).toEqual(config.options);expect(results.results.SC.outcomes.length).toBe(3);expect(results.results.TSO.outcomes.length).toBe(4);
 checks.push('result download payload preserves actual source options and both result sets');
 return {checks,payloads:[config,results]};`);
 payloads.push(...initial.payloads);
 stage('import-validation',String.raw`
 const checks=[];const source=${JSON.stringify(source)};
 for(const [name,path]of Object.entries(${JSON.stringify(fixturePaths)})){
 if(['valid','mode'].includes(name))continue;
 await page.getByLabel('实验配置文件',{exact:true}).setInputFiles(path);
 await expect(page.locator('#file-status')).toContainText('导入失败');
 await expect(page.getByRole('textbox',{name:'程序源代码',exact:true})).toHaveValue(source);
 await expect(page.locator('.metric-value')).toHaveText(['3种结果','4种结果']);
 checks.push('invalid import preserves experiment: '+name);
 }
 await page.getByRole('textbox',{name:'程序源代码',exact:true}).fill(source+'\n# edited');
 await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();await expect(page.locator('.outcome-table')).toHaveCount(0);
 checks.push('source edit immediately invalidates old results and download');
 await page.getByLabel('实验配置文件',{exact:true}).setInputFiles(${JSON.stringify(fixturePaths.valid)});
 await expect(page.locator('#file-status')).toContainText('已导入');await expect(page.getByRole('textbox',{name:'程序源代码',exact:true})).toHaveValue(source);await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();await expect(page.locator('#trace-content')).toBeHidden();
 checks.push('valid import restores configuration without trusting old results');
 await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.metric-value')).toHaveText(['3种结果','4种结果']);
 await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('');await page.getByRole('button',{name:'运行分析',exact:false}).click();
 expect(await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).evaluate(el=>el.validity.valueMissing)).toBe(true);await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();
 checks.push('empty state budget fails required validation without page error');
 await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('20000');await page.getByRole('spinbutton',{name:'最多结果数',exact:true}).fill('');await page.getByRole('button',{name:'运行分析',exact:false}).click();
 expect(await page.getByRole('spinbutton',{name:'最多结果数',exact:true}).evaluate(el=>el.validity.valueMissing)).toBe(true);
 checks.push('empty outcome budget fails required validation without page error');
 await page.getByRole('spinbutton',{name:'最多结果数',exact:true}).fill('256');
 return {checks};`);
 const incomplete=stage('incomplete-export',String.raw`
 await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('1');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('#results-badge')).toContainText('incomplete');await page.getByRole('button',{name:'下载结果 JSON',exact:false}).click();
 const result=await page.evaluate(async()=>JSON.parse(await window.__downloadPayloads.at(-1)));expect(result.options.maxStates).toBe(1);expect(result.results.SC.status).toBe('incomplete');expect(result.results.TSO.status).toBe('incomplete');
 return {checks:['incomplete download preserves budget and incomplete status'],payload:result};`);payloads.push(incomplete.payload);
 stage('cancel-import-race',String.raw`
 const checks=[];const heavy='memory x=0 y=0\\n'.replaceAll('\\n','\n')+Array.from({length:4},(_,i)=>'thread P'+i+'\n'+Array.from({length:16},(_,j)=>'store '+(j%2?'y':'x')+' '+(i+j)).join('\n')+'\nend').join('\n');
 await page.getByRole('textbox',{name:'程序源代码',exact:true}).fill(heavy);await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('100000');await page.getByRole('combobox',{name:'分析模型',exact:true}).selectOption('TSO');await page.getByRole('button',{name:'运行分析',exact:false}).click();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(page.locator('#outcomes')).toContainText('分析已取消');await expect(page.getByRole('button',{name:'运行分析',exact:false})).toBeEnabled();
 checks.push('cancel terminates old worker and restores runnable engine');
 await page.getByRole('button',{name:'运行分析',exact:false}).click();await page.getByLabel('实验配置文件',{exact:true}).setInputFiles(${JSON.stringify(fixturePaths.valid)});await expect(page.locator('#file-status')).toContainText('已导入');await expect(page.getByRole('button',{name:'运行分析',exact:false})).toBeEnabled();await expect(page.locator('.outcome-table')).toHaveCount(0);await expect(page.getByRole('textbox',{name:'程序源代码',exact:true})).toHaveValue(${JSON.stringify(source)});
 await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.metric-value')).toHaveText(['3种结果','4种结果']);checks.push('import during search cancels old worker and new run uses imported source');return {checks};`);
 stage('slow-example-vs-run',String.raw`
 await page.evaluate(()=>{const original=window.fetch.bind(window);window.__fetchOriginal=original;window.__exampleRequested=false;window.__exampleReleased=false;window.fetch=async(...args)=>{if(String(args[0]).includes('/examples/forwarding.litmus')){window.__exampleRequested=true;await new Promise(resolve=>window.__releaseExample=resolve);const response=await original(...args);const text=await response.text();window.__exampleReleased=true;return new Response(text,{headers:{'Content-Type':'text/plain'}});}return original(...args);};});
 await page.getByRole('combobox',{name:'载入教学案例',exact:true}).selectOption('forwarding');await page.waitForFunction(()=>window.__exampleRequested);await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.metric-value')).toHaveText(['3种结果','4种结果']);await page.evaluate(()=>window.__releaseExample());await page.waitForFunction(()=>window.__exampleReleased);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await expect(page.getByRole('textbox',{name:'程序源代码',exact:true})).toHaveValue(${JSON.stringify(source)});await expect(page.locator('.metric-value')).toHaveText(['3种结果','4种结果']);await page.evaluate(()=>window.fetch=window.__fetchOriginal);
 return {checks:['late example fetch cannot replace a running experiment or its result']};`);
 // Delay only the manifest response via init-script. The real server response is retained.
 stage('initial-manifest-vs-edit',String.raw`
 await page.addInitScript(()=>{const original=window.fetch.bind(window);window.__manifestRequested=false;window.__manifestReleased=false;window.fetch=async(...args)=>{if(String(args[0]).includes('/examples/manifest.json')){window.__manifestRequested=true;await new Promise(resolve=>window.__releaseManifest=resolve);const response=await original(...args);const text=await response.text();window.__manifestReleased=true;return new Response(text,{headers:{'Content-Type':'application/json'}});}return original(...args);};});
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.__manifestRequested);await page.getByRole('textbox',{name:'程序源代码',exact:true}).fill(${JSON.stringify(source+'\n# before manifest')});await page.evaluate(()=>window.__releaseManifest());await page.waitForFunction(()=>window.__manifestReleased);await expect(page.getByRole('combobox',{name:'载入教学案例',exact:true}).locator('option')).toHaveCount(7);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await expect(page.getByRole('textbox',{name:'程序源代码',exact:true})).toHaveValue(${JSON.stringify(source+'\n# before manifest')});
 return {checks:['late initial manifest preserves user-edited program']};`);
 stage('effects-and-fence',String.raw`
 const checks=[];
 await page.getByRole('combobox',{name:'载入教学案例',exact:true}).selectOption('store-buffering-fence');await expect(page.locator('#example-title')).toContainText('屏障');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.metric-value')).toHaveText(['3种结果','3种结果']);checks.push('fenced Store Buffering has SC3 TSO3');
 await page.getByRole('combobox',{name:'载入教学案例',exact:true}).selectOption('forwarding');await expect(page.locator('#example-title')).toContainText('自己的新值');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('#results-badge')).toContainText('complete');await page.getByRole('button',{name:'重放 TSO：Local.own=2 · Observer.seen=2；内存 x=2',exact:true}).click();await expect(page.locator('#step-label')).toHaveText('0 / 6');
 await page.getByRole('slider',{name:'重放步骤',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await expect(page.locator('#step-effect')).toContainText('FIFO 第 2 项');await expect(page.locator('#step-effect')).toHaveAttribute('data-source','buffer');await expect(page.locator('.buffer-item.read-source')).toHaveText('x=2');checks.push('core effect reports same-address forwarding from FIFO index1');
 await page.getByRole('button',{name:'跳到最终状态',exact:true}).click();await expect(page.locator('#step-effect')).toHaveAttribute('data-source','memory');await expect(page.locator('.memory-cell.read-source')).toHaveText('x = 2');checks.push('core effect reports shared-memory load and highlights source');
 await page.getByRole('button',{name:'回到初始状态',exact:true}).click();await page.getByRole('slider',{name:'重放步骤',exact:true}).focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');return {checks};`);
 if(supportsModes){
  const modes=stage('target-query-and-fences',String.raw`
  const checks=[];
  await page.getByRole('combobox',{name:'载入教学案例',exact:true}).selectOption('store-buffering');await expect(page.locator('#example-title')).toContainText('两次读取');
  await page.getByRole('combobox',{name:'实验模式',exact:true}).selectOption('query');
  await page.getByRole('textbox',{name:'目标条件',exact:true}).fill('reg.P0.r0=0 && reg.P1.r1=0');
  await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.query-card[data-model="SC"] .verdict')).toHaveAttribute('data-verdict','unreachable');await expect(page.locator('.query-card[data-model="TSO"] .verdict')).toHaveAttribute('data-verdict','reachable');
  checks.push('specified double-zero query is SC unreachable and TSO reachable');
  await page.getByRole('button',{name:'TSO 目标见证重放',exact:true}).click();await expect(page.locator('#step-label')).toHaveText('0 / 6');await page.getByRole('button',{name:'跳到最终状态',exact:true}).click();await expect(page.locator('.register-list')).toHaveText(['r0=0','r1=0']);checks.push('target match replays against original program');
  await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('1');await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.query-card[data-model="TSO"] .verdict')).toHaveAttribute('data-verdict','unknown');checks.push('query budget exhaustion reports unknown rather than unreachable');
  await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('20000');await page.getByRole('spinbutton',{name:'最多结果数',exact:true}).fill('1');await page.getByRole('textbox',{name:'目标条件',exact:true}).fill('mem.x=1');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('#results-badge')).toContainText('incomplete');await expect(page.locator('.query-card[data-model="TSO"] .verdict')).toHaveAttribute('data-verdict','reachable');checks.push('observed match remains reachable even when result enumeration is incomplete');
  await page.getByRole('spinbutton',{name:'最多结果数',exact:true}).fill('256');await page.getByRole('combobox',{name:'实验模式',exact:true}).selectOption('compare-fences');await page.getByRole('textbox',{name:'目标条件',exact:true}).fill('reg.P0.r0=0 && reg.P1.r1=0');await page.getByRole('textbox',{name:'屏障插入位置',exact:true}).fill('P0:1,P1:1');
  await page.getByRole('button',{name:'运行分析',exact:false}).click();const tso=page.locator('.query-card[data-model="TSO"]');await expect(tso.locator('[data-side="before"] .verdict')).toHaveAttribute('data-verdict','reachable');await expect(tso.locator('[data-side="after"] .verdict')).toHaveAttribute('data-verdict','unreachable');await expect(tso.locator('.comparison-difference')).toContainText('移除 1 个');await expect(tso.locator('.blocked-witness')).toHaveAttribute('data-mapping','blocked');checks.push('two fences remove double-zero with complete sets and separately block the old witness');
  await page.getByRole('textbox',{name:'屏障插入位置',exact:true}).fill('P0:1');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(tso.locator('[data-side="after"] .verdict')).toHaveAttribute('data-verdict','reachable');await expect(tso.locator('.blocked-witness')).toHaveAttribute('data-mapping','blocked');await expect(tso.locator('.blocked-witness')).toContainText('目标仍然可达');checks.push('one blocked old witness is not confused with forbidding the target');
  await page.getByRole('button',{name:'TSO 插入后见证重放',exact:true}).click();await expect(page.locator('#trace-badge')).toContainText('插入后');await page.getByRole('button',{name:'跳到最终状态',exact:true}).click();await expect(page.locator('.register-list')).toHaveText(['r0=0','r1=0']);checks.push('after witness uses transformed program for actual core replay');
  await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('1');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(tso.locator('[data-side="before"] .verdict')).toHaveAttribute('data-verdict','unknown');await expect(tso.locator('[data-side="after"] .verdict')).toHaveAttribute('data-verdict','unknown');await expect(tso.locator('.comparison-difference')).toHaveAttribute('data-complete','false');await expect(tso.locator('.comparison-difference')).toContainText('不能据此断言移除或新增');checks.push('incomplete fence comparison leaves target and set differences unknown');
  await page.getByRole('spinbutton',{name:'最多状态数',exact:true}).fill('20000');await page.getByRole('textbox',{name:'屏障插入位置',exact:true}).fill('P0:99');await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('#results-badge')).toHaveText('输入错误');await expect(page.getByRole('textbox',{name:'屏障插入位置',exact:true})).toBeFocused();checks.push('invalid fence boundary is visible and focused by core error.input');
  await page.getByLabel('实验配置文件',{exact:true}).setInputFiles(${JSON.stringify(fixturePaths.mode)});await expect(page.locator('#file-status')).toContainText('已导入');await expect(page.getByRole('combobox',{name:'实验模式',exact:true})).toHaveValue('compare-fences');await expect(page.getByRole('textbox',{name:'屏障插入位置',exact:true})).toHaveValue('P0:1,P1:1');await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();checks.push('version2 restores compare mode target fences and invalidates results');
  await page.evaluate(()=>{window.__modeDownloads=[];const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{const url=original(blob);window.__modeDownloads.push(blob.text());return url;};});await page.getByRole('button',{name:'下载配置',exact:false}).click();const config=await page.evaluate(async()=>JSON.parse(await window.__modeDownloads[0]));expect(config.version).toBe(2);expect(config.options.mode).toBe('compare-fences');expect(config.options.target).toBe('reg.P0.r0=0 && reg.P1.r1=0');expect(config.options.fences).toBe('P0:1,P1:1');checks.push('version2 download preserves all advanced mode configuration');
  await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(tso.locator('[data-side="after"] .verdict')).toHaveAttribute('data-verdict','unreachable');await page.getByRole('button',{name:'下载结果 JSON',exact:false}).click();const result=await page.evaluate(async()=>JSON.parse(await window.__modeDownloads[1]));expect(result.version).toBe(2);expect(result.results.TSO.mapping.status).toBe('blocked');expect(result.results.TSO.after.verdict).toBe('unreachable');expect(result.results.TSO.afterSource).toContain('fence');checks.push('comparison result bundle exports original source afterSource and actual verdicts');
  await tso.getByText('查看并应用插入屏障后的程序',{exact:true}).click();await page.getByRole('button',{name:'TSO 应用插入屏障后的程序',exact:true}).click();await expect(page.getByRole('combobox',{name:'实验模式',exact:true})).toHaveValue('query');await expect(page.getByRole('textbox',{name:'程序源代码',exact:true})).toHaveValue(result.results.TSO.afterSource);await expect(page.getByRole('button',{name:'下载结果 JSON',exact:false})).toBeDisabled();await expect(page.locator('#trace-content')).toBeHidden();checks.push('applying afterSource invalidates results and switches to query');
  await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(page.locator('.query-card[data-model="TSO"] .verdict')).toHaveAttribute('data-verdict','unreachable');checks.push('applied fenced source is independently queried as unreachable');
  await page.getByLabel('实验配置文件',{exact:true}).setInputFiles(${JSON.stringify(fixturePaths.valid)});await expect(page.getByRole('combobox',{name:'实验模式',exact:true})).toHaveValue('analyze');checks.push('legacy version1 imports into analyze mode');
  await page.getByLabel('实验配置文件',{exact:true}).setInputFiles(${JSON.stringify(fixturePaths.mode)});await expect(page.getByRole('button',{name:'运行分析',exact:false})).toBeEnabled();await page.getByRole('button',{name:'运行分析',exact:false}).click();await expect(tso.locator('[data-side="after"] .verdict')).toHaveAttribute('data-verdict','unreachable');await page.getByRole('button',{name:'TSO 插入前见证重放',exact:true}).click();await expect(page.locator('#step-label')).toHaveText('0 / 6');await page.getByRole('button',{name:'下一步',exact:true}).click();
  return {checks,payloads:[config,result]};`);
  payloads.push(...modes.payloads);
 }

 const desktop=stage('responsive-desktop',String.raw`const checks=[];for(const width of [320,390,768,1248]){await page.setViewportSize({width,height:1000});const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));expect(layout.scroll).toBeLessThanOrEqual(layout.width);checks.push('no horizontal overflow at '+width+'px');}await page.evaluate(()=>window.scrollTo(0,0));expect(globalThis.errors).toEqual([]);checks.push('no uncaught browser errors');return {checks,screenshot:await page.screenshot({fullPage:true}),userAgent:await page.evaluate(()=>navigator.userAgent)};`);await saveScreenshot(desktop.screenshot,'optimization-desktop.png');
 const mobile=stage('responsive-mobile',String.raw`await page.setViewportSize({width:390,height:900});await page.locator('#trace').scrollIntoViewIfNeeded();return {screenshot:await page.screenshot({fullPage:false})};`);await saveScreenshot(mobile.screenshot,'optimization-mobile-390.png');
 // These are ordinary files produced by this run, not a browser download ledger.
 const downloadDirectory=join(homedir(),'Downloads');
 for(const name of await readdir(downloadDirectory).catch(()=>[])){if(downloadsBefore.has(name)||!/^litmuslab-(experiment|results)( \(\d+\))?\.json$/.test(name))continue;const path=join(downloadDirectory,name);try{const info=await stat(path);if(info.size>8*1024*1024)continue;const bytes=await readFile(path);const value=JSON.parse(bytes);const matched=payloads.find(payload=>JSON.stringify(payload)===JSON.stringify(value));if(matched)observedDownloads.push({filename:name,kind:value.kind,maxStates:value.options.maxStates,sha256:createHash('sha256').update(bytes).digest('hex'),verifiedBy:'ordinary local file read matched captured Blob payload'});}catch{}}
 if(observedDownloads.length)checks.push({name:'downloaded local JSON files match captured payloads',passed:true,count:observedDownloads.length});
 evidenceAfter=snapshot();if(evidenceAfter.digest!==evidence.digest)throw new Error('Browser inputs changed during verification');checks.push({name:'browser input evidence unchanged before and after QA',passed:true});
}catch(error){failure=error.message;checks.push({name:'browser QA completed',passed:false,error:failure});}
finally{
 try{const finished=invoke(['finish','--task',task]);stages.push({id:'finish',status:finished.finished?'succeeded':'unknown',retained:true});}catch(error){stages.push({id:'finish',status:'failed',error:error.message});}
 if(server&&server.exitCode===null)await new Promise(ok=>{server.once('exit',ok);server.kill('SIGTERM');});
 await rm(temporary,{recursive:true,force:true});
}
const report={formatVersion:1,projectVersion,started,finished:new Date().toISOString(),command:'node tools/browser-qa.mjs',tool:'Installed Tabbit CLI / Playwright',evidence,evidenceAfter,source:'Real compiled MoonBit Worker. Network responses only delayed for race tests; model results never mocked.',passed:checks.filter(c=>c.passed).length,failed:checks.filter(c=>!c.passed).length,checks,stages,screenshots,downloads:{payloadsValidated:payloads.length,filesVerified:observedDownloads,limitations:'Tabbit has no download events. Payload capture wraps createObjectURL while retaining the native call and download. A captured Blob alone does not establish disk persistence; only filesVerified entries were also read from disk.'},limits:['Local UI and finite-model behavior only; no hardware-model claim.','Visual inspection is recorded separately after opening generated screenshot files.','Preview stopped after QA; browser page retained.']};
await writeFile(join(root,'reports/browser-optimization.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,failed:report.failed,report:'reports/browser-optimization.json',error:failure||null,screenshots:report.screenshots.map(s=>s.path)}));
process.exitCode=failure?1:0;
