
# TestSprite AI Testing Report(MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** lablr
- **Date:** 2026-04-17
- **Prepared by:** TestSprite AI Team

---

## 2️⃣ Requirement Validation Summary

#### Test TC001 Landing page renders hero and upload section
- **Test Code:** [TC001_Landing_page_renders_hero_and_upload_section.py](./TC001_Landing_page_renders_hero_and_upload_section.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/762bccf2-77cf-486c-9e2e-1ba9b21dc760
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC002 Analyze endpoint rejects GET method
- **Test Code:** [TC002_Analyze_endpoint_rejects_GET_method.py](./TC002_Analyze_endpoint_rejects_GET_method.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/6d981913-18c9-4fef-980d-5b1b11f02e74
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC003 OCR endpoint rejects GET method
- **Test Code:** [TC003_OCR_endpoint_rejects_GET_method.py](./TC003_OCR_endpoint_rejects_GET_method.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/b084506f-5cfa-4255-8352-a4dbb24073c1
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC004 Header brand and nav links are visible
- **Test Code:** [TC004_Header_brand_and_nav_links_are_visible.py](./TC004_Header_brand_and_nav_links_are_visible.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/017b5262-fea2-44dd-9b99-84d2935e1e7c
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC005 Upload dropzone UI is visible
- **Test Code:** [TC005_Upload_dropzone_UI_is_visible.py](./TC005_Upload_dropzone_UI_is_visible.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/86c80fc8-480c-4a3c-985a-4422b781ac73
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC006 Image URL input is visible and typed correctly
- **Test Code:** [TC006_Image_URL_input_is_visible_and_typed_correctly.py](./TC006_Image_URL_input_is_visible_and_typed_correctly.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/03b3214d-b8b2-40d1-8fe8-c973dfb1b269
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC007 Run button starts disabled before input
- **Test Code:** [TC007_Run_button_starts_disabled_before_input.py](./TC007_Run_button_starts_disabled_before_input.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/9542efd0-f59a-462e-ad71-c9aa3d6eeef1
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC008 Progress section shows three pipeline steps
- **Test Code:** [TC008_Progress_section_shows_three_pipeline_steps.py](./TC008_Progress_section_shows_three_pipeline_steps.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/4a30aa68-334e-4f8a-bed8-759f2b81a246
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC009 Results section helper content is visible
- **Test Code:** [TC009_Results_section_helper_content_is_visible.py](./TC009_Results_section_helper_content_is_visible.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/ae2dada2-90b7-4202-9c42-3d61d094580e
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC010 Upload nav link jumps to upload section
- **Test Code:** [TC010_Upload_nav_link_jumps_to_upload_section.py](./TC010_Upload_nav_link_jumps_to_upload_section.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/f1aaf369-8eea-451b-8496-cac169a96def
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC011 Progress nav link jumps to progress section
- **Test Code:** [TC011_Progress_nav_link_jumps_to_progress_section.py](./TC011_Progress_nav_link_jumps_to_progress_section.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/2cecce00-b47e-49b8-8458-6a581ce950ce
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC012 Results nav link jumps to results section
- **Test Code:** [TC012_Results_nav_link_jumps_to_results_section.py](./TC012_Results_nav_link_jumps_to_results_section.py)
- **Test Error:** TEST FAILURE

Clicking the Results navigation link did not focus or reveal a results section because the target element is missing from the page.

Observations:
- After clicking the 'Results' nav link the URL updated to http://127.0.0.1:3000/#results.
- No element with id="results" was found on the page.
- The visible content shows the Explanation section and footer rather than a results section.
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/bd2fbb53-1952-402c-b00e-a8ba2df7fc40
- **Status:** ❌ Failed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---

#### Test TC013 Static assets are served
- **Test Code:** [TC013_Static_assets_are_served.py](./TC013_Static_assets_are_served.py)
- **Test Visualization and Result:** https://www.testsprite.com/dashboard/mcp/tests/73f9ec4d-d6f1-4451-bcc6-b97ef2f36c18/b373e950-5388-4232-8d24-5bfe9a374e94
- **Status:** ✅ Passed
- **Analysis / Findings:** {{TODO:AI_ANALYSIS}}.
---


## 3️⃣ Coverage & Matching Metrics

- **92.31** of tests passed

| Requirement        | Total Tests | ✅ Passed | ❌ Failed  |
|--------------------|-------------|-----------|------------|
| ...                | ...         | ...       | ...        |
---


## 4️⃣ Key Gaps / Risks
{AI_GNERATED_KET_GAPS_AND_RISKS}
---