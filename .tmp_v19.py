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
                return 'EXC: ' + str(m['result'].get('exceptionDetails', {}))[:200]
            return m['result']['result'].get('value')

# 1) F11 进全屏
enter = ev("(async()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'F11',code:'F11',bubbles:false,cancelable:true}));await new Promise(r=>setTimeout(r,900));return await window.__TAURI__.core.invoke('is_main_fullscreen')})()", await_promise=True)
print('fs:', enter)

# 2) 碰顶触发按钮
shape = ev("""
(async () => {
  await new Promise(r=>setTimeout(r,300));
  window.dispatchEvent(new MouseEvent('mousemove', {clientY: 1, clientX: 700, bubbles: false}));
  await new Promise(r=>setTimeout(r,500));
  const b = document.getElementById('wxrd-exit-fullscreen');
  const cs = b ? getComputedStyle(b) : null;
  const rect = b ? b.getBoundingClientRect() : null;
  return JSON.stringify({
    shown: b?.classList.contains('wxrd-edge-shown'),
    size: cs ? [cs.width, cs.height] : null,
    top: cs?.top, transform: cs?.transform,
    rectVp: rect ? [Math.round(rect.top), Math.round(rect.left), Math.round(rect.width), Math.round(rect.height)] : null,
  });
})()
""", await_promise=True)
print('shape:', shape)

# 3) 命中区检验：在视口矩形的四角与中心各发 elementFromPoint（元素级命中）+
#    语义级：在四角坐标 dispatch click 到 document、观察按钮 onclick 是否挂上（invoke 触发）。
hit = ev("""
(async () => {
  const b = document.getElementById('wxrd-exit-fullscreen');
  if (!b) return 'no-btn';
  const r = b.getBoundingClientRect();
  const pts = [
    ['corner-LT', r.left+4, r.top+4],
    ['corner-RT', r.right-4, r.top+4],
    ['corner-LB', r.left+4, r.bottom-4],
    ['corner-RB', r.right-4, r.bottom-4],
    ['edge-mid-top', (r.left+r.right)/2, r.top+3],
    ['center', (r.left+r.right)/2, (r.top+r.bottom)/2],
  ].map(([n,x,y]) => {
    const el = document.elementFromPoint(x, y);
    return { n, hit: el === b || b.contains(el) };
  });
  return JSON.stringify(pts);
})()
""", await_promise=True)
print('hitmap:', hit)
