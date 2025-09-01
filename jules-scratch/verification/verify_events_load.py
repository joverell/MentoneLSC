from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000")

        # Wait for the events section to be visible
        events_section = page.locator("#events")
        expect(events_section).to_be_visible(timeout=10000)

        # Wait for the events to load inside the container
        event_element = events_section.locator("div[class*='event']").first
        expect(event_element).to_be_visible()

        # Take a screenshot of the events section
        events_section.screenshot(path="jules-scratch/verification/verification.png")
    except Exception as e:
        print(f"An error occurred: {e}")
        page.screenshot(path="jules-scratch/verification/error.png")
        print(page.content())
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
