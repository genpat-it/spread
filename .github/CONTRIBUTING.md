# Contributing to SPREAD

Thanks for your interest in SPREAD. It is developed by the bioinformatics team of the Istituto Zooprofilattico Sperimentale dell'Abruzzo e del Molise "G. Caporale" and published here.

## Reporting a problem or an idea

Open an [issue](https://github.com/genpat-it/spread/issues/new/choose) and pick the template that fits: a bug, an idea, or a request the local assistant did not understand.

**Never include real sample data**: sample codes, names, places, dates of real cases or anything that could identify a person. Describe the data, use placeholders, or reproduce the problem with the [demo](https://genpat-it.github.io/spread/).

## Proposing a change

1. Fork the repository and branch from `develop`, where the development version lives (it is the one published on GitHub Pages); `main` holds the releases.
2. SPREAD is plain HTML, CSS and JavaScript: open `index.html` with a static server (see the README) to try the change, no build step is needed.
3. Keep the interface texts in English, Italian and French (`js/i18n/`).
4. Open a pull request against `develop`, describing the change and how you checked it.

Changes are reviewed by the team and may be ported to the internal repository from which the releases are made.

## Citing SPREAD

If SPREAD is useful in your work, please cite the [paper](https://doi.org/10.12834/VetIt.3476.23846.1) (see `CITATION.cff`).
