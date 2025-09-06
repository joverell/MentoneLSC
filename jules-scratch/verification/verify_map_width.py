from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    page.goto("http://localhost:3000/account")

    # Check if we are already logged in by looking for the logout button
    try:
        page.wait_for_selector('button:has-text("Logout")', timeout=5000)
        print("Already logged in.")
    except:
        print("Not logged in, attempting to log in.")
        # If not logged in, the form should be visible.
        page.get_by_label("Email Address").fill("test@example.com")
        page.get_by_label("Password").fill("password123")
        page.get_by_role("button", name="Login").click()
        page.wait_for_url("http://localhost:3000/account", timeout=10000)

    # Navigate to the create event page
    page.goto("http://localhost:3000/create-event")

    # Wait for the map to be visible
    page.wait_for_selector('.gm-style', timeout=30000) # Wait for google maps to load

    # Take a screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
