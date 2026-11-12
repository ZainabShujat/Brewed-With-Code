# Brewed With Code — rules for Claude

Read `PROJECT_BRIEF.md` and `DESIGN_BIBLE.md` first. The design bible is the art direction. Don't invent a different style.

- The owner is creative director. Ask before changing layout, art style or game design.
- Performance budget: Intel UHD 620. No post-processing or bloom, one shadow-casting light, low-segment geometry, reuse materials. Check FPS after each feature.
- Content lives in `src/data/` (recipes, levels, decor, barista parts) so the owner can add items without code.
- Recipes must be real and sourced. Fact-check ratios.
- Never say a feature works without running it in the browser.
- Keep systems small and separate (`src/world`, `src/systems`, `src/ui`, `src/data`). Don't rewrite working code.
- Each session: commit, tag `sNN-feature`, and write `devlog/sNN.md` (feature, 4–8 showable lines, what broke and the fix).
- No AI attribution or co-author lines in commits.
