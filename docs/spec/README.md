# SRS and SDS

The Software Requirements Specification and the Software Design Specification of Fisko. Both are bilingual single-file HTML documents, with Word and PDF output built from the same Markdown sources.

**Status: version 0.1 draft.** All chapters are written in draft, and no person has reviewed them. Procurement was the pilot that set structure and depth for the other module chapters, and `src/AUTHORING-BRIEF.md` holds the rules every chapter follows.

## Build

```bash
python scripts/render_diagrams.py         # PlantUML sources to SVG and PNG, Thai and English (needs Java and the jar in tools/plantuml)
python scripts/build_spec.py              # both documents; "srs" or "sds" for one, --pdf for PDFs, --no-docx to skip Word
```

Outputs go to `docs/spec/dist/` and are not committed. Rendered diagrams in `docs/spec/diagrams/` are committed.

| Output | What |
| --- | --- |
| `Fisko-SRS.html`, `Fisko-SDS.html` | Thai and English in one file |
| `Fisko-SRS-rtm.csv` | Requirement list with clause references and status |
| `Fisko-clause-coverage.csv` | Every registered clause and where it is answered |
| `Fisko-{SRS,SDS}-{th,en}.docx` | Editable Word files |

## Sources (`src/`)

| Path | What |
| --- | --- |
| `AUTHORING-BRIEF.md` | Rules for writing a chapter: structure, ids, clause references, status and how to finish |
| `srs/`, `sds/` | `_meta.json` (order and titles) and `th/*.md`, `en/*.md`: the same blocks in the same order; the build fails if they differ |
| `law/*.tsv` | The clause register: every legal clause Fisko must answer, and whether the SRS or the SDS answers it |
| `diagrams/*.puml` | One PlantUML source per diagram, both languages from `$t("ไทย", "English")` labels |
| `assets/` | Page look, behaviour and fonts (SIL Open Font License 1.1) |

## Writing rules

- No agency names. Fisko is generic; agency values are tenant settings with an allowed range.
- One testable "shall" per requirement row. Give a number or a rule, never "fast" or "appropriate".
- Never invent a number. It comes from a clause or a measurement, or it is marked as a proposal.
- Status is honest: `Prototyped` only when the prototype has the behaviour and a sweep check covers it. No production code exists yet.
- Every unresolved matter is an `[!OPEN]` callout that says who must decide.
- Callouts: `[!NOTE]`, `[!WARN]`, `[!OPEN]`, `[!LAW]`. Figures: `{{fig:<id> | caption}}`.
- No emoji or arrow glyphs in the documents.
