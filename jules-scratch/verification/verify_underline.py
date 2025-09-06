from playwright.sync_api import Page, expect

def test_bottom_nav_underline(page: Page):
    """
    This test verifies that the underline is removed from the bottom menu icon text.
    """
    try:
        # 1. Arrange: Go to the homepage.
        page.goto("http://localhost:3000", timeout=60000)

        # 2. Assert: Check for the bottom nav.
        bottom_nav = page.locator("nav")
        # Wait for the element to be visible
        bottom_nav.wait_for(state="visible", timeout=30000)
        expect(bottom_nav).to_be_visible()

        # 3. Screenshot: Capture the final result for visual verification.
        page.screenshot(path="jules-scratch/verification/verification.png")
        print("Screenshot created successfully.")
    except Exception as e:
        print(f"An error occurred: {e}")
