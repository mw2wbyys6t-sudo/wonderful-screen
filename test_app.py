from playwright.sync_api import sync_playwright
import time

URL = 'http://localhost:4174/wonderful-screen/'
logs = []
errors = []

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
        page.on('pageerror', lambda err: errors.append(str(err)))
        page.on('requestfailed', lambda req: errors.append(f"request failed: {req.url} {req.failure_error_code}"))

        print('Navigating...')
        page.goto(URL, wait_until='networkidle', timeout=30000)
        page.wait_for_timeout(2000)
        page.screenshot(path='/workspace/screenshots/phase_loading.png')

        time.sleep(4)
        page.screenshot(path='/workspace/screenshots/phase_landing.png')

        btn = page.locator('.journey-btn')
        if btn.count():
            print('Clicking start...')
            btn.click()
            time.sleep(2)
            page.screenshot(path='/workspace/screenshots/phase_showcase.png')
            time.sleep(9)
            page.screenshot(path='/workspace/screenshots/phase_universe.png')
            print('Visible text sample:', page.locator('body').inner_text()[:500])
        else:
            print('No journey button found')

        browser.close()

    print('\n=== CONSOLE LOGS ===')
    for l in logs[-100:]:
        print(l)
    print('\n=== PAGE ERRORS ===')
    for e in errors:
        print(e)

if __name__ == '__main__':
    main()
