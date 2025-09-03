import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # 1. Login as the admin user
        page.goto("http://localhost:3000/login")
        page.get_by_label("Email").fill("jules.test.admin@example.com")
        page.get_by_label("Password").fill("password123")
        page.get_by_role("button", name="Login").click()

        # Wait for navigation to the account page to confirm login
        expect(page).to_have_url(re.compile(r".*\/account"))
        print("Login successful.")

        # 2. Navigate to Documents page
        page.get_by_role("link", name="Docs").click()
        expect(page).to_have_url(re.compile(r".*\/documents"))
        expect(page.get_by_role("heading", name="Club Documents")).to_be_visible()
        print("Navigated to Documents page.")

        # 3. Navigate to Gallery page
        page.get_by_role("link", name="Gallery").click()
        expect(page).to_have_url(re.compile(r".*\/gallery"))
        expect(page.get_by_role("heading", name="Photo Gallery")).to_be_visible()
        print("Navigated to Gallery page.")

        # 4. Navigate to Info tab and verify Sponsors
        page.get_by_role("link", name="Info").click()
        expect(page.get_by_role("heading", name="Club Information")).to_be_visible()

        # Check if the Sponsors section is there
        sponsors_heading = page.get_by_role("heading", name="Our Sponsors")
        expect(sponsors_heading).to_be_visible()
        print("Navigated to Info tab and Sponsors section is visible.")

        # 5. Take screenshot
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot taken.")

    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
