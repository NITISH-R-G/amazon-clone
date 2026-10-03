# Engineering report

`Cartly-Engineering-Report.pdf` is the compiled report. `main.tex` and `sections/` are its LaTeX source.

## Build

The document uses XeLaTeX (fontspec with the TeX Gyre Heros and Cursor fonts) and TikZ for all diagrams. Any of these works:

```bash
# Tectonic (fetches packages on demand)
tectonic -X compile main.tex --outdir build

# TeX Live / MiKTeX
xelatex -output-directory=build main.tex && xelatex -output-directory=build main.tex
```

Run from this folder. Two passes are needed for the table of contents and cross references (Tectonic does this itself). No bibliography is used: the report cites the repository, not external papers.

## Source of truth

Every technical claim comes from the repository at the commit this report was written against (source, migrations, tests, `docs/product-decisions.md`). Claims are tagged Implemented, Tested, Not built or Not verified. The report contains no secrets or credentials.
