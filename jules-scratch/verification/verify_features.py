from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Use a unique email to avoid conflicts
    email = f"jules.test.admin.{int(time.time())}@example.com"
    password = "password"

    # Register a new user. This user will become an admin.
    page.goto("http://localhost:3000/register")
    page.get_by_label("Name").fill("Jules Admin")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Register").click()
    page.wait_for_url("http://localhost:3000/login")

    # Log in as the new admin user
    page.goto("http://localhost:3000/login")
    page.get_by_label("Email").fill(email)
    page.get_by_label("Password").fill(password)
    page.get_by_role("button", name="Login").click()
    page.wait_for_url("http://localhost:3000/account")

    # Navigate to User Management
    page.goto("http://localhost:3000/admin/users")
    expect(page.get_by_role("heading", name="User Management")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/user-management.png")

    # Navigate to Event Management
    page.goto("http://localhost:3000/admin/events")
    expect(page.get_by_role("heading", name="Event Management")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/event-management.png")

    # Navigate to the user's own edit page
    page.goto("http://localhost:3000/admin/users")
    manage_link = page.get_by_role("link", name="Manage", exact=True).first
    expect(manage_link).to_be_visible()

    href = manage_link.get_attribute("href")
    print(f"Manage link href: {href}")

    manage_link.click()

    # Wait for the URL to change to the user edit page
    page.wait_for_url(f"http://localhost:3000{href}")

    print(f"URL after click: {page.url}")
    print(page.content())

    expect(page.get_by_role("heading", name="Edit User:")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/user-page.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
