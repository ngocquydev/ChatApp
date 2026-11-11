"""Browser regression: start frontend, set VIDEO_TEST_CLIP to a local MP4,
then run python scripts/test-video-progress.py (requires Python Playwright/Chromium).
API responses are mocked; no posts are created or uploaded.
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
from threading import Thread
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
import os
clip = Path(os.environ['VIDEO_TEST_CLIP'])

class H(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path != '/clip.mp4':
            self.send_error(404)
            return
        size = clip.stat().st_size
        start, end = (0, size - 1)
        h = self.headers.get('Range')
        if h and h.startswith('bytes='):
            a, b = h[6:].split('-', 1)
            start = int(a or 0)
            end = min(int(b) if b else size - 1, size - 1)
            self.send_response(206)
            self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
        else:
            self.send_response(200)
        self.send_header('Content-Type', 'video/mp4')
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Content-Length', str(end - start + 1))
        self.end_headers()
        with clip.open('rb') as f:
            f.seek(start)
            self.wfile.write(f.read(end - start + 1))

    def log_message(self, *args):
        pass
s = HTTPServer(('127.0.0.1', 0), H)
Thread(target=s.serve_forever, daemon=True).start()
media = f'http://127.0.0.1:{s.server_port}/clip.mp4'
post = {'_id': 'playwright-video', 'author': {'_id': 'test-user', 'name': 'Playwright test'}, 'content': 'Optimized video demo', 'images': [media], 'privacy': 'public', 'likeCount': 0, 'commentCount': 0, 'shareCount': 0, 'likedByMe': False, 'sharedPost': None}

def mock(route):
    url = route.request.url
    headers = {'access-control-allow-origin': 'http://localhost:5173', 'access-control-allow-credentials': 'true', 'content-type': 'application/json'}
    body = {'profile': {'_id': 'test-user', 'id': 'test-user', 'name': 'Playwright test', 'email': 'test@example.invalid'}} if '/auth/profile' in url else {'data': {'feed': {'items': [post], 'hasMore': False, 'nextCursor': None}}} if '/graphql' in url else [] if '/community-groups/my' in url or '/pages/my' in url else {}
    route.fulfill(status=200, headers=headers, body=json.dumps(body))
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    c = b.new_context(viewport={'width': 1440, 'height': 900})
    c.add_init_script("localStorage.setItem('has_session','true');localStorage.setItem('cached_user',JSON.stringify({_id:'test-user',id:'test-user',name:'Playwright test'}));")
    page = c.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route('http://localhost:3000/**', mock)
    page.goto('http://localhost:5173/explore', wait_until='domcontentloaded')
    page.wait_for_selector('video')
    page.wait_for_function("document.querySelector('video').currentTime > 0.5")
    drift = page.evaluate("()=>{const a=document.querySelector('article'),s=a.querySelector('input[type=range]'),r=a.querySelector('.MuiSlider-rail'),t=a.querySelector('.MuiSlider-thumb');return Math.abs(t.getBoundingClientRect().x+t.getBoundingClientRect().width/2-r.getBoundingClientRect().x-Number(s.value)/Number(s.max)*r.getBoundingClientRect().width)}")
    assert drift < 2, f'Progress trails behind actual value by {drift}px'
    for width in [320, 390, 768, 1024, 1440]:
        page.set_viewport_size({'width': width, 'height': 900})
        for mode in ['light', 'dark']:
            page.emulate_media(color_scheme=mode)
            v = page.locator('video')
            slider = page.locator('input[type=range]')
            v.evaluate('(v)=>v.play()')
            page.wait_for_timeout(150)
            page.locator('article button').first.click()
            page.wait_for_function('document.querySelector("video").paused')
            frozen = slider.input_value()
            time = v.evaluate('(v)=>v.currentTime')
            page.wait_for_timeout(200)
            assert slider.input_value() == frozen, 'Progress moved after pause'
            assert abs(float(frozen) - time) < 0.02, 'Pause time differs from progress'
            slider.focus()
            slider.press('Home')
            page.wait_for_timeout(100)
            assert float(slider.input_value()) < 0.02, 'Paused seek did not reach beginning'
            page.locator('article button').first.click()
            page.wait_for_timeout(150)
            page.locator('article button').first.click()
            page.wait_for_timeout(50)
            assert abs(float(slider.input_value()) - v.evaluate('(v)=>v.currentTime')) < 0.02, 'Stale pause position after seeking'
            v.evaluate('(v)=>{v.currentTime=v.duration-0.15;v.play()}')
            page.wait_for_function('document.querySelector("video").ended')
            assert abs(float(slider.input_value()) - v.evaluate('(v)=>v.duration')) < 0.02
            page.locator('article button').first.click()
            page.wait_for_timeout(100)
            assert float(slider.input_value()) < 0.4, 'Replay did not reset progress'
            first = float(slider.input_value())
            page.wait_for_timeout(250)
            assert float(slider.input_value()) > first + 0.1, 'Replay progress got stuck'
            print(f'PASS {width}px {mode}: pause, paused seek, end, replay', flush=True)
    assert not errors, errors
    page.screenshot(path='docs/assets/screenshots/short-video-progress-regression.png')
    b.close()
s.shutdown()
