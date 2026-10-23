#!/usr/bin/env python3
"""Controlled local comparison of archived 0.1.0 and current JS engines.
Each sample runs in a fresh Node process, after the same small warmup. The report
contains complete result fingerprints and state counts to prevent less-work wins.
"""
import argparse, hashlib, json, platform, statistics, subprocess
import evidence
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
CHILD=r'''
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
const {analyze}=await import(pathToFileURL(process.argv[1]));
const spec=JSON.parse(process.argv[2]);
const warm='memory x=0\nthread P0\nstore x 1\nload r x\nend';
for(let i=0;i<20;i++)analyze(warm,'TSO','bfs',100,4);
global.gc();
const start=performance.now();
const output=analyze(spec.source,spec.model,spec.strategy,100000,1024);
const elapsedMs=performance.now()-start;
const r=JSON.parse(output);
console.log(JSON.stringify({elapsedMs,maxRssKiB:process.resourceUsage().maxRSS,status:r.status,reason:r.reason,stats:r.stats,resultSha256:createHash('sha256').update(output).digest('hex')}));
'''
def main():
 p=argparse.ArgumentParser();p.add_argument('--samples',type=int,default=5);p.add_argument('--output',default='reports/performance.json');a=p.parse_args()
 if not 1<=a.samples<=20: raise SystemExit('samples must be 1..20')
 threads=lambda ops:'memory x=0 y=0\n'+'\n'.join('thread P'+str(t)+'\n'+'\n'.join(ops(t))+'\nend' for t in range(4))
 cases=[{'name':'fence-grid','source':threads(lambda t:['fence']*16),'model':'SC','strategy':'bfs'},
 {'name':'store-pressure','source':threads(lambda t:[f'store {"x" if i%2==0 else "y"} {t*16+i}' for i in range(16)]),'model':'TSO','strategy':'dfs'},
 {'name':'mixed-memory','source':threads(lambda t:[f'store x {t+1}','load r0 y','fence',f'store y {t+1}','load r1 x','load r0 y']),'model':'TSO','strategy':'bfs'}]
 modules={'baseline':ROOT/'tests/performance-baseline/engine.mjs','candidate':ROOT/'dist/engine.mjs'}
 report={'kind':'synthetic-local-performance-comparison','generatedAt':datetime.now(timezone.utc).isoformat(),'samplesPerVariant':a.samples,'platform':platform.platform(),'node':subprocess.check_output(['node','--version'],text=True).strip(),'scope':'Three fixed synthetic workloads on this machine; not a general speed guarantee. Fresh process per sample, 20 identical small warmups, GC before timing, variant order alternates.', 'engineHashes':{v:{path.name:hashlib.sha256(path.read_bytes()).hexdigest() for path in [m,m.with_name('engine.raw.mjs')]} for v,m in modules.items()},'cases':[]}
 report['status']='running'
 report['evidence']=evidence.snapshot(ROOT,'performance')
 (ROOT/a.output).write_text(json.dumps(report,indent=2)+'\n')
 for case in cases:
  samples={v:[] for v in modules}
  for i in range(a.samples):
   for v in (list(modules) if i%2==0 else list(reversed(modules))):
    raw=subprocess.check_output(['node','--expose-gc','--input-type=module','-e',CHILD,str(modules[v]),json.dumps(case)],text=True,timeout=60)
    samples[v].append(json.loads(raw))
  fingerprints={s['resultSha256'] for vals in samples.values() for s in vals}
  if len(fingerprints)!=1: raise AssertionError('Search output changed in '+case['name'])
  row={'name':case['name'],'source':case['source'],'model':case['model'],'strategy':case['strategy'],'sameSearchOutput':True,'samples':samples,'medians':{v:{k:statistics.median(s[k] for s in vals) for k in ['elapsedMs','maxRssKiB']} for v,vals in samples.items()}}
  row['timeRatio']=row['medians']['candidate']['elapsedMs']/row['medians']['baseline']['elapsedMs']; row['rssRatio']=row['medians']['candidate']['maxRssKiB']/row['medians']['baseline']['maxRssKiB']
  report['cases'].append(row);print(case['name'],json.dumps(row['medians']),flush=True)
 evidence.verify_snapshot(ROOT,report['evidence'],'performance')
 report['status']='passed';(ROOT/a.output).write_text(json.dumps(report,indent=2)+'\n')
if __name__=='__main__': main()
