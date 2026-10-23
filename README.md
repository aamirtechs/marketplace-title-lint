# Marketplace Title Lint
Live page: https://aamirtechs.github.io/marketplace-title-lint/

Lint a whole listing CSV against Amazon 2025 title rules, 200 characters, no word more than twice and no banned characters, before Amazon rewrites your titles. Sellers, operators and developers currently do this by hand, one row or one request at a time, in spreadsheets and paid suites. This tool does the whole batch in the browser for free.

## Features
- CSV upload with a title column picker, plus presets for Amazon (200), eBay (140), Etsy (140) and Shopify (255). Every limit is editable in the UI.
- Checks length in characters and bytes, words repeated more than twice, banned characters, ALL-CAPS titles and promo words.
- Byte length check for backend search terms against a 250 byte limit.
- Auto-trim and cleanup suggestion per row, with a violations CSV and a cleaned titles CSV to download.

## How it works
Paste or upload your input, set the options, and run the tool. All processing happens locally in your browser using the shared logic in `src/logic.js`, and you can download the results as files. It runs entirely in the browser.

## Privacy
Runs 100% in your browser. Your files never leave this device, nothing is uploaded,
and there is no tracking.

## Development
Core logic lives in `src/logic.js` and is shared by the page and the tests.
Run the tests with `npm test`.

## License
MIT, Copyright 2026 Amir Hussain.
