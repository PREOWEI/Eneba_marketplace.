# Marketplace frontend

React and TypeScript storefront using Vite, bundled Metropolis, Vitest and Oxlint. The PHP API supplies products, homepage content, seller offers, authentication, Favorites and orders.

See the [main README](../README.md) for the complete feature list, setup, artwork commands and verification limits.

## Run locally

Start PHP as described in the main README. From this folder:

~~~powershell
npm.cmd ci
npm.cmd run dev
~~~

Vite proxies /api to http://127.0.0.1:8000. Use the Vite URL so authenticated requests share the storefront origin.

## Interface behavior

- Home shows homepage sections and the catalog. Category navigation opens catalog view; Home and the logo restore the sections.
- Filter options come from the entire category independently of filtered results. Filters update results without replaying the homepage transition.
- Favorites are authenticated and stored by the backend. Guest save intent survives login.
- Header controls are cart/count, Favorites heart and account dropdown.
- Order codes start hidden with individual Reveal, Hide and Copy controls. Visibility is not persisted.
- Checkout explains that payments and codes are simulated. Compatibility and region information remain visible.
- ProductImage retains the existing image fit and provides a fallback on load failure.

## Checks

~~~powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
~~~

The latest filter-fix run passed 43 tests, lint and build. Tests mock API calls and do not prove live MongoDB persistence. This documentation update did not rerun them.
