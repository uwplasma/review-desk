# UW Plasma review desk

[Open the dashboard](https://uwplasma.github.io/review-desk/) for the current pull request queue across twelve public UW Plasma repositories. Select a pull request for its review status, dependencies, diff size, checks and evidence. The timing view shows how long CI jobs waited to start and how long they ran.

GitHub Pages serves the interface. A separate [refresh workflow](https://github.com/uwplasma/review-desk/actions/workflows/refresh.yml) collects public GitHub data every five minutes on a hosted runner. GitHub may delay scheduled jobs. The page shows the timestamp of its data and checks for updates while open.

The generated `data` branch holds one current snapshot. The application source lives on `main`. The collector uses the workflow's repository token and needs no personal credentials.
