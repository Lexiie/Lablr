# TestSprite Cloud Inputs

Folder ini berisi input yang dipakai untuk TestSprite MCP cloud run.

## Files
- `standard_prd.json` — ringkasan requirement produk sebagai baseline test.
- `testsprite_frontend_test_plan.json` — daftar test case frontend/API untuk eksekusi cloud.

## Cara Pakai
1. Set API key di env:
   - `TESTSPRITE_API_KEY=...`
2. Generate/refresh konfigurasi MCP lokal:
   - `pnpm testsprite:mcp:setup`
3. Verifikasi package MCP bisa diakses:
   - `pnpm testsprite:mcp:verify`

## Catatan
- Suite lokal berbasis JS (`TC*.mjs`, `run_testsuite.mjs`) sudah dihapus.
- Eksekusi test sekarang mengandalkan plan cloud di file JSON pada folder ini.
