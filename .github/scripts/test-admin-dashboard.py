"""Visual overflow regression for the admin dashboard (mocked API, no credentials)."""

import json
from pathlib import Path
from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parents[1]
SCREENSHOTS = ROOT / "docs" / "assets" / "screenshots"
STATS = {
    "users": {"total": 1000008, "active": 1000000, "banned": 12345, "admins": 1},
    "posts": {"total": 1234567, "comments": 9876543},
    "security": {"enabled": True, "underAttack": True, "activeBans": 12345,
                 "blockScanners": True, "blockBadUserAgents": True,
                 "challengeForeignAuth": True, "ipAllowlistCount": 2, "ipBlocklistCount": 10},
    "system": {"uptimeSeconds": 450000, "nodeVersion": "v24.18.0", "platform": "linux",
               "memory": {"heapUsedMB": 1234, "systemUsagePercent": 92,
                          "systemUsedMB": 12345, "systemTotalMB": 16384,
                          "status": "critical", "cloudBreakdown": {
                              "render": {"usedMB": 1234, "totalMB": 2048},
                              "redis": {"usedMB": 512, "totalMB": 1024}}},
               "services": {"mongo": "connected", "redis": "connected", "neo4j": "standby"}},
}


def inspect(page):
    return page.evaluate("""() => {
      const cards = [...document.querySelectorAll('.MuiCard-root')];
      const overflow = cards.flatMap((card, index) => {
        const cardRect = card.getBoundingClientRect();
        return [...card.querySelectorAll('*')].filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width && (r.right > cardRect.right + 1 || r.left < cardRect.left - 1);
        }).slice(0, 4).map((el) => ({card: index, text: el.textContent?.trim().slice(0, 65),
          tag: el.tagName, right: Math.round(el.getBoundingClientRect().right),
          cardRight: Math.round(cardRect.right)}));
      });
      const clippedText = cards.flatMap((card, index) => [...card.querySelectorAll('p, h1, h2, h3, h4, h5, h6, button, .MuiChip-label')]
        .filter(el => el.scrollWidth > el.clientWidth + 1)
        .map(el => ({card: index, text: el.textContent?.trim().slice(0, 65)})));
      return {viewport: innerWidth, bodyWidth: document.body.scrollWidth,
        cardOverflow: overflow, clippedText};
    }""")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    for language in ("vi", "en"):
        for width in (320, 390, 768, 1024, 1440):
            page = browser.new_page(viewport={"width": width, "height": 900})
            if language == "vi" and width == 390:
                # A previously signed-in browser must lose the old profile copy.
                page.add_init_script("""(() => {
                  localStorage.setItem('has_admin_session', 'true');
                  localStorage.setItem('cached_admin_user', JSON.stringify({
                    _id: 'legacy-admin', name: 'Old name', email: 'old@test.local', role: 'admin'
                  }));
                })()""")
            page.route("**/auth/profile", lambda route: route.fulfill(
                json={"profile": {"_id": "test-admin", "name": "Dashboard Test",
                                   "email": "admin@test.local", "role": "admin"}}))
            page.route("**/admin/stats", lambda route: route.fulfill(
                json={"success": True, "stats": STATS}))
            page.goto("http://localhost:5174/", wait_until="domcontentloaded")
            page.locator("h1").wait_for(timeout=10000)
            storage = page.evaluate("""() => ({
              profile: localStorage.getItem('cached_admin_user'),
              sessionFlag: localStorage.getItem('has_admin_session')
            })""")
            assert storage == {"profile": None, "sessionFlag": None}, storage
            if language == "en":
                page.locator("#language-select-button").click()
                page.get_by_role("menuitem").filter(has_text="English").click()
                page.locator("h1").get_by_text("System Overview").wait_for(timeout=10000)
            result = inspect(page)
            print(json.dumps({"language": language, "heading": page.locator("h1").inner_text(), **result}, ensure_ascii=False))
            if width in (390, 1440) and language == "vi":
                SCREENSHOTS.mkdir(parents=True, exist_ok=True)
                page.screenshot(path=str(SCREENSHOTS / f"admin-dashboard-{width}.png"), full_page=True)
            assert result["bodyWidth"] <= width, result
            assert not result["cardOverflow"], result
            assert not result["clippedText"], result
            if language == "vi" and width in (390, 1440):
                page.get_by_role("button", name="Chuyển sang giao diện tối").click()
                dark = inspect(page)
                print(json.dumps({"language": language, "theme": "dark", **dark}, ensure_ascii=False))
                assert dark["bodyWidth"] <= width and not dark["cardOverflow"] and not dark["clippedText"], dark
            page.close()

    context = browser.new_context()
    context.add_cookies([{"name": "accessToken", "value": "test-cookie",
                          "url": "http://localhost:3000/", "httpOnly": True}])
    page = context.new_page()
    profile_requests = []

    def authenticated_profile(route):
        profile_requests.append(route.request.headers.get("cookie", ""))
        route.fulfill(json={"profile": {"_id": "test-admin", "name": "Dashboard Test",
                                        "email": "admin@test.local", "role": "admin"}})

    page.route("**/auth/profile", authenticated_profile)
    page.route("**/admin/stats", lambda route: route.fulfill(json={"success": True, "stats": STATS}))
    page.route("**/admin/comment-reports**", lambda route: route.fulfill(json=[]))
    page.goto("http://localhost:5174/")
    page.locator("h1").wait_for()
    page.reload()
    page.locator("h1").wait_for()
    assert len(profile_requests) >= 2 and all("accessToken=test-cookie" in cookie for cookie in profile_requests)
    assert page.evaluate("localStorage.getItem('cached_admin_user')") is None
    assert page.evaluate("localStorage.getItem('has_admin_session')") is None
    assert page.locator("aside").get_by_role("link", name="Báo cáo bình luận").count() == 1
    assert page.get_by_role("link", name="Kiểm duyệt AI").count() == 0
    page.locator("aside").get_by_role("link", name="Báo cáo bình luận").click()
    page.wait_for_url("**/reports")
    page.locator("h1").get_by_text("Báo cáo bình luận").wait_for()
    page.goto("http://localhost:5174/moderation")
    page.wait_for_url("**/reports")
    context.close()

    page = browser.new_page()
    page.route("**/auth/profile", lambda route: route.fulfill(status=401, json={"message": "Unauthorized"}))
    page.route("**/auth/refresh", lambda route: route.fulfill(status=401, json={"message": "Unauthorized"}))
    page.goto("http://localhost:5174/")
    page.wait_for_url("**/login", timeout=10000)
    page.close()
    browser.close()
