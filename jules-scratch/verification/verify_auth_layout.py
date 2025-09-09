from playwright.sync_api import sync_playwright, expect
import time
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Go to the account page to log in/register
    page.goto("http://localhost:3000/account")

    # Click the "Register here" link to switch to the registration form
    page.get_by_role("link", name="Register here").click()

    # Wait for the registration form to be visible
    expect(page.get_by_role("heading", name="Register")).to_be_visible()

    # Fill out the registration form with admin email
    timestamp = int(time.time())
    email = f"jules.test.admin{timestamp}@example.com"
    page.get_by_label("Full Name").fill("Test Admin")
    page.get_by_label("Email Address").fill(email)
    page.get_by_label("Password").fill("password123")

    # Submit the registration form
    page.get_by_role("button", name="Register").click()

    # Wait for the URL to change to /account, indicating a successful login/redirect.
    page.wait_for_url("**/account", timeout=10000)

    # Navigate to the admin page
    page.goto("http://localhost:3000/admin")

    # Wait for the admin page to load
    expect(page.get_by_role("heading", name="Admin Dashboard")).to_be_visible(timeout=10000)

    # Check for the BottomNav on the admin page
    expect(page.locator("nav")).to_be_visible()

    # Take a screenshot to verify the layout for an admin user
    page.screenshot(path="jules-scratch/verification/admin_verification.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
