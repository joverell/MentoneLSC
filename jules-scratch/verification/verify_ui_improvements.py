import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # iPhone 12 Pro viewport
        context = await browser.new_context(
            viewport={'width': 390, 'height': 844},
            is_mobile=True,
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
        )
        page = await context.new_page()

        await page.goto("http://localhost:3000/account")

        try:
            await expect(page.get_by_role("button", name="Update Profile")).to_be_visible(timeout=1000)
        except:
            # Not logged in.
            try:
                # Try to login
                await page.get_by_label("Email Address").fill("jules.test.admin@example.com")
                await page.get_by_label("Password").fill("password123")
                await page.get_by_role("button", name="Login").click()
                await expect(page.get_by_role("button", name="Update Profile")).to_be_visible(timeout=10000)
            except:
                # Login failed, let's register.
                await page.goto("http://localhost:3000/account")
                await page.get_by_role("link", name="Register here").click()
                await page.get_by_label("Full Name").fill("Jules Test Admin")
                await page.get_by_label("Email Address").fill("jules.test.admin@example.com")
                await page.get_by_label("Password").fill("password123")
                await page.get_by_role("button", name="Register").click()
                await expect(page.get_by_role("button", name="Update Profile")).to_be_visible(timeout=10000)

        # 1. Verify Home Page
        await page.goto("http://localhost:3000")
        await page.wait_for_load_state('networkidle')
        await page.screenshot(path="jules-scratch/verification/home-mobile.png")

        # 2. Verify Admin Users Page
        await page.goto("http://localhost:3000/admin/users")
        await page.wait_for_load_state('networkidle')
        await page.screenshot(path="jules-scratch/verification/admin-users-mobile.png")

        # 3. Verify Create Event Page
        await page.goto("http://localhost:3000/create-event")
        await page.wait_for_load_state('networkidle')
        await page.screenshot(path="jules-scratch/verification/create-event-mobile.png")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
