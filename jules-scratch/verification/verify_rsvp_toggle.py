from playwright.sync_api import sync_playwright, expect
import re

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Log in
        page.goto("http://localhost:3000/account")
        page.get_by_label("Email").fill("jules.test.admin@example.com")
        page.get_by_label("Password").fill("password")
        page.get_by_role("button", name="Login").click()
        expect(page.locator("text=Logout")).to_be_visible(timeout=10000)

        # Navigate to the events tab
        page.goto("http://localhost:3000/?tab=events")

        # Wait for events to load
        page.wait_for_selector("div[class*='Home_event__']")

        # Print the page content for debugging
        print(page.content())

        # Get all event elements that are internal
        internal_events = page.locator("div[class*='Home_event__']:has(a:has-text('View Details & RSVP'))")

        if internal_events.count() == 0:
            raise Exception("No internal events with RSVP buttons found.")

        # --- Test First Event ---
        first_event = internal_events.first
        rsvp_button_1 = first_event.get_by_role("button", name="RSVP Now")
        # Use a more robust locator based on the heading text
        rsvp_container_1 = first_event.locator("div:has(> h4:has-text('Your RSVP:'))")

        # 1. Initially, the RSVP form should be hidden
        expect(rsvp_container_1).to_be_hidden()

        # 2. Click the RSVP button to show the form
        rsvp_button_1.click()

        # 3. The form should now be visible
        expect(rsvp_container_1).to_be_visible()
        page.screenshot(path="jules-scratch/verification/rsvp_form_visible.png")

        # --- Test Second Event (if available) ---
        if internal_events.count() > 1:
            second_event = internal_events.nth(1)
            rsvp_button_2 = second_event.get_by_role("button", name="RSVP Now")
            rsvp_container_2 = second_event.locator("div:has(> h4:has-text('Your RSVP:'))")

            # 4. Click the second event's RSVP button
            rsvp_button_2.click()

            # 5. The first form should now be hidden
            expect(rsvp_container_1).to_be_hidden()

            # 6. The second form should now be visible
            expect(rsvp_container_2).to_be_visible()
            page.screenshot(path="jules-scratch/verification/rsvp_form_switched.png")

            # --- Test Closing the form ---
            # 7. Click the second button again (now "Close RSVP")
            close_button_2 = second_event.get_by_role("button", name="Close RSVP")
            close_button_2.click()

            # 8. The second form should be hidden again
            expect(rsvp_container_2).to_be_hidden()
            page.screenshot(path="jules-scratch/verification/rsvp_form_closed.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
