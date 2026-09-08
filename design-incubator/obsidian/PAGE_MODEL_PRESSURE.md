# Page Model pressure — first visual pass

**No required Page Model additions identified.** The approved Shell/Home/Records/Document composition can use the existing semantic data. No model builders were changed.

## Records

Record cards intentionally use title, type, prepared-by, date, lifecycle, lock state and authorized supersession edges. They do not assume excerpts, cover art, unread state, favorites, popularity, or counts beyond those provided by the model. Type labels can be resolved from supplied `documentTypes`; no extra query is needed.

The card/list switch, sort choice, and page-size choices are presentation/workspace state. They are not new semantic Page Model facts. Final integration may need the Records endpoint/workspace adapter to accept requested ordering and batch size so a 50-row view does not fetch five small batches merely to fill its first screen; that is API ergonomics, not a new authorized fact.

## Shell / Home atmosphere

The atmospheric image and its optional caption are Design-owned presentation/configuration, not authorized archive facts. Aster Reach / Northwatch text belongs to fixtures. The Design does not require an invented featured story or featured department to make the homepage work.

## Document

Body, optional source, metadata, lifecycle, prepared-by, lineage, tags and concerns are sufficient. Heading typography is applied to canonical supplied HTML. No author avatar or additional relationship data is required. There is no generated summary or reading-time fact in the UI.

## Integration questions, not semantic model requests

- Final generic Shell/page configuration props differ from baseline's legacy axes. Use final P08D props.
- Final Records subfolder/type-exposure/loading/action adapter names must be reconciled after P08D.
- The preview OperatingContext must be replaced by the real core component. Its exact height/contrast needs one integration review inside the floating Shell.
- Shared management pages need the base theme bridge; isolated preview does not prove their styling.

If later design work genuinely needs a new semantic fact, record Page / Missing fact / Why needed / Why not layout / Authorization implications / Suggested addition here before requesting any model change.
