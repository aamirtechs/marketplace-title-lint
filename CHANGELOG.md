# Changelog

## 1.0.0 - 2026-10-23

- CSV upload with a title column picker, plus presets for Amazon (200), eBay (140), Etsy (140) and Shopify (255). Every limit is editable in the UI.
- Checks length in characters and bytes, words repeated more than twice, banned characters, ALL-CAPS titles and promo words.
- Byte length check for backend search terms against a 250 byte limit.
- Auto-trim and cleanup suggestion per row, with a violations CSV and a cleaned titles CSV to download.
