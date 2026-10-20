# Application provenance

The storefront source and public assets were imported from
[Azure-Samples/contoso-web](https://github.com/Azure-Samples/contoso-web/tree/e13b0d346bdc0f2139552df6b9268cbe71b5b644),
revision `e13b0d346bdc0f2139552df6b9268cbe71b5b644`.
The upstream MIT notice is preserved in [LICENSE.md](LICENSE.md).
The upstream repository is archived.

Local deployment changes:

- Excluded the upstream chat UI, chat API implementations, and chat-only helpers.
- Removed chat-only dependencies and query-string mode propagation.
- Added an explicit disabled response for all chat API paths. No Azure credentials
  or backend services are required.
- Updated Next.js and its ESLint configuration from 14.0.0 to 15.5.27 and adapted
  product page parameters to the asynchronous API.
- Override PostCSS with a compatible patched 8.x release, including Next.js's
  transitive copy; retain the resolved versions in the lockfile.
- Return 404 for unknown products.
- Run with `next start` instead of standalone output; limit build workers to two.
- Added production HTTP smoke tests.

The website remains a sample catalog, not a transactional ecommerce backend.
The displayed user profile is sample data, not authentication.
