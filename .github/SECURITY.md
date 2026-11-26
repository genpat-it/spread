# Security policy

## Supported versions

Security fixes are made on the latest release (see [Releases](https://github.com/genpat-it/spread/releases)) and on the `develop` branch.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Report it privately instead:

* with GitHub's [private vulnerability reporting](https://github.com/genpat-it/spread/security/advisories/new), or
* by email to **bioinformatica@izs.it**.

Describe the problem, the version or Docker tag, and how to reproduce it. We will acknowledge the report, keep you informed while we work on a fix, and credit you in the release notes if you wish.

SPREAD runs in the browser and keeps the loaded data in the page; the optional `server.js` serves the application and proxies remote files. Reports about the proxy, the loading of files from urls and the handling of loaded data are especially welcome.
