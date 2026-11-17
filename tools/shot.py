"""CDP screenshot helper.
usage: shot.py out.png width [--dark] [--url URL] [--nojs] [--reduced] [--eval JS] [--clipH N] [--noscroll]
Scrolls the page to trigger reveals, then captures full page (or viewport with --noscroll).
"""
import json, subprocess, sys, time, base64, urllib.request, websocket, argparse, os, signal

ap = argparse.ArgumentParser()
ap.add_argument('out'); ap.add_argument('width', type=int)
ap.add_argument('--height', type=int, default=900)
ap.add_argument('--dark', action='store_true'); ap.add_argument('--nojs', action='store_true')
ap.add_argument('--reduced', action='store_true'); ap.add_argument('--noscroll', action='store_true')
ap.add_argument('--url', default='http://127.0.0.1:8791/')
ap.add_argument('--cpu', type=float, default=0)
ap.add_argument('--eval', default=None); ap.add_argument('--wait', type=float, default=2.5)
a = ap.parse_args()

port = 9333
prof = os.path.join(os.environ.get('TMPDIR', '/tmp'), 'shot-chrome-prof')
p = subprocess.Popen(['google-chrome', '--headless=new', '--disable-gpu', '--hide-scrollbars', '--remote-allow-origins=*',
    f'--remote-debugging-port={port}', f'--user-data-dir={prof}', 'about:blank'],
    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    for _ in range(50):
        try:
            tabs = json.load(urllib.request.urlopen(f'http://127.0.0.1:{port}/json')); break
        except Exception: time.sleep(0.2)
    ws_url = [t for t in tabs if t['type'] == 'page'][0]['webSocketDebuggerUrl']
    ws = websocket.create_connection(ws_url, timeout=30)
    mid = [0]; logs = []
    def send(method, params=None):
        mid[0] += 1; my = mid[0]
        ws.send(json.dumps({'id': my, 'method': method, 'params': params or {}}))
        while True:
            m = json.loads(ws.recv())
            if m.get('method') == 'Runtime.exceptionThrown':
                logs.append('EXC ' + json.dumps(m['params']['exceptionDetails'])[:400])
            if m.get('method') == 'Runtime.consoleAPICalled' and m['params']['type'] in ('error', 'warning'):
                logs.append('CONSOLE ' + ' '.join(str(x.get('value', x.get('description'))) for x in m['params']['args']))
            if m.get('method') == 'Log.entryAdded' and m['params']['entry']['level'] in ('error', 'warning'):
                logs.append('LOG ' + m['params']['entry']['text'] + ' ' + m['params']['entry'].get('url', ''))
            if m.get('id') == my: return m.get('result', {})
    send('Runtime.enable'); send('Log.enable'); send('Page.enable')
    send('Emulation.setDeviceMetricsOverride', {'width': a.width, 'height': a.height, 'deviceScaleFactor': 1, 'mobile': a.width < 800})
    feats = [{'name': 'prefers-color-scheme', 'value': 'dark' if a.dark else 'light'}]
    if a.reduced: feats.append({'name': 'prefers-reduced-motion', 'value': 'reduce'})
    send('Emulation.setEmulatedMedia', {'features': feats})
    if a.nojs: send('Emulation.setScriptExecutionDisabled', {'value': True})
    if a.cpu: send('Emulation.setCPUThrottlingRate', {'rate': a.cpu})
    send('Page.navigate', {'url': a.url})
    time.sleep(2.5)
    def ev(js):
        return send('Runtime.evaluate', {'expression': js, 'returnByValue': True, 'awaitPromise': True}).get('result', {}).get('value')
    if not a.noscroll and not a.nojs:
        h = ev('document.documentElement.scrollHeight') or 0
        y = 0
        while y < h:
            ev(f'window.scrollTo(0,{y})'); time.sleep(0.25); y += a.height // 2
        ev('window.scrollTo(0,0)'); time.sleep(0.5)
    if a.eval:
        print('EVAL:', json.dumps(ev(a.eval))[:3000])
    time.sleep(a.wait)
    params = {'format': 'png'}
    if not a.noscroll:
        h = ev('document.documentElement.scrollHeight')
        params.update({'captureBeyondViewport': True, 'clip': {'x': 0, 'y': 0, 'width': a.width, 'height': h, 'scale': 1}})
    r = send('Page.captureScreenshot', params)
    open(a.out, 'wb').write(base64.b64decode(r['data']))
    print('saved', a.out)
    for l in logs: print(l)
finally:
    p.send_signal(signal.SIGTERM); p.wait()
