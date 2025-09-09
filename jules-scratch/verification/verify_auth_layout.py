from playwright.sync_api import sync_playwright, expect
import time
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Test unauthenticated view (e.g., home page)
    page.goto("http://localhost:3000/")
    # The nav should now be visible for guests on pages other than /account
    expect(page.locator("nav")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/unauthenticated_home_with_nav.png")


    # 2. Test authenticated view (account page)
    # Go to the account page to log in/register
    page.goto("http://localhost:3000/account")

    # The nav should NOT be visible on the login/register screen
    expect(page.locator("nav")).not_to_be_visible()

    # Register a new user to log in
    page.get_by_role("link", name="Register here").click()
    expect(page.get_by_role("heading", name="Register")).to_be_visible()

    timestamp = int(time.time())
    email = f"jules.test.admin{timestamp}@example.com"
    page.get_by_label("Full Name").fill("Test Admin")
    page.get_by_label("Email Address").fill(email)
    page.get_by_label("Password").fill("password123")

    page.get_by_role("button", name="Register").click()

    # Wait for the welcome message to appear, which confirms login
    welcome_message = page.get_by_role("heading", name=re.compile(r"Welcome,.*"))
    expect(welcome_message).to_be_visible(timeout=15000)

    # Assert that the BottomNav is now visible on the account page
    expect(page.locator("nav")).to_be_visible()

    # Take a screenshot to verify the layout for an authenticated user on the account page
    page.screenshot(path="jules-scratch/verification/authenticated_account_with_nav.png")

    # 3. Test authenticated view on another page (e.g., admin)
    page.goto("http://localhost:3000/admin")
    expect(page.get_by_role("heading", name="Admin Dashboard")).to_be_visible(timeout=10000)
    expect(page.locator("nav")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/admin_with_nav.png")


    browser.close()

with sync_playwright() as playwright:
    run(playwright)
