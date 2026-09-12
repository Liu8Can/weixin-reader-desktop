import json, urllib.request, websocket, time

tabs = json.load(urllib.request.urlopen('http://127.0.0.1:9333/json', timeout=5))
pg = None
for t in tabs:
    if t['type'] == 'page' and 'weread.qq.com' in t['url'] and 'reader' in t['url']:
        pg = t; break
if pg is None:
    for t in tabs:
        if t['type'] == 'page' and 'weread.qq.com' in t['url']:
            pg = t; break
assert pg, [t['url'][:50] for t in tabs]

ws = websocket.create_connection(pg['webSocketDebuggerUrl'], timeout=10, origin='http://127.0.0.1:9333')
mid = [0]

def ev(expr, await_promise=False):
    mid[0] += 1
    ws.send(json.dumps({'id': mid[0], 'method': 'Runtime.evaluate',
                        'params': {'expression': expr, 'returnByValue': True, 'awaitPromise': await_promise}}))
    while True:
        m = json.loads(ws.recv())
        if 'id' in m and m['id'] == mid[0]:
            if 'exceptionDetails' in m.get('result', {}):
                return 'EXC: ' + str(m['result'].get('exceptionDetails', {}))[:160]
            return m['result']['result'].get('value')

SCRIPT = """
(async () => {
  window.dispatchEvent(new MouseEvent('mousemove', {clientY:1, clientX:700, bubbles:false}));
  await new Promise(r=>setTimeout(r,180));
  const b = document.getElementById('wxrd-exit-fullscreen');
  if (!b) return 'no-btn';
  const rr = b.getBoundingClientRect();
  const el = document.elementFromPoint(rr.left+5, rr.top+5);
  if (!el) return 'corner-null';
  const chain = [];
  let p = el;
  for (let i=0;i<4 && p;i++){ chain.push(p.tagName + (p.id?'#'+p.id:'') + '|z='+getComputedStyle(p).zIndex + '|pos='+getComputedStyle(p).position); p = p.parentElement; }
  return JSON.stringify({
    attacker: el.tagName + '.' + String(el.className).slice(0,30),
    chain,
    btnZ: getComputedStyle(b).zIndex,
    btnParent: b.parentElement.tagName,
    attackerZ: getComputedStyle(el).zIndex,
    attackerPos: getComputedStyle(el).position,
  });
})()
"""
print(ev(SCRIPT, await_promise=True))
