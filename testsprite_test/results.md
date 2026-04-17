# TestSprite Test Results

- Started: 2026-04-17T08:09:14.191Z
- Finished: 2026-04-17T08:09:27.761Z
- Base URL: http://127.0.0.1:3001
- Total: 13
- Passed: 13
- Failed: 0

## Cases

- [PASS] TS-001 - Homepage responds with 200 and renders headline
  - Detail: Homepage loaded and headline present.
  - Duration: 831 ms
- [PASS] TS-002 - GET /api/analyze is method-restricted
  - Detail: Method not allowed works as expected.
  - Duration: 4001 ms
- [PASS] TS-003 - GET /api/ocr is method-restricted
  - Detail: Method not allowed works as expected.
  - Duration: 6969 ms
- [PASS] TS-004 - POST /api/analyze with empty JSON returns validation error
  - Detail: Missing payload rejected correctly.
  - Duration: 71 ms
- [PASS] TS-005 - POST /api/analyze with text/plain payload returns validation error
  - Detail: Unsupported content type is rejected without server crash.
  - Duration: 70 ms
- [PASS] TS-006 - POST /api/analyze multipart non-image file is rejected
  - Detail: Non-image file upload blocked.
  - Duration: 376 ms
- [PASS] TS-007 - POST /api/analyze rejects file larger than upload limit
  - Detail: Analyze endpoint enforces max upload size.
  - Duration: 790 ms
- [PASS] TS-008 - POST /api/ocr with empty form-data returns 400
  - Detail: OCR endpoint validates required input.
  - Duration: 101 ms
- [PASS] TS-009 - TestSprite runner scripts exist and are executable
  - Detail: testsprite_test runner scripts are present and executable.
  - Duration: 2 ms
- [PASS] TS-010 - Static asset /next.svg is served
  - Detail: Static SVG asset served correctly.
  - Duration: 217 ms
- [PASS] TS-011 - Favicon endpoint is served
  - Detail: Favicon endpoint returned 200.
  - Duration: 118 ms
- [PASS] TS-012 - Local MCP data files exist and are non-empty
  - Detail: mini_glossary.json and risk_rules.json are present and non-empty.
  - Duration: 11 ms
- [PASS] TS-013 - Project default upload limit is documented as 10 MB
  - Detail: Upload limit is documented consistently in project docs.
  - Duration: 4 ms

JSON report: testsprite_test/results.json
