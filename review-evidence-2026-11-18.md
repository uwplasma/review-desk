# Scientific review notes · 18 November 2026

The following measurements, references and test conditions come from the linked pull requests as they stood on 18 November. Each section links to the revision described. Later commits may change the results.

## vmex 515

[Optimize alpha residence after a short QA warm start](https://github.com/uwplasma/vmex/pull/515) · [Revision 3c7e830f](https://github.com/uwplasma/vmex/tree/3c7e830f114229f9f0c60e2931a13d3c3936cda1)

The shipped example at `e49c1e46` starts from a rotating-ellipse seed, runs a 10-evaluation QA least-squares warm start, then optimizes a smooth alpha residence score. The title and description previously claimed that no QA stage was used; that does not match the current script. Reliable direct optimization from a minimal seed without a QA stage remains an unmet objective.

The alpha stage differentiates 64 fixed births over 0.25 ms with 2000 RK4 steps, through the VMEX equilibrium, live Boozer spectrum and ESSOS guiding-centre orbits. It adds aspect and iota-floor penalties, uses three L-BFGS-B iterations, selects candidates using independent 2 ms hard losses, and checks fresh particles at 5 ms. `CONTROL=True` removes the alpha term from both the smooth cost and hard selection while retaining the same warm start, parameter space and geometry penalties. The code currently freezes one alternating m=1 combination; its treatment also needs review alongside #700's constrained-family correction.

Historical direct-seed results from the earlier version are retained here as context, not validation of the currently shipped warm-start workflow: three iterations gave mean holdout losses of 31.9% versus 34.0% for the iota/aspect control; four gave 30.9% versus 31.4%. Each result used two seeds of 400 particles at 5 ms, with about 2.3 percentage points of one-sigma uncertainty per seed. Most of the original improvement from about 82% losses came from lifting iota, and the remaining alpha-term gains were not established beyond sampling uncertainty. The historical 295 s timing likewise does not certify the current workflow.

A separate bounded study uses VMEX `d8791437` plus only #700's four core files at `85a1c85e`, ESSOS 0.22 and an already optimized NFP=2 pwO seed with minimum |iota|=0.50968. It has no QA stage and does not modify the shipped example. The 24-parameter particle stage uses 128 fixed births at s=0.3, a 0.5 ms escaped-residence window and 4000 RK4 steps, preserving the initial aspect and iota profile with penalties. Five accepted L-BFGS-B steps used 25 actual gradient evaluations: the configured maxfun=18 was exceeded while completing line search, then the run stopped at that limit rather than convergence. The particle-off control was stationary in one evaluation. Smooth risk fell from 0.10870029 to 0.09638549; doubling steps gives 0.09638090. Aspect changes from 6.08651 to 6.08801 and RMS iota-profile change is 2.63e-4, without the earlier large iota lift. A bounded local directional Taylor regime is observed, with the smallest differences becoming noise limited near 0.1% relative error.

Fresh physical marginal ensembles (4096 particles per design, adaptive 10 ms traces) give 28.91% control versus 28.17% candidate loss, within sampling uncertainty. Common random seeds do not create identical coordinates under field-dependent rejection sampling, so those raw differences are not paired estimates. An additional independent common-birth comparison uses 4096 genuinely identical birth coordinates, candidate physical-density importance weights (effective count 4091), adaptive tolerance 3e-8 and 16×16 Boozer modes. Its candidate-minus-control differences are:

| Horizon [ms] | Difference [percentage points] | Pointwise 95% paired interval |
| --- | ---: | ---: |
| 0.5 | -1.540 | [-2.349, -0.731] |
| 1 | +0.301 | [-0.560, +1.162] |
| 2 | +0.816 | [-0.009, +1.641] |
| 5 | +0.564 | [-0.243, +1.372] |
| 10 | +0.452 | [-0.350, +1.255] |
| 20 | +0.588 | [-0.217, +1.394] |

There are no failed trajectories; maximum relative energy error is 7.52e-5 in the common-birth traces. The fresh smooth score improves on both independent cohorts (11.76% and 8.95%), but the prompt hard-loss gain disappears by 1 ms. This demonstrates delayed prompt escape and an explicit horizon-generalization failure, not a low-loss design or a demonstrated long-time confinement improvement. The subsequent 2 ms audit fails that gate: 16,000→32,000 RK4 steps change the value by 0.88%, but the scaled gradient norm changes 1121.99→69.46, with 101.2% relative L2 change and cosine -0.166. Seven directional differences down to scaled step 1.95e-7 do not show a convergent Taylor regime (16.3% error at the smallest step). No 2 ms optimization was run; finer integration and sensitivity qualification remain necessary. A separate private adaptive-residence pilot retains the same functional, integrates its residence integral with Dopri8, locates continuous LCFS crossings and appends the post-escape contribution. Tolerances 1e-8→1e-9 change the 2 ms value 0.21721512→0.21721225 and the scaled gradient norm 80.49→77.90 (3.23% relative L2 change, cosine 0.9999975). This improves on fixed RK4 sensitivity but still lacks a converged gradient certificate: the best tested coarse-tolerance FD error is 4.65%. Initial-outside and stationary/no-crossing checks pass; the actual cohort has transverse escapes, while exactly grazing events remain unqualified. No adaptive optimization or public integrator change is claimed. The outstanding goal of robust QA-free optimization from a minimal seed remains unmet. Keep open for the owner's review; no merge or closure is requested.

## vmex 583

[Prepare the history slimming rewrite (do not run yet)](https://github.com/uwplasma/vmex/pull/583) · [Revision 183d24f4](https://github.com/uwplasma/vmex/tree/183d24f4105ed2033edc64f85dd6cbf78613c2c6)

A prepared, measured, **not executed** history rewrite that shrinks a full clone from 43 MB to about 15–17 MB, plus the one-off script that performs it (`tools/rewrite_history.py`). Nothing has been force-pushed. The maintainer decides when to run it, after the open slimming, docs and lane PRs have landed.

Companion PRs in the same slimming lane: code dedupe, benchmarks/media/meta-tests, README/docs. Run this one last: the script refuses to finish if the kept branch tips would change, which happens only while the current tree still contains text the rules rewrite.

#### Why

Clone size is dominated by old versions of figures and data, not code:

| measured 2026-10-15 on `e98da7cc` | before | after (dry run) |
|---|---|---|
| full clone from GitHub (`git clone --bare`, pack on disk) | 43 MB | ~17 MB expected (GitHub repacks less tightly than `gc --aggressive`) |
| same repo, `git gc --aggressive` locally | 35.4 MB | 14.1 MB (main only) / 16.5 MB (main + `en/local_test`) |
| full clone via `file://` after aggressive gc | 36 MB | 14 MB |
| blobless clone (`--filter=blob:none`, with checkout) | 8.1 MB | 7.7 MB |
| commits on main | 3,670 | 3,651 (19 commits that only touched dropped media become empty and are pruned) |
| media/data blobs dropped | | 494–524 (depends on which branch tips are kept) |

`git filter-repo --analyze` breakdown of packed history: `docs/_static/figures` 19.6 MB (mostly old PNG/WebP versions of current figures), `examples/data` 3.3 MB (incl. a deleted 3 MB NCSX mgrid), `benchmarks` 2.4 MB, all Python history 7.3 MB, all Markdown/RST 1.9 MB. Old code history is cheap; old media is not.

**Squashing old history is not worth it.** Grafting `v0.1.0` as the root (dropping the 2,674 prototype commits before 2026-07-12) gives 13.9 MB instead of 14.1 MB: 0.2 MB for losing two thirds of the history and the `v0.0.x` tags. Recommendation: keep all code history.

#### What the rewrite does

1. Drops every blob whose path ends in `png webp gif jpg jpeg mp4 webm mov pdf nc npz npy h5 hdf5 pkl json csv svg` and that is not in the tip tree of a kept ref. Current figures and fixtures stay byte-identical; old commits simply lack superseded media.
2. Message rules (`--replace-message`): remove selected co-author and generation trailers; rename the C++ VMEC reimplementation and its organisation to neutral words; rename the agent-named branch prefix in merge messages.
3. Text rules (`--replace-text`) and a path rule: the same neutral renames inside historical files and file names, so no historical blob or path keeps those names.
4. Mailmap: one historical committer identity is replaced by the author identity.
5. Verifies the tip tree of `main` and of every `--keep` ref is unchanged; otherwise it exits non-zero.

The three rule files are held by the maintainer, outside the repository, so the names they remove are not committed here.

#### Runbook

Prerequisites: `git-filter-repo` (`brew install git-filter-repo` / `pip install git-filter-repo`), admin on `uwplasma/vmex`, a quiet hour (announce a merge freeze).

```console
### 0. Freeze: no merges. Every slimming/docs/lane PR that should be in the new history is merged.
###    `git grep` on main for the renamed names returns nothing (otherwise step 4 aborts).

### 1. Archive the old history (keeps every old SHA resolvable: GKX artifact provenance, papers, forks).
gh repo create uwplasma/vmex-history-2026 --public --description "Pre-rewrite history of uwplasma/vmex (read only)"
git clone --mirror https://github.com/uwplasma/vmex.git vmex-old.git
git -C vmex-old.git push --mirror https://github.com/uwplasma/vmex-history-2026.git   # refs/pull/* is rejected; harmless
gh repo archive uwplasma/vmex-history-2026 --yes

### 2. Save every open same-repo PR as patches (cross-repo PRs, e.g. #451, are left to their authors).
for n in $(gh pr list --state open --json number,isCrossRepository --jq '.[]|select(.isCrossRepository|not)|.number'); do
  gh pr view $n --json headRefName,baseRefName,title,body > pr-$n.json
  git -C vmex-old.git format-patch -o pr-$n "$(git -C vmex-old.git merge-base main refs/pull/$n/head)..refs/pull/$n/head"
done

### 3. Fresh bare clone; prune branches that should not survive.
git clone --bare https://github.com/uwplasma/vmex.git vmex.git
cd vmex.git
###    delete merged and stale branches (list: git for-each-ref --sort=committerdate refs/heads);
###    keep main, open-PR branches and en/local_test (NEOPAX installs vmex from it);
###    rename #540's branch out of the agent-named prefix first (gh api -X POST repos/uwplasma/vmex/branches/<old>/rename -f new_name=feat/tracing-particle-parameters).
cd ..

### 4. Rewrite (about 40 s) and verify.
python vmex/tools/rewrite_history.py vmex.git --keep en/local_test --keep <each open-PR branch> \
    --message-rules msg.txt --text-rules text.txt --mailmap mailmap.txt --path-rule <old>=<new>
###    prints: stripped blobs N; pack 35 MiB -> ~15 MiB; kept tip trees identical
git -C vmex.git log --all --format='%B%an%ae%cn%ce' | grep -ciE '<names>'      # expect 0
git -C vmex.git log --all --name-only --format= | grep -ciE '<names>'          # expect 0
cp vmex.git/filter-repo/commit-map commit-map-2026.txt                         # old -> new SHA, attach to the announcement

### 5. Push (the only destructive step). Temporarily allow force-push on main in branch protection.
git -C vmex.git remote add origin https://github.com/uwplasma/vmex.git
git -C vmex.git push --force --all origin
git -C vmex.git push --force --tags origin
###    restore branch protection; delete remote branches pruned in step 3:
###    git push origin --delete <branch> ...

### 6. Verify from a clean machine.
git clone https://github.com/uwplasma/vmex.git vmex-check && du -sh vmex-check/.git
pip install "vmex @ git+https://github.com/uwplasma/vmex.git@v0.11.10"   # tags resolve to rewritten commits
```

#### Effects

- **Open PRs from this repo** (#515, #518, #540, #545, #558, #562, #564, #570, #571, #575, #578 at the time of writing): their branches are rewritten with the rest, so they stay open and keep their diffs, but their commit SHAs change and review comments anchored to old commits become outdated. If a PR shows the whole history as its diff (GitHub sometimes caches the old merge base), close it and recreate it from the step-2 patches: `git checkout -b <branch> origin/main && git am pr-N/*.patch`.
- **Cross-repo PRs and forks** (#451 from hongkelu, and forks krystophny/vmex, hongkelu/vmex, plus the two old vmec_jax forks): unaffected on their side, but their history no longer shares SHAs with ours. Their authors rebase with the commit map: `git rebase --onto <new-main> <old-merge-base>`, or re-apply their commits as patches. **Never merge a branch that still contains old history**: it would bring every dropped blob back. Guard: `git merge-base --is-ancestor e98da7cc HEAD` (an old main SHA) must fail in any PR; add it as a one-line CI step for a few months if collaborators are active.
- **Dependents.** PyPI releases are unaffected (wheels/sdists do not reference git SHAs). GKX artifact JSONs record `vmex_commit` SHAs for provenance: those resolve in `uwplasma/vmex-history-2026` and map through `commit-map-2026.txt`. NEOPAX installs `vmex @ git+…@en/local_test`: the branch name survives (keep it in step 3). Any pin by SHA must move to the mapped SHA or a tag.
- **Tags.** All 46 tags (`v0.0.1`–`v0.11.10`, `golden-v1`, `assets-*`) are rewritten to the mapped commits and force-pushed under the same names. GitHub releases follow their tag names, so release notes and the asset tarballs that `tools/fetch_assets.py` downloads (`assets-20260812-nc`, `assets-20260812-wout-fixtures`, `assets-20260823-ncsx`, `golden-v1`) keep working: those downloads are release assets, not git objects. Zenodo/DOI snapshots keep the old SHAs; cite the archive repo for those.
- **GitHub server storage.** `refs/pull/*` (read-only, 850 MB including every PR head ever pushed) still pins old objects on GitHub's side. User clones do not fetch them, so the measured clone sizes above hold. To reclaim server space, ask GitHub Support to run a gc and drop cached views after the push.
- **Local clones.** Everyone re-clones. An old clone that pulls will see unrelated histories; `git fetch && git reset --hard origin/main` on a clean tree, or re-clone.

#### Tested

- Dry runs on three scratch clones (main only; main + `en/local_test`; main grafted at `v0.1.0`), numbers above. Forbidden-name counts in messages, author fields and paths after the rewrite: 0. HEAD tree check fires as expected while the current tree still has text the rules change.
- `ruff check tools/rewrite_history.py` clean; `tools/check_docs_prose.py` clean.

#### Left

- Run it (maintainer), after the companion PRs merge; re-measure and paste the real numbers here.
- Delete `tools/rewrite_history.py` in the first commit after the rewrite.

## vmex 585

[Research: B-spline Galerkin radial discretization for the 3-D solve](https://github.com/uwplasma/vmex/pull/585) · [Revision 4573ada5](https://github.com/uwplasma/vmex/tree/4573ada54456d966f156f9fa56f4fbad7be35d47)

**Draft research PR. Do not merge.** This PR answers one question with measurements: can VMEX's main 3-D fixed-boundary solve use a B-spline radial basis and stay fast, performant and differentiable?

Status: the prototype runs in 3-D with a prescribed current. The measured numbers and the verdict are below.

#### Verdict

Keep it as an opt-in research path. Do not make it the default, and do not drop it.

- **What works:**
  - The energy converges much faster in radial resolution.
  - Implicit gradients agree with finite differences to 1e-9.
  - Newton converges quadratically once the poloidal angle is fixed.
- **What blocks the default:**
  - It is 3-4x slower than VMEX at production-like size with dense linear algebra.
  - Near-axis iota on the 2.5% beta QA deck does not converge either (see Results).

#### Why

VMEX discretizes radially as VMEC does: R, Z and λ live on a full/half mesh, with finite differences in s. The scheme is first order near the axis. For example, iota at ρ = 0.1 on one deck is 0.188, 0.176 and 0.166 at ns = 65, 129 and 257. The formerly quoted DESC value 0.166 is not a validated matched-profile reference; see the corrected comparison below. Mirror near-axis convergence has a separate unresolved gate (#211).

VMEX already has local B-splines and axis-regular amplitudes in `vmex/core/radial_basis.py`. Polish and the strong-force oracle use them, but the main solve does not.

#### Design

##### Representation

This reuses `HighOrderEquilibriumState` and `BSplineBasis`, so there are no new state types.

- Each Fourier amplitude is X_mn(ρ) = ρ^|m| q_mn(s), with q_mn a clamped B-spline in s = ρ² (degree 3, 5 or 7).
  - Axis regularity holds by construction for every m. There are no axis constraint rows.
  - This differs from GVEC's derivative constraints at ρ = 0. Those are imposed per m (`sbase.F90`), and the boundary-condition type is clipped at m > p.
- The unknowns are:
  - R_cos, Z_sin and L_sin coefficients (stellarator-symmetric decks);
  - the χ'(s) coefficients for NCURR = 1.
- The fixed boundary is the last clamped coefficient of R and Z, held at the boundary value. The λ (0,0) gauge is removed.

##### Energy and force

The discrete functional is

L = ∫ (B²/2μ0 − p(s)) dV − (4π²/μ0) ∫₀¹ Ī(s) χ'(s) ds,  with Ī = signgs μ0 I_tor/2π (VMEC's `icurv`).

- B uses the strong-force conventions: √g B^θ = 2ρ(χ'/nfp − Φ'λ_ζ) and √g B^ζ = 2ρΦ'(1 + λ_θ).
- The current term is a Legendre transform. Because δW/δχ'(s) = signgs 2π I(s), stationarity in χ' is the current constraint.
  - No Picard loop on iota is needed. GVEC uses such a loop (`run.py`, "picard_current").
  - The current constraint is also convex in χ' at fixed geometry.
- Quadrature uses p + 3 Gauss-Legendre points in s per knot span, as in GVEC, on a uniform θ, ζ grid. The default grid is 4·max(m) + 4 by 4·max|n| + 4, about GVEC's fac_nyq = 4.
  - Every node is off the axis, and (B²/2μ0)|√g| dρ = (ρ/μ0)(…)/|√g| ds is finite there.
- The force is −∇L, computed by JAX reverse mode. This gives the exact Galerkin force of the discrete energy, with no hand-derived variations (GVEC hand-derives them in `mhd3d_evalfunc.F90`).

##### Hessian

The energy is L = Σ_p w_p f(A_p x), with A the linear synthesis, so the exact Hessian is Aᵀ diag(w f″) A.

- f″ is a 10×10 matrix per point, computed by JAX.
- Each block is contracted angle-first, then radially. The cost is O(Nq · mn² · (Nang + nb²)) per component pair.
- This is checked against `jax.hessian` to 1e-13 relative on li383.

##### Solver

The prototype uses a Levenberg-damped Newton method on the eigendecomposed, diagonally scaled Hessian.

- Negative curvature is reflected.
- A step is accepted when the Jacobian stays nested and either the energy or the scaled force norm decreases.

##### Initial guess

The initial guess is VMEC's own: the `profil3d` interior guess plus the `guess_axis` retry. It is lifted with `lift_high_order_state`.

##### Output

`sample_high_order_state` already puts a native state on any legacy full mesh, and the polish wout path already writes one. The independent force oracle `certify_strong_force` measures the continuum force of both discretizations on the same grid.

#### Results

All runs are on the laptop, which was shared and loaded. "Warm" means the compile step is excluded. The oracle column is `certify_strong_force`, window s in [0.1, 0.99], <|F|>/<|grad B²/2μ0|>.

##### Solov'ev-type deck (`input.solovev`, mpol 6, same angular grid)

- **VMEX:** W − W∞ falls as ns⁻² (5.06, 1.30, 0.33, 0.083 J at ns = 17, 33, 65, 129). The axis converges as ns⁻¹.
- **Spline:** two cubic spans (69 unknowns) give W within 1e-10 of the extrapolated FD limit.
- Newton–KKT takes 7 steps and 0.04 s warm (8 quintic spans). The oracle force is 8.9e-5.

##### li383_low_res (3-D, NCURR = 1, mpol 4, ntor 3)

| | Unknowns or ns | Warm time | iota(s = 0.01) | Oracle force |
|---|---|---|---|---|
| VMEX | ns = 16 | 0.46 s | 0.4047 | 0.32 |
| VMEX | ns = 129 | 4.0 s | 0.4024 | 0.33 |
| Spline ladder 2→4→8 spans | 913 | 1.4 s | 0.4039 | 0.35 |

The oracle force is about 0.3 for both methods, so this deck is limited by Fourier truncation.

##### LandremanPaul2021_QA_beta2p5_bootstrap (the deck behind the validation-page iota note; mpol 7, ntor 6)

| | ns or spans | W (J) | iota(s = 0.01) | Oracle force | Warm time |
|---|---|---|---|---|---|
| VMEX | 65 | 7821411.47 | 0.1877 | 0.029 | 6.8 s |
| VMEX | 129 | 7821402.32 | 0.1764 | 0.022 | 19.5 s |
| VMEX | 257 | 7821399.90 | 0.1665 | 0.023 | 53 s |
| Spline | 4 (2117 dofs) | 7821399.47 | 0.1597 | 0.039 | 14 s |
| Spline | 8 (3133 dofs) | 7821399.35 | 0.1546 | 0.029 | 45 s |
| Spline | 16 (5165 dofs) | 7821399.33 | 0.1499 | 0.024 | 194 s |

- The spline energy converges, with steps of 0.12 J and then 0.015 J. At 4 spans it is already below VMEX at ns = 257.
- **Near-axis iota does not converge with uniform knots.** It drifts down by about 0.005 per halving, with no accepted resolved DESC reference for this matched-profile comparison. Uniform knots put only one span inside s < 0.0625.
- The likely cause is the near-axis behaviour of the bootstrap current profile (`cubic_spline_ip`) against χ' as a spline in s, which has no √s freedom. This is not verified. Axis-graded knots, or χ' in ρ, are the next experiment.
- The spline runs here were a single Newton solve per resolution, not the ladder. On li383 the ladder cuts the warm time about 4x.

##### Gradients

On li383 (4 spans), the implicit d iota(s = 0.01)/d RBC(0,1) and d/d ZBS(0,1) agree with central differences to 1e-9 relative (h = 1e-5). Before the angle condition was fixed they agreed only to 1e-4.

#### The poloidal-angle gauge (the main finding)

The discrete energy is nearly flat along poloidal relabelings, with Hessian eigenvalues of about ±1e-7 relative, and those directions still move the strong force. Four approaches were tried:

| Approach | Result |
|---|---|
| Unconstrained Newton | Converges linearly; 80 steps for oracle force 3e-4 |
| Eigenvalue cutoff | Force stalls at 1e-2 |
| Freezing the tangential displacement | Energy +4e-6 |
| Equal-arc constraint | Initial guess far from feasible; non-nested |

**The fix** is VMEC's own spectral-condensation condition (`forces.constraint_force`, weight m(m−1), rows for m ≤ mpol−2), imposed as a hard constraint and solved by Newton–KKT. The VMEC interior guess satisfies it to 1e-13. Convergence becomes quadratic: 7 steps on Solov'ev, against 80 or more before. The energy lands within 5e-11 of the unconstrained minimum, and the force is better (8.9e-5 against 3e-4).

#### Cost model (dense prototype)

N = 3 · mnmax · (spans + p) unknowns.

| Item | Cost | Notes |
|---|---|---|
| Energy plus gradient | ~ 10 · Nq · mnmax · Nang flops | Nq = spans · (p + 3) |
| Hessian | ~ 55 · Nq · mnmax² · (Nang + nb²) | 55 component pairs |
| Dense eigh | O(N³) | |

- li383_low_res (mpol 4, ntor 3, 4 spans): N = 617, and one Newton step takes well under a second.
- A production deck (mpol = ntor = 12, mnmax = 288, 16 spans) gives N ≈ 18,000. That is too large for a dense factorization.
- The Hessian is block-banded in the radial index, with bandwidth p and blocks of size 3·mnmax. Two routes follow:
  - a banded block Cholesky, about nb · (p · 3 mnmax)³;
  - Newton–Krylov, with that block-banded Hessian (or its per-mode radial diagonal, which is GVEC's and VMEC's preconditioner) as the preconditioner.

#### Risks

1. **Poloidal-angle gauge.** The chosen spectral-condensation condition gives quadratic convergence in the reported prototype KKT controls; its continuum effects remain an open check. For comparison, GVEC does not fix the gauge at all, and its final angle depends on the descent path.
2. **Dense linear algebra does not scale to production resolution.** See the cost model above.
3. **Scope.** The prototype covers fixed boundary, LASYM = F and GAMMA = 0 only. Free boundary needs the vacuum energy coupling at the edge coefficients, which is not attempted here.

#### Ownership and coordination

- This PR adds one module only: `vmex/core/spline_solve.py`.
- It does not touch `solver.py` or `preconditioner.py` (Lane E), or `implicit.py` and `optimize.py` (Lane C).
- Implicit-adjoint compatibility follows from the formulation, since the force is ∇L:
  - the equilibrium Jacobian is the symmetric Hessian above;
  - the adjoint solve reuses the same factorization.
  - A Lane C hook would be `jax.grad` of an objective through `unpack_state`, with an implicit-function rule that solves against `spline_hessian`.


#### Follow-up: near-axis iota on the 2.5% beta QA deck (decisive experiment)

The question was whether bunching knots toward the axis, or changing the spline degree, improves near-axis iota convergence. The then-assumed DESC reference 0.166 was subsequently withdrawn.

**Answer: no.** Every configuration converges at roughly first order in the number of spans, towards about 0.146-0.150. Mid-radius iota does converge, to 0.3965-0.397 in every run.

##### iota at s = 0.01 (ρ = 0.1), with χ' enforced at every node

All runs use the knot ladder 4 → 8 → 16 spans.

| Knots | Degree | 4 spans | 8 spans | 16 spans | Oracle force at 16 spans |
|---|---|---|---|---|---|
| Uniform in s | 5 | 0.1622 | 0.1537 | 0.1498 | 0.024 |
| Uniform in ρ (s = ρ_u²) | 5 | 0.1627 | 0.1517 | 0.1485* | 0.023 |
| Uniform in ρ | 3 | 0.1876 | 0.1681 | 0.1535* | 0.054 |
| VMEX, ns = 65 / 129 / 257 | | 0.188 | 0.176 | 0.1665 | 0.023 |

\* Stopped at the 80-iteration cap with a KKT residual of about 1e-4. Every other spline run converged to a KKT residual of 1e-10 or below.

- With uniform-s, degree-5 knots, the successive differences are 0.0085 and then 0.0039. The ratio is about 2.2, which is first order, and Richardson extrapolation gives about 0.146.
- **The VMEX sequence is also first order.** Its differences are 0.012 and 0.0099, and the same extrapolation gives about 0.157, not 0.166. The agreement between VMEX at ns = 257 and DESC may therefore be a coincidence of resolution. DESC's L, M and N for its 0.166 need to be recorded before it is treated as the reference.

##### Diagnosis

1. **The current constraint was enforced weakly.**
   - On the 4-span ρ-knot solution, the enclosed current I(s) = ∮B_θ/μ0 matched the prescribed current within 1% for s ≥ 0.04. It was off by 15% at s = 0.006 and by 88% at s = 0.001, because the Legendre term only enforced the projection onto the χ' spline.
   - **Fix:** χ' now takes one value per radial quadrature node, so the current constraint holds at every node, as in VMEC and DESC. This is commit `Enforce a prescribed current at every radial node`. Gradients still agree with finite differences to 1e-9.
   - **This did not change the drift:** 0.1644 became 0.1627 at 4 spans, and 0.1511 became 0.1517 at 8 spans. So the weak constraint was a real defect, but not the cause.
2. **Rate.** The observed first-order trends could reflect unresolved basis regularity, coordinate-gauge effects, profile sampling or insufficiently converged roots. These degree/grading experiments do not isolate the cause.
   - The leading hypothesis is an odd-in-ρ (√s) component in the m = 0 amplitudes at finite β with this current profile. ρ^|m| q(s) excludes such a component by construction, as do Zernike polynomials.
   - The second suspect is VMEC's angle condition near the axis (its `rcon0 = s·rcon_edge` term). Iota is gauge invariant in the continuum, but this is not tested in the truncated basis.

##### Next experiments (not run)

1. **Odd powers in ρ.** Let q depend on ρ (amplitude ρ^m q(ρ)). Improved convergence would motivate testing near-axis regularity; it would not establish physical nonanalyticity without stationary roots, matched fields and independent continuum convergence.
2. **A gauge-free control:** the same deck with the unconstrained (slow) Newton at 8 spans.

The banded/Krylov solver and the SOLVAX PR were conditional on near-axis convergence, so they are not started.

#### Follow-up 2: odd powers of ρ, and a DESC reference

##### Odd powers of ρ (`make_spline_plan(..., rho_basis=...)`, experimental)

In this option the geometry and λ are ρ^|m| q(ρ), with q a B-spline in ρ. That admits odd powers of ρ, which ρ^|m| q(s) and Zernike polynomials exclude. Profiles stay in s, and χ' still takes one value per node.

| Basis | 4 spans | 8 spans | 16 spans |
|---|---|---|---|
| q(ρ), degree 5 | **0.1534** | 0.1483* | 0.1492* |
| q(s), degree 5 (from above) | 0.1622 | 0.1537 | 0.1498 |

\* Stopped at the 120-iteration cap: KKT residual 1e-4 at 8 spans and 4e-3 at 16. Newton struggles with this basis.

- At 4 spans (converged), the odd-ρ basis already gives the value that the s-basis only approaches at first order (extrapolated 0.146–0.150).
- This supports the hypothesis that the equilibrium has a near-axis component odd in ρ, which the standard regular basis can only approximate at first order. It is suggestive, not proof, because the refined odd-ρ runs are not converged.
- Mid-radius iota is unchanged at 0.3965.

##### DESC on the same deck (DESC 0.17.3)

- **Setup:** the boundary is converted with `ptolemy_identity_fwd`. Pressure and the net toroidal current I(ρ) are `SplineProfile`s sampled from VMEX's own profile functions (101 points).
- **Sign check:** |iota(ρ = 0.5)| = 0.3972, matching VMEX, so the sign and normalization are right.

| L, M, N | iota(ρ = 0.05) | iota(ρ = 0.1) | iota(ρ = 0.2) | <\|F\|>/<\|∇B²/2μ0\|> |
|---|---|---|---|---|
| 8, 8, 6 | 0.2009 | **0.2132** | 0.2571 | 3.9e-3 |
| 12, 12, 8 | running | | | |

- At L = M = 8, DESC is well above every other estimate (0.213 against 0.15–0.19).
- The higher resolutions (L = M = 12, 16, 20, 24) are running, but slowly on the shared machine. This table is updated as they finish.
- Unless DESC moves strongly down as L grows, "0.166" is not a converged DESC value for this deck. The source of that number (its resolution and profile setup) is unknown.

#### What is left

1. **Near-axis iota on the bootstrap QA deck.** Try axis-graded knots (GVEC option 2, ρ = ρ_u²) and the current profile's near-axis form. This decides whether the method fixes the problem it was meant to fix.
2. **Scaling.** Replace the dense KKT with a block-banded solve, or Newton–Krylov with the per-mode radial preconditioner. Use the knot ladder by default.
3. **Integration:**
   - wout export through `sample_high_order_state` / `polished_wout_state`;
   - `LASYM = T`, `GAMMA ≠ 0`;
   - free boundary, which needs vacuum coupling at the edge coefficients.
4. **Exact 3-D check** against the closed-form equilibria of the analytic benchmark (#578).

#### Milestones (original plan)

1. Axisymmetric and Solov'ev order of convergence in knots, against VMEX in ns.
2. 3-D fixed boundary: li383_low_res and nfp2_QA, comparing energy, near-axis iota, oracle force and wall time at equal force error.
3. Gradients against finite differences.
4. A verdict: default, option, or drop.

#### References

- Hindenlang, Plunk and Maj, PPCF 67 045002 (2025), arXiv:2410.17595 (GVEC).
- Hirshman and Whitson, Phys. Fluids 26 3553 (1983).
- Hirshman and Breslau, Phys. Plasmas 5 2664 (1998) (spectral condensation).
- Dudt and Kolemen, Phys. Plasmas 27 102513 (2020) (DESC, Zernike basis).
- Lewis and Simon, J. Comput. Phys. 1990 (axis regularity).


#### Regression and repository-policy follow-up

The three original spline regressions now live in the existing `tests/test_strong_force.py`; the separate proposed test module and its manifest row are removed. Additional checks cover polynomial rho-basis values/derivatives, prescribed-current normalization and node-profile/energy roundtrip, and actual two-level stationary refinement with fixed boundaries.

The required preflight passes 71 affected tests, 45 repository guards, strict documentation/static checks, and 264/266 changed executable lines (99.2%). These checks qualify the stated implementation paths; continuum force accuracy, three-dimensional current closure, axis/gauge behavior and production performance remain research gates.

## vmex 594

[Add a helium residence objective](https://github.com/uwplasma/vmex/pull/594) · [Revision 23133f53](https://github.com/uwplasma/vmex/tree/23133f5379573a25343353f1bc6dee5fc756add7)

Add `HeliumAshObjective`, a least-squares adapter for ESSOS's source-weighted helium occupation. It uses a fixed positive reference, returns nonfinite values for invalid responses, and differentiates only the supplied callback's traced dependencies.

The flat example optimizes diffusion in a manufactured slab with fixed geometry, source and boundary conditions. It now supplies an explicit reverse-mode autodiff Jacobian to SciPy; its bounded diffusion solution and normalized occupation are unchanged. All 21 objective regressions now live in the existing `tests/test_problem.py`; the added test module is removed, and its coverage remains in the fast lane and the existing problem module's primary parity lane. No new test, validation or generated artifact file remains in the PR.

Requires [ESSOS #167](https://github.com/uwplasma/ESSOS/pull/167), currently open at `1fca4560`; released ESSOS 0.22 does not contain `essos.ash`. This stays draft until the dependency is available through a supported installation and CI exercises the real integration cases. The callback API passes against that pinned feature source.

The flat-example and regression-consolidation validation at `cf6edbe9`: incremental preflight against `630acf3d` passes all 98 tests in the complete problem/example modules (one declared skip), 45 guards, Ruff, mypy and documentation prose. All seven real ESSOS cases pass, including the flat example with its autodiff Jacobian. Independent coverage against main remains 39/39 changed production executable lines, or 100%. Production source and documentation are unchanged from the earlier qualification of 480 affected tests (51 skips) and strict Sphinx. A broad 30-module rerun was interrupted at its bounded budget after 146 passes and 53 skips; that attempt is incomplete and is not claimed as a passing full closure.

The hosted manifest check exposed duplicate primary ownership after consolidation: `test_problem.py` had both `pr-parity-d` and `pr-parity-c2`. The follow-up retains the existing single `pr-parity-d` owner, together with `pr-fast`, the full-suite lane and CPU/GPU/finite-difference classifications. It removes no cases and changes no production source. Required incremental static preflight passes all 45 guards, Ruff, mypy and prose; the complete problem and manifest modules pass 66 tests with one declared skip, including the collected-suite ownership validator. Hosted checks at the new head remain pending.

This is a manufactured coefficient/control example, not a stellarator helium-exhaust or kinetic shape-optimization result.

## vmex 804

[Scalar optimization examples: one problem per resolution, subproblem() per stage](https://github.com/uwplasma/vmex/pull/804) · [Revision f9e25865](https://github.com/uwplasma/vmex/tree/f9e25865beddbef22d5c3ccdb1f8b26dd979f8dd)

The seven scalar examples (QA/QI/QP_optimization_scalar and the four *_finite_beta_scalar) built a new VmecProblem at every max_mode stage. The decision vector changes length between stages, so every jitted value-and-gradient graph was traced and compiled again, although MINIMUM_MPOL keeps the equilibrium shapes the same. They now do what QA_optimization.py does: stages that share a resolution use one problem built at the group's largest max_mode, and each stage is `problem.subproblem(max_mode=..., x=x)`.

All seven, main against this branch, with MAXITER capped at 3 per stage and the final check at ns 31 and ftol 1e-10. The persistent compile cache was off. "Compile" is the sum of the "Value and gradient ready" times.

Laptop (M4, 2 threads, load 100 to 120), QA_optimization_scalar with MAX_MODES [1, 2, 3]:

| | main | this branch |
|---|---|---|
| compile | 103.0 s (3 builds) | 47.4 s |
| total CPU | 219 s | 148 s |
| wall | 197 s | 111 s |

Office CPU (x86, 8 threads, load 33 to 60), the other six with their shipped MAX_MODES:

| example | compile main / branch | CPU main / branch | wall main / branch |
|---|---|---|---|
| QI_optimization_scalar | 170.5 / 177.9 s | 693 / 561 s | 328 / 362 s |
| QP_optimization_scalar | 112.1 / 82.7 s | 681 / 635 s | 277 / 272 s |
| QA_optimization_finite_beta_scalar | 142.2 / 79.3 s | 582 / 429 s | 254 / 165 s |
| QH_optimization_finite_beta_scalar | 125.8 / 67.0 s | 629 / 463 s | 246 / 171 s |
| QI_optimization_finite_beta_scalar | 191.4 / 100.1 s | 841 / 628 s | 372 / 274 s |
| QP_optimization_finite_beta_scalar | 88.7 / 67.7 s | 555 / 429 s | 177 / 152 s |

Per-stage costs agree to at least 10 digits in every example, and every final check prints the same objective values. QI_optimization_scalar gains nothing. Its two stages (max_mode 1 and 3) share one resolution, so the single problem is built at max_mode 3 and that one compile costs about as much as the two separate ones. Its wall time went up by 10% while CPU went down by 19%, which is within the load noise on that machine.

GPU: office RTX A4000, float64, persistent cache on. QA_optimization_finite_beta_scalar with the same caps, with this PR applied together with #805, #807 and #810:

| | main | this branch |
|---|---|---|
| total wall, cold | 175.0 s | 80.7 s (cache already warm from the main run) |
| total wall, warm | 86.3 s | 72.1 s |
| value-and-gradient compile, warm | 38.7 s | 25.6 s |
| peak device memory | 585 to 592 MB | 585 to 592 MB |

The stage costs on the GPU (1.420177353693e-01, then 5.8062769718e-02 on main and 5.8062769745e-02 on this branch) match the CPU runs to 1e-10. The final QS is 5.9544e-02 on both devices.

## vmex 807

[Anchor least-squares trial points only where the Jacobian is taken](https://github.com/uwplasma/vmex/pull/807) · [Revision 9bf10e08](https://github.com/uwplasma/vmex/tree/9bf10e0888bb05deb07199b2ed3dfda8cb05bf22)

`least_squares` calls the residual at every trial point, and the residual ran the fixed-point anchor (`implicit._refine_fixed_point`), although only accepted points are differentiated. With this change `VmecProblem.residual` scores the host solve as it is, and `residual_jac` anchors the point before differentiating it. The solve is a memo hit there. If the anchor stalls far from the root, the Jacobian returns the failure Jacobian, where the residual used to return status 3. `value_and_grad`, the scalar lanes and `equilibrium_from_x` still read the anchored state. `FunctionProblem.residual_and_jac` now takes the Jacobian first, and a scored residual at a point that is already anchored reuses that state.

Refinement share on current main, from the implicit counters (solve + Jacobian + refinement host time):

| example, machine | trials (nfev / njev) | refinement share | GCROT replays |
|---|---|---|---|
| QA_optimization, laptop M4 2 threads | 45 / 39 | 37% | 0 |
| QA_optimization, office x86 8 threads, warm | 45 / 39 | 30% | 0 |
| QI_optimization, office x86 8 threads, warm | 105 / 79 | 18% | 0 |

The 88% of the older QI profile does not reproduce. Each refinement is 3 or 4 block Newton steps, and the GCROT replay never ran.

Effect of this PR (warm compile cache):

| | refinements main / PR | refinement time main / PR | least_squares wall main / PR | final objective main / PR |
|---|---|---|---|---|
| QA, laptop CPU (CPU seconds, load 100 to 140) | 43 / 37 | 66.7 / 40.5 s | 96.5 / 84.4 s CPU | QS 3.485478e-05 / 3.357942e-05 |
| QI, office CPU, PR alone | 103 / 81 | 65.9 / 60.5 s | 352 / 396 s | QI 1.694976e-03 / 1.190321e-03 |
| QA, A4000 float64, PR in the stack with #804, #805, #810 | 43 / 37 | 35.1 / 32.4 s | 85.3 / 80.2 s | QS 3.485478e-05 / 3.357942e-05 |

The anchor is skipped exactly on the rejected trials (6 of 45 on QA, 26 of 105 on QI). Scored residuals now sit 1e-7 to 1e-6 in |F| from the root, so the optimizer takes a slightly different path. On QI that path ends at a better objective with 84 Jacobians instead of 79, and its wall time is 12% longer, so this PR does not shorten the QI run end to end. On the A4000 the final objectives match the CPU runs to all printed digits, for main and for the PR. The GPU QA run peaks at 568 to 579 MB of device memory, against 578 MB on main.

GPU (office RTX A4000, float64, shared with another job at 100% utilisation on the other card): the jitted `jax_value_and_grad` compiles and runs on `cuda:0`, and its value and gradient match the CPU result to 1e-14. QA_optimization total wall time, cold / warm: main 243 / 143 s, stack 167 / 139 s. The office CPU with 8 threads gives main 190 / 139 s on the same example, so the GPU does not beat the CPU here. The implicit gradient path stays on the CPU on purpose (`resolve_implicit_device`), and the GPU only runs the forward solves.

Tests: the new `test_least_squares_trials_defer_the_anchor_to_the_jacobian`, plus `tests/test_optimize.py`, `test_refine_staging.py`, `test_trace_budgets.py`, `test_implicit_grad_fd.py` (which includes the frozen-path FD checks) and `test_problem.py`: 123 passed and 3 skipped locally. One test failed under laptop load 140: `test_problem.py::test_compile_methods_prime_the_requested_path_and_report_progress`, which counts heartbeat lines around a 0.03 s sleep. It passes on a quiet office core.

## vmex 811

[Linearize the raw block system operator once](https://github.com/uwplasma/vmex/pull/811) · [Revision 8fdfd917](https://github.com/uwplasma/vmex/tree/8fdfd917c453b65c195453a858087e096707da10)

`_raw_block_system` defined its operator as `jax.jvp` of the raw residual at `z_star`. Every use of that operator traced the residual again: the colored probes, the residual check after the block solve, and each matvec site of the certifying GMRES. The operator is now `jax.linearize` of the residual, built once per system. The probes, the block solve check and the GMRES apply the stored linear map, so the residual is traced once per system and the primal is not recomputed inside the solver loops.

The Jacobian is unchanged: on the QA problem below, `|J|` agrees to 1e-14 relative and the backsolve takes the same 1699 Krylov iterations.

Measured with `QA_optimization.py`'s problem at max_mode 3 (ns 31, mpol = ntor = 5): one `residual_and_jac` at x0, then four at random nearby points. Laptop M4, 4 threads, load 14 to 26, one run each in sequence:

| | main | this PR |
|---|---|---|
| first call, cold cache | 23.6 s | 15.3 s |
| first call, warm cache | 8.4 s | 5.0 s |
| `jacobian_rows_block` trace, warm | 4.4 s | 1.4 s |
| `jacobian_rows_block` compile, cold | 9.3 s | 5.6 s |
| next four calls, warm | 5.4 s | 5.3 s |

Steady-state calls do not change; the gain is in tracing and compiling the first Jacobian of each problem.

Office CPU (x86, 8 threads, load 14 to 24), same problem, main and this PR interleaved, one cold round then three warm rounds:

| | main | this PR |
|---|---|---|
| first call, cold cache | 41.8 s (compile 38.5 s) | 49.8 s (compile 47.8 s) |
| first call, warm cache, three rounds | 24.3, 20.8, 22.3 s | 19.3, 20.8, 19.0 s |
| traced time per process, warm | 14.6, 12.6, 13.2 s | 10.6, 11.9, 10.3 s |
| next four calls, warm | 13.3, 12.0, 13.6 s | 13.0, 11.3, 13.6 s |

On office the warm first call is 2.7 s (12%) shorter, the cold one is 8 s longer in the single cold round (XLA:CPU compiles the linearized graph more slowly on x86 than on the M4), and steady calls do not change.

Whole examples on office CPU, one run each at load 30 to 36 (the run-to-run spread on this machine is larger than these differences):

| | main | this PR |
|---|---|---|
| QA_optimization, warm | 140 s, CPU 513 s | 173 s, CPU 654 s |
| QI_optimization, cold | 578 s, CPU 2269 s | 658 s, CPU 2482 s |
| QI_optimization, warm | 518 s, CPU 2254 s | 503 s, CPU 2115 s |
| final QS (QA) | 3.485478e-05 | 3.485478e-05 |
| final constructed QI | 1.361e-03 | 1.670e-03 |

The QI optimizer path moves with round-off (see #812), so its final value is not a check on this change; the Jacobian check above is.

This is a small gain in warm tracing and a loss in cold compile on x86. I do not think it is worth merging on these numbers; it stays a draft so the measurement is on record.

Tests: `test_implicit_multi_rhs.py`, `test_refine_staging.py`, `test_trace_budgets.py`, `test_freeboundary_implicit.py`, `test_implicit_grad_fd.py` (frozen-path FD), `test_implicit_grad.py` and `test_device.py` pass locally (157 passed, 27 skipped).

## vmex 812

[QI example: solve trials to FTOL 1e-10 and let the anchor finish them](https://github.com/uwplasma/vmex/pull/812) · [Revision 729219de](https://github.com/uwplasma/vmex/tree/729219de46c77538fa4d85ee50703277cbd33751)

`QI_optimization.py` solved every optimizer trial to FTOL 1e-12. Every trial is then Newton-refined by the implicit anchor to a force residual below `refine_tol` = 1e-10 before it is scored or differentiated, so the last decades of the forward solve are replaced by the anchor anyway. This sets `STAGE_FTOL = 1.0e-10`. The anchor takes the trial from a median |F| of 3e-6 instead of 3e-7. That costs one more Newton step on some trials, and no anchor stalled or missed its tolerance.

Office CPU (x86, 8 threads, JAX 0.12, float64), same session, other jobs on the machine:

| QI_optimization.py | FTOL 1e-12 (main) | FTOL 1e-10 | FTOL 1e-8 |
|---|---|---|---|
| wall, cold cache | 578 s (load 24) | 458 s (load 20) | 506 s (load 22) |
| wall, warm cache | 518 s (load 35) | 352 s (load 31) | 322 s (load 16) |
| CPU time, warm | 2254 s | 1755 s | 1745 s |
| solver iterations | 56635 | 20011 | 5273 |
| solve / refinement / Jacobian, warm | 212 / 92 / 160 s | 69 / 85 / 145 s | 21 / 102 / 146 s |
| anchor Newton steps | 348 | 423 | 502 |
| anchors stalled or above 1e-10 | 0 | 0 | 0 |
| Jacobians | 82 | 81 | 86 |
| final constructed QI (fine-grid validation) | 1.361e-03 (1.216e-03) | 1.657e-03 (1.462e-03) | 1.935e-03 (1.710e-03) |

A cold pair on the laptop (M4, 4 threads) ran at load 88 and 108 from CI runners and does not confirm the office gain: main 477 s wall and 464 s CPU (34979 solver iterations, 294 anchor steps, 73 Jacobians, final QI 2.417e-03), FTOL 1e-10 811 s wall and 573 s CPU (24008 iterations, 469 anchor steps, 79 Jacobians, final QI 2.059e-03). The warm pair, at load 216 and 144, gave 535 s wall and 420 s CPU against 370 s wall and 488 s CPU. On that machine the path differs from office from the first stage, and the extra anchor steps (294 to 469) cost more CPU than the solver iterations saved (34979 to 24008). The office numbers are the ones taken at moderate load; a quiet-machine repeat is still needed before this is marked ready.

Repeat on office CPU (load 19 to 36), main and this branch interleaved, one cold run then three warm runs each:

| | main | FTOL 1e-10 |
|---|---|---|
| wall, cold | 492 s | 394 s |
| wall, warm 1 / 2 / 3 | 419 / 426 / 411 s | 324 / 360 / 351 s |
| CPU time, warm 1 / 2 / 3 | 1811 / 1803 / 1749 s | 1691 / 1831 / 1785 s |
| solve / Jacobian / refinement, warm mean | 180 / 121 / 68 s | 67 / 145 / 85 s |
| final constructed QI (fine-grid validation), every run | 1.361e-03 (1.216e-03) | 1.657e-03 (1.462e-03) |

Warm wall time drops 18% and cold 20%, every run; CPU time is unchanged within 1%. The solver iterations it removes run on one thread, and the extra anchor steps and Jacobian work it adds run on eight, so the gain is in wall time only. The final value is reproducible for each setting and differs between them because the path differs.

At 1e-8 the anchor starts further out: the warm CPU time is the same as at 1e-10, the cold run is slower, refinement and Jacobian time grow as fast as the solve shrinks, and the run takes five more Jacobians. 1e-10 is the smaller step from the current setting for the same cost.

The final QI differs because the optimizer path differs, and on this example the path moves with round-off. Changes that should not affect the result give the same spread on the same machine: #811 (a re-association of the same linear operator) ends at 1.670e-03, and #807 ended at 1.190e-03. The aspect, iota, mirror and elongation limits are met in every run. `docs/reference/objectives.rst` quoted a single value, 1.4e-3; it now quotes the 1.2e-3 to 1.7e-3 range.

A4000 (float64, implicit work on the CPU as on main), interleaved, load 14 to 22:

| | main | FTOL 1e-10 |
|---|---|---|
| wall, cold | 623 s | 483 s |
| wall, warm 1 / 2 | 456 / 485 s | 362 / 380 s |
| CPU time, warm 1 / 2 | 1826 / 1962 s | 1620 / 1917 s |
| final constructed QI | 1.361159e-03 | 1.656502e-03 |

Laptop (Apple M4, 4 threads), interleaved, load 62 to 146 from CI runners:

| | main | FTOL 1e-10 |
|---|---|---|
| wall, cold | 238 s | 283 s |
| wall, warm 1 / 2 | 200 / 309 s | 377 / 345 s |
| CPU time, cold / warm 1 / warm 2 | 550 / 466 / 431 s | 624 / 509 / 551 s |
| solver iterations / anchor steps / Jacobians | 34979 / 294 / 73 | 24008 / 469 / 79 |
| final constructed QI | 2.417458e-03 | 2.058645e-03 |

On Apple silicon the trade goes the other way: the optimizer path differs from x86 from the first stage, the solver iterations saved are fewer (31% against 65%) and the extra anchor and Jacobian work costs more CPU than it saves. The example therefore keeps 1e-12 when it runs on an arm64 CPU and uses 1e-10 on x86 CPUs and on a GPU.

Not changed: QA, QH and QP. The same setting on `QA_optimization.py` (deck FTOL 1e-12 to 1e-10) cuts solver iterations from 11183 to 4894 and leaves the path unchanged to 7 digits (final QS 3.485478e-05 / 3.485479e-05), but the end-to-end gain is small because the solve is a smaller share there: laptop M4, 4 threads, load 5 to 13, cold 55.4 to 52.2 s and warm 37.1 to 34.3 s with equal CPU time; on office CPU, with a GPU job of mine sharing the host, warm went 140 to 166 s. I left QA out of this PR.

## vmex 815

[Serve the refinement and block Jacobian programs from the AOT executable cache](https://github.com/uwplasma/vmex/pull/815) · [Revision 876477b8](https://github.com/uwplasma/vmex/tree/876477b8e92e2618f8704002a87b023dc626ff65)

A warm optimization process re-traced and re-lowered the refinement and Jacobian programs on every start, although their executables were in the persistent cache: on office CPU that was 21 s of trace and lowering in a 140 s `QA_optimization.py` run, 8.2 s of it the trace of `jacobian_rows_block` alone.

This serves those programs from `core/aot.py`, the serialized-executable cache the solver lanes already use:

- `AotLane` keys a static argument by its `_aot_key()` when it has one. `ImplicitConfig._aot_key()` digests the same content `_canonical_config` keys on (boundary and profile values reach the lanes traced, so they are left out) plus the two adjoint tolerances.
- The four refinement programs (`_refine_step_core`, `_refine_probe_core`, `_refine_block_factor_core`, `_refine_block_step_core`) are AOT lanes. Their `cfg` is passed by keyword.
- The host block Jacobian runs in three programs: the tangents and the rows stay per-problem jits (they close over the objective terms), and the state responses, which are 85% of the trace, are a new per-config AOT lane `_evolved_tangent_lane`. Traced callers (`jax_residual_jac`, `jax_value_and_grad`) still use the one-program `jacobian_rows_block`.
- `AotLane` builds a program once when several threads ask for it at the same time (the probe and column threads did each compile it).

A version, source or shape mismatch, a tracer, or a disabled cache falls back to the jitted lane as before.

The Jacobian is unchanged: on the QA problem below `|J|` = 550.4287140120156 and the backsolve takes 1699 Krylov iterations on both.

`QA_optimization.py`'s problem at max_mode 3, one `residual_and_jac` at x0 then four at nearby points, laptop M4, 4 threads, main and this branch interleaved (load 43 to 71 from CI runners):

| | main | this branch |
|---|---|---|
| first call, cold cache | 37.2 s | 44.1 s |
| first call, warm, two rounds | 7.3, 8.4 s | 4.2, 2.5 s |
| traced time, warm | 4.2, 5.3 s | 1.1, 1.1 s |
| lowering, warm | 1.1, 1.3 s | 0.45, 0.45 s |
| next four calls, warm | 7.6, 6.4 s | 7.3, 6.7 s |

The cold run is slower once per machine and source version: the AOT build compiles without the persistent cache, and the split Jacobian compiles two programs instead of one.

`QA_optimization.py` on office CPU (x86, 8 threads, load 16 to 19), main and this branch interleaved, one cold run then three warm runs each:

| | main | this branch |
|---|---|---|
| wall, cold | 184.4 s | 192.9 s |
| wall, warm 1 / 2 / 3 | 120.5 / 121.8 / 119.6 s | 111.8 / 111.2 / 112.1 s |
| CPU time, warm 1 / 2 / 3 | 451 / 458 / 451 s | 432 / 432 / 434 s |
| trace / lower / compile+retrieval, warm mean | 11.6 / 3.6 / 4.6 s | 4.6 / 2.4 / 2.2 s |
| Jacobian host time, warm mean | 29.4 s | 21.7 s |
| final QS total, every run | 3.485478e-05 | 3.485478e-05 |

`QI_optimization.py`, same machine and session (load 15 to 26; the main runs are the ones of the #812 repeat, taken in the hour before):

| | main | this branch |
|---|---|---|
| wall, cold | 491.9 s | 507.3 s |
| wall, warm | 418.9 / 426.4 / 411.0 s | 392.1 / 396.5 s |
| CPU time, warm | 1811 / 1803 / 1749 s | 1677 / 1690 s |
| trace / lower, warm mean | 17.0 / 6.6 s | 7.6 / 4.0 s |
| Jacobian / refinement, warm mean | 121 / 68 s | 102 / 59 s |
| final constructed QI, every run | 1.361159e-03 | 1.361159e-03 |

The QI optimizer path, which moves with round-off, is unchanged here.

On QA, warm runs are 7.5% faster in wall time and 4% in CPU time and the cold run is 4.6% slower; on QI, warm runs are 6% faster in wall and CPU time and the cold run is 3% slower. The Jacobian's runtime also drops (29 to 22 s): the split programs run faster than the single one, which I did not take apart further.

Tests: `test_aot_lane.py` (two new: a static argument with `_aot_key` shares one executable; the config key ignores boundary values and follows tolerances and resolution), `test_implicit_multi_rhs.py`, `test_refine_staging.py`, `test_trace_budgets.py`, `test_optimize.py`, `test_implicit_grad_fd.py` pass locally.

## DKX 452

[Print a line at each solve phase; size route budgets from physical memory](https://github.com/uwplasma/DKX/pull/452) · [Revision 496ac496](https://github.com/uwplasma/DKX/tree/496ac496b91a872f445a32d6431d5b48e23f9700)

The recycled Krylov route printed nothing between the start of a solve and its result, so a cold compile looked like a hang (93 s of silence on an 8,068-unknown two-species deck in the review). The route now prints which route it took and why, the start of the preconditioner build, and the start of GCROT. The default route printer of `solve` is flushed, and so are the stall-escalation lines.

Memory budgets keep route choice apart from admission:

- `solver.memory_fraction` (case runs, the batched Er scan) and the batch chunk budget are fractions of physical RAM, as on main, read through one function (`coarse_precond._host_memory_bytes`) instead of two private sysconf readers. The first version of this PR moved them to available memory, which let another user's job change the route a deck takes.
- `auto` prefers the coupled preconditioner when its peak fits half of physical RAM, capped by the memory available at the call. On main the budget was half of the available memory.
- The coarse preconditioner guard keeps available memory, and never refuses less than 1 GiB. On office a 7 x 9 x 16 W7-X deck (`stFT9`, 3 MB of bands) read a 0.0 GiB budget while another job held the machine's memory, was sent to the one-shot checkpointed route and took 74.6 s warm instead of 0.4 s.

Cold run of the review deck (`geometryScheme4_2species_withEr_fullTrajectories` at 7 x 9 x 16 x 4), compilation cache disabled, 2 cores, load 68-73, timestamps from a wrapper:

```
[  2.8]  Beginning the main solve.  This could take a while ...
[  2.9] [dkx.solve] recycled Krylov route: legendre_blocks requires DKES trajectories: ...
[  3.0] [dkx.solve] building the coarse_triangle preconditioner ...
[ 16.6] [dkx.solve] GCROT on 8068 unknowns, 1 right-hand side(s); the first call in a process compiles ...
[ 18.2]  Done with the main solve.  Time to solve:    15.38 seconds.
```

The `stFT9` case again, on office CPU (8 threads, cache disabled, load 21-31) with the available-memory reading forced to zero: main 53.4 s cold and 38.4 s warm on the one-shot route, this branch 30.8 s cold and 0.4 s warm on the dense bands.

Tested: `tests/test_tier2_stall_escalates_instead_of_crashing.py`, `tests/test_tier2_memory_guard.py` and `tests/test_edge_helpers.py`, 115 passed on office CPU on this branch and on main before the 1 GiB floor (load 33-39, durations within a few seconds of main's), and the last two files again after it (76 passed, laptop). New tests: the case and batch budgets read physical RAM when available memory is low; the coupled choice follows physical memory until the build would not fit what is available; a small deck keeps its bands at a 0.0 GiB reading. `tests/test_speed_triangle_precond.py -k coupled` and `tests/test_benchmark_doc_claims.py` pass.

Main is merged in.

## DKX 465

[Store coarse factors in float32 where float64 bands fail the memory guard](https://github.com/uwplasma/DKX/pull/465) · [Revision e10a57d8](https://github.com/uwplasma/DKX/tree/e10a57d896c99ca888a621e870e9e55c4337f0af)

When the float64 coarse bands fail the memory guard, the coarse preconditioner fell back to the Schur-LU-only route, which regenerates the off-diagonal blocks on every application. It now first tries the same dense-row route with the rows stored in float32, if half the band bytes pass the guard. Each row is rounded only after its pins (the l = 0 rank-one pin, the Nxi_for_x mask pin, the floor) and its Schur update are formed in float64, and float32 rows are applied through their LU rather than an explicit inverse. The speed-triangle variant keeps its float64 path.

Measured on office CPU (8 threads, cache on, JAX 0.12, load 37-82 during the runs, so times are indicative): W7-X drift deck `filteredW7XNetCDF_2species_magneticDrifts_noEr` at 15 x 27 x 40 x 6, Fokker-Planck, RHSMode 1, GCROT with the coarse preconditioner, tol 1e-10. The memory budget was forced to the float64 band size (1.76 GiB), which float64 bands fail and float32 bands pass.

| route | iterations | true residual | cold | warm | peak RSS |
|---|---|---|---|---|---|
| float64 bands (budget unconstrained) | 79 | 8.2e-15 | 87 s | 34 s | 3.74 GB |
| float32 bands (this PR, budget 1.76 GiB) | 76 | 5.4e-15 | 98 s | 38 s | 3.49 GB |
| Schur-LU-only route (main, budget 1.76 GiB) | 79 | 8.2e-15 | 120 s | 114 s | 8.83 GB |

Fluxes, float32 against float64: particle flux -2.5541089001710e-7 against ...01792e-7 (3e-12 relative), heat flux 3e-12, FSABFlow 1.4e-9 and 1.6e-9. On this deck the route main took to save memory used 2.4 times the memory and three times the warm time of the float32 bands.

Earlier laptop probes with an explicit-inverse variant of the float32 rows (forced coarse preconditioner): 8,068-unknown FP + Er deck 23 -> 23 iterations; tokamak PAS 3 -> 4; NCSX two-species FP at 126,004 unknowns 27 -> 28 with peak RSS 2.59 -> 2.15 GB; W7-X drift 11 x 19 x 24 x 5 29 -> 28. The quick two-species FP fixture in the new test is the worst seen, 90 -> 102.

Tested: `tests/test_tier2_memory_guard.py` (new test: between the two band sizes the float32 route is taken, warns, converges within 1.25x the float64 iterations and matches the float64 solution to 1e-8), `tests/test_coarse_precond_constants.py`, `tests/test_speed_triangle_precond.py`. The two band-fit stubs in the tests take the new `itemsize` argument.

Without a forced budget, on a deck whose float64 bands did not fit: the same W7-X drift deck at 23 x 55 x 26 x 6 (394,684 unknowns), office CPU, 8 threads, load 20-34. Float64 bands 11.16 GiB (16.2 GiB with the 1.45 overhead) against 9.8 GiB available at the start, so the guard stored float32 rows (5.58 GiB). GCROT converged in 207 iterations to a residual of 1.5e-14, 396 s cold and 351 s warm. Peak RSS was 10.5 GB on the cold solve and 14.9 GB over the process, about 1.9 times the float32 bands, above the 1.45 the guard charges; the guard was right to refuse float64 here, but it under-counts the float32 route. Main could not be run against it on the same footing: when its turn came 32 GiB were available, so it took the float64 bands (build and one application 112 s, 12.4 GB RSS).

Not measured on GPU: both office A4000s stayed at 100% utilisation under other jobs (2.4 to 15 GB each) for the whole window. The guard reads host memory only, so on a GPU it does not see device memory; a deck whose float64 bands fit the host but not the card would still take the float64 route there. That is untested.

Conflicts: #459 (another session) also stores coarse rows in float32, through a `store` argument of `_factor_coarse_rows`; a trial merge conflicts in `src/dkx/coarse_precond.py`, and the two mechanisms should become one. A trial merge with #467 conflicts only in the band-fit stubs of two test files.

## DKX 467

[Split the Legendre eliminations into parity sectors on stellarator-symmetric decks](https://github.com/uwplasma/DKX/pull/467) · [Revision e3640e2c](https://github.com/uwplasma/DKX/tree/e3640e2ccb6e4327e77abb781369652524203325)

On a stellarator-symmetric field, streaming and the mirror force are odd under the angular reflection R: (theta, zeta) -> (-theta, -zeta) and couple l to l +- 1, while collisions, the l = 0 pin and the constraint weights are even under R and diagonal in l. The operator then commutes with S = (-1)^l R, and every Schur complement of the Legendre elimination commutes with R. This PR uses that in three places:

- the coarse preconditioner eliminates the chains S = +1 and S = -1 separately, each on h = (m + fixed points) / 2 of the m = Ntheta Nzeta angular points, as two more "species" of its batched rows (all three storage routes and the speed triangle);
- the speed-coupled factorization (exact route and the coupled Krylov preconditioner) takes the LU of the even and odd halves of each Schur complement;
- the per-(species, x) structured direct route (full bands) factors two sector chains per subsystem.

Factor storage halves and elimination work drops 4x. The Krylov operator is unchanged.

When it applies is decided numerically, to 1e-12 relative, on the arrays the blocks are built from (`coarse_precond._coarse_parity`): streaming and mirror odd under R, ExB, the drift parts and the border weights even. E_r != 0 (ExB) and the tangential magnetic drifts are odd under R and diagonal in l, so they anticommute with S and those decks keep the unsplit path, as do up-down asymmetric fields and grids not symmetric under R. Two more exclusions came from measurement: grids under 128 angular points (a tokamak FP deck on 21 points went from 33 s to 67 s cold at the same warm time, the gathers cost more compile than the smaller LUs save) and decks without constraints, whose chain is singular so that its null component depends on the pivots. The truncated and generated-full PAS routes are not split yet.

The drives of RHSMode 1-3 are odd under S, so on a split deck the solution lies in the S = -1 sector: ||f + S f|| / 2||f|| = 2.4e-15 (PAS, 2 species) and 4.6e-16 (FP), sources 1e-16. With drifts or E_r it is 3.6e-3 and 0.6. A Krylov solve restricted to that sector (single-sector preconditioner, half the basis) is the next step and is not in this PR; it needs a guard on right-hand sides and adjoint solves that leave the sector.

Measured, office CPU (8 threads, compilation cache disabled, load 29-38), main against this branch, one cold and one warm `dkx.run` per process:

| deck | route | main cold / warm | branch cold / warm | iterations | peak RSS |
|---|---|---|---|---|---|
| NCSX 2 species FP, 19 x 27 x 64 x 5 (328,324 unknowns) | coupled precond | 78.3 s / 73.4 s | 60.0 s / 34.1 s | 19 / 19 | 2.88 / 2.49 GB |
| NCSX 2 species FP, 15 x 21 x 24 x 5 | coupled precond | 33.8 s / 14.4 s | 33.7 s / 7.4 s | 19 / 18 | 1.46 / 1.41 GB |
| NCSX PAS, E_r = -2 (not split) | coarse | 45.3 s / 6.3 s | 44.0 s / 6.3 s | 6 / 6 | 2.50 / 2.40 GB |
| NCSX FP, E_r = -2 (not split) | coarse_triangle | 32.4 s / 5.0 s | 30.7 s / 4.2 s | 12 / 12 | 1.86 / 1.92 GB |
| W7-X drifts 15 x 27 x 40 x 6 (not split) | coupled precond | 71.5 s / 51.0 s | 68.9 s / 54.5 s | 29 / 29 | 2.36 / 2.40 GB |

On the three unsplit decks the fluxes and FSABFlow are identical to the printed 13 digits. On the 328k deck at its own tolerance (1e-8) FSABFlow moves by 3e-6 relative; rerun at tolerance 1e-12 on the laptop (4 threads, load 11-15) the split and unsplit coupled solves take 28 and 29 iterations, 11.8 s and 19.1 s cold, 2.35 and 2.52 GB, and agree to 3.6e-10 (FSABFlow), 9e-11 (particle flux) and 1.2e-10 (heat flux).

Parts, laptop, 328k deck: the coupled preconditioner application 1.08 s -> 0.62 s (its float32 tail LUs 652 -> 328 MB, the dense l < 2 LUs 210 -> 106 MB); forcing the coarse preconditioner, build 12.5 s -> 6.5 s and application 0.072 s -> 0.037 s.

GPU, office A4000 (float64, card idle at the start, host load 23-28), 328k deck: cold 59.9 s on main and 61.4 s here, 21 and 20 iterations, peak GPU memory 2.79 and 1.51 GB, fluxes agree to 1e-7 (tolerance 1e-8). The warm runs are not comparable: on the branch `auto` switched to the coarse preconditioner on the second solve (it reads available host memory, which dropped between the two runs; #452 changes that), and the split coarse build then took 58 s on the GPU (62.0 s warm against 6.8 s on main with the coupled preconditioner). The coarse split build on GPU needs a look before this is ready.

Exactness, against the unsplit factorization on random vectors: coarse preconditioner on every route (dense, reusable, checkpointed, speed triangle) 5e-14 on FP and 1e-10 to 2e-9 on the PAS chains, whose condition numbers are near 1e8; exact coupled route 5e-11 (residual 6e-12); tier-1 1.9e-12. Whole `dkx.run` outputs with the split forced on these small decks, every output above 1e-10 in size: `filteredW7XNetCDF_2species_noEr` (a SFINCS-parity deck) 4.6e-13, `geometryScheme4_2species_noEr` 6.6e-14, `transportMatrix_geometryScheme11` 2.1e-14. Outputs that vanish by symmetry (FSA density and pressure perturbations, sources, momentum flux, all below 1e-15) differ at rounding.

Tests: `tests/test_coarse_ragged_chains.py` (split equals unsplit on both storage routes; S K S = K for the full and coarse operators and S b = -b for the drive; drifts and E_r refuse the split, and forcing it on the E_r deck changes the inverse by 2.8e-4 against 1e-10 rounding; split storage is 2 h^2 / m^2 of the unsplit), `tests/test_speed_triangle_precond.py` (coupled, exact and keep = 2), `tests/test_tier1_refinement.py` (tier-1, forward and transposed), plus `tests/test_coarse_precond_constants.py`, `tests/test_tier2_memory_guard.py`, `tests/test_coarse_scan_rows.py`, `tests/test_lazy_transposed_precond.py`, `tests/test_solve.py`, `tests/test_batch.py`, `tests/test_factor_reuse_contract.py`. One test in `test_solve.py` (`test_solve_on_explicit_second_cpu_device_matches_and_returns_home`) fails locally because my shell sets `XLA_FLAGS`; it does not touch this code.

Conflicts: the band-fit stubs in `tests/test_coarse_precond_constants.py` and `tests/test_speed_triangle_precond.py` take an extra argument here and in #465, so whichever merges second needs a one-line resolution.

## GKX 495

[Wall-clock nonlinear progress lines, run summary and result plot](https://github.com/uwplasma/GKX/pull/495) · [Revision b58097cf](https://github.com/uwplasma/GKX/tree/b58097cf9fee4f763f66d8bdf00c50a4beaaa51c)

Nonlinear runs print one progress line about every two seconds, whatever the chunk size or step speed: elapsed time (counted from the first setup message), t/t_max, percent, ETA from the last ten seconds of progress, the current heat flux per species and the saturation detector's verdict (transient, saturating: Q=7.1+-0.4, saturated). The first line appears when the first chunk finishes, which is when compilation ends, and the last at t_max. The old per-chunk message is gone.

Fixed-step runs with diagnostics now go through the same chunked path when a reporter is present, so the in-scan printing is no longer reached from gkx.solve or the CLI.

ProgressReporter (gkx.workflows.runtime.chunks) is passed as status_callback to gkx.solve or run_runtime_nonlinear; the CLI uses it under --progress, and show_progress=True builds one. reporter.finish(result, plot=stem, ky=ky) prints the summary (wall time, final t, steps, mean+-SEM, status) and writes <stem>.flux_time.png, plus the ky flux spectrum when resolved diagnostics and ky are given. Plot failures are contained. The CLI figure set is unchanged and respects --no-plots; the time-trace figure now also shades the mean+-SEM band.

When the run is not set to stop at saturation, the chunk loop runs the detector as a monitor only, so the verdict is still shown. The reporter costs about 1 us per chunk and adds no device sync.

Real output on a laptop CPU (examples/03, t_max = 60, then 400 fixed steps):

    integrating nonlinear from t=0 up to t_max=60 (the first progress line follows compilation)
    00:20  t=12.8/60   21%  eta --:--  Q=6.76e-07  transient
    00:22  t=25.6/60   43%  eta 00:07  Q=2.8e-06  transient
    00:25  t=38.4/60   64%  eta 00:05  Q=1.81e-05  transient
    00:28  t=51.2/60   85%  eta 00:02  Q=0.000139  transient
    00:30  t=60/60  100%  eta 00:00  Q=0.000602  transient
    done in 00:30: t=60, 600 steps, no saturation estimate
    --- fixed steps
    integrating nonlinear from t=0 up to t_max=40 (the first progress line follows compilation)
    00:07  t=12.8/40   32%  eta --:--  Q=6.76e-07  transient
    00:11  t=25.6/40   64%  eta 00:04  Q=2.8e-06  transient
    00:15  t=38.4/40   96%  eta 00:00  Q=1.81e-05  transient
    00:32  t=40/40  100%  eta 00:00  Q=2.32e-05  transient
    done in 00:32: t=40, 400 steps, no saturation estimate

The gap before the last fixed-step line is the compile of the shorter final chunk (400 is not a multiple of 128), as in the existing saturation route.

Chunk length is left alone. I tried resizing chunk_steps after the second chunk to a target of 1.5 s (explicit stepper, 16x16x16 deck, laptop CPU under heavy load): total wall time went from 47 s to 87 s with one recompile and smaller chunks, so the resize was dropped.

Tests: fake-clock throttling, line content, summary and plot file; a fixed-step run reporting through the new path. Existing chunk-loop, CLI and artifact tests updated for the line format. tests/release, ruff, mypy and the architecture check pass.

## GKX 496

[Apply the collision operator once per explicit step](https://github.com/uwplasma/GKX/pull/496) · [Revision b4019706](https://github.com/uwplasma/GKX/tree/b40197066652cdfd462409c3f05cc8bffc8e624f)

The explicit steppers evaluated the conserving collision operator (Landau or Dougherty, with its gyro-averaged field-particle corrections) in every stage. With nu dt near 1e-3 that buys no accuracy. Unless `collision_split = false`, the explicit steppers now take it out of the stages and apply it once per step, after the step, as one forward-Euler update through the existing split hook (`_apply_explicit_collision_split`). `collision_split = true` keeps its old meaning on top (diagonal hypercollision split). IMEX and the chain IMEX methods (`imex-ars3`, `imex-ark3`, which already advance the Landau operator implicitly) are unchanged, and so are decks with nu = 0. `[time] collision_split` is now unset by default; the reference decks and docs say so.

Right-hand side, Landreman-Paul QA (lowres wout), common deck, 64x64x32, (Nl, Nm) = (4, 8), nu = 0.01, float32, CPU ms per evaluation (load 16-21):

| | main | this PR |
|---|---|---|
| RHS in each stage | 200 | 104 |
| collision-only update, once per step | - | 96 |
| one RK4 step (4 stages) | 800 | 512 |

Collisions are 46% of the main RHS (200 vs 109 without them); the bracket is about 66 ms and the remaining linear terms 38 ms.

Heat-flux gate: Cyclone deck (examples/03 case_full) at 32x32x16, (4, 8), nu = 0.01, adaptive step, t = 600, float32. Mean ion heat flux over t >= 150 with the standard error of 10 blocks (integrated autocorrelation time 15-21):

| | Q | CPU s | wall s |
|---|---|---|---|
| collisions in every stage (`collision_split = false`) | 19.29 +- 0.26 | 529 | 199 |
| once per step (default) | 19.82 +- 0.30 | 375 | 175 |

The difference, 0.53, is 1.3 combined standard errors (2.8%). Run cost drops 1.41x in CPU time. The mean step was 0.0999 in both runs (load 16-21).

Forward-Euler stability: power iteration (60 iterations) on the collision-only operator gives max |lambda| = 0.0331 (3.3 nu, real and negative) on both the QA 64x64x32 grid and the Cyclone grid, so dt |lambda| = 0.0033 at dt = 0.1. The Euler update stays stable for dt up to about 60.

Tests (JAX_ENABLE_X64=1): the split, collision and runtime tests in tests/unit/nonlinear, tests/unit/solvers/test_time_integrators.py, the reference-deck release gate and tests/integration/runtime/test_cli.py pass; mypy on the touched modules is clean. The RK-stage comparison test is replaced by one that checks a step equals G + dt C(G) at the default setting.

GPU, one RTX A4000 (office), float32, JAX 0.6.2 CUDA 12. The GPU was shared with other jobs throughout, so the per-step times carry that noise. Main against the stack of this PR, #497 and #499, nu = 0.01:

| | main | stack |
|---|---|---|
| Cyclone 64x64x24 (4, 8), t = 1000: steps | 10000 | 8624 |
| ms per step (compile excluded) | 56 | 17 |
| cold / warm wall of a t = 5 solve, s | 67 / 10.8 | 68 / 3.4 |
| peak GPU memory | 0.55 GB | 0.56 GB |
| Q over t >= 150, 15 blocks | 7.29 +- 0.13 | 7.44 +- 0.19 |
| QA 96x96x48 (4, 8): ms per step | 172 | 90 |
| cold / warm wall of a t = 2 solve, s | 92.5 / 8.3 | 78.6 / 4.7 |
| peak GPU memory | 2.53 GB | 2.53 GB |
| Q over 100 <= t <= 400, 10 blocks | 5.90 +- 0.19 | 6.06 +- 0.21 |

At 96x96x48 the step is CFL-bound near 0.096 in both, so the QA per-step gain is this PR's (#499 does not change dt there). Precision: the stack in x64 on the same Cyclone deck gives Q = 7.82 +- 0.29 against 7.46 +- 0.31 in float32 over 150 <= t <= 600 (0.9 combined errors), at 89 against 17 ms per step.

## GKX 499

[rk4-pi: no dt_max cap when it is unset](https://github.com/uwplasma/GKX/pull/499) · [Revision 12e6fe17](https://github.com/uwplasma/GKX/tree/12e6fe177104c8c30a3de10897a7e20f2b7c28de)

With `dt_max` unset the adaptive steppers clamp the step at the deck `dt` (0.1 unless the deck says otherwise). For `rk4-pi` and `lawson-rk4-pi` that cap was the binding one: on the runs below the error estimate sat at 0.004-0.02 of the tolerance and the CFL cap allowed 0.17 (Cyclone) and 0.36 (QA). These steppers already bound their step by twice the CFL step and their error estimate, so an unset `dt_max` now means no further cap for them; the deck `dt` is their first step. The fixed-tableau methods keep `dt_max = dt`. An explicit `dt_max` is unchanged, and so is the `auto` choice between `lawson-rk4-pi` and `rk4-pi` (it still reads `dt` as the cap). One expression in `operators/nonlinear/policies.py`, plus docs and the reference-deck comments.

Stacked on #496 (collisions once per step); both measured together.

Heat-flux gate, laptop CPU, float32, 2 threads, nu = 0.01, 15 blocks over the saturated window (block length 2-4 integrated autocorrelation times), Q with its standard error:

Cyclone (examples/03 case_full) 32x32x16, (4, 8), t = 1500, window t >= 150 (load 13-16):

| | mean dt | steps | CPU s | Q |
|---|---|---|---|---|
| dt_max = 0.1 (before) | 0.100 | 15000 | 978 | 19.54 +- 0.20 |
| unset (this PR) | 0.150 | 9990 | 711 | 19.83 +- 0.27 |
| unset, rk4-pi tolerance / 4 | 0.150 | 10005 | 702 | 19.44 +- 0.21 |

QA (Landreman-Paul QA lowres wout, common deck) 32x32x32, (4, 8), t = 2000, window t >= 100 (load 16-23, last run up to 130):

| | mean dt | steps | CPU s | Q |
|---|---|---|---|---|
| dt_max = 0.1 (before) | 0.100 | 20000 | 2902 | 10.55 +- 0.11 |
| unset (this PR) | 0.330 | 6057 | 964 | 10.39 +- 0.12 |
| unset, rk4-pi tolerance / 4 | 0.211 | 9464 | 1630 | 10.55 +- 0.10 |

Differences against the dt = 0.1 runs are 0.9 (Cyclone) and 1.0 (QA) combined standard errors. On Cyclone the step is CFL-bound, so the tighter tolerance does not change it; the dt = 0.1 run is the smaller-step control there. QA runs 3.0x faster.

Tests (JAX_ENABLE_X64=1): the adaptive, split and collision tests of tests/unit/nonlinear/test_nonlinear.py and the reference-deck release gate pass; mypy is clean. A new assertion checks that an unset dt_max is unbounded for rk4-pi.

GPU, one RTX A4000 (office, shared with other jobs), float32, the stack with #496 and #497: on Cyclone 64x64x24 (4, 8) the mean step goes from 0.100 to 0.116 (10000 to 8624 steps to t = 1000; Q 7.29 +- 0.13 against 7.44 +- 0.19). On QA 96x96x48 (4, 8) the CFL bound holds the step near 0.096 in the saturated phase either way, so this change only shortens the linear phase there (mean step 0.124 against 0.082 over t <= 50). The gain grows as the grid coarsens; at production resolution it is small.

## GKX 505

[Accept DESC and GVEC equilibria as geometry inputs](https://github.com/uwplasma/GKX/pull/505) · [Revision 9e08546a](https://github.com/uwplasma/GKX/tree/9e08546adefdc52b760e2c16e75c6644a18483c9)

GKX reads a DESC equilibrium (.h5) or a GVEC state as a geometry input next to a VMEC wout:

    [geometry]
    model = "desc"            # or "gvec"
    vmec_file = "equilibrium.h5"   # GVEC: GVEC_State_*.dat, parameter.ini beside it
    torflux = 0.5

The equilibrium is sampled on 16 flux surfaces in its own straight-field-line angles, Fourier analysed in the VMEC convention and written as a stellarator-symmetric wout in the existing eik cache directory (`_convert_equilibrium` in `gkx.geometry.vmec_eik`, keyed on path, size and mtime). The VMEC bridge then produces every coefficient, so bmag, gradpar, gds2, gds21, gds22, gbdrift, cvdrift and the rest come from the code path VMEC runs already use. GVEC runs with zeta = -phi, so the converter flips the signs of iota, the edge flux and the covariant B_zeta. `desc-opt` and `gvec` are imported only when selected (extras `gkx[desc]`, `gkx[gvec]`); Python 3.10 is unaffected. Stellarator-asymmetric equilibria raise an error.

Diff: one source file extended (vmec_eik.py, +270 lines), three one-line dispatch edits (startup, config validation, case_paths), tests in test_geometry.py, a short docs section, 190 KB of fixtures.

Evidence. Reference is a vmex quasi-axisymmetric wout (nfp 2, ns 50, s = 0.5, alpha = 0, one poloidal turn, 64 points). DESC is `VMECIO.load` of that wout (L=16, M=N=8); GVEC is `pygvec-convert-wout` of it. Peak-normalised maximum difference along the line against the VMEC flux tube:

| quantity | DESC | GVEC |
|---|---|---|
| bmag | 3.0e-4 | 2.4e-3 |
| gradpar | 2.4e-6 | 1.2e-3 |
| gds2 | 1.4e-3 | 2.4e-3 |
| gds21 | 1.6e-3 | 2.5e-3 |
| gds22 | 7.5e-4 | 2.5e-3 |
| grho | 5.2e-4 | 1.2e-3 |
| gbdrift = cvdrift | 8.1e-2 | 3.3e-3 |
| gbdrift0 = cvdrift0 | 1.7e-2 | 6.2e-4 |

q agrees to 2e-7. The drift difference of the DESC route is the DESC fit of the VMEC surfaces: raising the radial resolution of the fit lowers gbdrift from 12.9% (L=8) to 8.1% (L=16) and 4.3% (L=32), with the other rows below 1e-3 at L=32. The converter itself matches DESC's own `VMECIO.save` wout to the printed digits.

Linear growth rates, same case, krylov, Nl=2, Nm=4, adiabatic electrons, ky = 0.2, 0.4, 0.6:

| model | gamma | omega |
|---|---|---|
| vmec | 0.06626, 0.16789, 0.24068 | 0.01471, 0.08448, 0.18437 |
| desc | 0.06457, 0.16539, 0.23852 | 0.01353, 0.08160, 0.18059 |
| gvec | 0.06611, 0.16778, 0.24066 | 0.01462, 0.08425, 0.18404 |

gamma differs from VMEC by 2.6, 1.5, 0.9% (DESC) and 0.23, 0.06, 0.01% (GVEC).

Timing, CPU seconds on a loaded laptop (wall times were 3 to 5 times longer): the geometry pipeline from a wout takes 0.4 s; GVEC conversion 2.1 s; DESC conversion 14.6 s cold, nearly all of it DESC's jit compilation. Conversions are cached, so a second run starts at the pipeline.

Tests: `test_geometry.py` converts small fixtures (DESC fit and GVEC state of an mpol = ntor = 5 equilibrium) and compares the flux tube with a stored VMEC eik.nc, plus a routing test that needs neither package. The conversion tests skip when `desc` or `gvec` is missing; they run in about 18 s with both installed (DESC jit dominates). Lint, format, mypy on touched files, architecture check and tests/release pass locally.

Not done: no nonlinear comparison, no cross-check against GX's DESC script (its gbdrift sign and zeta conventions differ and I did not reconcile them), and the optional packages are not in the CI install, so the conversion tests do not run there yet.

## DRBX 125

[Four-field driver: cap dt at a computed RK4 limit](https://github.com/uwplasma/DRBX/pull/125) · [Revision cf5388ca](https://github.com/uwplasma/DRBX/tree/cf5388caf08850e307ea38f4ca7c631795ab57c1)

Stacked on #124.

The four-field model is explicit RK4 and its fastest term is the electron parallel wave. Nothing computed it, so a dt above about 0.035 on the 12x16x8 tutorial grid blew up within a few steps.

`four_field_step_limit` returns the RK4 step limit of the current state and the limit of each term:
- electron parallel wave: per cell and per poloidal/toroidal grid mode, `|k_par| sqrt(mi/me (Te + B^2/(n k_perp^2)))` with central-difference wavenumbers and `k_perp^2 = g^11 (pi/L_x)^2 + g^22 k_y^2`; the second term is the electrostatic shear-Alfven coupling through the vorticity
- E x B advection: `sum |v_E^i| / dx_i`
- perpendicular diffusion: `4 D sum (g^ii - b^i b^i) / dx_i^2`
- combined as `dt = 1 / ((wave + exb) / 2.83 + diffusion / 2.79)`

`run_stellarator_turbulence` treats dt as the largest step and caps it at the limit before every chunk, printing each change. dt is a traced argument, so a change does not recompile, and frame times are the actual times.

Check against the measured threshold (main, tutorial setup, fixed dt, 200 steps, laptop CPU, load 15-21):

| dt | 0.01-0.035 | 0.037 | 0.04 | 0.05 |
|---|---|---|---|---|
| D = 1e-2 and 1e-4 | stable | fails at step 21 | step 5 | step 3 |

The wave limit on that grid is 0.0351. With the default D = 1e-2 the combined limit is 0.0299, between the stable 0.02 and the failing 0.05 that the review reported.

No shipped deck or example is capped. All use dt <= 2e-3 and the smallest initial limit is 8.3e-3 (stellarator_3d_render grid, 16x32x16); the table for all ten cases is below. The limit costs 0.44 ms per call after a 0.3 s compile.

| case | shape | dt used | limit |
|---|---|---|---|
| tutorial rotating ellipse | 12x16x8 | 2e-3 | 2.99e-2 |
| test rotating ellipse | 12x16x8 | 2e-3 | 1.85e-2 |
| deck stellarator_turbulence | 8x12x6 | 2e-3 | 3.32e-2 |
| stellarator_turbulence.py | 20x32x12 | 2e-3 | 9.84e-3 |
| rotating_ellipse_filament.py | 20x28x12 | 2e-3 | 9.98e-3 |
| stellarator_3d_render.py | 16x32x16 | 2e-3 | 8.30e-3 |
| deck four_field_tokamak / electromagnetic | 6x8x4 | 1e-3 | 3.33e-2 |
| electromagnetic_turbulence.py | 10x16x8 | 1e-3 | 1.89e-2 |
| deck island_divertor | 6x8x4 | 1e-3 | 5.37e-2 |
| island_divertor.py | 16x24x12 | 2e-3 | 1.12e-2 |

Tests (laptop CPU, 2 threads): `test_stellarator_turbulence`, `test_island_divertor` and `test_decks`, 32 passed (before the bound was refined); after it, the two turbulence files, 7 passed. New test: a dt = 0.5 run is capped and prints the limits.


After merging #124 into this branch (both plan rows kept): `test_decks` + `test_stellarator_turbulence`, 29 passed in 49 min, peak RSS 1.76 GB (laptop, 2 threads, load 70-146).

Compile of the checked chunk. Laptop CPU, 12x16x8, cold, `jax_log_compiles`; load 60-130, so the absolute times are inflated:

| variant | compile of the largest program |
|---|---|
| main (bare jitted RK4 step) | 29.1 s |
| this branch (chunk = while_loop around the step) | 63.5 s, 119.9 s |
| this branch merged with #126 (stage loop) | 13.1 s, 27.1 s |

With #126 merged, the chunk compiles in less time than the bare step on main. The step-limit kernel itself compiles in 0.45-1.0 s.

## DRBX 143

[Split run_full_eb into stages and delete its unused options](https://github.com/uwplasma/DRBX/pull/143) · [Revision e71dffe5](https://github.com/uwplasma/DRBX/tree/e71dffe55761bdd42227ed85b6fb2b3fc879c54d)

Depends on #127, #130, #131 and #132 (merged in that order into this branch). Until they land the diff includes them; I will rebase after each merge. The change itself is the last commit.

`run_full_eb` was one 1,985-line function. It is now 1,056 lines plus module functions for the parts that do not need the compiled closures:

- `_check_run_arguments`, `_pack_cell_fields` (geometry, curvature face and sparse-row channels)
- `_ssp222_stages`, `_finalize_advance`, `_inspect_local` (stage algebra, step diagnostics, grid-scale inspection; previously closures)
- `_step_failure`, `_wall_step_vector`, `_snapshot_payload`, `_snapshot_path`, `_static_output_payload`, `_run_metadata`, `_history_geometry_payload`
- `_NeutralStage`: neutral fluid and wall recycling (init, step, record, output)

The compile/advance closures (`build_local_model`, `implicit_solve`, the three `advance_execution` modes) stay inside the function: they capture the mesh, the sharded arrays and the phase timer, and passing them out costs more lines than it saves.

Deleted options nothing sets (checked against examples/inputs, tests, docs and the one call in `run()`): `time_integrator`, `parallel_operator_scheme`, `history_dtype` (fixed at float32, as every deck had it), `control_volume_field_count`, the `control_volume_descriptor is None` and `owner_host_geometry is None` branches, the always-true `wall_ledger is None` return, and in `build_local_eb_model` the non-toroidal halo filler and the default curvature coefficients (both callers pass them). The output files and metadata are unchanged.

`run.py`: 4,313 to 4,301 lines. Tests: +128/-19.

Checked on the 16^3 HSX geometry, 2 steps, four decks: plain, diagnostics with a timed snapshot and a periodic checkpoint, neutrals with recycling, and electromagnetic. Every array in every output file (history, snapshot, checkpoint) is bit-for-bit identical to main. The run_metadata_json differs only in `command` and `drbx_source_root`.

Coverage of `run.py` over `tests/fci_braginskii` and `tests/test_cli_run.py` (not slow): 28% before, 31% after. The remaining uncovered lines are the compiled-kernel bodies, which need a geometry bundle (`DRBX_TEST_GEOMETRY_BUNDLE`); CI has none, so that part stays uncovered there.

New tests (all under 0.2 s, except the last):
- `_ssp222_stages` on y' = -a y - b y split explicit/implicit: observed order 2.3 and 2.2 at 8, 16, 32 steps (Pareschi and Russo, IMEX-SSP2(2,2,2)).
- `_step_failure`: each rejection path, and `None` for a healthy step.
- `_wall_step_vector` pairing and `_snapshot_path` naming with the restart offset.
- slow, needs a bundle: a run restarted from a periodic checkpoint reproduces the continuous run (atol 1e-12; it is bitwise on 16^3 HSX, 44 s).

Existing AST tests that read the source of `run_full_eb` now point at the moved functions (`test_stage_2_phi_solve`, `test_restart_step_offset`, `test_hsx_blob_curvature_wiring`, `test_hsx_blob_operator_boundary_wiring`).

For review: `git diff --color-moved` shows most of the diff as moved blocks. `scripts/fci_diagnostics.py` still works: it reads locals of the first `shard_map` frame, which are unchanged.

## DRBX 146

[Add an 8x8x8 HSX geometry bundle so the compiled time step runs in CI](https://github.com/uwplasma/DRBX/pull/146) · [Revision 3ac1e028](https://github.com/uwplasma/DRBX/tree/3ac1e0281125fee9fce64894564d731846a614f1)

The HSX tests skipped without `DRBX_TEST_GEOMETRY_BUNDLE`, so `run_full_eb`, `fci_drb_EB_rhs.py` and most of `fci_operators.py` never ran in the coverage job. This adds `tests/data/hsx_8x8x8` (0.4 MB: QHS coils and the shipped vessel, 8x8x8, built from a `[geometry]` table that is in `docs/fci_braginskii_hsx_backend.md`). `tests/fci_braginskii/conftest.py` points `DRBX_TEST_GEOMETRY_BUNDLE` at it with `setdefault`, so the variable still overrides it. The bundle passes the checksum audit and loads, but the producer's closure check is out of tolerance at this size; it is a test fixture, not a physics grid. Building it in CI takes about 60 s plus a compile, so I committed it (option B).

An `hsx_run` session fixture runs each distinct deck once and the tests share the history. New tests in `test_wall_ledger_finite.py`:
- 4-step Bohm run: all fields finite, n/Te/Ti positive, wall ledger finite, particle inventory falls monotonically.
- Restart from frame 2 reproduces frames 2..4 of the continuous run to 5e-5 of each field's maximum (float32 histories; measured 1.2e-5 on Ve, 1e-7 on n).
- Zero-flow wall, no filament: n, Te, Ti stay exactly 1 and phi, Vi, Ve, vorticity stay 0.
- Zero-flow wall with the filament: particle inventory changes by less than 1e-8 (measured 1.5e-9).

The sheath step check and the zero-flow ledger test lost their `slow` mark and use the shared runs. The mutation test (5% too strong wall block) stays `slow`. Four slow tests had rotted and are updated: `test_hsx_stage_residuals_from_returned_state` (3 params) and `test_evaluate_stage_term_scaling_on_hsx_geometry` called a removed `driver.main`; `test_hsx_recycling_ledger_closes` read the neutral-ledger column `wall_influx`, which is now `particle_source`. All five pass locally on the 8-cubed bundle.

Not fixed, both `slow`: `test_every_pair_is_an_exact_adjoint` (the test's sign for `D` no longer matches the code) and `test_step_advection_along_b_is_bounded_with_face_flux_dissipation`, plus `test_electromagnetic_step_gradient_matches_finite_difference` (its jit/shard_map spy never sees the advance). They fail with the variable set, which they never did in CI because they skipped.

Coverage job (`coverage.yml` commands, local, `-m "not slow"`), main vs this branch:

| | main | branch |
|---|---|---|
| whole package | 62% | 70% |
| `fci_braginskii/run.py` | 28% | 64% |
| `native/fci_drb_EB_rhs.py` | 21% | 76% |
| `native/fci_operators.py` | 11% | 54% |

Time: the four compiled runs take about 110 s (27, 20, 29, 20 s on an M-series laptop). The two coverage invocations took 1394+158 s on main and 1487+210 s here, but the main run shared the machine with other jobs, so I count the 110 s, not the difference. The coverage floor could go from 58 to 68; I did not touch it, since #145 and #140 edit that line. Neutrals and recycling stay `slow` (about 30 s per run each); running them would raise `fci_neutrals.py` and the neutral branches of `run.py`.

Based on main (#127, #130, #131, #132 are merged).

## LMhdX 319

[Traced dt and a CFL-controlled step for the projection run](https://github.com/uwplasma/LMhdX/pull/319) · [Revision 316d514c](https://github.com/uwplasma/LMhdX/tree/316d514c0316fe8526eb0880a2ffa61a45c4dc77)

The projection run passes `dt` to its compiled program as an argument. `Solver(cfl=)` holds each step at that fraction of the RK3 central-transport limit, measured cell by cell with `outgoing_rate`; `Solver.dt` is the largest step allowed. A step that ends non-finite is skipped inside the scan (`lax.cond`) and the state holds. The history marks the step (`dt`, `finite`), and `solve` rejects the run at that step. `_transient` builds the kernel at unit dt and keeps the viscous factorizations, so a new `Solver.dt` reuses the program. Before this change, every `solve` call compiled again: the viscous factorizations hash by identity, so the kept program was never found. With an `Output`, the existing log already prints and flushes each chunk; `dt` is now in its series.

Measured on the laptop CPU, 2 threads, float64, persistent cache off. Spanwise channel with central transport, RK3, 20 steps per `solve`. The 1-minute load is given with each row.

| grid | | first call | second call, same dt | first call after a new dt |
|---|---|---|---|---|
| 24x16x16 | main (load 18) | 4.0 s | 2.3 s (116 ms/step, compiles again) | 2.2 s |
| 24x16x16 | this PR (load 20) | 3.9 s | 0.16 s (8.1 ms/step) | 0.13 s |
| 48x48x16 | main (load 16) | 2.8 s | 2.6 s (129 ms/step) | 3.6 s |
| 48x48x16 | this PR (load 22) | 4.6 s | 1.17 s (58 ms/step) | 1.2 s |

The final kinetic energy is the same to all printed digits. The warm cost of the step itself, from `core3d.advance` with the same factorizations: 4.89 ms (fixed dt) and 4.77 ms (traced dt) at 24x16x16, load 16. At 48x48x16 it is 43.9 ms and 50.4 ms, load 19-21. The traced path builds the pressure stage in the trace, and at the larger grid it may cost up to 15 % per step; that is within the noise at this load. Compile time here is 2-5 s. The minute in the review note was measured at load 150-350.

Tests, local: `tests/test_stepper.py`, `tests/test_timeloop.py`, `tests/test_io.py`, `tests/test_problem.py`, `tests/test_config.py` and `tests/test_toml.py` pass, including `test_the_unsteady_duct_is_the_older_projection_run_bit_for_bit`. New test: a traced dt matches the fixed-dt run to 1e-13 and compiles nothing new; `cfl=0.9` holds the step at 0.9 sqrt 3 / max rate; a run at Courant 10 stops at its last finite state, with `time` stopped there.

Audit budgets go up by the measured amounts (+62 core, +27 test lines).


Device check, float64, on the whole stack (#319 to #322). The duct is periodic in x with walls in y and z, Ha 5, Re 3000, central transport, 20 RK3 steps. CPU is the laptop on 2 threads (load 17-19). GPU is one RTX A4000 on office; it took the job when it was idle, but another user's job started on it during the run, so the GPU times are upper bounds.

| | 48x32x32 CPU | 48x32x32 GPU | 96x64x64 CPU | 96x64x64 GPU |
|---|---|---|---|---|
| Poisson solve, warm | 0.86 ms | 0.45 ms | 7.4 ms | 1.9 ms |
| RK3 step, cold (compile and 20 steps) | 7.0 s | 12.5 s | 20.0 s | 15.4 s |
| RK3 step, warm | 105 ms | 18-23 ms | 647 ms | 179 ms |
| with statistics, warm | 120 ms | 18 ms | 787 ms | 241 ms |
| heated RK3 step, warm | 140 ms | 17 ms | 808 ms | 198 ms |
| peak device memory | - | 0.13 GB | - | 0.32 GB |
| CG iterations per step | 14.2 | 14.2 | 17.4 | 17.4 |

CPU and GPU agree to 1.9e-13 (48x32x32) and 5.0e-13 (96x64x64) in velocity, relative to its maximum, after 20 steps. The temperature of the heated run agrees to 1.1e-13 and 1.7e-13. Nothing in these PRs helps on one device and hurts on the other.

Profile of the step (same duct, float64). The separable solves are timed 50 to a program, so that one call is not one launch. Office CPU, 4 threads, load 12-15:
- 48x32x32: Poisson 2.2 ms, viscous Helmholtz 1.3-2.0 ms per component, step 145 ms.
- 96x64x64: Poisson 7.2 ms, Helmholtz 5.5-8.4 ms, step 604 ms.

Office GPU (A4000, uncontended):
- 48x32x32: Poisson 0.23 ms, Helmholtz 0.21 ms, step 17 ms.
- 96x64x64: Poisson 1.6 ms, Helmholtz 1.5-1.7 ms, step 203 ms.

The pressure Schur solve takes 14 conjugate-gradient iterations per step at 48x32x32 and 17 at 96x64x64, about 5 per stage. Each iteration applies three Helmholtz inverses and one separable preconditioner. Counting the solves this way accounts for all of the CPU step, and for 73-100 % of the GPU step. So the dense-eigenbasis solves are the step, and the next thing to cut is the number of Schur iterations per stage. A faster transform would only reduce the cost per solve.

## LMhdX 321

[Running statistics inside the scan: means, Reynolds stresses, friction and Nusselt number](https://github.com/uwplasma/LMhdX/pull/321) · [Revision fcbb8d5b](https://github.com/uwplasma/LMhdX/tree/fcbb8d5b5a86fb85b113bbfddf47a157f5bb58d8)

Stacked on #319.

`advance(statistics=True)` and `Solver(statistics=True)` integrate inside the scan the plane averages, over the periodic axes, of the cell-centred velocity and their products, weighted by each step. A run in chunks carries the integrals in its state, so it integrates as the run in one. Three functions read the integrals:
- `turbulence_statistics` turns them into means and covariances (`uv` is <u'v'>).
- `friction_coefficient` gives c_f = 2 tau_w / (rho U_b^2).
- `nusselt_number` gives Nu = -D_h dT/dn / (T_w - T_b).

The wall values come from a quadratic through the three cells nearest each wall, which is second order on a stretched mesh.

Test: a known field gives its exact mean and variance, an exact parabola gives c_f to 1e-12, slug flow between heated walls gives Nu = 8/T_b (12.0 to 0.1 on the stretched mesh), and two chunks of three steps integrate as one run of six to 1e-13.

Tests, local (load 15-18): `tests/test_timeloop.py`, `test_stepper.py`, `test_io.py` and the bit-for-bit duct test: 144 passed. Cost of the integrals, re-measured 2026-11-17 with the accumulation timed alone (50 accumulations chained in one program): 0.77 ms per step at 48x32x32 and 6.2 ms at 96x64x64 on office CPU (4-8 threads, load 35-40), 0.6 % of the step or less, and 0.3 and 1.0 ms on the A4000 (0.2 % and 0.1 %). The 14-22 % first reported here came from timing separate runs on a loaded laptop: alternated runs with and without statistics now scatter by 25 % in either direction at that load. Off, they cost nothing. Audit budgets go up by the measured amounts. Largest module: core3d at 1733 lines.


Device check, float64, on the whole stack (#319 to #322). The duct is periodic in x with walls in y and z, Ha 5, Re 3000, central transport, 20 RK3 steps. CPU is the laptop on 2 threads (load 17-19). GPU is one RTX A4000 on office; it took the job when it was idle, but another user's job started on it during the run, so the GPU times are upper bounds.

| | 48x32x32 CPU | 48x32x32 GPU | 96x64x64 CPU | 96x64x64 GPU |
|---|---|---|---|---|
| Poisson solve, warm | 0.86 ms | 0.45 ms | 7.4 ms | 1.9 ms |
| RK3 step, cold (compile and 20 steps) | 7.0 s | 12.5 s | 20.0 s | 15.4 s |
| RK3 step, warm | 105 ms | 18-23 ms | 647 ms | 179 ms |
| with statistics, warm | 120 ms | 18 ms | 787 ms | 241 ms |
| heated RK3 step, warm | 140 ms | 17 ms | 808 ms | 198 ms |
| peak device memory | - | 0.13 GB | - | 0.32 GB |
| CG iterations per step | 14.2 | 14.2 | 17.4 | 17.4 |

CPU and GPU agree to 1.9e-13 (48x32x32) and 5.0e-13 (96x64x64) in velocity, relative to its maximum, after 20 steps. The temperature of the heated run agrees to 1.1e-13 and 1.7e-13. Nothing in these PRs helps on one device and hurts on the other.


Turbulent square duct with these statistics. Re 3000 (bulk velocity, half-width), field along y, 48x32x32, Lx = 2 pi. The references (Krasnov et al. 2012, plan H5.3) use 64^2 and 4 pi, so this grid is coarser and the box shorter. The drive is held at G = f_ref/2, so U_b = 1 if the friction matches. RK3, central transport, CFL 0.5. Office CPU, 2 threads per run, load 26-35. Heat is passive, at Pr 0.025.

| Ha | run, time units | f, mean of t > 300 (4 blocks) | reference | difference | c_f on the side walls | Nu (both z walls) |
|---|---|---|---|---|---|---|
| 0 | 755 | 1.651e-2 (1.643-1.657) | 1.714e-2 | -3.7 % | 8.72e-3 | 5.51, 5.58 |
| 5 | 1100 | 1.612e-2 (1.596-1.622) | 1.680e-2 | -4.0 % | 8.22e-3 | 5.58, 5.49 |
| 7 | 1108 | 1.599e-2 (1.578-1.622) | 1.647e-2 | -2.9 % | 7.93e-3 | 5.50, 5.57 |

The Ha 0 row is the shorter laptop run, on 2 threads. Turbulence is sustained in all three, with v_rms at 0.040, 0.037 and 0.034. The friction falls with Ha as in the reference (by 2.4 % and 3.1 %, against 2.0 % and 3.9 %). The level is 3-4 % low on this grid, which is outside the plan's 3 % gate at Ha 0 and 5. Nu stays at 5.5 at every Ha, because conduction dominates at Pe 150. The repo cites no reference Nu for this case. Cost: 0.21 s per step on 2 office threads, 1.3 GB RSS. Not added to the docs or tests: the grid is coarser than the reference, and a gate would need the 64^2, 4 pi run.



Reference grid, 2026-11-17: 96x64x64 cells, box 4 pi, tanh beta 2 (first cell centre at y+ 0.5, seven cells below y+ 10, dx+ 26). RK3, CFL 0.5, A4000 float64, about 5 h per run with three runs sharing the card. Statistics from t = 154-173 to t = 704-706 (533-550 time units). The error bar is 95 % from 50-unit batch means, widened for their lag-1 correlation:

| Ha | f | Reference | Difference |
|---|---|---|---|
| 0 | 1.890e-2 ± 0.006e-2 | 1.714e-2 | +10.3 % |
| 5 | 1.824e-2 ± 0.015e-2 | 1.680e-2 | +8.5 % |
| 7 | 1.758e-2 ± 0.016e-2 | 1.647e-2 | +6.7 % |

This misses the 3 % gate, so no gate or figure is added. Twice the wall shear from the statistics matches the drive (1.901e-2 at Ha 0), so the momentum balance closes. Ha 0 runs at 32^2 isolate the causes (2-4 h each on office CPU, statistics from t = 100 to 450):

| Cells | Box | f | Difference |
|---|---|---|---|
| 48x32x32 | 2 pi | 1.667e-2 | -2.7 % |
| 96x32x32 | 2 pi | 1.489e-2 | -13.1 % |
| 96x32x32 | 4 pi | 1.680e-2 | -2.0 % |
| 96x64x64 | 4 pi | 1.890e-2 | +10.3 % |

The box length moves f by under 1 %. Starting the window at t = 200 instead of 100 moves it by 0.4 %. Halving dx lowers f by about 10 %, and doubling the cross-section cells raises it by about 13 %. The near-match on the coarse grid was two resolution errors cancelling. The constant drive leaves U_b at 0.95-0.96, so Re_b is 2850-2900 instead of 3000. That accounts for about 1 % of the excess (f ~ Re^-1/4). A 192x64x64 Ha 0 run (dx+ 13) is queued on office for the next free GPU.

## LMhdX 322

[Temperature through the RK3 stages](https://github.com/uwplasma/LMhdX/pull/322) · [Revision 8c6bec60](https://github.com/uwplasma/LMhdX/tree/8c6bec600d9b874e7a8338901a623ea0822dcb72)

Stacked on #321.

`Solver(method="rk3")` on a heated problem now carries the temperature through the momentum's three IMEX stages. Each stage takes its own electric solve, Joule heat, buoyancy and transport, and Crank-Nicolson conduction at the stage's implicit weight. Heat advection gains `"central"`, which is stable under RK3 to sqrt 3; Euler refuses it. `Solver(cfl=)` holds the step on the heated run too. The heat ledger sums the stage terms at their weights and closes at the Euler ledger's rounding floor. A step that ends non-finite is not taken on either path: the run holds its last finite state, and the rejection names that step. A heated state can carry statistics, the temperature's included, and the heated `Solution` returns its `state`, so a run can continue in chunks.

The Euler heat path stays for solid walls, held flows and open ducts. The RK3 step does not take those yet, and raises for them.

Temperature error against a run of 320 steps, at t = 0.4, buoyant duct 6x6x6, Ha 4 (laptop CPU, load 14-15):

| steps | 10 | 20 | 40 | 80 | observed order |
|---|---|---|---|---|---|
| RK3, central heat | 2.32e-4 | 5.83e-5 | 1.45e-5 | 3.45e-6 | 1.99, 2.01, 2.07 |
| Euler, upwind heat | 2.88e-2 | 1.36e-2 | 6.35e-3 | 2.72e-3 | 1.08, 1.10, 1.23 |

At 40 steps the RK3 error is 440 times smaller than Euler's.

Tests, local: `tests/test_timeloop.py`, `test_problem.py`, `test_io.py`, `test_physics.py` and `test_stepper.py` pass, after the two fixes in the last commit. The new test checks second order, the ledger, the refusal of central transport under Euler, and statistics in two chunks equal to one run. The old assertion that a heated run refuses `rk3` is removed. Audit budgets go up by the measured amounts.

Turbulent square duct with heat transfer, run on this branch (script outside the repo). Re 3000 on the bulk velocity and half-width, Ha 0, Pr 0.025, 48x32x32 cells, Lx = 2 pi, tanh stretching 2. RK3 with central momentum and heat transport and `cfl=0.5`. Constant drive G = f/2, using Krasnov et al.'s turbulent f = 1.714e-2, so U_b = 1 when the friction matches. The walls take a uniform inward flux, balanced by a uniform sink. From noise on a laminar profile the run stays turbulent for 755 time units, with v_rms 0.037-0.044 after t = 30. Statistics are averaged over the last 673 units.
- f from the mean bulk velocity: 1.667e-2, 2.7 % under 1.714e-2. It is still drifting down at the end of the run, from 1.75e-2 at t = 100. This is the coarsest grid tried and not a converged value.
- c_f on the walls normal to z, from the wall gradient: 8.72e-3.
- Nu on those walls (D_h = 2): 5.51 and 5.58. The usual liquid-metal comparators are Lyon's 7 + 0.025 Pe^0.8 = 8.4 (uniform flux) and Seban-Shimazaki's 5 + 0.025 Pe^0.8 = 6.4 (uniform wall temperature), at Pe = 150. Both are pipe correlations, and the uniform sink here differs from an axially developed flux, so they bound the value roughly and do not gate it.
- Cost: 110 ms per step on 2 threads at load 12-16 (35 at one point). Peak RSS 0.80 GB. 63 chunks of 250 steps in 30 minutes.


Device check, float64, on the whole stack (#319 to #322). The duct is periodic in x with walls in y and z, Ha 5, Re 3000, central transport, 20 RK3 steps. CPU is the laptop on 2 threads (load 17-19). GPU is one RTX A4000 on office; it took the job when it was idle, but another user's job started on it during the run, so the GPU times are upper bounds.

| | 48x32x32 CPU | 48x32x32 GPU | 96x64x64 CPU | 96x64x64 GPU |
|---|---|---|---|---|
| Poisson solve, warm | 0.86 ms | 0.45 ms | 7.4 ms | 1.9 ms |
| RK3 step, cold (compile and 20 steps) | 7.0 s | 12.5 s | 20.0 s | 15.4 s |
| RK3 step, warm | 105 ms | 18-23 ms | 647 ms | 179 ms |
| with statistics, warm | 120 ms | 18 ms | 787 ms | 241 ms |
| heated RK3 step, warm | 140 ms | 17 ms | 808 ms | 198 ms |
| peak device memory | - | 0.13 GB | - | 0.32 GB |
| CG iterations per step | 14.2 | 14.2 | 17.4 | 17.4 |

CPU and GPU agree to 1.9e-13 (48x32x32) and 5.0e-13 (96x64x64) in velocity, relative to its maximum, after 20 steps. The temperature of the heated run agrees to 1.1e-13 and 1.7e-13. Nothing in these PRs helps on one device and hurts on the other.

## LMhdX 329

[H4.7: delete the 1.x case, io and fully developed modules and their entry points](https://github.com/uwplasma/LMhdX/pull/329) · [Revision fdb29fa6](https://github.com/uwplasma/LMhdX/tree/fdb29fa6a75e7a5ac4f97c7c5f7e285b9d76aea8)

H4.7 of `plan.md` (ADR 0010 DH4 to DH7, ADR 0012 DC8): the 1.x case machinery is deleted. H4.5 (#323) moved the examples, docs and validation onto `Problem`, `Solver`, `Output` and `solve` and made the 1.x entry points warn; this removes them. The release (version, `CITATION.cff`, Zenodo, PyPI) and H4.6 are not in this PR.

**Source**

- Deleted: `cases.py` (1,166 lines), `io.py` (1,134), `fully_developed.py` (809). `coreflow.py` (439) moves to `validation/coreflow.py`; its callers (`validation/freemhd.py`, `validation/gci.py`, `tests/test_coreflow.py`) and the external-validation path filter follow.
- Kept, moved: the units, ratios and `WallLayer` become `units.py` (286); the field-table files `Table` reads move to `fields.py`; `NumericalFailure` moves to `solver.py` before `cases.py` goes (ADR 0012 DC8); `LoggingSpec` moves to `output.py` and `require_finite` to `q2d.py`, their only users. `solve` takes a `ChannelProblem` and a `Q2DProblem` directly.
- New `cli.py` (30 lines): `lmhdx FILE.toml [table.key=value ...]` and `lmhdx upgrade OLD.toml`. The `lmx` alias and the `run`, `validate` and `benchmark` commands are gone; exit status 2 on a rejected run, as before.
- Importing the package sets no `XLA_FLAGS`. `lmhdx.configure(gpu_gemm=True)` adds the cuBLAS flag, once, on the `lmhdx` logger.
- Removed from the root: `make_hartmann_case`, `make_shercliff_case`, `make_hunt_case`, `solve_fully_developed_fields`, `generate_rect_duct_mesh_from_faces` (41 to 36 exports). `docs/reference/migration.md` maps each removed name.

**Measured** (`scripts/audit_architecture.py`, every budget set to its measured value)

| | before | after |
|---|---|---|
| package modules | 21 | 19 |
| package lines | 15,445 | 12,301 (-3,144) |
| root exports | 41 | 36 |
| test files | 26 | 25 |
| test lines | 17,932 (main at 45d2574) | 16,206 |
| validation files | 10 | 11 (`coreflow.py`; the largest stays `mistrangelo.py`, 813) |
| checkout bytes | 4,274,045 at HC3 | 4,069,585 |
| wheel, sdist | | 250,172 and 236,947 bytes (limits 256 and 240 KiB) |

The loans of H4.1 to H4.5 (2,018 lines) are repaid; the ledger in H.10.8 is updated. Coverage of the tests outside the slow tier is 96.15 % (gate 95 %).

**Tests**

The tests of the 1.x entry points are deleted. Anything that still covers a 2.0 path was kept or ported, with no tolerance changed and no test moved to a slower tier.

- `test_fully_developed.py` is deleted. Ported to `tests/test_laminar_anchors.py` on `duct(...)`: the spectral quadrant and aspect-ratio references, resolved walls on one and on two axes, thin walls on both axes, the sheared field, an axial field component, odd meshes, and the first-order start from rest. The matched Ha 20 to 1000 accuracy pins were already in `test_steady.py`; the shared-program test there loses only its `fully developed` route.
- `test_design.py` keeps the `steady.channel_*` tests and gains the channel versions of the drive derivative, drive elimination, power in a stronger field, `DuctResponse`, the mismatched velocity and the conducting wall; the case-based duplicates go.
- `test_io.py` becomes `tests/test_output.py`: the logger, `Output`, restart, the command and the module entry point. The writers, plots, restart bundles and argparse branches go with the code.
- `test_toml.py` stays, since it tests schema 3 and `upgrade`; the two tests that compared with the 1.x loader now pin what that loader built (cell widths, material, field, wall) as numbers, and the other against the spectral reference.
- `test_config.py` becomes `tests/test_repository.py` (CI tiers and shards, audit, API surface, hygiene, a gate that no tracked file outside the plan, its log, the ADRs and the migration guide names a removed 1.x entry point, and the import-time options). `test_physics.py` becomes `test_q2d.py` (its Q2D tests; the case and report tests go). `test_benchmarks.py` becomes `test_run_benchmarks.py` (the script's tests).
- 937 tests collected (19 slow). CI shard maps, the `fully_developed` shard and the change gate follow the new names.

**Local results:** `ruff check` and `ruff format --check`, `audit_architecture.py --check --measure-import` with the built wheel and sdist, `sphinx -W`, and `pytest -n 2 -m "not slow"` with coverage.

Not done: H4.6 (SOLVAX moves), the version bump and release, and a separate changelog file (the migration guide is final).

## FAX 67

[Solve stellarator-symmetric problems in real arithmetic](https://github.com/uwplasma/FAX/pull/67) · [Revision 4c96a330](https://github.com/uwplasma/FAX/tree/4c96a3308a232c28c02f6f22b54e61611248790c)

With every asymmetric harmonic zero, the map (theta, zeta) -> (-theta, -zeta) commutes with the continuum and global operators, so their matrices in exp(i(m theta - n zeta)) are real (imaginary parts measured at 1e-16 of the largest entry on CTOK, precise QA, with `finite_beta` and with sound). `continuum_matrices` and `global_matrices` now return real arrays when the geometry is stellarator symmetric on the host (`fax.geometry.symmetric`), and every eigensolve downstream runs in float64 instead of complex128. A traced geometry, as in `jax.grad` with respect to the geometry or the vmex design path, keeps the complex path, so derivatives along asymmetric directions are unchanged.

Same pencil in both dtypes, warm, eigenvalues equal to 1e-13 relative. Precise QA of Knyazev et al. (fixture), 49 nodes:

| case | office CPU (8 threads, load 34) real / complex | laptop M4 (4 threads, load 75-88) real / complex |
|---|---|---|
| dense, H = 64 (N H = 3136) | 14.3 s / 124.9 s | 2.83 s / 18.9 s |
| dense, H = 24 (1176) | 0.77 s / 6.78 s | 0.10 s / 1.64 s |
| targeted, 8 modes near 30 kHz, H = 64 | 0.31 s / 0.73 s | 0.076 s / 0.187 s |
| continuum, 162 harmonics, 49 surfaces | 0.26 s / 0.58 s | 0.062 s / 0.25 s |
| pencil storage, H = 64 | 6.1 MB / 12.1 MB | |

The laptop was heavily loaded, so its absolute times are noisy; the ratios agree with the office ones.

Test: `test_symmetric_geometry_is_solved_in_real_arithmetic` compares the real matrices and the dense and targeted eigenvalues with the traced complex path on a 9-surface circular torus with a toroidal |B| variation. The fast suite passes locally (114 passed). Stacked on #66. CI did not run (drafts skip CI). GPU, RTX A4000, float64, shared with another job at 100% utilisation on the same card (so absolute times are noisy): dense H = 64 real 2.28 s / complex 6.65 s, H = 24 0.22 s / 0.53 s; targeted H = 64 0.45 s / 0.93 s; QA continuum `eigh` 0.086 s / 0.170 s. Eigenvalues agree as on CPU. Against #66 alone, the eager calls with #67-#69 on the GPU are faster warm on QA (continuum 0.23 to 0.13 s, 8 modes 0.99 to 0.49 s) but compile 8-10 s longer cold (CTOK modes 18.3 to 26.4 s, QA modes 18.5 to 28.8 s); on the laptop CPU the extra cold time is 0.1-1 s. The increase is the compilation of SOLVAX's `generalized_eigenpairs` for float64 instead of complex128 inputs: with `JAX_LOG_COMPILES` on the same eager calls it goes from 7.5 to 14.6 s (Koenies) and from 14.8 to 23.1 s (QA) on the A4000, against 3.6 to 4.6 s on the laptop CPU. Every other program compiles in the same time, and #68 and #69 add nothing (15.4 and 15.8 s, 23.7 and 24.6 s). The dense fallback is not compiled at these sizes (`N H > 2048`), so it is not that branch. With the persistent cache this is paid once per shape.

## FAX 68

[Parity sectors for stellarator-symmetric geometry](https://github.com/uwplasma/FAX/pull/68) · [Revision 6edd83e3](https://github.com/uwplasma/FAX/tree/6edd83e3a0c0a2bd266394bb723d08fb21b08d7e)

The single-sign basis exp(i(m theta - n zeta)) of a harmonic list drops the coupling of (m, n) to (-m', -n') through the field harmonic (m + m', n + n'). That harmonic exists whenever 2n is a multiple of nfp: every family at nfp = 2, the n = 0 family in a tokamak. A real potential needs both signs, and the single-sign problem then matches neither physical sector. On precise QA (nfp = 2, the 162 AE3D harmonics) the (m, n) x (-m', -n') block is 3.9% of the largest stiffness entry, 1240 of 15876 continuum branches move by more than 1%, and the largest move is 62%.

With stellarator symmetry the problem on (m, n) and (-m, -n) splits exactly into a cos sector (STELLGAP's basis) and a sin sector (AE3D's), each real and the size of the list. `parity=1` or `-1` in `continuum_matrices`, `continuum` and `global_matrices` (and through them `eigenmodes` and `frequency_hz`) assembles the two-sign problem and projects it onto one sector. It raises on asymmetric geometry and on a list that holds (m, n) and (-m, -n). The default stays the single-sign basis; whether the default should change is left open. The Knyazev helpers use the option in place of their own projection.

Against STELLGAP (cos basis), all 98 fixture surfaces, relative L2 error of the sorted branches:

| basis | mean | p95 | max |
|---|---|---|---|
| single-sign (default) | 3.0e-3 | 3.4e-3 | 4.3e-3 |
| `parity=1` | 1.6e-3 | 2.5e-3 | 2.6e-3 |
| `parity=-1` | 3.6e-3 | 4.3e-3 | 4.4e-3 |

Cost of one sector against the full two-sign problem, precise QA, 49 nodes, office CPU, 8 threads, load 30-36 (the two-sign problem is also real here, through #67; without the symmetry it is complex and costs about 2.4x more in the targeted solve and 8x more dense):

| H | method | sector (N H, pencil, time) | two-sign (N H, pencil, time) |
|---|---|---|---|
| 24 | dense | 1176, 0.85 MB, 0.66 s | 2352, 3.4 MB, 6.5 s |
| 24 | targeted, 8 modes | 0.09 s | 0.15 s |
| 64 | targeted, 8 modes | 3136, 6.1 MB, 0.19 s | 6272, 24.3 MB, 0.62 s |
| 64 | dense | 12.3 s | not run (about 8x) |

Assembly goes from 0.84 s to 1.16 s warm (H = 64), since the sector is built from the two-sign matrices.

Test: `test_parity_sectors_split_the_two_sign_problem_and_cos_is_stellgaps_basis` checks that the union of the two sectors equals the two-sign problem (continuum and dense global eigenvalues to 1e-9), that the single-sign basis differs from the cos sector by more than 1%, and the STELLGAP gate of the cos sector. `tests/test_knyazev.py`, `test_continuum.py` and `test_eigen.py` pass on the office CPU. Stacked on #67. CI did not run (drafts skip CI).

GPU (RTX A4000, float64, card shared with another job): H = 24 dense sector 0.21 s against two-sign 1.07 s; H = 64 targeted sector 0.44 s against two-sign 0.92 s. Same eigenvalues as on CPU.

## FAX 72

[Solve the real potential on both signs by default](https://github.com/uwplasma/FAX/pull/72) · [Revision 9052ca01](https://github.com/uwplasma/FAX/tree/9052ca0154f336c6d27231e58f3bdd4b3235019a)

The potential is real, phi = Re sum x_j exp(i(m_j theta - n_j zeta)). Its energy has a Hermitian part, which couples (m, n) to (m', n') through the field harmonic (m' - m, n' - n), and a bilinear part, which couples (m, n) to (-m', -n') through (m + m', n + n'). The averaged field only has toroidal numbers that are multiples of nfp (only 0 when axisymmetric), so the bilinear part is nonzero only for pairs with n + n' a multiple of nfp (n + n' = 0 in a tokamak). FAX's default solved the Hermitian part on the listed harmonics alone and dropped the bilinear part.

When that is exact and when it is not:
- Exact: no listed pair has n + n' = 0 mod nfp. This covers a tokamak with n != 0 (CTOK, Koenies) and a single stellarator family N = n mod nfp with 2N != 0 mod nfp (N = 1 at nfp = 4 or 5). Each complex eigenvalue is then a degenerate pair of real modes (the two travelling waves), and the list is complete.
- Not exact: self-conjugate families, N = 0 (any nfp; n = 0 in a tokamak) and N = nfp/2 (N = 1 at nfp = 2, N = 2 at nfp = 4). Also a list holding both N and -N, which `alfven_harmonics` produces for every stellarator.

The default now solves the list on both signs, split into the blocks that do not couple (`fax.continuum.spectral_blocks`):
- A family N with its conjugate -N != N is one complex pencil on (m, n) of family N and (-m, -n) of family -N. The conjugate pencil has the same eigenvalues and is skipped, so each eigenvalue (a travelling pair) is reported once, as before.
- A self-conjugate family is one pencil on both signs. With stellarator symmetry the reflection (theta, zeta) -> (-theta, -zeta) commutes with the operator and maps exp(i(m theta - n zeta)) to its conjugate, so that pencil is real and splits exactly into a cosine sector (STELLGAP's basis) and a sine sector (AE3D's). Each sector is the size of the list; the sine sector has no (0, 0).

What the default returns is both sectors, merged and sorted. The reasons:
- Completeness. The two sectors are different spectra, and both are physical. STELLGAP reports the cosine sector, AE3D the sine sector, and each alone misses half of the modes; in precise QA the 26-35 kHz gap holds 79 cosine and 91 sine modes at 64 harmonics.
- Degeneracies. The merged list has no artificial duplicates. Where the bilinear coupling of a mode vanishes, the two sectors give the same eigenvalue; that is a true degeneracy, and the existing tie rule gives NaN gradients for a selection that splits it.
- Labels. `structures` stay the coefficients x of the listed harmonics: real for a cosine mode, -i times real for a sine mode, with the potential Re sum x exp(i(m theta - n zeta)).
- Coverage of the default by case:
  - nfp = 1 tokamaks: n != 0 is unchanged; n = 0 splits into sectors.
  - Odd nfp: only N = 0 is self-conjugate; N and nfp - N form one pencil.
  - Asymmetric geometry: the self-conjugate pencil is solved as one complex problem on both signs, with the same eigenvalues.
  - Traced geometry (the vmex design path, `jax.grad` in the geometry): symmetry cannot be checked at trace time, so it takes the complex two-sign pencil, which is exact either way; a traced geometry with nfp = 1 counts as axisymmetric.
  - The design path differentiates through the merged values (first order, test below).

`parity="single"` keeps the old basis and `parity=1` or `-1` one sector, in `continuum`, `eigenmodes`, `frequency_hz`, the design options and TOML (`[run] parity`). `continuum_matrices` and `global_matrices` still assemble exactly the list they are given. Both signs double the span of dm, so the angle grids default to the smallest unaliased size (at least 32; `ntheta = nzeta = 0` in TOML). `mode_families` pairs N with -N, and `summary` labels branches through the block vectors. The two sectors of a family share one assembly on both signs.

#### Old default against the new one

"new >1%" is the share of new branches farther than 1% from every old branch on the same surface.

| case | branches old → new | new >1% (max) | reference |
|---|---|---|---|
| CTOK n = 2 | 13 → 13 | 0 | identical |
| Koenies n = 6 | 12 → 12 | 0 | identical; TAE 64.632 kHz both |
| CTOK n = 0, m = 1..12 | 12 → 24 | 9.6% (22%) | new = two-sign list to 3e-10 |
| precise QA (nfp 2), 162 harmonics, 98 surfaces | 162 → 324 | 4.9% (12.6%) | new = two-sign list to 1e-6; vs STELLGAP: cosine sector 1.6e-3 mean (2.6e-3 max), old 3.0e-3 (4.3e-3) |
| same, 96 harmonics | 96 → 192 | 7.9% (12.7%) | |
| QH (nfp 4), `alfven_harmonics(m <= 8)`, 40 / 80 surfaces | 176 → 254 | 9.6% / 9.5% (45%) | |
| same, m <= 12 | 266 → 389 | 3.8% (41%) | |
| W7-X (nfp 5), m <= 8, 40 / 80 surfaces | 198 → 226 | 7.2% / 7.2% (14%) | |
| same, m <= 12 | 290 → 337 | 3.1% (14%) | |

Gaps (`summary`):
- QA: the same six gaps (three TAE, three HAE), centres within 0.01 kHz and widths within 0.03 kHz.
- QH: the old run gives six HAE gaps from four separate families. The new one splits the harmonics into three groups, and the gap centres move by 0.1-0.6 kHz (35.32 → 34.76, 21.89 → 21.77, 22.61 → 22.28 kHz).
- W7-X:
  - Old gaps: TAE gaps at 58.03, 54.46 and 53.00 kHz, plus NAE and HAE gaps at 222-550 kHz.
  - New gaps: TAE at 57.69, 54.36 and 52.60 kHz, an EAE at 40.71 kHz, and an HAE at 231.6 kHz.
  - The selected gap mode moves from 52.90 kHz (in the (6,6)-(7,6) TAE gap) to 50.38 kHz (in the (6,5)-(5,5) gap). The 50.38 kHz mode is present in both bases with overlap 1.00.

Global modes and eigenfunctions. Overlaps are between the old and new coefficient vectors; for an old complex mode this is the overlap with its two-dimensional real eigenspace.
- CTOK n = 0, near 300 kHz: 287.5-315.9 kHz becomes 292.2-310.9 kHz, with overlaps 0.80-0.92.
- Precise QA, the 12 modes nearest 30.3 kHz: 6 of 12 old modes have overlap below 0.95 with every new mode. This holds at all five resolutions: 49 and 99 nodes, 40, 64 and 96 harmonics. The other modes match to 0.97-1.00, so the difference is the basis and not the resolution.
- Precise QA n = 0, the three lowest modes of `examples/qa_vmex.py`: 294.11, 294.44, 294.92 kHz become 245.55, 245.76, 246.06 kHz. The grid change alone (8 × 8 to 16 × 32) moves them by 0.003 kHz. The reason is visible in the continuum. On both signs the m = 1, n = 0 branch splits into a cosine branch (258 kHz at s = 0.5, minimum 243.7 kHz at s = 0.03) and a sine branch (346.5 kHz at s = 0.5). The single-sign basis gives 300 kHz, between the two, and no real mode has that frequency. Because the new minimum sits near the axis, the lowest eigenvalue no longer converges at first order on uniform nodes: 253.2, 252.4, 242.2 and 250.9 kHz at 16, 32, 64 and 128 nodes, against 294.7, 294.2, 294.0 and 293.9 kHz before. `test_boundary_gradient_and_radial_refinement`, which checks first-order convergence of the edge minimum, now pins `parity="single"`.
- The archived AE3D mode (sine basis) overlaps the new modes by 0.34 and the old ones by 0.65 at 64 harmonics. The old number is the overlap with two-dimensional degenerate eigenspaces, so it is not a better match. Neither basis gives a single-mode match, as `docs/validation.md` already states.
- QH, modes at the 21.77 and 34.76 kHz HAE gaps: 4 and 6 of 8 have overlap below 0.95.
- W7-X:
  - The {1, 4} pair at 57.69 kHz moves by 0.4-0.6 kHz.
  - The N = 0 gap at 54.36 kHz: the gap mode (50.38 kHz) is unchanged and its neighbours move by up to 1 kHz.
  - The {2, 3} pair at 40.71 kHz moves by 0.1 kHz or less.

#### Runtime and memory

`ab_runtime.py`, one call per fresh process, old and new interleaved under the same load, two rounds (range shown). Old is the single-sign basis with #66-#69 (real arithmetic, one field period). Each cell is cold / warm / peak RSS.

Office CPU (8 threads, 1 BLAS thread, load 16-31):

| call | old | new | values |
|---|---|---|---|
| CTOK, 8 modes near 384 kHz | 6.6-6.7 s / 0.29 s / 0.96 GB | 6.4-7.2 s / 0.26-0.27 s / 0.95 GB | 8 / 8 |
| QA continuum, 162 harmonics × 49 surfaces | 3.3-4.1 s / 0.35 s / 0.80 GB | 5.4 s / 0.95-1.05 s / 0.97-1.00 GB | 7938 / 15876 |
| QA 8 modes near 30.3 kHz, 64 harmonics | 5.9-6.1 s / 0.44-0.46 s / 0.91 GB | 9.1-10.1 s / 1.12-1.16 s / 1.28-1.33 GB | 8 / 8 |
| QH continuum, 176 harmonics × 40 surfaces | 2.6-2.9 s / 0.36-0.37 s / 0.85-0.90 GB | 7.1-7.5 s / 0.69-0.70 s / 0.84-0.85 GB | 7040 / 10160 |
| QH 8 modes | 6.6-6.7 s / 1.46-1.50 s / 1.73 GB | 18.3-19.4 s / 1.99 s / 1.18-1.20 GB | 8 / 8 |
| QA dense, 64 harmonics | 17.6 s / 13.6 s / 1.25 GB | 35.7 s / 30.2 s / 2.17 GB | 3136 / 6272 |

Laptop M4 (4 threads, load 65-149, so only the ratios are meaningful): QA continuum warm 0.15-0.20 s against 0.42-0.57 s, QA 8 modes 0.15-0.32 s against 0.56-0.79 s, QH continuum 0.13-0.18 s against 0.22-0.44 s, QH 8 modes 0.83-1.02 s against 0.70-1.11 s, QA dense 7.2 s against 15.6 s (RSS 0.96 against 2.76 GB), CTOK unchanged.

GPU: the interleaved A/B on the A4000 did not run, because both cards stayed busy with other jobs for the whole session. The closest measurement is from #68 on a shared A4000 (float64, H = 64, 8 modes near 30 kHz): one sector 0.44 s against the single-sign real solve 0.44-0.45 s. Two sectors therefore cost about twice the old basis with #67, and the same as the complex single-sign solve on `main` (0.93 s). This is an estimate, not a measurement of this branch.

The default does more work where the old basis was incomplete: twice the modes for a self-conjugate family, and an assembly on both signs over a grid twice as fine in theta. Against `main` (complex single-sign, before #67) the QA dense solve takes 124.9 s on the office CPU, so the new default is still four times faster there. Assembling only the (S, S) and (S, -S) blocks would halve the assembly. That is the next step and is not in this PR.

#### Tests

- `test_default_basis_is_both_signs_split_into_independent_blocks` (tokamak n = 0, symmetric and asymmetric geometry) checks, against the two-sign list:
  - the block structure;
  - the continuum, eager and under `jit`;
  - dense and targeted eigenvalues;
  - that every returned mode, mapped back to both signs, is an eigenvector (residual below 1e-8);
  - `jax.grad` of `frequency_hz` in the density (analytic) and in the geometry (finite differences to 1e-5) through the merged sectors.
- Knyazev tests use STELLGAP's cosine sector by default and pin the single-sign number explicitly. `mode_families` pairs N with -N. The TOML runner, examples and docs (theory section 2, validation, tutorials, README scope row) are updated; the QA example's printed values are the new ones. The QA optimization numbers in the tutorials and validation pages are marked as single-sign and were not rerun.
- `test_continuum.py`, `test_knyazev.py` and `test_api.py` pass on Python 3.10 with JAX 0.4.38. Full suite under coverage on the laptop (vmex 0.15, probes on one thread as the conftest sets): 129 passed, statements 99.91%, branches 99.46%. Lint and `sphinx -W` are clean.

Stacked on #69. CI did not run (drafts skip CI).

## JAX-in-Cell 42

[Research PIC API with tested fields, walls, collisions and sources](https://github.com/uwplasma/JAX-in-Cell/pull/42) · [Revision d9d1402f](https://github.com/uwplasma/JAX-in-Cell/tree/d9d1402fbef534b15ae3ef5e92f1be051a046b31)

The research API now tests the Maxwell inversion independently, processes explicit wall impacts within the physical output interval, and records volume births separately from wall exchanges. It integrates the feature branches while preserving contributor history.

##### Changes

- Separate the curl inversion from nonlinear particle iteration: periodic FFTs and nonperiodic tridiagonal solves replace the linear fixed-point approximation. Direct dense Crank–Nicolson, Fourier-mode, boundary-work, precision and derivative controls verify the solve. Correct the staggered explicit vacuum test.
- Add optional `picard_tolerance` validation of the accepted field/orbit residual. The default retains fixed-iteration work; stable vacuum inversion does not guarantee nonlinear plasma convergence.
- Resolve accelerated explicit wall contacts and returned flights, retaining physical impact momenta. Detected repeat contacts and unresolved roots invalidate the step.
- Add prescribed electrostatic `Source(rate=..., drift=..., emit=..., every=...)` births, fixed capacity, independent weight/energy/momentum/projection budgets, sparse snapshots and exact restart. Document pulse cadence, neutralizing backgrounds and supported configurations.
- `run(snapshot_steps=n)` keeps every n-th completed step as well as an explicit index list; the dominant frequency is NaN for unevenly spaced snapshots instead of a value from the wrong frequency grid.
- Include collision corrections, tensor-field export, implicit impact budgets, quintic weighting and orbit-integral forces. Version archives for physical wall positions and birth budgets, preserve typed random keys, and document migration from the previous API.

##### Validation and limits

All tests passed (latest: 527 passed, 22 optional-backend skips) on Python 3.13/JAX 0.11 CPU. Four updated restart controls then passed, completing **100% line and branch coverage** without production changes. Direct field, wall, source and typed-key controls also pass on JAX 0.4.30. Strict Sphinx and configured flake8 pass. All six affected examples ran successfully and their plots were inspected; optional I/O uses real JSON/HDF5/ADIOS2 readback.

CPU XLA, LLVM and kernel profiling is retained. Correct magnetic contacts cost up to 4.4× the earlier straight-flight helper in the measured case; this is a correctness tradeoff, not an overall speedup. GPU performance remains unverified.

Nonperiodic Maxwell ghosts can exchange energy and are not general PEC/PMC boundaries. Magnetic flights, source cadence, collision statistics and nonlinear iteration require refinement. Unequal-weight collisions conserve statistically. This remains a separate research direction under development; preserve contributor history with a normal merge when ready.


Approved boundary main aa881b3 is an ancestor. This refresh preserves the research numerical implementation, tests, tutorials and migration guide; tests and documentation workflows now also run for PRs targeting research-release. The typed API rejects unsupported legacy field arguments and already implements sources.

## JAX-in-Cell 75

[Add relativistic collisions, radiation and differentiable RF control](https://github.com/uwplasma/JAX-in-Cell/pull/75) · [Revision ef500045](https://github.com/uwplasma/JAX-in-Cell/tree/ef500045a494c30850873de5e8f970b0cb3145c0)

Stack: base is `research-release` (#42 at `ac605d4f`); first of six, merge order #75, #80, #77, #79, #78, #76.

#### Why
RF-control studies of relativistic plasmas need accurate carried momentum, collisional pitch scattering, radiation reaction and a differentiable prescribed drive with a trustworthy energy budget. Reconstructing momentum from near-light-speed velocity loses information, and equating emitted radiation with negative mechanical work gives the wrong balance in a general electric field.

#### What
- `Species.u = p/m = gamma*v` (SI specific momentum) is carried through stepping, collisions, sources, walls, restart archives, diagnostics and openPMD output.
- Classical reduced Landau-Lifshitz radiation for selected species, with separate mechanical-work and physical-emission ledgers, in the implicit Picard residual and in explicit split stepping.
- Relativistic elastic center-of-momentum Coulomb collisions with Nanbu angles. The nonrelativistic path is unchanged.
- Prescribed fields `(x, absolute_time, parameters) -> (E, B)` as pure callbacks with dynamic parameter pytrees.
- Streamed per-species kinetic energy and prescribed, radiation, emission and collision budgets (`energy_balance`), without particle histories.
- Optional step checkpointing for reverse-mode differentiation, and a profiling script for forward runs, scalar AD objectives and ensemble sharding.
- Four asserted examples: magnetic beam cooling, laser-beam cooling, finite-time RF pitch control, and cold-plasma supplied-energy optimization.

Production changes extend existing modules. New files: four examples, one radiation docs page, one profiling script.

#### Tested
Python 3.12, JAX 0.12.0.1, CPU, float64 unless stated.
- 637 tests pass; coverage 2,838/2,838 statements and 726/726 branches. flake8 and `sphinx -W` clean.
- Magnetic cooling: max relative gamma error 8.6e-13, analytic dB derivative error 1.3e-11.
- RF pitch control: AD vs finite difference 8.3e-10; field exposure 0.752 -> 0.450 at the pitch target.
- Laser-beam cooling: second-order refinement, final-gamma error 1.6e-8, amplitude-derivative error 1.4e-6; mean gamma 80 -> 78.42.
- Source-energy optimization: 2.18% less supplied energy for the declared ideal port; source-cost gradient relative error 3.9e-4 against a continuum oracle.
- Sharding over two virtual CPU devices differs by 2.0e-15; checkpointed reverse AD vs finite difference 1.0e-10.
- Compiler temporary buffers for a 384-particle, 64-cell, 16-step implicit gradient: 87.6 MB without checkpointing, 6.6 MB with it (estimates, not measured peak memory).

#### Limits
- New radiation or prescribed callbacks with the implicit solver need periodic particle boundaries. Explicit wall paths work.
- No LL field-derivative term and no quantum emission here (see #78, #76). Collisions are fully ionized, leading-log, elastic; no partial screening or avalanche source.
- The RF examples show pitch control and supplied-energy accounting for an ideal non-recovering port. They do not show minimum power, net cooling or runaway suppression.
- 64-seed pilots show unresolved unequal-weight energy-budget variance in collisions; #77 addresses it.

## JAX-in-Cell 76

[Quantum-corrected mean recoil and chi monitor](https://github.com/uwplasma/JAX-in-Cell/pull/76) · [Revision cecbdc98](https://github.com/uwplasma/JAX-in-Cell/tree/cecbdc983945cb6263134381ddaf747b6b9c54c3)

Stack note: base is `radiation-references`; merge position 6 of 6 in the stack #75, #80, #77, #79, #78, #76 (merge in that order).

#### Why
The classical reduced Landau-Lifshitz model overstates recoil once the quantum parameter chi approaches 1, and the code gave no warning. This adds a chi monitor and a mean-recoil correction, and writes down the next stages with acceptance gates.

#### Changes
- `Work.chi_emission` and `diagnostics(out)["chi_mean"]`: emission-weighted mean chi. `lcfa_parameter(chi, omega)`: ratio of the field scale to the formation length (hbar/mc)/chi.
- `Radiation(model="ll_quantum")`: the reduced force and emitted power times the Niel et al. (2018) Gaunt factor g(chi). No new module; `landau_lifshitz` gains two optional arguments.
- Archives written before `chi_emission` still load (zeros).
- `docs/numerics/radiation.md`: the model, a gate table, and gated plans for Fokker-Planck diffusion, stochastic emission and pairs. None of these is implemented.

#### Validation
Float64, tests independent of the implementation (scipy quadrature of the nonlinear-Compton spectrum):
- g(chi) for 1e-6 <= chi <= 1e3: at most 1.4% from the quadrature (gate 2.5%).
- dg/dchi: at most 8.6% from the quadrature, at chi -> 0 (fit slope -5.44 against the exact -55 sqrt(3)/16 = -5.954). Gate 9%.
- chi -> infinity coefficient within 1% at chi = 1e5; chi = gamma B/B_S against CODATA constants to 1e-4; kernel power ratio within 2.5% of the quadrature at chi = 0.0009, 9, 900.
- Simulation emitted energy, quantum over classical, equals g(chi) to 1e-3 (explicit and implicit); chi_mean returns chi.
- Gradient of cooled gamma with respect to B through g(chi) matches central differences to 1e-6.
- flake8 clean; `sphinx -W` clean; coverage 100% statements and branches (combined from five workstation pytest processes).
- Test results: 196 + 98 + 76 + 87 + 183 passed. Two failures seen on the earlier base (example precision, wall-impact gradient NaN on jax 0.6.2) are fixed lower in the stack (#75, #80). The `test_api.py` expectation for the diagnostics keys is updated for `chi_mean`.

#### Limits
- Mean recoil only: no diffusion, photon sampling or pair creation. The reduced model still omits field derivatives.
- The Gaunt fit is accurate in value, not in slope (up to 9% bias in g'; 1.8% in d(chi^2 g)/dchi).
- `chi_mean` is an emission-weighted mean, not a maximum; a hot minority can be hidden.
- Local constant-field validity needs a >> 1; the code reports a only for a frequency the user supplies.

## JAX-in-Cell 77

[No-RF runaway baseline, moment-restored unequal-weight collisions and collision validation](https://github.com/uwplasma/JAX-in-Cell/pull/77) · [Revision f25a38e3](https://github.com/uwplasma/JAX-in-Cell/tree/f25a38e31735c841a219a16843a51a1ed4567121)

Stack note: base is `perf-profile-optimize`; merge position 3 of 6 in the stack #75, #80, #77, #79, #78, #76 (merge in that order).

#### Why
The no-RF homogeneous baseline, and the unequal-weight collision budget it rests on, were only prototypes: the 100 us run had a raw collision energy defect 26 times the seed's collisional transfer, no collision test checked relaxation to Maxwell-Juttner or Spitzer exchange, and the real time scale of the problem (seconds, not 100 us) was not measured.

#### Changes
- `collide(..., restore=True)` and `Collisions(restore=True)` (default off): after each cross-species stage the weighted momentum and energy of every cell are returned to their values before it, by a uniform shift and a Newton-solved scaling of the momenta of the higher-weight species. The lighter species, whose rates the stage computes, is bit-identical. Derivation in docs/numerics/collisions.md. Self-collisions are not corrected.
- `examples/3_advanced/runaway_baseline.py`: B=2 T, n=1e18, T=100 eV, 20 MeV seed 1e-5, lnL=15, E=5 mV/m. Total mean E held by an ideal J_ext=-J_plasma, per-species DC work, magnetic RR emission, omitted electric emission, restored collisions, and the reduced test-particle ODE (collisional drag, pitch scattering, drive, synchrotron) as the independent reference.
- Tests (all in `tests/test_collisions.py`): relaxation of a non-equilibrium gas to Maxwell-Juttner (T_eff and a KS test), electron-ion equilibration against Spitzer's exact rate at m_i=25 m_e and T_e/T_i=4, the Higginson variance 2(R-1)/M of the unequal-weight defect, the Connor-Hastie critical force on a gamma=100 electron, and the restoration properties.

#### Validation
- The four 64-seed handoff pilots and the cold-target variance table reproduce to the documented digits (raw defect SE 1.7e-4, 9.9e-5, 2.6e-4, 1.7e-4 J/m^3).
- Restoration, 64 realizations of the default: raw defect rms 1.4e-3 -> 4.8e-13 J/m^3; seed collision work -3.601e-5 -> -3.480e-5 (SE 1.8e-6 each), no bias. Cold-target defect over 512 replicates at R=64: variance 2(R-1)/M within 5 SE before, <1e-10 after.
- Kinetic seed <gamma> against the reduced ODE: 100 us -9.864e-4 vs -9.888e-4; 5 ms, 20 MeV start -4.959e-2 vs -4.935e-2; 5 ms, gamma 5 start +3.23e-3 vs +3.32e-3.
- Kernel vs Spitzer exchange: 0.95 of NRL, 0.98 of exact Spitzer as dt -> 0 (0.875 at dt=tau_e/50, step-size effect on slow electrons).
- Gate: flake8 0; sphinx -W ok; full suite split per file on workstation CPU (jax 0.6.2): 646 passed, 100% statement and branch coverage. The two failures seen on the earlier base (example precision, wall-impact gradient NaN on jax 0.6.2) are fixed lower in the stack (#75, #80).

#### Baseline result (what L4 needs)
- E/E_c=6.5, tau_c=2.23 s, tau_syn=1.29 s. The zero-noise test-particle ODE has a synchrotron-limited fixed point at gamma=13.13 (6.2 MeV, pitch 0.136 rad). It is not a bound on the kinetic tail. With collisional pitch-angle diffusion (Z+1=2) the stationary distribution at B=2 T, E=5 mV/m, n lnL=1.5e19 peaks at gamma=17.7 (pitch 0.10 rad), with mean gamma 21.9 and 90th percentile 33.8 (10.7 MeV mean kinetic energy, 16.7 MeV at the 90th percentile). The peak and shape agree with the DREAM kinetic solution (mode 16.8-17.1) to 4 %, the mean to 4-5 % after matching its momentum cutoff. The ODE is reached only as the diffusion is switched off. The 20 MeV seed relaxes toward the ODE for the first ~2 s (1/e time 4.64 s, 39.05 at 0.1 s; within 3 % of DREAM at 1-2.5 s and within 0.3-2.7 % of the ODE over the 5 ms windows) and then toward the kinetic bump, taking tens of seconds. Regrowth of a suppressed tail: 1/e time 7.5 s from gamma 5; 50/63/90 % of the gap in 4-6/6-8.5/16-18 s.
- Bulk Ohmic power ~32-37 W/m^3 (Spitzer 32; noisy at 2048 markers). Runs used dt = 0.2 us (tau_e/115, tau_e = 23 us); kinetic horizons are ms, the longer ones come from the ODE.

#### Limits
- Reference is a test-particle ODE with high-energy collision coefficients; DREAM and CODE were run separately and the PIC tail was checked against DREAM at long times; the live-bulk 5 ms windows are unchanged. Avalanche growth at E/E_c=6.54 is 0.05-0.07 /s (DREAM kinetic 0.053, CODE 0.073, Rosenbluth-Putvinski eq. 18 gives 0.073), 5-7 % per second and a factor 1.7-2.0 over 10 s; it is not in the kernels (no large-angle collision source) and is below 0.04 % over the 5 ms windows. Bremsstrahlung (~0.2 % of eE c), screening and reabsorption are not in the kernels.
- Restoration moves the correction onto the heavy species and is validated only for cross-species stages; it changes nothing for equal weights. Cells whose heavy markers have no spread keep their energy defect.
- 5 ms is the longest kinetic window run; four realizations.

## JAX-in-Cell 79

[Minimum supplied RF energy for runaway tail control: bounded study](https://github.com/uwplasma/JAX-in-Cell/pull/79) · [Revision daad1e94](https://github.com/uwplasma/JAX-in-Cell/tree/daad1e94d16e93006007fd90945d92979fb6b1bf)

Stack note: base is `runaway-baseline`; merge position 4 of 6 in the stack #75, #80, #77, #79, #78, #76 (merge in that order).

#### Why
L2 showed that at B=2 T, n=1e18, T=100 eV, E=5 mV/m synchrotron drag sets a fixed point at 6.2 MeV, so a minimum-RF problem for the 10 MeV threshold is degenerate there. This PR documents that as a bounded negative result and runs the full control program in one declared alternative scenario.

#### Changes
- `examples/3_advanced/runaway_rf_minimum.py` (stages: scenario, validate, source, opt_single/opt_random/opt_es, verify, margin) and `docs/numerics/runaway_rf_control.md`. No production code changed.
- Scenario: the synchrotron fixed point never disappears with E; it crosses 10 MeV at 6.26 mV/m. Declared study choice E = 15 mV/m (fixed point 58 MeV, 5.6x the threshold in gamma), hold 2.70 s from the measured regrowth gamma 5 -> 10 MeV, RF window 0.3 s. Collision and radiation strengths unchanged.
- Slow RF response: counter-propagating cold whistler, quasilinear pitch/energy diffusion along the wave-frame curve, compared with a resolved relativistic Boris push on 14 windows.
- Source energy: explicit drive current J_drive = curl B/mu0 - eps0 dE/dt - J_plasma, P = -J_drive.E, ideal nonrecovering port Q+ with zero-crossing quadrature; returned and net energy reported separately.
- Search: single band, random search (3 bands) and evolution strategy (3 bands), 240 evaluations each, frozen-control checks on independent seeds, dt/2, 2x nodes, +-30 % amplitude.

#### Validation
- rf_source_control.py reproduced on workstation (jax 0.6.2): Maxwell residuals, refinement gate, derivative checks and the source-cost optimum (controls 0, 2.5, 0.267, 0) match the handoff. Its field-exposure optimizer hit the iteration limit there, which does not affect the source-cost result.
- Resolved vs quasilinear, held-out windows: pitch-variance growth ratio 0.92 to 1.67 (mean 1.3), mean energy shift 1.1 to 2.0 times larger when resolved. Coherent, sparse and dense-line cases fail and fall back to the resolved push.
- Source ledger: closure 1e-6, supplied energy changes < 1e-6 under refinement, steady power within 3 % of the closed form.
- Best verified feasible control (3 bands, evolution strategy): Q+ = 5.1 J/m3 over 0.3 s (4.2 to 6.1 over the checks; 5 to 9 if the quasilinear tail exchange is low by the measured factor), tail fraction above 10 MeV at the end of the hold 1.6 % (upper bound 1.8 % on independent seeds); no RF gives 100 %. Single band 8.2 J/m3, random search 9.0 J/m3, same budget. DC Ohmic work over the 3.0 s horizon is roughly 1 kJ/m3.
- flake8 clean, sphinx -W ok.

#### Limits
- The constraint holds at the declared end of the hold only: the controls park the tail at the synchrotron fixed point of the scattered pitch (9 MeV mean) and with RF off 34 to 73 % exceed 10 MeV after another 0.5 s, 100 % after 1 s. With 2 s added to the hold no strategy finds a feasible control (smallest fraction 99.8 %), a bounded negative result for a 0.3 s window, three bands and b <= 1e-5.
- One check at 30 % lower amplitude fails for the best control (2.6 %).
- Most of Q+ is energy taken by the resonant tail, not bulk absorption (0.2 W/m3). The controls need noise-like bands, about 1e4 lines per band.
- Not modeled: avalanche, bremsstrahlung, transport, antenna loading and wall-plug efficiency, mode conversion, bulk heating by the wave. The ideal port is a lower bound.
- The slow quasilinear response holds only for noise-like (decorrelated) bands. A coherent comb gives bounded chaos (the band fills to 0.5-0.7 of complete mixing and stops) unless the phase decorrelation rate is at least about 0.03 of the line spacing.

## JAX-in-Cell 80

[Reproduce the gate, profile CPU/GPU, and cut the scatter cost](https://github.com/uwplasma/JAX-in-Cell/pull/80) · [Revision 3f2fe7d7](https://github.com/uwplasma/JAX-in-Cell/tree/3f2fe7d73ce9a52f1ddca90dbe1cba6e7d4ff30b)

Stack note: base is `relativistic-radiative-control`; merge position 2 of 6 in the stack #75, #80, #77, #79, #78, #76 (merge in that order).

#### Why
The gate and the CPU/GPU profile of the radiative-control branch had not been reproduced on the workstation host, and the GPU traces show that the deposit scatter-add (and its transpose in the gather) is the cost of an explicit or implicit run.

#### Changes
- On an accelerator the charge and the two transverse currents of a half step are one scatter of three columns, and above 8192 particles the deposit and the gather use 32 private grid copies, which removes most of the atomic contention. A CPU keeps the single-copy code.
- The contact-refinement `cond` is called directly when a prescribed drive makes it always taken. Under jax 0.6.2 (Python 3.10) its reverse pass returned NaN for `test_time_dependent_wall_impact_energy_and_gradient_converge`; the suite passes under 0.6.2 now.
- `docs/scripts/profile_workloads.py` times the beam-laser, RF-control and maintained-sheath workloads; the performance page has the profile record with before/after tables.
- Two kernel tests (large deposit and gather against numpy) and one test of the accelerator path against the CPU one.

#### Validation
- Gate on workstation CPU, Python 3.12, jax 0.12.0.1: 642 tests pass, coverage 100 % of 2862 statements and 734 branches, `flake8 . --count` 0, `sphinx -W` clean. Python 3.10 with jax 0.6.2: 553 pass, 1 skipped (all modules except `test_api.py`).
- GPU (RTX A4000, shared host, 3 alternating rounds, median): explicit forward 131072 electrons 108 -> 50 ms (64 cells), 82 -> 50 ms (256 cells); float32 61 -> 15 ms; implicit 1550 -> 916 ms; radiation 375 -> 310 ms; collisions 226 -> 166 ms. Small cases (2048 electrons) move 0 to 9 %.
- Derivatives: AD vs JVP 1e-12 or better and unchanged derivative values (1e-12) in every row; reverse 0.75 to 0.99 of the parent time at 16384 electrons.
- CPU: workstation core and Apple core forward medians unchanged (1.00 to 1.01); workloads unchanged within 1 %. Maintained sheath on GPU 32.8 -> 29.8 s (CPU 555 s).

#### Limits
- The collision loop is launch-bound on the GPU and the radiation arithmetic is compute-bound; neither was changed. The implicit step is still 10 to 15 times an explicit one.
- Collision single-scatter variant was slower on CPU and dropped. No Pallas kernel was written.
- The GPU is shared with other jobs; reverse runs without checkpointing at 131072 electrons do not fit in 16 GB (implicit asks for 78 GiB). Compiler temporary bytes are not peak memory.
- The examples were not rerun for this PR.

## JAX-in-Cell 85

[Examples without arguments, sized to run in about a minute](https://github.com/uwplasma/JAX-in-Cell/pull/85) · [Revision 45f63ea3](https://github.com/uwplasma/JAX-in-Cell/tree/45f63ea360e1d5bcf083f7d8926f1cd9ed58edf9)

Every example is now a plain top-to-bottom script with no arguments, and the CI Examples job runs all of them.

**Examples**
- Removed `--quick`, `--oblique`, `--matched`, `--reference=`, `--gamma=`, `--every=`, `--markers=`, `--transits=`, the stage list and the `BASELINE_*`, `JIC_*` environment variables. Those that mattered are ordinary variables at the top of the script (`oblique`, `reference`, `ion_every`, `stages`, `out_dir`).
- The defaults are the former smoke presets, sized to finish in under about a minute on the CI runner. The converged values stay in the script as `research:` comments next to the setting.
- Each header says what the script shows, its reference and its runtime. `examples/README.md` lists every script with its CI runtime and a table of which feature each one covers.
- `electron_cooling.py` gains a short `Radiation(model="ll_quantum")` case at chi = 0.29: the final energy matches an independent ODE with the Gaunt factor of Niel et al. (2018) to 1e-3, and is above the classical value. This was the one radiation model without an example.
- Removed none: each remaining script covers something the others do not. `runaway_rf.py` overlaps most with `rf_source_control.py` and is the one I would drop first.
- `rf_source_control.py` now always writes `./rf_source_control`, and its SLSQP limit is 200 iterations instead of 60. The CI runner needed 69 for the field-exposure problem and stopped at 60.
- Slowest defaults reduced: `langmuir_wave` (3 wavenumbers), `landau_damping` and `bump_on_tail` (fewer particles), `compare_models` (3000 particles, seed 1e-3 so the seed stays above the noise), `wall_reflection`, `conservation`, `sheath_reflection` (30 Debye lengths, 3000 steps, 1500 markers), `grazing_sheath` (a smoke run at 30 degrees), `sheath_optimization`.

CI Examples job on this branch: 27 scripts, four at a time, about 5 minutes in total; the slowest is `sheath_reflection` at about two minutes. The step prints each script's seconds.

**Coverage**
`pyproject.toml` already measures the whole `jaxincell` package with branch coverage, omits only the generated `version.py`, has no `pragma: no cover` anywhere and fails under 100 %. The base (`ef5b322`) reports 2931 statements, 744 branches, 100 %. Nothing to change in the configuration. `tests/test_edge_cases.py` adds three degenerate-input tests: a lone marker moving at constant velocity, a 1e-30 m^-3 density, and a 1e31 m^-3 plasma resolved at omega_pe dt = 0.1.

**Docs**
The `--quick` and flag lines in `docs/examples/` and `README.md` now describe the variables. Figures quoted in the docs were made with the `research` values.

Based on `quantum-recoil`.

## JAX-in-Cell 86

[Packed collision sort, species-only radiation reaction, checkpoint default, NaN guards](https://github.com/uwplasma/JAX-in-Cell/pull/86) · [Revision 4e29a443](https://github.com/uwplasma/JAX-in-Cell/tree/4e29a44391236822b82e80f529d800d4b17f202d)

Four small changes from a profiling pass over the top of the stack, one commit each.

**Collision sort.** The pairing sort was a two-key, three-operand `lax.sort`. The cell number and the random bits now form one packed key (uint64 with x64; uint32 without, with the cell in the top bits and a `ValueError` past 2**24 cells), sorted by one `argsort`. Each species is also sorted once per step, and every pairing of that species in the step (self and cross) reuses the permutation, where before each pair drew its own. The pairings of one stage are still uniform; stages of the same step now share the order of a species, so e-e and e-i partners of a particle are correlated within a step. The random stream changes, so seeds give different realisations. All 72 existing collision tests pass unchanged.

**Radiation reaction.** The Landau-Lifshitz force ran on every particle and was then masked by zeroing the charge of unselected species. It now runs on the selected species blocks only.

**Checkpoint.** `run(checkpoint=True)` is the default. `checkpoint=False` keeps the intermediates. README, running and differentiation pages updated, and a test pins the default. The compiler-estimated reverse-mode temporaries on the performance page are 8 to 40 times smaller with it.

**Guards.** Three configurations returned NaN without a message and now raise `ValueError` when the object is built:
- a thermal particle wall with an absorbing field wall on the same side;
- explicit `ll_reduced` with a given `external_B` where `tau (q/m)^2 B^2 dt / substeps` exceeds 1;
- the implicit solver with `omega_pe dt` above 100 (the profile saw NaN fields at 564, none at 56).

The radiation and implicit checks look only at concrete values, so traced or self-consistent fields are not covered. Each guard has one case in the existing error table.

**Measured**, CPU, x64, machine load about 47, best of several runs. Sort alone, 64 cells:

| particles | before | after |
|---|---|---|
| 100k | 17.4 ms | 7.6 ms |
| 1M | 200 ms | 71.6 ms |

Step time, 2 species of 20k particles each, 64 cells, ms per step (two runs each, before then after):

| case | before | after |
|---|---|---|
| PIC | 5.1, 4.9 | 5.0, 4.7 |
| collisions (3 pairs) | 16.0, 17.8 | 9.5, 8.7 |
| radiation, electrons only | 8.7, 10.0 | 7.9, 7.7 |

Tests: 640 passed, 22 skipped; flake8 clean; coverage of the package is 100% except `_plot.py` and `openpmd.py`. Seven plot and ffmpeg tests fail here because matplotlib cannot find DejaVu Sans on this machine, which is unrelated to the diff. GPU timings were not repeated.

## SPECTRAX 18

[Fix implicit midpoint time, convergence reporting and pytree states](https://github.com/uwplasma/SPECTRAX/pull/18) · [Revision 4937b9c1](https://github.com/uwplasma/SPECTRAX/tree/4937b9c190b7a6ed263383c16baab46e1488961a)

**Target:** main. **Head:** `806c2e4`, two commits on main `ab87385`. Old head: `60ca682`, a 25-commit integration merge carrying #9/#12/#13/#34/#46/#48/#50/#51/#52/#53.

**Dependencies:** none. The step uses `jax.tree.map`, so it works with the flat state on main and with #13's `(Ck, Fk)` tuple state. #21 builds on this solver.

#### Problem
`ImplicitMidpoint` on main:
- (a) evaluates the RHS at `t1` instead of `t_n + dt/2`;
- (b) always returns `successful`;
- (c) breaks on PyTree states.

The previous fix for (b) set `not_converged = norm >= 1` and returned its complement. **A NaN residual is False for both `< 1` and `>= 1`, so a NaN step ended as success.** The flag also described the residual *before* the last update, not the iterate that was returned.

#### Change (`spectrax/midpoint_solver.py` only)
* The RHS is evaluated at `t_mid`, and all state arithmetic uses `jax.tree.map`. This is the original commit, kept.
* **Convergence is decided on the residual of the returned iterate.** That residual must be finite and its scaled norm < 1. Tolerances are unchanged (`rtol=1e-6`, `atol=1e-8`, same scaled norm).
* **A nonfinite residual or Newton update ends the step as `nonlinear_divergence`.** This also covers a failed inner GMRES solve. An exhausted Newton budget ends as `nonlinear_max_steps_reached`.
* **A failed step returns an infinite error estimate**, as Diffrax's own implicit solvers do:
  * with an adaptive controller, the step is rejected and retried smaller;
  * with constant steps, the failure becomes the result of the solve.
* GMRES restarts are `max(1, min(20, max_iters // 2))`. Before, `max_iters=1` gave zero GMRES restarts, so the single allowed update was a no-op.

#### Tests (local, macOS CPU, Python 3.12, jax 0.11.2, diffrax 0.7.2, at `806c2e4`)
`python -m pytest -q -n 2 tests`: 21 passed. With `JAX_ENABLE_X64=1`: 21 passed.

New file `tests/test_midpoint_solver.py`, 10 tests. Run against the previous #18 solver, the 9 failure-path tests all fail.
* **NaN / ±Inf RHS:** result is `nonlinear_divergence` and the error estimate is inf.
* NaN reached only after an update.
* **Failed inner solve:** a `custom_jvp` with a NaN tangent gives a failure, never success.
* **Max iterations:** with `y'=-y³`, one update is not enough, and a converged run satisfies the midpoint equation to 1e-9.
* **Last allowed update:** linear `y'=-y` with `max_iters=1` succeeds with the exact `(1-dt/2)/(1+dt/2)`.
* **Zero iterations:** accepts an already exact predictor and rejects an inexact one.
* **Whole solves:** a constant-step solve ends with the failure, and an adaptive solve rejects failed steps and still finishes accurately.
* **Harmonic oscillator** (ω=2, dt=0.2, 250 steps, `rtol=1e-12`):
  * energy is conserved to < 1e-11;
  * phase follows `(2/dt) arctan(ω dt/2)` to 1e-9;
  * the accumulated lag matches `ω³dt²t/12` within the expected O((ω dt)²) correction (2.3% here).

#### Evidence on a Landau case (not in CI)
Setup: 1D Landau, Nx=4, Nn=40, ν=0, t=20, consistent initial field as in `Examples/1D_Landau_damping.py`. Reference: Dopri8 at tol 1e-10. Midpoint uses constant steps with `rtol=1e-10`.

| dt | max rel. total-energy change (saves at steps) | rel. E₁ error |
|---|---|---|
| 0.4 | 1.5e-8 (saves interpolated) | 8.4e-2 |
| 0.2 | 1.7e-12 | 2.1e-2 |
| 0.1 | 1.7e-12 | 5.3e-3 |

* **Order:** the error falls 4× per halving of dt, so the method is second order.
* **Energy:** at saves that fall on steps, the energy change equals the Dopri8 reference's own 1.7e-12. At saves between steps, `LocalLinearInterpolation` does not conserve energy (about 1e-9 at dt=0.1).
* **Phase:** we compared zero crossings of Re E₁ with the reference (ω = 1.3439 from the reference). The phase lag at t = 17.9 is:

| dt | measured lag | predicted by `(ω/ω̃ - 1) ω t`, ω̃ = (2/dt) arctan(ω dt/2) | ratio |
|---|---|---|---|
| 0.4 | 0.561 | 0.568 | 0.988 |
| 0.2 | 0.142 | 0.144 | 0.984 |
| 0.1 | 0.0355 | 0.0361 | 0.982 |

#### Notes for review
* **Error estimate is first order.** `y_error = y1 − (Euler predictor)` is an O(dt²) local estimate for a second-order method, so adaptive midpoint steps are conservative. This is unchanged here.
* **No reverse-mode AD.** The Newton loop is a `lax.while_loop`, so it is not reverse-differentiable. Use Dopri8 for `jax.grad`.

GitHub CI: see the checks on this head. The local results above are not CI results.

## SPECTRAX 21

[Use SOLVAX Newton-Krylov with a Hermite line preconditioner in implicit midpoint](https://github.com/uwplasma/SPECTRAX/pull/21) · [Revision 188281d3](https://github.com/uwplasma/SPECTRAX/tree/188281d393159e35bacca92b42c9adceac825a51)

**Depends on #13 (structured tuple state) and #18.** Their commits are included here until they merge; merge #13, then #18, then this.

#### Problem
Unpreconditioned Newton-GMRES in `ImplicitMidpoint` needs thousands of Krylov iterations once the timestep exceeds the Hermite streaming/collision time scales, and gives no iteration diagnostics.

#### Change
- Newton-Krylov solve delegated to `solvax.newton_krylov` (PyPI; deps only `jax` + `equinox`, already pulled by diffrax; `solvax>=0.8.0` added to `pyproject.toml`/`requirements.txt`, tested with 0.8.0 and 0.26.0). New options `linear_rtol`, `linear_atol`, `linear_restart`, `linear_max_restarts`, `preconditioner`.
- `collision_diffusion_x_streaming_preconditioner(args, dt)`: exact inverse of the collision + diffusion + x-streaming Hermite tridiagonal lines (`jax.lax.linalg.tridiagonal_solve`).
- `simulation()` returns `midpoint_stats` (total/max Newton and GMRES iterations) when the solver is `ImplicitMidpoint`.
- Default `solver` stays `Dopri8` (see below).

#### Effect
1D Landau, Nx=33, Nn=128, nu=20, t=10, x64, same machine, interleaved runs (min of 3). Error = max |Fk - Fk_ref| / max |Fk_ref| against Dopri8 at tol 1e-11.

| solver | dt | wall | error |
|---|---|---|---|
| Newton + `jax.scipy` GMRES (incremental), no preconditioner | 0.5 | 29.5 s | 1.1e-1 |
| Newton + `jax.scipy` GMRES, line preconditioner | 0.5 | 0.69 s | 1.1e-1 |
| **this PR** (SOLVAX + line preconditioner) | 0.5 | **0.24 s** | 1.1e-1 |
| Newton + `jax.scipy` GMRES, line preconditioner | 0.02 | 8.3 s | 1.9e-4 |
| **this PR** | 0.02 | **4.9 s** | 1.9e-4 |
| Dopri8 adaptive, tol 1e-8 (default) | - | 1.3 s | 1.2e-7 |

- The preconditioner is the large win at large dt (about 40x). SOLVAX's Newton-Krylov is a further 1.7-3x over the best equivalent written with `jax.scipy.sparse.linalg.gmres` at the same preconditioner and iteration counts, and it reports GMRES iteration counts.
- Dopri8 stays the default. At equal accuracy it is 4-10x cheaper than implicit midpoint on the shipped-style cases: 1D Landau, a stiffer Landau (Nn=256, nu=100), 1D two-stream and a 2D (17x9) Landau case.

##### Where implicit midpoint wins
Dopri8's step is set by stability (step count does not change between tol 1e-4 and 1e-8), so implicit midpoint wins when the dynamics of interest are slow compared with the collision or streaming rates. Runs on 6 pinned cores (`taskset`), min of 2 runs, compile time excluded (implicit ~9 s, Dopri8 <3 s). Error is max over saved times of |Fk - Fk_ref| / max |Fk_ref|; the reference is Dopri8 at tol 1e-12. Implicit uses the line preconditioner with `rtol=1e-8, linear_rtol=1e-6`.

| case | solver | steps | wall | field error |
|---|---|---|---|---|
| collisional Landau, Nx=3, Nn=64, nu=2000, t=50 | Dopri8, tol 1e-4 to 1e-8 | 24061-24469 | 30.6-32.3 s | 6e-6 to 3e-7 |
| | implicit, dt=0.05 | 1000 | 2.9 s | 1.4e-3 |
| | implicit, dt=0.02 | 2500 | **2.6 s (12x)** | 2.2e-4 |
| collisional Landau, Nx=33, Nn=128, nu=1000, t=20 | Dopri8, tol 1e-4 to 1e-8 | 4399-4617 | 58.7-62.9 s | 8e-6 to 3e-7 |
| | implicit, dt=0.05 | 400 | **7.2 s (8x)** | 1.3e-3 |
| | implicit, dt=0.02 | 1000 | 22.4 s (2.7x) | 2.1e-4 |
| ion acoustic wave, mi/me=100, Ti/Te=0.1, Nx=33, Nn=128, nu=50, t=300 | Dopri8, tol 1e-4 to 1e-8 | 8035-8085 | 107-113 s | 3e-4 to 3e-9 |
| | implicit, dt=0.5 | 600 | **23 s (4.7x)** | ion density 2.1e-4; field 1.7e-2 for t>=50 |
| | implicit, dt=0.1 | 3000 | 89 s (1.2x) | field 5.6e-4 for t>=50, 3.3e-3 incl. the initial electron transient |

- The ion acoustic case is a win only when the slow observable (ion density) is what you need. Resolving the field to 1e-3 needs dt=0.1, and then it is only 1.2x faster.
- At dt >= 1.5 in the ion acoustic case Newton fails on the first step, and the solve reports failure instead of returning a result.
- Reverse-mode gradients: neither the old nor this Newton loop is reverse-differentiable (`while_loop`); use Dopri8 (gradient matches finite differences to 8e-7).

#### Tests
`test_implicit_midpoint_simulation_reports_iterations` (preconditioned run, stats present) and `test_collision_diffusion_x_streaming_line` (matches a dense solve). Full suite passes with and without `JAX_ENABLE_X64=1`.


---
#### Review 2026-10-03 (branch not changed; head `9c066cc`)

**Scope.** The only #21-specific commit is `567e0c4`. The rest of the 28-commit head is accumulated #9/#12/#13/#18/#34/#46/#48/#50/#51 history.

**Restacking needed.** #18 was rewritten (now `806c2e4`) with an outer-residual and finiteness fix. This branch must be rebuilt onto the new #18 (and #13) before review of the diff itself.

**Failure handling.** `solvax.newton_krylov` stops on a nonfinite residual or threshold with `converged=False`, and decides on the residual of the current iterate. So a NaN is not reported as success here. Two gaps remain:
* `y_error` is not set to inf on failure, so an adaptive controller may accept a failed step's estimate before the failure ends the solve. Corrected #18 sets it to inf.
* The stopping test `‖F‖ ≤ max(atol, rtol‖F(y_Euler)‖)` is unscaled and relative to the predictor's residual. That is a different contract from the scaled per-component test in #18.

**Coupling.** The preconditioner reads parameters by negative positions in `args` (`args[-20:-18]`, …). That is fragile against any change of the `args` tuple.

**AD.** No reverse-mode AD: the Newton loop is an early-exit `while_loop`. SOLVAX's `fixed_work=True` scan path is not used. Forward mode was not tested.

##### Matched-error profile
* **Case:** collisional 1D Landau (`input_1D_landau_damping.toml` with Nx=3, Nn=64, ν=2000, t=20), consistent initial field.
* **Reference:** Dopri8 at tol 1e-12.
* **Error:** max over saves of |Fk − Fk_ref| / max|Fk_ref|.
* **Timing:** time of the second call, so compile is excluded. Single run per row, on a laptop CPU.
* **Midpoint settings:** `rtol=1e-8`.
  * #21 uses `linear_rtol=1e-6` with the line preconditioner.
  * Corrected #18 uses `atol=1e-10`.

| solver | dt / tol | steps | Newton / GMRES iterations | run time | error |
|---|---|---|---|---|---|
| Dopri8 | tol 1e-4 | 8955 | – | 2.35 s | 7.7e-6 |
| Dopri8 | tol 1e-8 | 9362 | – | 2.43 s | 4.5e-8 |
| #21 SOLVAX + line preconditioner | dt 0.004 | 5000 | 5048 / 9533 | **1.12 s** | 7.7e-6 |
| corrected #18 (jax.scipy GMRES, no preconditioner) | dt 0.004 | 5000 | – | 4.18 s | 8.8e-6 |
| #21 SOLVAX + line preconditioner | dt 0.02 | 1000 | 1029 / 2144 | **0.23 s** | 2.2e-4 |
| #21 SOLVAX, no preconditioner | dt 0.02 | 1000 | 2000 / 15459 | 0.90 s | 2.2e-4 |
| corrected #18 | dt 0.02 | 1000 | – | 0.89 s | 2.2e-4 |

* At matched error (about 8e-6), #21 is **2.1× faster than Dopri8** and **3.7× faster than plain midpoint**.
* At 2e-4, #21 is about 4× faster than plain midpoint. Dopri8 cannot go that coarse: it is stability-limited, about 9000 steps at any tolerance.
* The gain comes from the line preconditioner. SOLVAX without it is no faster than corrected #18.
* This is one stiff, collisional case. The PR's own tables show Dopri8 is 4–10× cheaper on the shipped low-collision examples.

##### Recommendation
**Hold** for the owner's numerical and performance review. Restack it on the corrected #18, then:
* set `y_error = inf` on failure;
* replace the positional `args` reads with named parameters;
* consider loading SOLVAX as an optional dependency.

## SPECTRAX 34

[Add mainline magnetic reconnection example](https://github.com/uwplasma/SPECTRAX/pull/34) · [Revision 79bfe922](https://github.com/uwplasma/SPECTRAX/tree/79bfe9220735128853a249b505e2b5e90119a61c)

#### Problem
Main has no magnetic-reconnection example on the rFFT solver.

#### Change
One file, `Examples/2D_magnetic_reconnection.py`: periodic double Harris sheet with the Camporeale et al. (2006, sec. IV.C) parameters (`m_i/m_e=16`, `omega_pe/Omega_ce=3`, `T_i=T_e`, `rho_i/a=2`, guide field 5). Harris pressure balance gives `v_th,e = sqrt(2)/6 c` and hence `a = sqrt(2) d_e`; thermal speeds `a/6`, `a/24` and drifts `±1/(6a)` follow. Evolves in chunks, fits the half-sheet magnetic-mode growth, and writes a growth/flux plot, a `J_z` movie with `A_z` contours and an npz file. `--perturbation 1e-4` is the linear diagnostic, `0.1` a finite-seed nonlinear island.

#### Effect (CPU, shared 36-core node)
- default 33x9, H=4, t=10: finite, 12 s
- 65x17, H=4, t=500, perturbation 0.1: closed island, 258 s; last-Hermite-mode fractions 4.3e-8, 2.6e-5, 3.5e-5
- Linear tearing (perturbation 1e-4, ny 5, nu 1, t = 1000; ky = 1 mode at the X point, fit over 500 <= t <= 1000) against Camporeale's 0.256 Omega_ci = 5.33e-3 omega_pe:

| nx | H | gamma | vs paper | runtime |
|---:|---:|---:|---:|---:|
| 65 | 10 | 2.39e-3 | -55 % | 3.7 h |
| 129 | 6 | 4.76e-3 | -11 % | 53 min |
| 129 | 8 | 4.84e-3 | -9 % | 3.3 h |
| 257 | 6 | 5.07e-3 | -4.9 % | 3.9 h |

  The rate converges in nx (the sheet needs nx >= 257 in this box); extrapolating nx (second order) and H gives about 5.25e-3, 1.5 % below the paper. The docstring records the table.

#### Tests
Example only, no solver change; full suite 7 passed (also with `JAX_ENABLE_X64=1`).



#### Update 2026-10-03 (head 87c4cf7)
- Growth observable and fit now match: the docstring names the observable (first ky mode of (Bx, By) over the left half-box), and gamma is a least-squares fit of its log over `--fit-window` (default: second half of the run). The output also has the fit rms log residual and the rates of the two halves of the window, as a check that the window is in a single exponential phase. The earlier fit through local maxima for t >= t_max/4 is gone.
- The movie shows the kinetic current `J_z/Omega_ce` from the Hermite moments (`plasma_current`). It is not labelled curl B, which also contains `dE_z/dt`.
- Hermite tails: `hermite_tail_fraction` per population (from #9) replaces the unweighted all-species sum without Parseval weights. **Depends on #9**. With main's two-population `dCk` bookkeeping, populations 3 and 4 keep their k=0 background, so the tail fractions are exact only after #12.
- The convergence table is kept, but labelled as measured with the old peak fit and not re-measured. The "second-order extrapolation to 5.25e-3" is removed because no spatial order was measured.
- Run here: default smoke (33x9, H=4, t=10) and t=40 with `--fit-window 10 40`, both finite, on main + #9 (4.6 s and 10.5 s on a laptop CPU). These short runs are transient, not tearing growth: the rms residual is 0.46 and 0.98, so the new output flags them.
- Equilibrium normalization: checked independently (see #33). Harris drift `V = v_th^2/(Omega_ce a)` = `1/(6a)` and `J_z/Omega_ce = (curl B)_z = sech^2/a` with `a = sqrt(2) d_e`. This example uses the exact `1/3, 1/48` constants.

## SPECTRAX 44

[Differentiable simulation: Diffrax adjoint pass-through, tests, and an Orszag-Tang inverse-design example](https://github.com/uwplasma/SPECTRAX/pull/44) · [Revision 8fff8bab](https://github.com/uwplasma/SPECTRAX/tree/8fff8bab7400dcfd446e6b18b0045949c53fbce6)

**Target:** main. **Head:** `3ad4a9d`. Old head: `49c4c69`, a merge of #21/#18/#13 and other branches carrying about 950 lines of unrelated diff.

**Stacked on #50** (`2744422`), which provides `max_steps`, `throw` and the validity metadata. Until #50 merges, this diff shows #50's four commits. Review only the top two:
* `c4038a7`: the original #44 commit;
* `3ad4a9d`: the cleanup.

This PR does not depend on #13, #18 or #21.

#### Change
* `simulation` accepts `adjoint` and `progress_meter`, both static.
  * `adjoint` defaults to `RecursiveCheckpointAdjoint()`, so behaviour is unchanged.
  * `RecursiveCheckpointAdjoint(checkpoints=k)` bounds reverse-mode memory.
  * `ForwardMode()` works with `jax.jacfwd`.
* `kinetic_energy_species` is returned real, so scalar objectives are real.
* `Examples/2D_Orszag_Tang_optimization.py`: the controls are stream-function phases and the objective is magnetic-energy conversion. It checks the reverse-mode gradient against centred differences, then runs L-BFGS-B.
  * **The example no longer keeps its own real-FFT weights.** It had `w = 1` for k=0 and `w = 2` otherwise, a second, parity-dependent copy of the Parseval rule that #9 fixes in the library.
  * It now takes the grid mean of `Bx² + By²` after `irfftn`, which needs no weights for any `Nx`.
  * The example is not run in CI.

#### AD contract
* **Supported:** reverse mode through Diffrax's checkpointed adjoint, and forward mode, for explicit solvers such as Dopri8 (adaptive) and Tsit5 (fixed step).
* **Not supported:** `ImplicitMidpoint` in reverse mode. Its Newton loop is a `lax.while_loop`.
* Objectives must be real scalars.

#### Tests (local, macOS CPU, Python 3.12, jax 0.11.2, diffrax 0.7.2, at `3ad4a9d`)
* `python -m pytest -q -n 2 tests`: 18 passed. The autodiff file alone takes 17 s on 2 workers.
* `JAX_ENABLE_X64=1 python -m pytest -q -n 2 tests/test_autodiff.py`: 6 passed.

`tests/test_autodiff.py` uses a tiny two-species Orszag–Tang case (8², 4³ Hermite):
* reverse mode = forward mode (rtol 1e-9) = finite differences, adaptive Dopri8;
* the gradient does not depend on the checkpoint budget (1, 4, 20);
* reverse-pass workspace does not grow from 10 to 80 steps;
* current-density and time-window objectives.
* **New, finite-difference plateau:** centred differences of a real scalar along a fixed direction, eps = 1e-1 … 1e-7.
  * The error relative to the AD directional derivative falls by more than 50× from eps 1e-2 to 1e-3.
  * It stays below 1e-6 over at least three consecutive eps.

Example: `python Examples/2D_Orszag_Tang_optimization.py --t-max 5 --iterations 2`
* reverse vs centred differences: max relative difference 2.9e-8;
* L-BFGS-B: 0.99956 → 0.991404 in 2 iterations;
* 9.9 s wall time.

GitHub CI: see the checks on this head. The local results above are not CI results.

#### Owner decision
Review the final API and gradient contract once:
* `adjoint` and `progress_meter` as static `simulation` arguments;
* real kinetic energies.

## SPECTRAX 51

[Maxwellians narrower than their Hermite basis, and a bump-on-tail example](https://github.com/uwplasma/SPECTRAX/pull/51) · [Revision 510b1185](https://github.com/uwplasma/SPECTRAX/tree/510b1185265974742dc26ba84926b4c876af34a3)

**Target:** main. **Head:** `30e67c4` (rebased on main `ab87385`; old head `ff6a0a0`). **No dependencies.** Supersedes #24.

#### Problem
* `compute_C_nmp` assumed every Maxwellian has exactly its basis width.
* Its factorial formula overflowed to NaN at high order (Nn = 112 and 256 on main).
* A beam expanded in its own narrow basis diverges once it is trapped and spreads.

#### Change
* **Independent widths.** `compute_C_nmp(..., vth_s=None)` takes physical thermal speeds separately from the basis widths `alpha_s`. The default `alpha_s/√2` keeps the previous result.
* **Stable recurrence.** Coefficients `cⁿHₙ(d/c)/√(2ⁿn!)`, with `c² = 1 − 2vₜ²/α²`, come from a three-term recurrence run as a `lax.scan`. There are no factorials, and compile time does not depend on Nn.
* **Corrected convergence statement.**
  * The basis weight is `exp(-(v-u)²/α²)`. A Maxwellian of standard deviation σ has finite weighted norm `∫ f²/F_b` **iff σ < α**, and its normalised coefficients decay like `|1 − 2σ²/α²|^(n/2)`.
  * The matched Maxwellian is σ = α/√2. **So Maxwellians broader than matched (α/√2 ≤ σ < α) are admissible.** The previous text wrongly said a Maxwellian wider than α/√2 does not converge.
  * This is a statement about this fixed weighted norm and the initial expansion only. It says nothing about other formulations, or about whether a truncated nonlinear run stays resolved.
* **`Examples/1D_bump_on_tail.py`** (Nx 33, Nn 128, ν = 3, t = 100; about 9 s on a laptop CPU).
  * The beam is expanded in the bulk basis.
  * The dashed γ = 0.198 line is labelled as linear theory, for orientation only.
  * The docstring says that neither the line nor this single resolution certifies the nonlinear saturation phase.
  * The example prints max|E_k| and min f.

#### Tests (local, macOS CPU, Python 3.12, jax 0.11.2, at `30e67c4`)
`python -m pytest -q -n 2 tests`: 19 passed.

Tests in `tests/test_initialize_maxwellian.py`:
* **Closed form:** the default and explicit `alpha_s/√2` reproduce the old formula (rtol 1e-12).
* **Narrow beam:** a narrow Maxwellian is reconstructed to 1e-12.
* **High order:** Nn = 256 stays finite.
* **New: σ/α = 0.5, 1/√2, 0.85, 0.95 against independent quadrature.**
  * Setup: two species, anisotropic α per axis, shifted centres, σ < α on every axis, Nn = 96 × Nm 6 × Np 4.
  * Every `C_nmp` equals the product of 1D coefficients projected by independent quadrature, to 1e-11 of the maximum.
  * The tail decay rate matches `√|1−2σ²/α²|` within 10%.
* **New: at and beyond the bound.**
  * At σ = α, the even coefficients stop converging: `Σ|g|²` keeps growing.
  * At σ = 1.1α they grow.
  * The recurrence stays finite in both cases.

Example run: `python Examples/1D_bump_on_tail.py` gives max|E_k| = 0.5298 and min f = −0.019, in 8.5 s wall time. This is a single resolution and not a convergence study.

GitHub CI: see the checks on this head. The local results above are not CI results.

#### Owner decision
Please personally check the weighted-norm statement and the test fixtures before merging.

## SPECTRAX 54

[Sync Discontinuous-Galerkin with main](https://github.com/uwplasma/SPECTRAX/pull/54) · [Revision a5998a8f](https://github.com/uwplasma/SPECTRAX/tree/a5998a8f27f3616dee8149646aadc3651bd37db5)

**Problem.** `Discontinuous-Galerkin` was 96 commits behind `main` (merge base bcd41c4).

**Change.** A merge of current `main` (ab87385, includes #49/#52/#53) into the branch, so the DG history and the open PRs #45/#39 stay valid.

Conflicts and how they were resolved:
- `spectrax/_model.py`, `_simulation.py`, `_initialization.py`: kept the DG solver. Main's rFFT layout, `_twothirds_mask` and Fourier default state do not apply to a DG discretization. From main, kept `solver_stats` in the simulation output.
- `spectrax/midpoint_solver.py`: took main's cleaned version. It removes the broken `_preconditioning`/`jaxopt` imports that DG had commented out.
- DG examples (`1D_Landau_damping`, `1D_two_stream`, `1D_Weibel`, `2D_Orszag_Tang` and their TOMLs): kept the DG versions. The Weibel files are kept even though main deleted them. Main's `adaptive_time_step` TOML key is not taken, because the DG `simulation` does not accept it.
- Everything else comes from main: diagnostics, the inverse-transform norm fix, `_initialize_maxwellian`, the old_src/crank_nicolson removals, docs, README and tests.

Follow-up commit: main's #52 test (a 2D multi-Hermite TOML with no initial state) failed on DG. `legT` was only given the x grid, and the default `Ck_0` ignored `Nm`/`Np`. Both are fixed. The test asserts the DG shape `(t, Ns*Nn*Nm*Np, Ny, Nx, Nz, Nl)`.

**Tests.**
- `pytest tests`: 9 passed, with and without `JAX_ENABLE_X64=1`.
- DG Landau example (Nx=33, Nn=40, N_DG=2): E-field damping rate -0.104. Main's Fourier solver gives about -0.099.
- DG two-stream example: the pre-existing `legT` old-signature call is fixed (3 lines). It runs in 105 s. The E-field growth rate fitted over t in [5,15] is 0.221, and kinetic linear theory gives 0.218 for k=5.0, u=+-0.1, alpha=0.0707. The fit depends on the window (0.21-0.38) because the 1% seed saturates by t of about 12.
- DG Weibel runs.
- DG Orszag-Tang at reduced size (12x12, Nn=Nm=3, t=5) runs and stays finite.

**Known issues (already on DG before this merge).**
- Main's Fourier-only additions (`1D_Landau_damping_dr_curve.py`, `1D_two_stream_gr_curve.py`, `orszag_tang_data_analysis.py`) do not run on the DG solver. They are kept so a later DG to main merge does not delete them.

Merge order: this PR, then #45, then #39.

#### Update 2026-10-03 (head 2f4ee44)
- Re-checked against main ab87385 (unchanged since the merge): `git rev-list origin/main ^HEAD` is empty.
- README: a short note at the top states that `simulation` on this branch is Legendre DG in space, lists the four DG examples, and says that `1D_Landau_damping_dr_curve.py`, `1D_two_stream_gr_curve.py`, `orszag_tang_data_analysis.py` and the `diagnostics`/`plot`/`inverse_HF_transform` utilities come from main, assume the Fourier layout and do not run on DG output. No code change.
- Tests: `pytest tests` 9 passed (also with `JAX_ENABLE_X64=1`), Python 3.12, JAX 0.11.2, CPU.
- Open question for review: main's `diagnostics` is exported here but is commented out in the DG `simulation`; a DG energy diagnostic would need Legendre mass weights, not rFFT weights.

Stack: this PR -> #45 (base now `sync/dg-with-main`) -> #39 (base now `agent/dg-autodiff`).


#### Update 2026-10-23 (head a5998a8)
- Merged current Discontinuous-Galerkin (21f5068) and main (b668d87). DG wins for the solver, examples and utilities (`DG_project`, `inverse_HDG_transform`, DG diagnostics and plots). The growth/decay rate scans (`*_dr_curve`, `*_gr_curve` and their toml/csv files) are not on the branch.
- From main: the logo, bytecode removal, diffrax/orthax deps, #50 `dtmin`/`max_steps`/`throw` (plus `solver_result` and `valid_times`), and #13's structured `(Ck, Fk)` solver state. Their tests are adapted to the DG layout. `ImplicitMidpoint` now accepts a pytree state.
- Not ported: #12 (`dCk` bookkeeping), because DG dropped `dCk` from the output.
- README DG note updated.
- Tests: `pytest tests` 17 passed (also with `JAX_ENABLE_X64=1`). Reduced DG Landau, two-stream, OT and Weibel runs stay finite. Landau E-field damping rate is -0.1036 at Nx=33, Nn=40.

## SPECTRAX 66

[Field-scaled closure rate for the asymmetric-Hermite top-mode instability](https://github.com/uwplasma/SPECTRAX/pull/66) · [Revision cdfd09d8](https://github.com/uwplasma/SPECTRAX/tree/cdfd09d8f6cc740b017930ff2b2c0c77dc1b5a64)

Stacked on #60 (`adaptive/p5-hypercollision`, d3379cc). Lands on main after the foundation PRs and #56–#60.

#### What
`field_scaled_closure_rate(F, alpha_s, qs, Omega_cs, Nn, Nm, Np, Ns, c)` returns a per-species rate
`nu_s = c |q/m|_s max_i sqrt(2 N_i) max_x |E_i - <E_i>| / a_{s,i}` shaped `(Ns,1,1,1,1,1,1)`, so it can be passed as
`nu` to `Hermite_Fourier_system` (whose `Col = -nu * col * Ck` already broadcasts) together with
`hypercollision_spectrum(order>=2)`. The docstring of `nu` now states it may be per species. No default changes:
nothing calls it unless the user does. 2 files, +93/-3 (`_model.py` +42/-3, new `tests/test_field_closure.py`).

#### Why (defect it addresses)
The truncated asymmetric-Hermite (AW) Fourier–Hermite operator `-v d/dx + (q/m) E d/dv` is not anti-self-adjoint.
In a non-uniform field it has spurious growing modes in the top third of the Hermite ladder at the largest kept |k|:
- frozen field E1 cos(k1 x), a = sqrt(2) v_te, Nn = 64: max Re(lambda) = 0.26 (|k| <= 2), 0.42 (|k| <= 5), 0.58 (|k| <= 10)
  at E1 = 4e-3; the symmetric (SW) basis gives 1e-15;
- oscillating field (omega = 1): Floquet exponent 0.044 (|k| <= 2) and 0.146 (|k| <= 5) at E1 = 0.02, zero below
  E1 ~ 8e-3; SW zero throughout.

The rate grows with the Fourier cut-off and with Nn, which is why, in the pump-frame strong-drive H05 runs,
x-refinement failed earlier (Nx 16 at t = 476 vs Nx 8 at 632) and Nn-refinement did not help. Aliasing
(padded-convolution check: 1e-16), step size (fixed dt 0.01: same failure time) and segment remaps (disabled:
same failure) were ruled out. A fixed nu is overtaken because the self-consistent field grows secularly; a rate
that follows max|E| is not.

#### Evidence (Dark-SPECTRAX branch `highk`, studies/highk_*.py, macOS, py3.12, JAX 0.11.2, CPU x64)
H05 pump frame, v_q/v_te = 0.1, c = 1, order-2 spectrum:
- Nx 16: reaches t = 700 (baseline failed at 476); c = 0.5 and 2 and Nn 128 agree with it to t = 700 (10% rule) on
  electron dK and W_ext; no negative kinetic energy or k=0 temperature; mobile-ion grid agreement on dK_e to 691.5
  and W_ext to 700. Before 550 the closure run equals the unregularized run to 5 digits.
- v_q/v_te = 0.03, Nx 16: reaches t = 1000; c halved/doubled agree to 1000; Nn 128 agrees to 980.5 (dK_e).
- Nx 32 (with the noise floor of Dark-SPECTRAX main): agrees with Nx 16 on dK_e and W_ext to 680 (v_q 0.1) and
  952 (0.03), then loses positivity at 672 / 942. That late loss is a physical broadband finite-k instability of the
  quivering plasma (growth rising with k up to k lambda_D ~ 0.1; exact Volterra, linear Hermite and the grid agree on
  it), which the closure correctly does not suppress; the grid at Nx 32 blows up at the same time.
The study wrapper used there equals this helper used as `nu` to 4e-16 relative.

#### Tests
`tests/test_field_closure.py`: c = 0 gives exactly zero; analytic value (uniform field excluded, axes with N <= 3
inactive); per-species nu in the RHS gives exactly `-nu_s col C` and zero rate of n, M_i, M_ii; jit.
Local: `python -m pytest -q -n 2 tests` -> 187 passed (tested SHA d0f371f). GitHub CI does not run on stacked PRs.

#### Open questions
- c = 1 is a choice; the H05 results are insensitive to c in [0.5, 2]. It is a regularization: report it.
- An L2-stable alternative is the symmetric (SW) basis, which trades exact momentum/energy conservation.

## SPECTRAX 71

[Conservative Dougherty collision operator in the moving Hermite basis](https://github.com/uwplasma/SPECTRAX/pull/71) · [Revision ffcaa2ef](https://github.com/uwplasma/SPECTRAX/tree/ffcaa2ef0aa07fc7d5b5b8a4d45b9cbf09dea64d)

Stacked on #66 (`highk/field-closure`, moving-basis stack #56–#60). Stacked PRs get no CI here; the full suite was run locally (197 passed before the TOML test was added, 11/11 in the new file).

#### What
A physical collision operator, the conservative Dougherty (Lenard–Bernstein with self-consistent moments) operator

C_ss = nu_ss d_v · [(v − U_s) f_s + theta_s d_v f_s],  theta_s = tr P_s / (d m_s n_s)

where U_s and theta_s are spatially local moments of the same f_s (Hakim, Francisquez, Juno & Hammett, arXiv:1903.08062, eq. 3–8; d = velocity dimension as in Gkeyll).

#### Hermite projection (exact, any moving basis)
With xi = (v − u_s)/a_s per axis, delta_i = (U_i − u_i)/a_i, tau_i = theta/a_i², and psi_n = H_n e^{−xi²}/sqrt(pi 2^n n!):
d psi_n = −sqrt(2(n+1)) psi_{n+1},  xi psi_n = sqrt((n+1)/2) psi_{n+1} + sqrt(n/2) psi_{n−1}. Composing the stencils before any truncation gives

(C f)_n = nu sum_i [ −n_i C_n + sqrt(2 n_i) delta_i C_{n−e_i} + (2 tau_i − 1) sqrt(n_i(n_i−1)) C_{n−2e_i} ]

Every source index is <= n (lower-triangular), so the projection onto the retained modes is exact at any N; no intermediate is truncated and no closure enters. It holds for any (u_s, a_s), including the time-dependent basis of #56–#60.

- Moments use only n <= 2 per axis: n = a_x a_y a_z C_0, U_i = u_i + a_i C_{e_i}/(sqrt2 C_0), P_ii/(mn) = a_i²[1/2 + C_{2e_i}/(sqrt2 C_0) − delta_i²].
- Conservation at finite N: rows 0 and 1 vanish identically; the row-2 energy terms sum to 2 C_0 (d theta − sum_i P_ii/mn) = 0. So density, momentum and energy are conserved to round-off whenever each active axis keeps n <= 2 (N_i >= 3). Axes with N_i <= 2 carry no second moment; on them the projected operator is identically zero, so they are skipped and not counted in d.
- Equilibrium: any Maxwellian with matching U, theta is in the kernel, truncated or not (lower-triangular rows of a kernel element).
- Shifted-centred basis (u = U, a² = 2 theta): every mode decays at exactly n nu.
- Spatial dependence: U(x), theta(x) and the products are formed in real space from the masked state, transformed and multiplied by the same strict 2/3 mask as the rest of the RHS.

#### Pair collisions (second part of the same commit)
m_s n_s nu_sr = m_r n_r nu_rs (pointwise), u_sr = u_rs = (U_s + U_r)/2, common
T_sr = (m_r T_s + m_s T_r)/(m_s + m_r) + m_s m_r |U_s − U_r|²/(2 d (m_s + m_r)). This is derived here from R_sr + R_rs = 0 and Q_sr + Q_rs = 0 and is Greene's form with beta = 0. Masses are m_s = 1/Omega_cs. Note: arXiv:1903.08062 leaves the cross-species coefficients to later work, and the Gkeyll collision-model docs page could not be reached, so the beta convention was not checked against Francisquez et al.; the conservation itself is tested.

#### Interface
- `simulation(..., collision_model="dougherty")` (static) with `input_parameters["nu_dougherty"]`: a scalar (self collisions of every species) or an (Ns, Ns) matrix (diagonal: nu_ss; upper triangle [s, r]: nu_sr; the lower triangle is ignored, nu_rs follows from momentum conservation).
- TOML: `[collisions]` with `model = "dougherty"` and `nu = ...`.
- Separate from the numerical hypercollision `nu`/`collision_matrix`. Default `collision_model=None`: the RHS is unchanged (no term is added; bitwise-equality test).

#### Tests (`tests/test_dougherty.py`, CPU, ~17 s)
- projection of the operator on an anisotropic, drifting, skewed 2V distribution against direct evaluation (autodiff of the flux, quadrature projection): agreement to 1e-9 relative; moments against direct quadrature
- density / momentum / energy conservation to round-off at finite N, per x, with spatially varying moments, Ns = 1 and Ns = 3 with pair collisions
- R_sr + R_rs = 0, Q_sr + Q_rs = 0 for the pair moments
- drifting Maxwellian narrower than and off the basis: exact equilibrium (< 1e-13); anisotropic Maxwellian is not
- n·nu decay rates in the shifted-centred basis
- time-integrated: T_x − T_y decays like exp(−2 nu t) (d = 2), 1e-7; two-species drift difference decays like exp(−(nu_sr + nu_rs) t / 2) with total momentum and energy conserved to 1e-11
- off is bitwise unchanged; nu = 0 matches
- jax.grad through a collisional run vs central differences
- TOML `[collisions]` table

#### Cost per RHS (laptop CPU, 4 threads, Ns = 2 with pair collisions)
| grid | off | dougherty | ratio |
|---|---|---|---|
| Nx=129, N=(64,1,1) | 0.386 ms | 0.585 ms | 1.51 |
| Nx=33, N=(16,16,1) | 0.378 ms | 0.495 ms | 1.31 |
| Nx=17, N=(8,8,8) | 0.416 ms | 0.603 ms | 1.45 |

The extra cost is one rFFT of the coefficient array plus the moment products.

#### Limits
- nu is constant per pair (no n- or T-dependence of nu yet).
- U and theta divide by the local C_0, so a state whose density approaches zero somewhere is not supported.
- Explicit stepping: the stiffness is about N nu.

## SPECTRAX 78

[Integrate one sharded (Ck, Fk) PyTree solver for one or many devices](https://github.com/uwplasma/SPECTRAX/pull/78) · [Revision bc4a03e8](https://github.com/uwplasma/SPECTRAX/tree/bc4a03e81643b2ef12a97b103c81fa78fa542ffb)

Part 5 of 7 of multi-device (spatial + species) execution for the DG solver. The PRs are stacked; merge them in order. This one targets `dg-parallel/4-runtime-config`; once the previous PR is merged, retarget it to `Discontinuous-Galerkin`.

This is the core change. `simulation()` becomes a host-side wrapper around a cached, jitted numerical core. The core integrates `Y = (Ck, Fk)` with one global Diffrax solve on the device mesh from `[parallel]`, using one device by default.

| array | shape | PartitionSpec |
|---|---|---|
| `Ck` state | `(Ns, Nv, Ny, Nx, Nz, Nl)` | `P("species", None, "y", "x", "z", None)` |
| `Fk` state | `(6, Ny, Nx, Nz, Nl)` | `P(None, "y", "x", "z", None)`, replicated across species groups |
| saved `Ck` | `(Nt, H, Ny, Nx, Nz, Nl)` (public shape) | `P(None, "species", "y", "x", "z", None)` |
| saved `Fk` | `(Nt, 6, Ny, Nx, Nz, Nl)` (public shape) | `P(None, None, "y", "x", "z", None)` |
| `qs`, `ms`, `alpha_s`, `u_s`, `A_pm` | species first | `P("species")`; small tables `P()` |

**Solver**
- jit `in_shardings`/`out_shardings` match the PyTree. Spatial faces stay global `jnp.roll` shifts, which XLA lowers to boundary-sized collective permutes.
- The species current needs one species-axis all-reduce per RHS evaluation when `ps > 1`.
- `PIDController` uses `state_rms_norm`, a shape-preserving global tree RMS norm.
  - Its value and zero-safe derivative match the flattened default.
  - It needs only scalar all-reduces, and the replicated field is counted once.
- `diffeqsolve(throw=False)`: the scalar status is checked once on the host with `diffrax.is_okay`, and a failed solve raises `RuntimeError`.
- New keywords: `parallel`, `progress_meter`, `max_steps`. New output key: `num_steps`.

**Initialization and input**
- `load_parameters` reads through `_runtime.read_input` and stores the validated layout in `solver_parameters["parallel"]`.
- `DG_project` compiles on the mesh with sharded element centres, integrand and output; `species=True` shards the leading species axis.
- Default initial data is projected only when it is not supplied.
- `Ns != 2` requires user-supplied `ms`, `qs`, `alpha_s`, `u_s`, `Ck_0` and `Fk_0`, and supplied shapes are validated.

**CLI:** loads the input before importing the numerical stack. New flags: `--no-plot` (prints a text summary; the generic `plot` still needs `output['dCk']`, which was already broken before this PR) and `--no-progress`.

**Tests (all pass, run per file):**
- 59 RHS and communication tests:
  - sharded RHS parity on spatial, species-only and hybrid layouts, covering 1D/2D/3D, N_DG > 1, and Ns = 4 with two species per shard;
  - halos across every device seam;
  - species-current reduction and ownership;
  - tree-norm parity and layout invariance;
  - compiled collectives: boundary-sized permutes, one species-axis current all-reduce, scalar norm reductions, and no all-gather or all-to-all.
- 78 runtime/bootstrap tests.
- 5 legacy and CLI tests.

The default single-device run matches the base commit to 1.5e-10, on values up to 53.

## SPECTRAX 82

[Lawson (integrating-factor) wrapper for the diagonal hypercollision damping (opt-in)](https://github.com/uwplasma/SPECTRAX/pull/82) · [Revision b9c302c5](https://github.com/uwplasma/SPECTRAX/tree/b9c302c5c4d5e7dc5a88b1464223a4ca1ad880d3)

#### Lawson (integrating-factor) wrapper for the diagonal damping — opt-in, bitwise off

Targets `main` (bf41830). Self-contained: it needs nothing from the closure PRs (#66 etc.). The older #81 is the same wrapper stacked on the integration lineage (field-scaled closure rate, Dark-SPECTRAX); it is merged into `integration/dark-baseline` only and is kept as the integration variant. This PR is the clean, main-based version.

##### What it is
- `spectrax.LawsonSolver(solver, rate_fn)`: wraps any explicit Diffrax Runge-Kutta solver (`Dopri8`, `Heun`, ...) so a diagonal damping `-r y` of the right-hand side is integrated exactly. `rate_fn(t, y, args)` returns a non-negative pytree like `y` (zeros for states that must not be damped). It is the hook for any stiff diagonal rate, e.g. the field-scaled closure rate of #66 (not a dependency).
- `simulation(..., integrating_factor=True)`: uses the hypercollision `nu * col` and hyper-diffusion `D k^2` rates of the existing right-hand side. Default `False` is bitwise unchanged (tested). Steps are clipped onto the save times (see dense output below).
- `hypercollision_rate`, `simulation_rate` helpers. +171 lines of library code, +138 of tests, +20 of `simulation`, a README section.

##### Derivation (also in the `spectrax/_lawson.py` docstring)
Write `f(t, y) = -r y + N(t, y)`, `r = r(y0) >= 0` frozen at the step start, `N = f + r y0 * y`. That is an identity for every `r`. With `w = exp(r (tau - t0)) y`:
`w' = exp(r (tau - t0)) (f(tau, exp(-r (tau - t0)) w) + r exp(-r (tau - t0)) w)`; one step of the wrapped RK tableau on `w` from `w(t0) = y0`, then `y1 = exp(-r h) w1`.
- **Order (h -> 0, fixed rate).** per Lawson (1967, SIAM J. Numer. Anal. 4, 372-380) the order of the underlying RK method is retained for a fixed linear part as h -> 0 (here the rate is the step-start rate, Lawson's re-evaluated-A form). No stiff-order claim is made when r h >> 1: per Hochbruck and Ostermann (2010, Acta Numerica 19, 209-286; Thm 2.17, Ex. 2.32, Table 2.2) the stiff order of Lawson methods drops (to 1 for Lawson-Runge) when ||hA|| is large. Empirical support is measured agreement with plain Dopri8 records (5e-10 in H05 c=64). The numerical order tests (Heun-Lawson order 2, Dopri8-Lawson order 8 with a state-dependent rate) are asymptotic h -> 0 checks.
- **Stability.** The stability function of a Lawson scheme equals that of the underlying RK method applied to `N` (arXiv:1910.12720, Section 3, which I read). So `-r y` no longer enters the stability condition `h r < ~5.17` of Dopri8.
- **Error estimate and dense output** are mapped back: `y_err = exp(-r h) w_err`; `y(t) = exp(-r (t - t0)) w(t)`.
- **Frozen rate.** The true rate varies over the step; the variation sits inside `N` and is treated explicitly (this is why `r` should vary slowly on the step, as the field-scaled closure does through `|E|`).
- **Dense-output caveat (measured).** `w(t)` is a polynomial; `y = exp(-r (t - t0)) w` is accurate only for `r h` of order one. Saves on step ends are exact. `simulation(integrating_factor=True)` therefore wraps the controller in `ClipStepSizeController(step_ts=save_times)` (users of `LawsonSolver` directly should do the same when the rate is stiff).
- **Overflow guard (found while benchmarking this PR).** `exp(r h)` overflows near `r h ~ 700`. An adaptive controller will happily propose such a step (the stiff mode is exactly resolved so the error estimate is tiny); the candidate is then `inf`, Diffrax's scale `atol + rtol max(|y0|, |y1|)` becomes `inf`, the scaled error 0, and the garbage step is **accepted**. Now a non-finite candidate is returned as `y0` with a finite huge error (1e30; an infinite one poisons the PID memory and the next step becomes `inf`), so it is rejected and the step shrinks. Finite steps are bitwise untouched. Regression test included; without the guard the `nu = 4000` run below never finishes (20 000 rejected steps).

##### Evidence (this machine, CPU, x64; `simulation(Nx=17, Nn=24, Ns=2, timesteps=5, t_max=2, nu=...)`, wall after warm-up)
| `nu` | plain steps / wall | Lawson steps / wall | max abs `Ck` difference at saves |
|---|---|---|---|
| 3 (default) | 18 / 0.01 s | 20 / 0.01 s | agree at solver tolerance (test) |
| 300 | 106 / 0.04 s | 10 / 0.01 s | |
| 4 000 | 1 830 / 0.68 s | 21 / 0.01 s | |
| 40 000 | 19 597 / 7.43 s | 713 / 0.34 s | |

(t_max = 5 for the `nu = 3` row.) Larger gains are limited by `r h < ~700` and by forced-mode accuracy (below). In the Dark-SPECTRAX study (field-scaled closure rate, `Nx 64, Nn 128`, GPU/CPU records in that repo) the same wrapper gave **5.0x fewer steps at c = 64** to the t = 500 mark and **no gain at c = 4** (closure not stiff before ~540); ordinary-dispersion B10 case: 4.6x fewer steps but 1.5x wall (small state, per-step cost 3x), and a ledger defect that is 1e-9 instead of 1e-11 because the plain run over-resolves. Those are in the Dark repo `docs/results.md`; they are reported, not re-derived here.

##### When it helps and when it does not
- Helps: a diagonal rate makes the explicit step stability-limited (`nu * h`, `D k^2 h`, or a field-scaled closure damping that grows with the field).
- No gain, small cost (one extra RHS evaluation per step, because FSAL's cached stage lives in the other variable): default `nu` (3), where the step is accuracy-limited. 18 -> 20 steps above.
- Forced stiff modes: `w' ~ exp(r tau) N`. If the stiff row is driven by a smooth source, the transformed integrand is far from polynomial and the step remains limited by accuracy for `r h` beyond a few tens. On the toy `y' = -4000 y + sin t` (rtol 1e-6) it needs 1 143 steps (the plain stability bound alone would be ~1 600; plain not run). This is the known drawback of Lawson relative to phi-function (ETD/Rosenbrock) integrators; see literature.
- **It does not fix the asymmetric-weight (AW) Hermite truncation instability.** The exponential is exact, so it neither adds nor removes damping. A step-size collapse from a growing instability is not cured.
- Not conservative beyond the order of the scheme; density/momentum/energy rows should get rate 0 (the hypercollision spectrum already vanishes for `n <= 2`).
- Only `ODETerm` problems; wrapped solver must be explicit RK with an embedded error estimate (`Dopri8`, `Tsit5`, `Heun`, ...); `r h < ~700`.

##### Literature (what I read, and what I did not)
- Crouseilles, Einkemmer, Massot, *Exponential methods for solving hyperbolic problems with application to kinetic equations*, arXiv:1910.12720 (J. Comput. Phys. 2020): **read** Sections 1-3. Lawson stability function equals the RK one; for kinetic (hyperbolic) problems Lawson is preferred over ETD/ExpRK for stability, while for parabolic problems Lawson has "all but lost" its appeal because phi-function methods converge better (also: full order with inhomogeneous boundary conditions cannot be achieved by Lawson).
- Kassam, Trefethen, *Fourth-order time-stepping for stiff PDEs*, SIAM J. Sci. Comput. 26 (2005): **read** abstract and the comparison. Integrating-factor RK4 is competitive for Burgers, worst for Kuramoto-Sivashinsky, and fails for KdV/Allen-Cahn in their setting; ETD4RK (their contour-integral version of Cox-Matthews) is best. Consistent with the forced-mode caveat above.
- Einkemmer, Ostermann, *Convergence analysis of Strang splitting for Vlasov-type equations*, arXiv:1207.2090: **read** abstract/introduction (second order under regularity). Used only for the splitting discussion in the follow-up streaming PR.
- Lawson (1967, SIAM J. Numer. Anal. 4, 372-380) and Hochbruck-Ostermann (2010, Acta Numerica 19, 209-286): **read**. Lawson keeps the RK order for a fixed linear part as h -> 0; Hochbruck-Ostermann (Thm 2.17, Ex. 2.32, Table 2.2) show the stiff order of Lawson methods drops (to 1 for Lawson-Runge) when ||hA|| is large, which is why no stiff-order claim is made here. Cox-Matthews (2002, J. Comput. Phys. 176): not read; cited only as a standard ETD reference, no claim depends on it.
- Delzanno, J. Comput. Phys. 301 (2015): context only (fully implicit, conservative alternative for the same stiffness); not used for any claim.

##### Tests (`tests/test_lawson.py`, 10, all pass locally; full CI below)
1. frozen diagonal is exact at `r h = 200` (plain Dopri8 blows up at the same step);
2. order 2 (Heun) and 8 (Dopri8) with a state-dependent rate;
3. zero rate is bitwise equal to the wrapped solver, same step count, dense output (SaveAt ts);
4. dense output versus exact decay;
5. pytree state with a rate-0 ledger-like row;
6. `simulation` default unchanged bitwise; Lawson agrees at solver tolerance; n <= 2 rows agree to 1e-6;
7. gradient (`jax.grad`) versus central finite difference, rel 1e-5;
8. stiff `nu = 4000` simulation matches plain, with at least 2x fewer steps;
9. rate layout equals the flat `[Ck, Fk]` state, rate zero on fields;
10. overflow step is rejected, not accepted.

##### Limitations / review notes
- `rate_fn` is evaluated at the step start; its time variation inside the step is explicit (documented above).
- Complex-state support in Diffrax is flagged "work in progress" by Diffrax itself; the tests compare against the plain solver on the same complex state.
- The `simulation` option on main covers hypercollision/hyper-diffusion only (main has no field-scaled closure); custom closures use `LawsonSolver` directly.

##### Merge recommendation
Safe to merge if the owner wants the option: opt-in, bitwise off, no new dependency, small. Value is concentrated in stiff-closure runs (large `nu`, strong `D`, or the #66 field-scaled closure). If SPECTRAX's intended regime is the default `nu`, there is no benefit and the PR can wait; nothing else depends on it. A stacked follow-up (exact Hermite streaming, #83) is a separate PR on top of this one; its benchmark showed that exact streaming does not help the stiff-closure regime, so #83 is optional and this PR does not depend on it.

## SPECTRAX 83

[Exact Hermite free-streaming integrating factor for LawsonSolver (stacked on #82)](https://github.com/uwplasma/SPECTRAX/pull/83) · [Revision b5493d0b](https://github.com/uwplasma/SPECTRAX/tree/b5493d0ba64be13297f13af77a9b37d235cf690a)

#### Exact Hermite free-streaming integrating factor for `LawsonSolver` (stacked on #82)

**Stacking.** Targets `main` so CI runs, but the branch contains the #82 commit; review only the last two commits (`git log origin/agent/lawson-main..`) = `spectrax/_lawson_streaming.py`, a few lines in `_lawson.py` / `_simulation.py`, README section, tests. Merge #82 first (then this PR reduces to the streaming files). The older integration-lineage version is merged into `integration/dark-baseline` only.

##### What it is
`LawsonSolver(solver, factor_fn=...)` generalizes the diagonal rate of #82 to an arbitrary smooth integrating factor `Phi(tau)`, `Phi(0) = I`. `hermite_streaming_factor` builds the factor for the free streaming of the Hermite-Fourier system, and `simulation(..., integrating_factor="streaming")` uses it (default `False` stays bitwise unchanged; `True` is #82).

##### Derivation (details in the `spectrax/_lawson_streaming.py` docstring)
- Streaming acts along each Hermite axis as `G = -i k (a T + u I)` (`k = 2 pi index / L`, `a` width, `u` drift, `T` the symmetric tridiagonal `T[j, j+1] = sqrt((j+1)/2)`). The three axes act on different tensor factors, so they commute and `exp(tau G)` is a product. `T = V diag(lam) V^T` (one real `eigh`; `lam` the Gauss-Hermite nodes over sqrt 2, `V` the nodal transform) gives `exp(tau G_ax) = exp(-i tau k u) V diag(exp(-i tau k a lam)) V^T`: unitary, exact for any step, `V` shared by every `k`, species, width and drift (only the phases depend on them). Cost: two `Nn x Nn` products per Hermite axis per stage.
- Transformation: `w = Phi^{-1} y` gives the exact identity `w' = Phi^{-1}(f(Phi w) - Phi' w)`, so the wrapped RK tableau applies to `w` for **any** smooth `Phi` (the choice of `Phi` only changes what is left in `w'`). Order statement (corrected): per Lawson (1967, SIAM J. Numer. Anal. 4, 372-380) the order of the underlying RK method is retained for a fixed linear part as h -> 0 (here the rate is the step-start rate, Lawson's re-evaluated-A form). No stiff-order claim is made when r h >> 1: per Hochbruck and Ostermann (2010, Acta Numerica 19, 209-286; Thm 2.17, Ex. 2.32, Table 2.2) the stiff order of Lawson methods drops (to 1 for Lawson-Runge) when ||hA|| is large. Empirical support is measured agreement with plain Dopri8 records (5e-10 in H05 c=64).
- Streaming only (`Phi = B`): `w' = B^{-1} f(B w) - G w`, i.e. `N = f - G y` is what the RK method sees.
- Streaming plus a diagonal rate `r` (does not commute with `G`): Strang product `Phi = A(h/2) B(h) A(h/2)`, `A = exp(-r .)`; with `z = A w`, `u = B z`, `y = A u`: `w' = A^{-1} B^{-1}[A^{-1} f(y) + (r/2) u] - A^{-1} G z + (r/2) w`, one `B` and one `B^{-1}` per stage; reduces to #82 for `G = 0`. The symmetric BCH expansion shows the factor equals `exp(tau (G - r) + O(tau^3 [G,[G,r]]))`, so what remains explicit is `O((h |G|)^2 |r|)`. **A stiff diagonal rate is therefore removed completely only while `h |G| = h k a sqrt(2 Nn)` is small.** A joint exponential of `G - R` per `k` would need a non-Hermitian `eig` per step (rate changes every step; `jnp.linalg.eig` is CPU-only): not built.
- Moving basis: `hermite_streaming_factor(basis_fn=...)` takes `(a, u)` from the state at the step start (used in the integration lineage for the pump frame); the basis change over the step stays in `N`.
- The factor is exact in the dense output as well (`y(t) = Phi(t - t0) w(t)`; oscillations are removed from `w`, which is smooth).

##### Measured
All on a laptop CPU (2 threads), after warm-up, `simulation` default two-stream, `t_max = 20`, 2 species, `nu = 3`:

| `Nx`, `Nn` | tolerance | plain steps / wall | streaming steps / wall | rel. diff `Ck` / `Fk` vs plain |
|---|---|---|---|---|
| 32, 64 | 1e-8 | 161 / 0.18 s | 30 / 0.12 s | 2.5e-7 / 3.0e-5 |
| 32, 64 | 1e-12 | 166 / 0.19 s | 79 / 0.32 s | 5.0e-11 / 3.1e-9 |
| 64, 128 | 1e-8 | 497 / 1.86 s | 28 / 0.36 s | 3.8e-7 / 5.4e-5 |
| 64, 128 | 1e-12 | 507 / 1.90 s | 75 / 0.96 s | 1.0e-10 / 6.4e-9 |
| 128, 128 | 1e-8 | 1049 / 7.11 s | 29 / 0.58 s | 8.2e-7 / 7.3e-5 |
| 128, 128 | 1e-12 | 1081 / 7.31 s | 71 / 1.41 s | 1.3e-10 / 8.7e-9 |

Cost per Runge-Kutta step: plain 3.5 ms, `integrating_factor=True` 4.6 ms, `"streaming"` about 12 ms (3.5x plain) at `Nx 64, Nn 128`. The streaming factor wins when the explicit step is stability-limited by streaming (`h k a sqrt(2 Nn) < ~3.7`) and the dynamics is smooth; it loses on small or accuracy-limited problems.

**Decisive stiff-closure benchmark (Dark-SPECTRAX, gates declared in a committed script before any run; numbers in its `docs/results.md`):** H05 `v_q/v_te = 0.1`, `Nx 64, Nn 128`, field-scaled closure (#66) with streaming plus the closure rate inside the factor, against the same-session closure-only Lawson (#82) and the plain record:
- `c = 64` to `t = 500`: 9606 steps (closure-only Lawson) vs 9652 (streaming): streaming was not what limited the step; wall 52 s vs 130 s (2.5x slower; per-step cost 2.7x). Accuracy vs the plain CPU record: dK_e 3.4e-10, W_ext 2.7e-11; ledger 3.7e-12.
- `c = 4`: identical to `t = 400`; then the run ends at `t = 456.5` on the step budget (201 927 steps in one chunk, closure-only: 5 444 for the same chunk): the Strang leftover `O((h|G|)^2 |r|)` is stiff in `w`.
- Ordinary B10 (`nu = 100`): closure-only 25 845 steps; streaming plus rate hits the 400 000-step budget.
- Gates S1 (steps ratio >= 1.5 or wall ratio >= 1) failed for both cases, S3 failed for `c = 4`; S2 (accuracy) passed. **Verdict as declared: streaming does not earn its place in this regime.** Consequently `simulation` exposes `"streaming"` only (the rate-inside-the-factor combination remains available through `hermite_streaming_factor(rate_fn=...)` and is documented as harmful at large `h|G|` and `|r|`).

##### Literature (read / not read)
- Crouseilles-Einkemmer-Massot, arXiv:1910.12720: **read** Sections 1-3 (Lawson for hyperbolic/kinetic problems, stability function of the Lawson scheme equals the RK one; the CFL for Lawson `b dt < C dv`, with `b` the advection speed; exact exponential for Fourier/semi-Lagrangian streaming). This is the precedent for exponentiating streaming; their numerical tests are Vlasov-Poisson and drift-kinetic, not Hermite.
- Einkemmer-Ostermann, arXiv:1207.2090: **read** abstract/introduction (Strang splitting for Vlasov, second order under regularity). Used to frame the Strang product above; the factor here is inside a Runge-Kutta step, not an operator split of the solution.
- Kassam-Trefethen (SIAM J. Sci. Comput. 2005): **read** the comparison; integrating-factor schemes mixed results. Same caution applies.
- Lawson (1967), Cox-Matthews (2002), Hochbruck-Ostermann (Acta Numerica 2010), Delzanno (JCP 2015, fully implicit alternative; local PDF consulted only for context): **not used for any claim**; the first three could not be fetched open-access.

##### Tests (`tests/test_lawson_streaming.py`, 7, all pass; full suite 25 passed locally)
1. `G` equals the streaming part of the real RHS (`Fk = 0`, `nu = 0`): 3-D, drifts, unequal widths, `Nm, Np > 1`;
2. `B` unitary, group property, equals `scipy.linalg.expm`, `V diag(lam) V^T = T`;
3. analytic Hermite front `c_n = (-i x)^n / sqrt(n!) exp(-x^2/2)` to 1e-12 in **one** step at 13x the Dopri8 imaginary-axis step (plain solver gives |c| > 50 at that step);
4. order (Heun 2, Dopri8 pre-asymptotic like the plain solver) with streaming alone and with a rate inside the factor;
5. `simulation` agrees with plain at the solver tolerance, `k = 0` density preserved to round-off, default bitwise unchanged;
6. gradient w.r.t. the thermal width vs finite difference (1e-5);
7. `basis_fn` overrides the argument basis.

##### Limitations
- Cost per step 3.5x plain; benefit only for streaming-limited smooth runs. Not a cure for the stiff closure nor the asymmetric-weight (AW) Hermite truncation truncation instability (the exponential is exact).
- Joint streaming+closure exponential per `k` not implemented (non-Hermitian `eig`).
- Complex-state warning from Diffrax applies.

##### Merge recommendation
**Do not merge unless you want an opt-in exact-streaming integrator for large `Nx x Nn` smooth runs.** It is correct, tested, and bitwise off, but the measured benefit is narrow and it does not help the stiff-closure regime that motivated it. #82 is the one with demonstrated value. If merged, merge after #82.

## SPECTRAX 87

[Differentiable multi-device DG simulation, Python 3.10](https://github.com/uwplasma/SPECTRAX/pull/87) · [Revision 8285ce9e](https://github.com/uwplasma/SPECTRAX/tree/8285ce9e3107d29698431b0e0287c4d1ee26519d)

Stacked on #80. It fixes what the review on #78 and #80 found, and restores Python 3.10.

**Gradients and jit**
- `jax.grad` through `simulation()` failed with an AssertionError in the checkpointed while loop. The cause was `jax.device_put(..., in_shardings)` on traced inputs. Only concrete leaves are placed now, and the jitted solve reshards traced ones.
- Under a user `jax.jit`, the host `is_okay` / `int(num_steps)` check is replaced by `eqx.error_if`. The diagnostics get static `Nn`/`Nm`/`Np`/`Ns` instead of traced values.
- One device uses no sharding annotations.
- New tests: the gradient matches central differences (rtol 1e-5) on `(1,1,1,1)`, `(1,2,2,1)` and `(2,2,1,1)`, and `simulation` runs under `jax.jit`.

**Python 3.10**
- `requires-python >=3.10`, `jax>=0.6`, a `tomli` fallback, and CI on 3.10.
- On 3.10 the resolver gets jax 0.6.2, diffrax 0.7.0 and optimistix 0.0.11. That brings two limitations, both noted in `docs/parallel.rst`:
  - JAX 0.6 keeps the mesh in array types, which diffrax's custom JVPs reject. Gradients therefore work on one device only, and the multi-device gradient tests are skipped there.
  - optimistix 0.0.11 starts the JAX backend at import. `load_parameters` now imports diffrax only after it bootstraps the devices. Code that imports `simulation` before `load_parameters` gets one CPU device, and the lazy-import test is skipped on 3.10.

**Tests (macOS CPU)**
- 3.13 with jax 0.11: 164 passed.
- 3.10 with jax 0.6.2: all pass except `test_legacy_single_device_parity_with_base_commit`. The base commit falls back to `pip._vendor.tomli`, and my test env had no pip. The CI env has pip.

**Not done:** GPU scaling. Both workstation GPUs were busy.


#### Update: shard_map RHS and CPU strong scaling
- On more than one device the RHS runs in `shard_map` (`sharded_rhs`). One `ppermute` per split axis and direction carries both the Ck and Fk boundary slabs, giving 4 permutes per RHS for a 2x2 split instead of 8. The species current is a `psum` only when species are split. `Hermite_DG_rhs` gets a `comm=(shift, species_sum)` hook and is unchanged on one device.
- Validated against 1 device: trajectories, adaptive Dopri8, gradients on 4 devices, `jit`. `pytest tests` 164 passed.
- Strong scaling against cores: one process shares one XLA CPU thread pool across devices, so `NPROC=D` with D devices gives a 1-core baseline. Apple M4 (4P + 6E), Hermite 3^3, best of two runs, load < 5:

| grid | 1 core | 2 | 4 | 8 |
|---|---|---|---|---|
| 64^2 | 0.90 s | 1.9x | 2.4x | 3.1x |
| 128^2 | 4.19 s | 2.0x | 2.6x | 3.1x |
| 192^2 | 9.29 s | 1.8x | 2.5x | 2.4x |

![](https://raw.githubusercontent.com/uwplasma/SPECTRAX/dg-parallel/8-grad-jit/docs/strong_scaling_cpu.png)

Close to ideal on 2 cores. Past 4 devices, subdomains land on efficiency cores and every step waits for the slowest one. At 192^2 memory bandwidth (about 72 GB/s, reached by 4 cores) also caps it. Office CPU and GPU runs are still pending: both were fully loaded.

## SPECTRAX 88

[Opt-in relativistic momentum-space Hermite model (inv_c2)](https://github.com/uwplasma/SPECTRAX/pull/88) · [Revision 74365348](https://github.com/uwplasma/SPECTRAX/tree/743653486921af65ccbcb74050bcf6f5c9874e9d)

Adds an opt-in relativistic model to the Hermite-Fourier solver. `inv_c2 = 1/c^2` (code velocities are in units of `c`, so `inv_c2 = 1` is physical) is a new keyword of `Hermite_Fourier_system`, `plasma_current`, `ode_system` and `simulation`. The default `inv_c2 = 0.0` takes the existing code path unchanged (tested: explicit `0.0` is bitwise equal to omitting it); all 26 tests of the suite pass.

#### Model
Work in the momentum-like variable `u = p/(m c)` already used by SPECTRAX (`u_s`, `alpha_s`). The Vlasov equation is
`d_t f + v(u).grad_x f + (q/m)(E + v x B).grad_u f = 0`, `v = u / sqrt(1 + inv_c2 |u|^2)`.
* The electric force term is unchanged (it differentiates polynomial test functions).
* Everything containing `v(u)` is a Galerkin multiplication operator. With the Hermite recurrence matrix `T = P diag(lam) P^T` per axis (`lam` = Gauss-Hermite nodes), `M[g] = (P x P x P) diag(g(u_s + alpha_s lam)) (P x P x P)^T`. For `g = u_i` this is exactly the existing ladder `u_s + alpha T`; for `v_i` it is the Gauss-Hermite quadrature of the product, spectrally accurate because `v` is analytic with branch points at `u = +-i c`.
* Streaming is `-i k_i M[v_i] C`, the current is `q a_x a_y a_z (M[v_i] C)_{000}`, the magnetic force is `(sqrt(2 n_i)/a_i)` times the lowering of `E_i C + (v x B)_i C` (`div_u (v x B) = 0`), and the kinetic energy is `m (gamma - 1) c^2` via `relativistic_kinetic_energy`.
* New module `spectrax/_relativistic.py` (`hermite_nodes`, `speed_apply`, `gamma_minus_one_apply`, `relativistic_kinetic_energy`), exported from the package.

#### Conservation
Charge and momentum are exact; the streaming energy flux is exact; the work identity `dK/dt = <J.E>` holds to the spectral projection error of `v` (zero in the nonrelativistic ladder for N >= 3). Magnetic work is zero to the same error. Derivation and the residual are in the Dark-SPECTRAX design note listed below.

#### Verification (gates declared in a committed script before running; Dark-SPECTRAX `studies/relherm/`)
* `inv_c2 -> 0` reproduces the existing RHS and current to round-off (4e-16 in 1V, 1.3e-15 in 1D2V with x-dependent Ex, Ey, Bz); `inv_c2 = 1e-8` differs by 1e-8.
* Homogeneous driven electron-ion oscillator (v_q = 0.03, T = 500) against an exact relativistic kinetic ODE: field 1.5e-8, work 1.1e-8, phase 1.4e-8 rad (the nonrelativistic ODE misses the work by 38%).
* Gyration of a drifting Maxwellian in uniform B against the exact per-particle rotation at `Omega/gamma`: 1.7e-10 in `<v>`; kinetic energy constant to 3e-15.
* Linear response function vs the relativistic Juttner dielectric: 3e-5 (control, nonrelativistic: 4e-5).
* Energy ledgers with `gamma - 1`: 6.6e-10 (1D1V resonant), 8e-9 (1D1V off-resonant, v/c = 0.83), 6.8e-6 (1D2V EM with hypercollision loss integrated, mean speed 0.59c).
* Failures, recorded: the eigenvalue comparison with the Landau root fails by construction (the truncated operator has a real, undamped spectrum, in the nonrelativistic control too); the first 1D2V ledger run blew up through the known truncation instability of the asymmetric basis (frozen-field growth 4.7 relativistic vs 4.9 nonrelativistic), which is not specific to relativity.
* In this PR: `tests/test_relativistic.py` (default path bitwise equal; 3V limit with all six fields; current vs independent quadrature; relativistic gyration and zero magnetic work; electric work identity; `simulation(..., inv_c2=1.0)` runs).

Literature: Juno et al., arXiv:2602.17487 (no obvious conservative spectral/FE basis for relativity; DG with velocity mapping); nonrelativistic Hermite spectral Vlasov: Holloway 1996, Delzanno 2015 (JCP 301), Camporeale et al. arXiv:1311.2098, Koshkarov et al. arXiv:2004.12010, Pagliantini et al. arXiv:2110.11511. A search found no prior relativistic Hermite Vlasov solver (not exhaustive). Design note: `docs/design/relativistic-hermite.md` in uwplasma/Dark-SPECTRAX.

#### Limitations
* Cost: the nodal transforms are dense. 1V kinetic RHS measured 1-5x the ladder (noisy laptop timings); in 3V `O(N^4)` per Fourier mode instead of `O(N^3)`, because `gamma` couples the axes.
* An axis with one Hermite mode is treated as cold (single node at `u_s`).
* Hot Juttner tails (theta >~ 0.3) decay slower than the Gaussian weight; expect poor convergence there (not needed for theta ~ 1e-3).
* Not supported yet with the pump/moving frame (not in main), Lawson streaming (not in main), collisions other than the existing hypercollision and `D`. The truncation instability of the asymmetric basis is unchanged.
* A moving frame is a Lorentz boost; only the momentum translation by a uniform force is exact, which the model keeps.

## SPECTRAX 91

[spectrax.run, [output] table and [initial_state] hook: zero-Python runs](https://github.com/uwplasma/SPECTRAX/pull/91) · [Revision 9b8460e8](https://github.com/uwplasma/SPECTRAX/tree/9b8460e889e284fbdf8b0ad1c04aa10c342830e1)

Stacked on #64. Makes the common case zero lines of Python and scripted use one or two.

- `spectrax input.toml [--no-show] [key=value ...]` runs, prints a one-line summary, saves the figure. Overrides use TOML syntax and dotted species paths: `Lx=2.0 Nn=64 species.electrons.vth=0.2 save=out.npz`.
- `spectrax.run("input.toml", **overrides)` does the same and returns a `Result` (a dict) with `.plot()`, `.save(path, keep=None)`, `.summary()`.
- Optional `[output]` table: `figure` (default `input.png`, `false` for none), `show`, `save` (`.npz`), `keep` (subset of diagnostics), `summary`.
- Optional `[initial_state] file = "x.py"`: the file's `initial_state(input_parameters, solver_parameters)` returns `Ck_0`/`Fk_0`. This is how Orszag-Tang becomes a TOML plus its physics function, with no driver script.
- A parameter scan is a loop over `run(..., figure=False, show=False)`.

New library code: `spectrax/_run.py` (69 lines) and 8 lines in `load_parameters`; `__main__.py` is 31 lines (was 23).

#### Lines of user Python (before -> after)
| case | before | after |
|---|---|---|
| Landau damping | 11 | 0 (`spectrax input_1D_landau_damping.toml`) |
| two-stream | 11 | 0 |
| Orszag-Tang | 82 + 490 (analysis script) | 0 driver + 16-line initial-state function |
| Landau / two-stream scans | 27 / 29 | 26 / 26 (the fit and theory plot remain) |
| scripted single run | 5 | 2 (`from spectrax import run; run("x.toml")`) |

Removed as redundant: `1D_Landau_damping.py`, `1D_two_stream.py`, `2D_Orszag_Tang.py`, `orszag_tang_data_analysis.py` (the auto figure of #63 covers energy, energy error and the in-plane field; the Jz slice and gif are no longer produced).

#### Verification
- `pytest -q -n 2`: 24 passed.
- Both scan scripts were run end to end on a reduced k list (0.3 and 0.6): Landau rates -0.013 and -0.267, two-stream rates +0.232 and +0.139, about 3 s each.
- Orszag-Tang runs through `spectrax input_2D_orszag_tang.toml` on a reduced case (`t_max=0.01 Nx=8 Ny=8 Nn=2 Nm=2 Np=2 timesteps=3 ode_tolerance=1e-5`): 3 s wall, figure written. The full 151x151, 6x6x6 case was not run; it takes hours.
- Jz slice and gif: dropped, not made a plot option. The 490-line analysis script needs far more than 10 lines to port.
- `summary()` has no growth/damping fit: the Landau (peak envelope) and two-stream (late-time window) fits differ, so one built-in would be wrong for one of them.

#### Security note
`[initial_state] file = ...` executes the local Python file next to the input file, with the same trust as running a script. Only run input files from sources you trust.

#### Survey of other codes (ideas worth adopting)
- JAX-in-Cell, GKX and PyPIC3D (uwplasma): all run `code [file.toml]`, and JAX-in-Cell also has a 4-line Python path (`Simulation(...)`, `run`, `diagnostics`, `plot`). Same shape as this PR.
- GKX: `gkx case.toml --estimate` sizes the grid and exits, and `gkx plot out.nc` replots a saved bundle. A `spectrax plot out.npz` replot would be the natural follow-up to `save`.
- WarpX: `key=value` overrides after the input file on the command line, as adopted here.
- Gkeyll and Smilei use Lua or Python input files, so a scripted setup needs more lines than TOML plus overrides. We keep the declarative TOML and only drop to Python for custom initial states, as WarpX does through PICMI.
- PyPIC3D writes outputs under `<output_dir>/data`; an `output_dir` key could replace per-file paths if the number of outputs grows.

## MHX 5

[Add differentiable Kelvin-Helmholtz examples](https://github.com/uwplasma/MHX/pull/5) · [Revision 3744cd46](https://github.com/uwplasma/MHX/tree/3744cd46c43c44ae8f637d095342ac2a72443314)

Adds a clean Kelvin-Helmholtz tutorial and validation path without modifying the existing imported notebook:

- reusable differentiable KH passive-dye benchmark API
- smooth low-Mach compressible-MHD KH API
- clean FAST-default notebooks for incompressible, compressible-MHD, and backpropagation workflows
- standalone publication-style validation script with JSON gates, NPZ histories, manifest hashes, figures, and a GIF
- native `mhx benchmark kelvin-helmholtz` CLI command
- tests for gradients, JVPs, notebook execution, compressible state conversions, tiny compressible KH runs, config validation, CLI execution, manifest schema, and publication-example conventions
- docs page explaining equations, outputs, AD choices, validation gates, expected artifacts, and limitations
- fixes direct test dependency on `click` by using Typer's public exception instead
- generalizes fixed-step RK4 trajectory typing for arbitrary PyTree states, with Python 3.10-compatible runtime typing

#### Current scope

This PR remains **draft** until the KH plan is reviewed. The validation example is intentionally `claim_level = "validation"`: it checks smooth periodic KH morphology, passive-dye entropy response, a resolution-comparison gate, low-Mach compressible-MHD positivity, and artifact reproducibility. It does **not** claim shock-capturing compressible-MHD production accuracy or high-Reynolds-number KH convergence.

#### Validation

Latest local checks on head `37b2a8f`:

- `python -m ruff check src tests examples tools`
- `python -m pytest tests/test_compressible_mhd.py tests/test_kelvin_helmholtz.py tests/test_publication_examples.py tests/test_docs_links.py -q` (`55 passed`)
- `python -m pytest -m "not slow" -q` (`287 passed, 22 deselected`)
- `sphinx-build -W -b html docs docs/_build/html`
- `MHX_EXAMPLE_FAST=1 MHX_EXAMPLE_OUTDIR_ROOT=/tmp/mhx_kh_validation_example python examples/publication_kelvin_helmholtz_validation.py`
- `python -m mhx.cli.main benchmark kelvin-helmholtz --outdir /tmp/mhx_kh_cli --nx 16 --ny 32 --comparison-nx 12 --comparison-ny 24 --compressible-nx 12 --compressible-ny 24 --t-end 0.12 --min-entropy-gain 1e-4 --min-saved-samples 3 --max-resolution-entropy-rdiff 5e-2 --movies`

Remote checks are green for head `37b2a8f`; the PR remains draft for plan review.

#### Plan checklist

- [x] Keep `examples/KelvinHelmholtz.ipynb` untouched
- [x] Add clean FAST-default incompressible KH notebook
- [x] Add clean FAST-default KH backpropagation notebook
- [x] Add smooth compressible-MHD KH API and notebook
- [x] Add KH gradient/JVP/notebook tests
- [x] Add compressible-MHD state/RHS/tiny-run tests
- [x] Add KH config validation tests
- [x] Add KH documentation page with equations, outputs, and AD references
- [x] Add gated publication-style KH validation runner and example script
- [x] Add generated validation figures/GIF to docs
- [x] Add native CLI command for KH validation artifacts
- [x] Add manifest/NPZ schema and CLI tests for KH validation
- [x] Generalize `evolve_rk4` typing from `ReducedMHDTrajectory` to a generic PyTree trajectory protocol
- [x] Monitor and fix remote CI failures

#### Review focus

- Whether the validation claim boundary is appropriately conservative.
- Whether the default validation settings (`64×128`, `t_end=2.0`) are sufficient for a useful reviewer-facing KH artifact while keeping local runtime reasonable.
- Whether the compressible-MHD tutorial wording is clear enough that users do not mistake it for a shock-capturing production solver.

## MHX 7

[3D incompressible MHD: spectral core, validation ladder, and parallel transforms](https://github.com/uwplasma/MHX/pull/7) · [Revision 219063e0](https://github.com/uwplasma/MHX/tree/219063e0dda7d0c758efb7f6ca14c4772da2e94c)

Implements plan_3d.md as one major PR, per the delivery model in its section 13.

#### Landed

- **Slab-parallel spectral transforms** (`numerics/spectral/pfft.py`): rfftn-convention forward/inverse over a one-axis device mesh via `shard_map` with a single `all_to_all` transpose; single-device passthrough to `jnp.fft`.
- **3D core**: `MHD3DState`, rotational-form incompressible visco-resistive MHD RHS with spectral Leray projection and 2/3 dealiasing, guide field folded into the real-space products; Williamson 2N low-storage RK3 on the integrating-factor variable (exact for pure dissipation); equilibria: single mode, CP Alfven wave, the exact Politano-Pouquet-Sulem beta=0.8 Orszag-Tang fields, ABC flow with a broadband solenoidal seed, Taylor-Green class I.
- **Same-API dispatch**: `mhx.Simulation(shape=(nx,ny,nz), equations="mhd3d", ...)` runs, prints, plots (midplane |j| and |v| slices, energy and cross-helicity histories), and saves the same way as 2D. The 3D integrator defaults to `if_rk3`, with `etdrk4` selectable.
- **ETDRK4 validation stepper** (`time_integrators/exponential.py`): Cox-Matthews coefficients through the Kassam-Trefethen contour mean (the naive formulas hit catastrophic cancellation, caught by the cross-check gate); beats IF-RK3 by >5x on the CP Alfven wave with both landing on the analytic state.
- **Gates G1-G5** (`tests/test_mhd3d*.py`): exact resistive decay (1e-12), projector properties, divergence at round-off, damped-Alfven dispersion vs the exact complex frequency (1e-3) from the exact damped eigenvector, CP Alfven with third-order temporal convergence, ideal-invariant drift < 1e-6 and convergent, exact initial energies (E_V=2, E_M=1.92), d(energy)/d(nu) vs finite differences (1e-6, x64), and the ABC kinematic dynamo reproducing the Galloway-Frisch window structure at Rm = 1/eta (growth at Rm 12 and 30, none at Rm 20; slow-marked, 66 s).
- **Parallel and AD contract** (`tests/test_mhd3d_parallel.py`): four-device subprocess asserting sharded-vs-single forward parity (1e-12), distributed gradient parity (1e-10), and compiled HLO containing `all-to-all` with **no `all-gather`** in forward or backward.
- plan_3d.md section 13: one-PR delivery model and the solver-pass amendments.

Full suite: 342 tests green at 95.36 percent coverage (the suite now runs with four logical CPU devices so the sharded paths count in-process); physics-anchored completeness tests pin the Taylor-Green exact means, the ABC Beltrami helicity identity, and sharded-vs-single Simulation agreement at 1e-12.

- [x] Frame-by-frame MHD3DResult.save (closes the trajectory-OOM item)

- [x] Gallery example 09_orszag_tang_3d.py in the uniform workflow; README capability matrix (2D/3D x compressible/incompressible, shocks out of scope)
- [x] Track C planned in plan_3d.md section 14: subsonic smooth compressible spectral MHD (ln rho/u/B + bulk viscosity, per-mode block-exponential stepper, gates C1-C6 incl. the parametric-decay cross-model discriminator at gamma/omega0 = 0.41, PR #5 reimplement-and-salvage verdict)

- [x] Track C phase C-1: the compressible spectral core (isothermal ln-rho/u/B with shear and bulk viscosity) with gates C1 (Stokes-Kirchhoff sound decay 1e-3; oblique fast-magnetosonic frequency and damping vs the exact 7x7 block eigenvalues 2e-3) and C2 (pseudosound Mach-squared scaling). The C1 gate caught a sign error in the compressive viscous stress on its first run.

- [x] Track C phase C-2: `Simulation(equations="compressible")` dispatch with the same print/plot/save contract; gate C3 (solenoidal convergence onto the incompressible module, with the acoustic-transient split documented); gate C4, the flagship cross-model discriminator (Goldstein-Derby parametric decay within 10 percent of the dispersion root; the same pump only decays resistively in incompressible MHD); docs/physics/compressible.md with equations, the log-density design rationale, the C-gate table, and seven new references; gallery example 10_compressible_orszag_tang.py; capability matrix updated to available

#### Merge state

Ready for review. All CI-tier gates pass: 328 fast tests plus slow gates, 23 prose documents, sphinx -W, ruff, the artifact verifier, and coverage above the 95 percent gate. Post-merge campaign work (tracked in plan_3d.md sections 8 and 14): C5/C6 compressible campaigns, the G7 dissipation-normalization audit, G6 tearing, G8-G12, the TOML path for the new equations, and compressible movies from the workstation GPUs.

#### Superseded checklist items (campaign-scale, post-merge)

- [x] `Simulation` dispatch so a 2D call becomes 3D by changing shape, equations, and equilibrium
- [x] ETDRK4 validation stepper
- [x] G5 ABC kinematic dynamo
- [ ] TOML config path for `model = "incompressible_mhd_3d"`
- [x] Strong-B0 accuracy gate: exact dispersion at B0/b = 33 with third-order convergence (exact Elsasser rotation stays an optimization item, now gated)
- [ ] G6 tearing gates
- [x] Docs: physics/mhd3d.md with equations, a full derivation (constant-density limit, rotational identity, exact pressure elimination, ideal invariants, Elsasser structure, the strong-guide-field bridge to 2D), numerics, gate table, citations, and the first 3D movie (128-cubed Orszag-Tang current sheets, midplane + max projection, motion-gated, manifest-registered); README and landing updated to the honest 2D+3D scope
- [ ] G7+ campaigns on the workstation GPUs with committed evidence bundles (first 128-cubed 3D Orszag-Tang run complete through the new API: 564 s, div B 5.5e-9, dissipation peak 0.833 at t = 2.8 inside the MPM06 window, energy budget closes; the eps normalization audit and the frame-by-frame MHD3DResult.save fix are the next items, see plan_3d.md log)
- [ ] Forcing, turbulence gates G8-G11, and the G12 reduced-MHD-limit flagship
- [ ] jaxDecomp option and implicit path consuming the SOLVAX interop PR

## MHX 20

[3D driver: chunked run, CFL substeps and checkpointed blocks](https://github.com/uwplasma/MHX/pull/20) · [Revision c739de3a](https://github.com/uwplasma/MHX/tree/c739de3a0363ae03d9ae574fd29a75859509b7e6)

Targets `feature/mhd3d` (#7). This ports #14, #15 and #17 to the 3D driver. `run_mhd3d` had the same single jitted scan as the 2D path, with no progress, no step limit and no non-finite stop.

- `run_mhd3d` now runs one compiled chunk per saved state. It prints a progress line (at most about 20 per run) and raises `FloatingPointError` at the first chunk with non-finite fields.
- Both 3D integrators treat diffusion exactly, so the step limit comes from advection and Alfven waves only: `cfl * c / sum_i k_max_i (max|v_i| + max|b_i| + |B0_i|)`, with `c = sqrt(3)` for IF-RK3 and 2.8 for ETDRK4 (imaginary-axis stability). A chunk whose limit is below `dt` takes equal substeps, and each new substep count compiles once. More than 100 substeps stops the run. `Simulation` gains `cfl = 0.5`.
- IF-RK3 and ETDRK4 advance through `jax.checkpoint` blocks of about sqrt(save_every) steps, through a shared `checkpointed_steps` helper in `fixed_step.py`. After #17 merges, `evolve_rk4` can use the same helper.

Measured against `feature/mhd3d` at ab97b31, Orszag-Tang, `nu = eta = 5e-3`, one substep at these settings.

GPU, RTX A4000, float32, 100 steps, warm time per step:

| grid | #7 | this PR | peak GPU memory |
|---|---|---|---|
| 64^3 | 3.16 ms | 3.40 ms | 110 / 109 MiB |
| 128^3 | 43.3 ms | 25.3 ms | 820 / 672 MiB |

The 128^3 timings are single runs on a shared GPU. A repeat on an idle card (another job joined it a minute later, after which both branches ran at 55-60 ms): 25.8 ms on #7 and 25.6 ms on this PR, peak memory 820 / 672 MiB, identical energy. Final energies agree to 2e-8 relative.

CPU (Linux, 8 threads, float32, load average about 40-50), 64^3, 20 steps: 154 and 181 ms per step on #7, 145 and 156 ms on this PR, with identical energy.

Gradient of the final magnetic energy with respect to resistivity through IF-RK3, x64, compiled-gradient temporary memory:

| case | #7 | this PR |
|---|---|---|
| GPU 64^3, 16 / 64 / 256 steps | 2077 / 7812 / 31140 MiB | 762 / 1322 / 2343 MiB |
| CPU 32^3, 16 / 64 / 256 steps | 329 / 1245 / 4908 MiB | 112 / 194 / 359 MiB |

Values and gradients agree to 1e-16 relative. The gradient is slower: at 16 steps 1.47 s instead of 0.56 s on GPU and 1.87 s instead of 1.19 s on CPU. Those GPU numbers came from a shared card. Repeated with all variants in one process (A4000, x64, 64^3, 16 steps, card shared with another job): forward 0.37 s, plain gradient 1.18 s (3.15 forwards), checkpointed 1.58 s (4.22 forwards). On the laptop CPU at 32^3 the figures are 2.58 and 3.78 forwards. The difference is one recomputed forward pass in both cases. `evolve_if_rk3`, `evolve_etdrk4` and `checkpointed_steps` now take `checkpoint=True`; `False` stores every step for gradients that fit in memory. The 3D gradient test checks both give the same gradient to 1e-13.

Tested: on Linux under x64, `tests/test_mhd3d*.py`, `tests/test_simulation3d.py`, `tests/test_simulation.py` and the compressible tests pass (44 passed, plus the 9 multi-device tests in their own environment). A new test covers substeps above the CFL limit, the progress line, the 100-substep stop and the non-finite stop. `feature/mhd3d` merged with current `main` (a local merge, not pushed) passes the same files (43 passed).

## ESSOS 46

[Consume pyQSC_JAX external 3+5+7 field jets](https://github.com/uwplasma/ESSOS/pull/46) · [Revision 3fe454b2](https://github.com/uwplasma/ESSOS/tree/3fe454b2d8f8fbd11a03cbc24f2d679d58778ab2)

- add a generic JAX magnetic-field Hessian interface;
- consume pyQSC_JAX total-vacuum or surface-free external field jets;
- use smooth, dimensionally normalized 3+5+7 least-squares residual blocks;
- verify exact vacuum reduction and finite-beta external-target subtraction;
- differentiate through real coil shapes/currents and pyQSC_JAX
  axis/physics variables;
- add executable finite-beta stage-two and single-stage optimization
  examples.

#### Pressure-only stellarator examples

Both demonstrations now use public database-backed
`plasma_stellarator` (Wisconsin database ID 52521):

- finite `p2` and exactly `I2 = 0`;
- nonplanar axis with nonzero torsion;
- `|iota| > 2.8`;
- formal radius `0.15 m`;
- normalized field, STF-gradient, and STF-Hessian residual blocks.

The single-stage design vector is `(rc1, zs1, etabar, B2c)`; toroidal current
is fixed at zero and cannot drift toward a tokamak-like solution. Saved
metadata include the complete Fourier axis and database provenance.

#### Validation

- **13 focused tests pass**, including both optimization scripts in clean
  subprocesses.
- The pressure-only regression checks finite pressure, exactly zero current,
  `|iota| > 0.4`, RMS torsion above `0.5 1/m`, more than 10% angular
  variation in the plasma-field norm, and nonzero field/Hessian subtraction.
- Stage two: normalized objective `6.7102e7 -> 4.4677e3`; field, gradient,
  and Hessian block sums independently decrease
  `4.4786 -> 0.7913`, `2.0187e4 -> 72.3078`, and
  `2.6833e8 -> 1.7578e4`.
- Single stage: objective `6.7102e7 -> 3.0052e4`; final blocks are
  `0.6382`, `137.638`, and `1.1966e5`; weighted B20 residual
  `0.2930 -> 0.2514`; final `|iota| = 2.843`, `I2 = 0`, and RMS torsion
  `0.856 1/m`.
- Coil-shape/current and near-axis gradients agree with finite differences;
  vacuum reduction is exact.

These deliberately short runs are execution and coupled-gradient
demonstrations, not claims of device-quality global optima.

#### Dependency and inherited state

This draft is paired with
[uwplasma/pyQSC_JAX#2](https://github.com/uwplasma/pyQSC_JAX/pull/2);
the final boundary/VMEX hardening source commit is `060aef3`. Dependency
direction remains `ESSOS -> pyQSC_JAX`.

The ESSOS base branch retains unrelated collection, formatting, and
documentation failures already present before this patch. They remain
disclosed rather than being mixed into the field-jet integration. No
generated optimization output is committed.

This PR should remain draft until the paired pyQSC_JAX API lands.

## ESSOS 61

[Differentiable alpha loss fraction and in-memory Vmec construction](https://github.com/uwplasma/ESSOS/pull/61) · [Revision c5c2430a](https://github.com/uwplasma/ESSOS/tree/c5c2430ac05868f61ef5cea53e04831b8c2c8423)

Adds `Tracing.soft_loss_fraction` (with `per_particle=True` for one score per orbit), `loss_soft_lost_fraction`, and an example that optimizes a VMEX boundary against fusion-alpha losses.

#### Why
The open question was whether the soft loss improves confinement against a matched control. It does when the dofs are boundary coefficients of a recomputed equilibrium. On field-array dofs (see the earlier issue) Adam did no better than random search.

#### What changed
- `soft_loss_fraction(per_particle=True)` returns the score of each orbit and keeps a stopped orbit at the peak of its saved path. In the mean, stopped orbits are clamped to 1, a constant, so only orbits that had not yet left carried a gradient; this stalled the first boundary runs.
- `examples/particle_tracing/optimize_alpha_loss_boundary.py`: VMEX least squares on RBC/ZBS (mode ladder 2, 3) with quasisymmetry, aspect ratio 6, iota floor 0.40 and the soft loss of 192 fixed alphas (born at s = 0.5, 6e-5 s). The equilibrium state is rebuilt in memory as `Vmec.from_arrays` at ARIES-CS size; gradients use VMEX's implicit adjoint and a forward-mode ESSOS trace (one Jacobian takes 7 to 25 min on 16 cores). Needs `pip install vmex`; CI does not run it.
- One test for the per-particle gradient. README section.

#### Numbers
Hard loss (fraction reaching s = 1) on 1000 independent alphas (seed 101, s = 0.5), ESSOS VMEC-coordinate guiding centres:

| boundary | aspect | min iota | 6e-5 s | 1e-3 s |
|---|---|---|---|---|
| stage 1 (QS only), example run | 6.006 | 0.394 | 10.0% | 23.7% |
| after stage 2 (QS + soft loss), example run | 6.000 | 0.449 | 1.6% | 3.5% |
| QS-only control, same weights and floor, modes 2, 3 | 6.000 | 0.400 | 5.2%, 5.7% | 7.9%, 7.3% |
| QS + soft loss, modes 2, 3 (development run) | 6.000 | 0.445, 0.459 | 1.5%, 1.1% | 5.0%, 3.3% |

Binomial error is 0.4 to 0.7%. A second code path (vmex `trace_alphas`, Boozer coordinates) gives, for 1000 alphas within 6e-5 s, 11.1% for stage 1, 6.9% for the control and 1.4% for the soft-loss run, and within 1e-3 s 7.6% for the control, 3.9% for the development run (modes 2, 3) and 2.7% for a further stage trained at 2e-4 s with 128 alphas (ESSOS: 7.3%, 3.3%, 3.1%; 1.4% within 2e-4 s). The gain over the control at 1e-3 s is about 4 sigma in both tracers.

A run from a rotating-ellipse seed that never reached quasisymmetry went from 38.5% and 63.1% to 1.8% and 5.1%.

#### Longer horizons
Warm-started stages from the development run, mode 2, 1000 independent alphas within 1e-3 s (ESSOS / Boozer tracer): trained at 2e-4 s with 128 alphas, 3.1% / 2.7%; then at 1e-3 s with 96 alphas, 2.8% / 2.5% (training cost fell 0.21 to 0.024, so the 96 alphas were fitted); then at 6e-4 s with 160 fresh alphas, 2.9% / 3.3%. The loss plateaus near 3%; the control is 7.3% / 7.6%.

#### What did not work
- Soft loss alone, 48 or 192 alphas, no quasisymmetry term: the training loss fell 20 to 36% but the independent loss did not move (10.5% to 10.5% at 1e-4 s with 48 alphas; 10.3% to 9.2% at 6e-5 s with 192).
- L-BFGS-B with the reverse-mode adjoint (scalar loss): about 90 s per gradient for 8 alphas and stalled against the penalty terms.
- Short horizons only train what leaves promptly. Losses within 6e-5 s fall to about 1%, losses within 1e-3 s to about 3 to 5%, not to zero. Training at 1e-3 s costs about 17 times more per Jacobian.
- The soft loss helps only together with a quasisymmetry term (weight 3000 here); with weight 300 the result was worse than QS alone (7.3% against 3.6% at 6e-5 s).

#### Checks
`tests/test_dynamics.py` and `tests/test_objective_functions.py` soft-loss tests: 12 passed. flake8 gate 0. The example was run end to end once on 16 CPU cores (1 h 40 min).

## ESSOS 148

[Add differentiable physical section flux and filament potential](https://github.com/uwplasma/ESSOS/pull/148) · [Revision 547d0bff](https://github.com/uwplasma/ESSOS/tree/547d0bff32bc3e3c0c70dfab6f50707de66c3178)

Adds two physical-flux primitives in the existing field module: `section_flux` integrates `B_phi dR dZ` over a supplied section polygon, and `BiotSavart.A` evaluates the filament vector potential using the existing coil quadrature. Field and vertex derivatives are retained. The section measure has no extra radius factor; the equivalent circulation for the positive toroidal normal traverses the boundary clockwise in `(R,Z)`.

The caller must supply a simple, resolved polygon and a field regular over its signed triangle fan. These functions do not locate turnstiles, identify manifold branches or qualify a coil-design objective. There is no new dependency, tracer or topology package.

Independent tests cover the analytic `B_phi=C/R` rectangle, field reversal, polygon orientation, concave geometry, field and shape derivatives, JIT/VMAP/JVP/VJP, `curl(A)=B`, closed-loop Stokes and gauge invariance. Inserting an extra radius deliberately makes the analytic oracle fail. All 57 field/coil tests pass; coverage reaches 22/22 changed executable lines and 4/4 new validation branches. The upstream fatal flake8 selectors pass.

The full local suite reports **323 passed, 1 xfailed, 2 failed** (535.55 s). Both failures are bitwise adaptive8 survivor-compaction comparisons and reproduce on unchanged baseline `043047f6f0ccfe51ec85c655497c73af855a39bb` in the same environment, with maximum absolute array mismatch `6.94e-18`. Those failures are preserved; the suite is not claimed green. Environment: Apple M4 CPU, Python 3.13.7, JAX/JAXlib 0.11.0, x64, one BLAS/OpenMP thread. At revision `74afb895f2e1fe91263175898c6ccffb2b59beff`, the Python 3.10, 3.11 and 3.12 CI suites and patch-coverage check all pass.

The patch adds 50 source lines, 65 test lines and 10 README lines. It has no performance or new physical-result claim. Related open #99 owns the cylindrical return map, #139 changes coil conversion, and #146 changes broader field algebra/tracing; this patch leaves those implementations alone. Review this bounded diagnostic independently of any future lobe or optimization work.

Current-main integration: merge `ed6d61772048a2bc98f41b9125f6a3c46c6b1c66` includes upstream `0d1f9b6267af404c5a8585c1c36335ade385b797` (#147). The flux/coil source, tests and README are byte-identical to the previously qualified patch. All 74 field, coil and augmented-Lagrangian tests pass on the integrated revision (181.40 s, same shared CPU environment), and fatal flake8 selectors report zero. Python 3.10/3.11/3.12 CI and patch coverage all pass on this integrated revision.

## ESSOS 190

[Coil distance values, coil designs and constraint rows; one-contraction gamma_dash (GPU fix)](https://github.com/uwplasma/ESSOS/pull/190) · [Revision 33b16ae1](https://github.com/uwplasma/ESSOS/tree/33b16ae1979ee47f88642feb47b9edac31fb8bb7)

ESSOS has coil-geometry *penalties* (`loss_coil_separation`, `loss_coil_surface_distance`: hinge losses above a threshold). A constrained optimizer (e.g. SLSQP) needs the *values* instead: one smooth row per sample point, so their minimum is the clearance and the rows stay differentiable where the minimum switches points. This adds, in `essos/objective_functions.py`:

- `segment_distances(a, b)`: exact segment-segment distances of two closed polygons (interiors included), so a clearance sampled at a modest number of points still bounds the true one.
- `coil_coil_distances(coils)`: each base-coil point's distance to the nearest other coil, every symmetry copy included, shape (base coils, points). Coil pairs are mapped with `lax.map` to bound memory.
- `coil_self_distances(coils)`: each base-coil point's distance to its own non-adjacent segments (non-intersection).
- `coil_surface_distances(coils, surface)`: each coil point's distance to `surface.gamma`, shape (coils, points).
- `coil_mean_squared_curvature(coils)`: the arc-length mean of the squared curvature per coil.

All are `jit`-compiled, use the coils' static `nfp`/`stellsym` to find the base coils, and differentiate with respect to the coil degrees of freedom (and the surface).

#### GPU fix: `Curves._compute_gamma_dash` / `_compute_gamma_dashdash`

The per-order einsum under `vmap` made XLA's GPU backend fail in the reverse pass:

- 40 curves (5 base coils, nfp 4, stellarator symmetric): `CUDA_ERROR_ILLEGAL_ADDRESS` at every segment count tried (192-512).
- Silently wrong for a 24-curve set (3 base coils, nfp 4, order 12): B.n/|B| RMS 2.078e-2 on a test surface, where the CPU (and the new code on the GPU) give 2.497e-2.
- 16- and 32-curve sets and the CPU were unaffected.

Both are now one contraction over the orders. Values are unchanged: a new test checks them against spectral derivatives of `gamma`, and B.n of a 40-coil set matches the CPU result of the old code to every printed digit.

#### Coil designs and constraint rows: `essos/coil_design.py`

The layer a constrained single-stage optimization builds on these values (moved here from VMEX, so the coil code stays in ESSOS):

- `CoilDesign(coils, current_dofs=(), scales=None)`: one design vector -> coils and their `BiotSavart` field. Its coordinates are relative changes of the selected base-coil currents and additive changes of every base coil's unscaled Fourier coefficients (m); `x0 = 0` is the nominal design, with `scales` and `dof_names` per coordinate. The current normalization is fixed, so the field of a traced design passes into `jit`.
- `CoilLimits(length, curvature, mean_squared_curvature, coil_distance, ...)`: scaled inequality rows (feasible where >= 0) of each base coil's length, peak curvature, mean squared curvature and minimum speed, and the coil-coil and self distances, with margins that keep an SLSQP design strictly inside the limits; `per_point=True` gives one row per sample point. `surface_clearance(coils, surface)` is the coil-surface distance.
- `coil_constraint(rows_from_x, forward_chunk=None)`: those rows as a SciPy `NonlinearConstraint` with a reverse-mode or chunked forward-mode (`chunked_jacfwd`) Jacobian.

#### Tests

`tests/test_objective_functions.py`, against analytic answers:
- two coaxial circles a height h apart are h apart at every point (and the minimum has a finite gradient);
- a polygon circle's nearest non-adjacent segment is one chord away;
- the segment distance sees a crossing above a segment's midpoint;
- a poloidal coil around a torus sits at its radius minus the minor radius;
- a circle's mean squared curvature is 1/R^2.

`tests/test_coil_design.py`: the nominal design is the coils and their field (also under `jit`), the extreme rows are the minima of the per-point rows, and the constraint's reverse and forward Jacobians match central differences.

`tests/test_coils.py`: the tangent and second derivative against spectral derivatives of `gamma`.

The coil-design and distance tests also pass on an RTX 5090 (8 passed).

Full suite on CPU (Python 3.12, jax 0.12.0.1): 387 passed, 1 skipped (`test_multiobjectives.py` not run there: `optuna` not installed). The new code was also used on RTX 5090 GPUs in VMEX free-boundary single-stage optimizations (per-point coil constraint rows, 16-40 curves).

## ESSOS 195

[Simplify the native Dopri solvers](https://github.com/uwplasma/ESSOS/pull/195) · [Revision d0f0fb73](https://github.com/uwplasma/ESSOS/tree/d0f0fb73da1e224ffaf946a652701d62421cb88d)

Simplification of #187, meant to be merged into `feat/native_dopri`. No change to the public behaviour of `Tracing`, `trace_boozer` or `prepare_solver`.

What changed:
- One dense-output path. The Dopri5 quartic is built once from its tableau as the same per-stage polynomial table that Dopri8 already used, so the separate Python interpolants and the Dopri5 branch inside the CUDA kernel are gone.
- Removed the public one-step functions `rk45_step`/`dopri8_step` with their interpolation wrappers, `solve_rk45`/`solve_dopri8` (use `method=`) and the unused `record_steps`/`step_ts` history.
- `solve_rk` validates its inputs from one list of conditions: concrete values raise `ValueError`, traced values give `INVALID_INPUT`, as before.
- README section reduced from about 150 to about 90 lines. The stale 8192-alpha result table was dropped (the script is still described and unchanged); the other table is kept.
- Tests: added fixed-step agreement with Diffrax (stages, FSAL, dense output at intra-step saves), convergence order (5 and 8), event-root accuracy against the exact zero of cos(t), analytic Larmor gyration/streaming in a uniform field, and energy conservation of native `Tracing` in a coil field. Removed tests of private helper internals; two small guards remain.

Size (lines): `essos/rk.py` 1509 -> 1398 (-111), `README.md` -62, `tests/test_native_orbit.py` 382 -> 408 (+26), net -147.

The looped stage option (`stage_execution="loop"`) is kept: the CPU reference in `test_vmec_private_values_match_current_main` needs it, because compiling the unrolled Dopri8 stages for the real equilibrium took 15.5 GB and 91 s on Linux x86 with jax 0.6.2 (an earlier revision of this PR removed it). Measured on x86, jax 0.6.2, cold XLA cache, for that test: base 3.4 GB / 28 s, this branch 3.4 GB / 29 s.

Not changed: `boozer.py`, `dynamics.py`, `benchmark_native_orbits.py`, and the CUDA/Pallas adapters apart from the shared dense-output table. The GPU path cannot be run here; it is exercised through Pallas interpretation on CPU, including Dopri5 dense output and event bisection.

Profile: (JAX 0.12, CPU, shared and loaded machine, best of two interleaved rounds, cold XLA cache; first call includes compilation). Position error is against a Diffrax Dopri8 reference at 1e-12 and is identical to four digits before and after.

| case | solver | tol | first call before / after (s) | warm before / after (s) | error before / after |
|---|---|---|---|---|---|
| coils GC | native Dopri8 | 1e-7 | 1.12 / 1.10 | 0.55 / 0.41 | 2.82e-5 / 2.82e-5 |
| coils GC | native Dopri5 | 1e-7 | 0.79 / 0.80 | 0.72 / 0.73 | 1.60e-4 / 1.60e-4 |
| coils Lorentz | native Dopri8 | 1e-10 | 0.73 / 0.70 | 0.71 / 0.70 | 4.2e-10 / 4.2e-10 |
| VMEC GC | native Dopri8 | 1e-9 | 6.83 / 7.44 | 1.25 / 1.34 | 2.27e-9 / 2.27e-9 |
| VMEC GC | native Dopri5 | 1e-9 | 3.48 / 3.22 | 0.77 / 0.76 | 1.58e-8 / 1.58e-8 |
| Boozer GC | native Dopri8 | 1e-9 | 2.06 / 1.63 | 7.4 / 7.6 ms | 1.4e-14 / 1.4e-14 |
| Boozer GC | native Dopri8 fixed | - | 1.80 / 2.24 | 0.180 / 0.183 | 2.1e-15 / 2.1e-15 |
| `solve_rk` oscillator | Dopri8 | 1e-10 | 0.29 / 0.29 | 25-31 us | 1.03e-10 / 1.03e-10 |

Timings vary by about 20% between runs on this machine, so these show no slowdown rather than a speedup.

Tests: full suite `pytest -n 2` passes on JAX 0.12 (408 passed, 1 skipped, 1 xfailed) and at the declared floors (jax 0.6.2, diffrax 0.7.0; Linux x86; 404 passed, 5 skipped, 1 xfailed; peak RSS 4.9 GB). `tests/test_native_orbit.py` has 24 tests. `flake8 essos tests --select=E9,F63,F7,F82` is clean and there are no new F401. The `-x -vv --tb=short` diagnostics in the oldest-versions CI step are left as they were.

Update: `main` is merged into `feat/native_dopri` (#187) and into this branch; the only conflict was the new `adjoint=None` argument of `Tracing`. CI is green on both.

Update 2026-11-13: `feat/native_dopri` merged again (it had merged a newer main).
- Removed `examples/benchmarks/benchmark_native_boozer_alpha.py` (-204 lines) and its README paragraph; `benchmark_native_orbits.py` already covers the Boozer workload.
- Added `test_forward_derivative_of_the_final_state`: `jacfwd` of `solve_rk` on the harmonic oscillator equals the rotation matrix to 1e-8 for Dopri5 and Dopri8. The solver is forward-mode only (README says so).
- Tests: `tests/test_native_orbit.py` 26 passed, JAX 0.12, x64, `-n 2`, 7 min on a machine at load ~200.
- CPU profile (4 particles, Tracing GC, jax.profiler perfetto): with 4 CPU devices the while loop time is almost all `all-reduce`/rendezvous from the sharded batch condition, for Diffrax (3 per step) and native (2 per step). With one CPU device, warm times were 0.20-0.58 s (Diffrax) and 0.46-0.51 s (native), first call 21.6 s vs 28.8 s; the load makes these inconclusive, so no speedup is claimed. GPU profile not done, office unreachable.

## ESSOS 196

[Simplify the analytical Alfven perturbation PR](https://github.com/uwplasma/ESSOS/pull/196) · [Revision 1eefd26d](https://github.com/uwplasma/ESSOS/tree/1eefd26d6667c570f360d8f2bfa9b17d156cfc26)

Trims for #177 with the same physics and public API, to review and merge into your branch.

What changed
- One `Perturbation` base (`potentials`, `derivatives`, `axis_stop_threshold`) shared by `BoozerPerturbation` and `GuidingCenterPerturbation`; one `AnalyticalAlfvenMode.envelope`; shorter validation and docstrings. The two types stay separate, so a Boozer wave cannot be passed to a native `Tracing`.
- Examples: the two paper benchmarks, launcher, plot/comparison scripts, convention helpers, sampling and 10 saved reference files (about 1,700 lines) are replaced by `paul_alfven_benchmark.py` (parameters at the top, no argparse) and a 30-line `alfven_perturbation.py`. Watchdog threads, resume modes and JSON manifests are gone.
- Tests: Boozer, axis-stop and electromagnetic-verification files merged into `tests/test_perturbations.py`, VMEC map tests into `tests/test_native_gc_perturbations.py`. Script-plumbing tests removed. One test added: a Landau-resonant marker (omega - n zeta_dot = 0, White, Theory of Toroidally Confined Plasmas) gains energy equal to the work of the parallel field, a detuned one only oscillates, and v_perp^2/2B stays constant.
- Docs 260 -> 126 lines; only `paul_loss_100.png` kept (101 KB -> 45 KB); `tomli` dependency removed.

Net: #177 is +3747/-60 in 40 files; with this it is about +1500/-60 in 13 files.

Checks (JAX 0.12, Python 3.13, x64, current main merged in)
- `tests/test_perturbations.py` and `tests/test_native_gc_perturbations.py`: 57 passed. Edge cases covered: zero amplitude (bitwise equal to the unperturbed RHS and trace), births on the axis and axis crossing, gradient with respect to amplitude against finite differences, float64 conservation to 1e-12.
- `paul_alfven_benchmark.py` runs end to end after the edit (4 markers, 2e-5 s smoke run). The 100-marker docs table and figure were regenerated with the reactor-scale wout (below).
- Main merged: the `adjoint` argument is in `Tracing.__init__` next to `perturbation`, and `_vmec_results` still carries `axis_stop_times`, `axis_stop_states`, `axis_stopped`.
- CPU cost, 64 markers, 100 steps, loaded laptop, second call: rk4 0.03 s -> 0.28 s with a wave (the potentials' Jacobian is evaluated each stage); adaptive8 0.01 s -> 0.02 s. First call (compile): rk4 23 -> 34 s, adaptive8 46 -> 142 s (timings inflated by load ~200).

Later commits
- Slow tests: the chunking/compaction test and the inner-stop test run Dopri5 (`adaptive`) instead of Dopri8, and the chunking test uses 3 markers instead of 7. Both exercise the same chunked-interval and axis-stop code; Dopri8 stays covered by the other adaptive8 traces. CPU time (user+sys; wall time is unusable at load 150-300) for the two adaptive cases: 97 s -> 42 s. Under the same load wall time was 749 s and 121 s before.
- `wout_LandremanPaul2021_QA_lowres.nc` (1.5 MB) is removed. Lossless shrinking only reaches 1.0 MB (float64 data does not compress), so the Paul benchmark uses `wout_LandremanPaul2021_QA_reactorScale_lowres.nc`, already in the repo and used by other examples and tests. After the example's rescaling to a = 1.7 m and B00 = 5.86 T the two equilibria agree: boundary coefficients to 1e-6, iota to 1e-3 (0.4209 vs 0.4211 at s = 0.25), Boozer Bmn ratios to 0.2% (ns 50, mpol 5 vs ns 75, mpol 8). Regenerated table (100 markers, `HISTORICAL = True`, seed 42), old -> new: Boozer wave 21.62% -> 22.29%, VMEC wave 21.56% -> 24.30%, unperturbed 12.25% -> 12.25%; all inside the sampling intervals (2.7% is 3 markers). Docs text and `paul_loss_100.png` (45 KB -> 40 KB) updated.

Not changed: the Boozer `K = B_psi` omission and per-marker `speed`.

## ESSOS 207

[Derive Tracing timestep and max_steps, tie atol to rtol, warn on unfinished orbits](https://github.com/uwplasma/ESSOS/pull/207) · [Revision 33e7bca8](https://github.com/uwplasma/ESSOS/tree/33e7bca82a039bd726d48d394e28ebe690289853)

Tracing's defaults limited accuracy and could silently truncate runs, so this changes them and makes truncation visible. It is based on main; #206 is merged.

#### What changed

- `atol` defaults to `rtol`. The old `atol=1e-7` is absolute and positions are about 1 m, so tightening `rtol` alone left an error floor.
- `rtol` defaults to 1e-8 (was 1e-7).
- `timestep` defaults to 1/400 of the transit time `R0 / v` on a coil field and 1/100 on a VMEC field (was a fixed 1e-8 s). `R0 = field.r_axis` and `v` is the largest particle speed, both evaluated eagerly, so the value also holds under `jax.grad` and `jit` when the field and particles are closed over. If either is traced (coil dofs or energy being differentiated) a fixed-step model raises an error asking for an explicit `timestep`; adaptive models use `maxtime/100` as their first trial step (and `max_steps` stays 1e6), and field lines use `maxtime/100`.
- `max_steps` defaults to 16 times the steps of a fixed-step solve (was 1e6, which could stall a batch).
- A `RuntimeWarning` reports orbits that end non-finite or reach `max_steps`; adaptive models used to return inf rows silently.
- In #206's `_orbit` helper the objective losses default to `timestep=None` and `trace_tolerance=1e-7` (was 1e-5, energy error about 1e-4).
- New `docs/tracing.rst` on adaptive against fixed, tolerances, `max_steps` and the warnings.

The VMEC value comes from the sweep below: the Fourier field is converged to 1e-10 from about 100 steps per transit, and 400 only costs 2.3 times more. A coil field needs 400 (max energy error 3e-2 at 100, 4e-8 at 400).

#### Numbers

6 guiding centres over 40 transits against a Dopri8 reference at `rtol = atol = 1e-12`. Coil: 4 keV alphas, LandremanPaulQA coils. VMEC: 3.5 MeV alphas, reactor-scale QA wout. Wall time is with the compiled program cached and includes about 2 s (coil) or 4 s (VMEC) of setup; one process on a shared 36-core machine, so differences under about 20% are noise.

| case | | max energy error | median endpoint error (m) | wall (s) |
|---|---|---|---|---|
| coil, adaptive | before | 3.9e-7 | 3.8e-7 | 2.2 |
| | after | 7.1e-8 | 6.5e-8 | 2.4 |
| coil, fixed step | before | 2.6e-5 | 3.0e-12 | 6.2 |
| | after | 3.8e-8 | 2.9e-12 | 8.6 |
| VMEC, adaptive | before | 1.9e-5 | 2.8e-7 | 4.0 |
| | after | 1.9e-5 | 5.2e-8 | 4.3 |
| VMEC, fixed step | before | 1.9e-5 | 1.7e-10 | 6.3 |
| | after | 1.9e-5 | 1.1e-10 | 8.9 |

The VMEC energy error is a property of the field representation, not the integrator. The coil fixed-step endpoint error is the median; one orbit is chaotic and its error is larger and not meaningful. The fixed-step cost on VMEC rose from 6.3 to 8.9 s because the old 1e-8 s step was about 78 steps per transit; at 400 per transit it would have been 17 s.

![Error against wall time, old and new defaults](https://raw.githubusercontent.com/uwplasma/ESSOS/5a18e0e7c825462bf64cd10ae83405f020d20fc4/docs/_static/tracing_work_precision.png)

Large markers are the defaults. The dashed orange curve is the old `atol=1e-7`; it follows the new one down to about rtol 1e-8 and then floors.

#### Tests

New in `tests/test_dynamics.py`:

- `test_fixed_step_error_converges_at_the_scheme_order`: error against step size has slope 4, 5 and 8 for `rk4`, `dopri5` and `dopri8` on an axisymmetric Boozer guiding centre (Hairer, Norsett and Wanner, solving ODEs I, II.3). Measured slopes 3.96, 5.07 and 8.5.
- `test_full_orbit_magnetic_moment_is_an_adiabatic_invariant`: in a static coil field the instantaneous mu oscillates by about 1% with the gyrophase while its gyro-average over ten periods holds to 2e-4 (Littlejohn 1983; Cary and Brizard 2009), and the energy is conserved.
- `test_default_timestep_is_a_transit_fraction_and_survives_grad`: 1/400 on coils, 1/100 on VMEC, unchanged under `jax.grad` of the launch point, and the error for a traced energy.
- Earlier in this PR: energy conservation of the default adaptive and fixed-step traces, and the truncation warning.

Energy and canonical toroidal momentum in an axisymmetric field were already covered for the Boozer tracer in `tests/test_boozer.py`, so they are not repeated. The guiding-centre energy in a static coil field is covered by `test_default_tracing_conserves_energy`.

The full suite passes with `JAX_ENABLE_X64=1` on JAX 0.12 / Python 3.13 (398 passed, 1 xfailed) and on JAX 0.6.2 / Python 3.10 (390 passed, 5 skipped; `test_multiobjectives.py` is excluded there because `optuna` is not installed in that environment).

#### For a reviewer

```
JAX_ENABLE_X64=1 PYTHONPATH=. python -m pytest -q -n 2 tests
JAX_ENABLE_X64=1 PYTHONPATH=. python -m pytest -q tests/test_dynamics.py -k "scheme_order or adiabatic or default_timestep or default_tracing or truncated"
```

#### Limits

- Under `jax.grad` with coil dofs or energy as the differentiated input, fixed-step models now need an explicit `timestep`; adaptive models do not.
- Adaptive traces whose scales are traced start from `maxtime/100` and keep `max_steps=1_000_000`; the truncation warning is skipped under tracing because the result is not concrete.
- The sweep script for the figure is not in the repository.

## ESSOS 208

[Sum Biot-Savart over coils with lax.scan in one shared kernel](https://github.com/uwplasma/ESSOS/pull/208) · [Revision bb169ee9](https://github.com/uwplasma/ESSOS/tree/bb169ee96655d417f92b8fa412a77a7d6a318c76)

`BiotSavart.B` and `BiotSavart_from_gamma.B` repeated the same dense formula, which builds a (coils x quadrature x 3) temporary for every evaluation point, and again for its Jacobian under `jacfwd`. Both now call one `_biot_savart` kernel that sums the same expression over coils with `lax.scan`, 8 coils per step (the last step is padded with zero-current copies), with `jax.checkpoint` on the step so reverse mode keeps no per-coil residuals. Constructors and public API are unchanged.

Why this form: The first version of this PR used a different einsum inside the scan and cost 10-30% in warm time. Using the previous kernel's exact expression inside each chunk, with 8 instead of 4 coils per step, removes that cost for everything except a bare `B` call.

Accuracy: x64, 4096 random points, 16 and 64 coils, versus the previous kernel: B, dB/dx, kappa from `gc_quantities` and `jax.grad` with respect to the coil dofs agree to 4e-16 .. 1e-15 relative. A traced guiding-centre run differs by 6e-9 relative (adaptive stepping amplifies round-off).

Numbers (CPU): Laptop with other jobs running (load about 10-14), median of 3 fresh processes, `examples/input_files/ESSOS_biot_savart_LandremanPaulQA.json` (16 coils) and the same curves with nfp=8 (64 coils), 75 quadrature points. 4096 points for B, dB, gc; grad is of sum |B|^2 over 256 points with respect to all dofs; trace is 1000 guiding-centre particles for 2e-6 s. Times are good to about 10%.

| | warm time old -> new | peak RSS (MiB) old -> new |
|---|---|---|
| 16 coils, B | 13.4 -> 14.0 ms | 462 -> 445 |
| 16 coils, dB | 33.7 -> 23.9 ms | 894 -> 434 |
| 16 coils, gc | 43.9 -> 35.1 ms | 1209 -> 542 |
| 16 coils, grad | 6.1 -> 5.8 ms | 428 -> 406 |
| 16 coils, trace | 2.42 -> 2.17 s | 760 -> 624 |
| 64 coils, B | 50.3 -> 61.7 ms | 939 -> 478 |
| 64 coils, dB | 118 -> 112 ms | 2611 -> 461 |
| 64 coils, gc | 171 -> 142 ms | 3832 -> 574 |
| 64 coils, grad | 19.7 -> 22.7 ms | 716 -> 503 |
| 64 coils, trace | 7.09 -> 4.99 s | 1437 -> 751 |

Small cases are within 5% of the old speed or faster; the only slower entries are a bare `B` on 64 coils (+23%) and `grad` on 64 coils (+15%). Compile time is unchanged within noise.

Scaling: Extra peak memory and warm time of the Jacobian of `B` at 1024 points, 16 to 256 coils (`python docs/biot_savart_scaling.py`): the dense sum goes from 207 to 2445 MiB, the scan from 98 to 217 MiB, with the same warm time (8.7 -> 6.7 ms at 16 coils, 141 -> 143 ms at 256 coils).

![Peak memory and warm time versus number of coils](https://raw.githubusercontent.com/uwplasma/ESSOS/01366faf32cedf348040e182c2fd7921883c42b9/docs/_static/biot_savart_scaling.png)

Tests: `tests/test_fields.py` now checks, against analytic results independent of the kernel: the scan against a direct sum for chunks that pad, fit exactly and are mostly padding; geometric convergence of the quadrature of a circular loop at an off-axis point (Jackson, ch. 5); div B = 0 and curl B = 0 off the filament through `jax.jacfwd`; and Ampere's law, the circulation of B around a loop linking the coil being mu0 I (and 0 for a loop that does not link it). The on-axis B_z and its derivatives of a loop were already tested.

Reviewer commands:
```
JAX_ENABLE_X64=1 python -m pytest -q -n 2 tests          # 394 passed, 1 xfailed; Python 3.10 + JAX 0.6.2: 389 passed, 5 skipped, 1 xfailed
JAX_ENABLE_X64=1 python -m pytest -q tests/test_fields.py -k "scan or off_axis or divergence or ampere"
python docs/biot_savart_scaling.py                       # regenerates the figure, prints the numbers
```

Limits: GPU (A4000, summed kernel time of one profiled run): gc_coils 800 ms on main and 954 ms here, fo_coils 241 and 245 ms. The slower gc_coils comes from differentiating the scan with jacfwd; #233 replaces that with the fused B and dB/dx pass (365 ms). The earlier version of this PR, measured on an idle A4000, cut device peak memory 4-15x; the temporaries are the same size here. Bare `B` on many coils is up to 25% slower than the dense sum. Memory still grows slowly with the coil count (the inputs and the padded copies), about 2x from 16 to 256 coils.

Overlap: #152 removes `sqrtg`/`to_xyz` from `BiotSavart` a few lines from the `B` body changed here, so at most a trivial context shift. #190 touches `coils.py`, not `fields.py`.

## ESSOS 226

[Uniform examples; fast and research-grade loss examples](https://github.com/uwplasma/ESSOS/pull/226) · [Revision 09f9bb2e](https://github.com/uwplasma/ESSOS/tree/09f9bb2e1939f3d415f056deaa418b90b5661992)

Makes the examples uniform and adds a clear pair of loss examples.

**Template.** Every example is a plain script: a module docstring saying what it teaches and the expected runtime, imports, a parameter block of plain variables, the workflow, and the printed or plotted results. All 40 examples that had no docstring now have one. The two scripts with `main()` or parsed arguments (`trace_particles_interpolated_dipoles.py`, `cross_code_benchmark/benchmark.py`) now read their settings from a parameter block at the top. The benchmark re-enters itself for FIRM3D and DESC through an environment variable instead of argv.

**Fast and research loss examples** (README points to both):
- `particle_tracing/losses_fast_boozer.py`: Boozer guiding centres with fixed-step RK4 and a pruned |B| spectrum (`mode_tolerance=1e-4`), loss at `s = 1`, 101 saves. This is the path behind `vmex --trace`, which calls `essos.boozer.trace_boozer`, so no library change was needed. 256 alphas in ARIES-CS for 2 ms: 14.8 s of tracing including compilation (24 s wall), 3.1% lost, energy error 4e-4.
- `particle_tracing/losses_research_vmec.py`: adaptive Dopri8 in VMEC coordinates, with a collisional run (`GuidingCenterCollisionsMuFixed`), energy error per orbit and the energy of each lost alpha. 24 alphas in the QA reactor-scale case for 0.1 ms: 17 s collisionless, 50 s with collisions (81 s wall on the lightly loaded office machine), energy error 4e-5.

**Merged duplicates.** `trace_particles_vmec.py`, `trace_particles_vmec_classifier.py` and `trace_particles_vmec_collisionsMu.py` are replaced by `losses_research_vmec.py` (the classifier boundary and the Adaptative model are noted as options in its parameter block). Removed `..._classifier_scaled_currents.py` (identical to `..._classifier.py` apart from comments) and `statistics_collisions_velocity_distributions_mu_Adaptative.py` (now the `model` parameter of the `_Fixed` script).

**Run on a shared 36-core CPU box** (timings inflated by other jobs): ran to completion: the two loss examples, `trace_particles_boozer_vs_vmec`, `trace_particles_coils_fullorbit`, `..._coils_guidingcenter`, `..._vmec_Electric_field`, `..._interpolated_dipoles` (after the edit), `..._vmec_to_wall` (with VMEX), all `fieldline_tracing`, all `simple_examples` except the optional-package ones, `paper/gc_vs_fo`, `gradients`, `poincare_plots`, `gc_integrators`, the collision statistics scripts, and the VMEC-surface coil optimizations (`vmec_surface`, `augmented_lagrangian_comparison`, `..._stochastic`, `..._distance_forces`).

**Not run, and why**
- need `pyqsc_jax`: `optimize_coils_and_nearaxis`, `optimize_coils_for_nearaxis`, `coils_from_nearaxis`
- need `simsopt`: all of `comparisons_simsopt`, `trace_particles_coils_guidingcenter_with_classifier`, `..._with_collisionsMu`, `coils_from_BOOZ_XFORM` (also `booz_xform`)
- need `optuna`: `optimize_multiple_objectives`
- need `virtual_casing_jax`: `optimize_coils_virtual_casing`, `optimize_coils_finite_beta_vmex`
- `optimize_coils_particle_confinement_fullorbit` and `..._guidingcenter` were still iterating after 25 minutes on the loaded machine (no error)
- `fo_integrators` was cut at 25 minutes (no error); with the sweeps cut to one tolerance and one step, it ran through to the plots
- `cross_code_benchmark/benchmark.py` with `CODES="ESSOS"` and 16 particles gets through the ESSOS run and then stops on the missing `booz_xform` package

**One example edit beyond the template.** `paper/gc_integrators.py` failed on main at the Kvaerno5 (implicit) solver with a `TracerBoolConversionError` in `Tracing`. I commented that solver out with a note; the explicit solvers are unchanged. The failure itself is a library bug and is not fixed here.

**Interplay with open PRs.** #206 renames the BioSavart loss call; `trace_particles_interpolated_dipoles.py` line `tracing.loss_fraction_BioSavart(classifier)` already changes in that PR, so it needs `tracing.loss_fraction(classifier)` there (the PR edits that file itself). #207 only changes `Tracing` defaults, and every example sets `timestep`, `atol` and `rtol` explicitly. No other example needs an update.

## ESSOS 228

[Tests: raise coverage to 93%](https://github.com/uwplasma/ESSOS/pull/228) · [Revision 59fdf33c](https://github.com/uwplasma/ESSOS/tree/59fdf33c597b62c78d5168088903bb27fef1b2bc)

Line coverage of `essos` goes from 73.4% to 93.5% (branch-inclusive 70.9% to 92.0%). Measured with `pytest -n 6 --cov=essos --cov-branch`, JAX on CPU, Python 3.10, with the `multiobjective` extra installed.

Per module, missed lines before and after: coils 354 to 61, multiobjectiveoptimizer 388 to 55, augmented_lagrangian 128 to 49, surfaces 124 to 18, dynamics 252 to 154, losses 59 to 1, optimization 61 to 3, util 22 to 0, electric_field 13 to 0, fields 44 to 7, coil_perturbation 12 to 0, mgrid 7 to 2.

Tests were added to the existing file of each module. New files only for modules that had none: `tests/test_util.py` (util, electric field) and `tests/test_optimization.py`.

What the tests check against references:
- Circular loop: length 2 pi R, curvature 1/R, gamma'' = -(2 pi)^2 gamma, and the on-axis field mu0 I a^2 / (2 (a^2 + z^2)^{3/2}) (Jackson, eq. 5.37) from `BiotSavart_from_gamma` with FFT derivatives.
- Circular torus: quadratic, local and normalised squared flux (B0^2 a R/4, a R/4, 1/4 for a uniform axial field); toroidal/poloidal flux by Stokes; signed distance to the surface.
- Particles initialised around the magnetic axis sit at the requested distance in the plane normal to the axis, in absolute units and as a fraction of the boundary distance.
- Full-orbit collisional SDE drift equals the Lorentz force plus the Stratonovich drift derived from the diffusion tensor (checked with jacfwd).
- Augmented Lagrangian: min |x| on x0 + x1 = 1 gives (1/2, 1/2) and the multiplier 1/sqrt(2) (or 1 for the squared form), Nocedal and Wright, Thm 12.1; every mu strategy.
- Periodic Gaussian-process perturbations: variance sigma^2, correlation decay, and nfp / stellarator symmetry of systematic coil perturbations (a coil rotated by pi about z carries the same displacement).
- Arclength resampling and Fourier fit of a non-uniformly parametrised circle; Newton root solve; interpolated roots of sin(x) = 1/2; Er to E_s conversion.
- Edge cases: empty/invalid arguments raise (ValueError, TypeError, KeyError), zero and scalar currents, dof round trips, legacy JSON keys, pytree round trips under jit.

Fixes found by the tests:
- `Curves.plot` / `DiscretizedCoils.plot` with `close=True` raised `TypeError` (a Python list passed to `jnp.concatenate`); now `data[:1]`.
- `PerturbationSample.get_sample` error message was missing its `f` prefix, so it printed the braces literally.

Not changed here:
- `MagneticField`'s abstract methods are `jit`-decorated and fail on a non-pytree `self` before reaching `NotImplementedError`.
- Unreachable or unchanged: `ScaledConstraint` (deleted in #193; about 55 lines), simsopt converters (simsopt is not installed), `version.py` (generated), the booz_xform_jax branch and compact tracing in `boozer.py` (#205 rewrites it), plotting and condition code in `dynamics.py` that #206/#207/#209 change, and the FullOrbitCollisions setup, which needs diffrax >= 0.7.1.

Small fixes made after the first findings, each with a test: `python -m essos` runs again (its removed loss is rebuilt from the existing near-axis, length and curvature losses, and the `Tracing` arguments are current); `optimize_loss_function` uses an exact `jax.jacfwd` Jacobian and falls back to finite differences only for losses JAX cannot trace; the signed-distance helpers accept an `(N, 3)` batch; `BiotSavart_from_gamma` is a registered pytree; `MagneticField()` no longer raises; the empty `plot_scalar_on_flux_surface` is removed.

The earlier `-n 6` worker crash on `test_vmec_wall_trace_differentiates_in_both_modes...` does not reproduce alone (it passes, 3.9 GB peak, 8 min on a loaded box), so it was most likely the OOM killer on a nearly full shared host; it is unchanged.

Tests avoid lines that the open PRs 205 to 210 and 193 delete or rewrite; the one dynamics test that is not in a new location was inserted mid-file to limit merge conflicts with #206/#207.

CI time: the new tests add about 85 s of CPU in total as measured on a loaded 36-core box (load 100), where the slowest is 15 s; most take 1 to 6 s. The full suite ran in 11 minutes with `-n 6` under that load.

## ESSOS 232

[PEP 8 names: ElectricFieldFlux, ElectricFieldZero, species_indices, alm_model_lbfgs](https://github.com/uwplasma/ESSOS/pull/232) · [Revision ff9e2c5c](https://github.com/uwplasma/ESSOS/tree/ff9e2c5ccb31153999dbf769a0c6b03930820484)

PEP 8 names and removal of compatibility code. Breaking, no aliases; the old -> new table is in the README.

| Old | New |
| --- | --- |
| `Electric_field_flux`, `Electric_field_zero` | `ElectricFieldFlux`, `ElectricFieldZero` |
| `BackgroundSpecies.species_indeces` | `species_indices` |
| `ALM_model_lbfgs`; `ALM_model_jaxopt_lbfgsb` (alias, removed) | `alm_model_lbfgs` |
| `CreateEquallySpacedCurves`, `RotatedCurve` | `create_equally_spaced_curves`, `rotated_curve` |
| `BdotN`, `BdotN_over_B`, `B_on_surface`, `SquaredFlux` | `bdotn`, `bdotn_over_b`, `b_on_surface`, `squared_flux` |
| `loss_B_difference_coils_near_axis`, `loss_gradB_difference_coils_near_axis`, `loss_particle_Br`, `normB_axis`, `loss_normB_axis_average`, `B_regularized_*` | lower-case (`loss_b_difference_coils_near_axis`, ..., `norm_b_axis`, `b_regularized_*`) |
| vector-field functions `GuidingCenter*`, `LorentzCollisions*`, `Lorentz`, `FieldLine*` | snake_case |
| `BiotSavart_from_gamma`; `base_loss`, `custom_loss`, `composite_loss` | `BiotSavartFromGamma`; `BaseLoss`, `CustomLoss`, `CompositeLoss` |
| `*Adaptative` models, `Mu_Adaptative_1/2`, `Mu_Tolerance` | `*Adaptive`, `MuAdaptive1/2`, `MuTolerance` |
| `FullOrbit_Boris`, `FieldLineArclength` | `FullOrbitBoris`, `FieldLineArcLength` |
| `order_Fourier` (option key, example variables), `Tracing.ODE_term` | `fourier_order`, `ode_term` |
| `Tracing(condition=...)` and `stopping_criteria` | one argument, `stopping_criteria` (level-set callables, also sets `boundary_hits`) |

Removed compatibility code:
- the `essos.fields.near_axis` stub that only raised `ImportError`;
- the `x` property of coils and surfaces ("placeholder for compatibility");
- the legacy branch of `Coils.from_json` (keys `dofs_curves`, `dofs_currents`); the one committed file in that format, `ESSOS_biot_savart_LandremanPaulQA.json`, is rewritten with `Coils.to_json` (gamma and currents identical, max difference 0.0);
- the xfailed `test_build_available_inputs`, which used the old optimizer loss API, and two commented-out ODE-term lines.

Stacked on #231 (base `api-uniform-renames`): both touch the same examples and `objective_functions.py`, so the merge is resolved here. Fixed in the merge: renaming `BdotN_over_B` to `bdotn_over_b` made four `bdotn_over_b = bdotn_over_b(...)` locals shadow the function; they are now `ratio`.

Tests (x64, -n 2, laptop): test_coils, test_surface_integrals, test_objective_functions, test_fields, test_collision_mu_drifts, test_background_species, test_multiobjectives, test_augmented_lagrangian, test_interpolated_field, test_mgrid, test_boozer: 267 passed after the fixes (5 failed before them: string patch targets and `.x` uses). test_dynamics, test_cpu_devices, test_surface_cross_section, test_coil_perturbation, test_constants: 148 passed. pyflakes reports no undefined name in essos, tests or examples.



Names pass: test_dynamics, test_multiobjectives, test_boozer, test_interpolated_field, test_augmented_lagrangian, test_objective_functions: 250 passed (x64, -n 2). Four edited examples ran to completion. `booz.Boozer_G/I` are attributes of booz_xform and stay.

## ESSOS 236

[Compacted tracing: step budgets that drop finished particles](https://github.com/uwplasma/ESSOS/pull/236) · [Revision cf34c197](https://github.com/uwplasma/ESSOS/tree/cf34c1978f63c9cf883ea4363a4230617c7e80fd)

A vmapped adaptive solve runs every particle to the step count of the slowest, and a particle that has been lost keeps being evaluated until the batch finishes.

`Tracing(..., step_budget=k)` traces in rounds: each round advances the remaining particles by at most k steps, then the particles that reached maxtime or a stopping event leave the batch and the rest resume from where they stopped. The PID controller state, now including the next step size, is carried between rounds, so a resumed particle takes the same steps it would have taken in one solve. Rounds are padded to 3 significant bits, as trace_boozer already does. max_steps still bounds each orbit. It is off by default, CPU only, and skipped under jit/grad; it raises for FullOrbit_Boris and GuidingCenterCollisionsMuAdaptative.

VMEC guiding centres without a condition (the LCFS/wall segment path) are covered too: `_vmec_orbit` is split into a start, one pass (an inside and an outside segment) and a finish, and with a budget each round is one pass of the active orbits. A segment that runs out of its budget pauses the orbit in its region. It resumes from its last save, because under vmap diffrax root-finds on every orbit once any orbit has an event, and an orbit stopped by max_steps can then end inside a rejected step. The inside saves are mapped to xyz once at the end, not in every round.

The PID state carries an extra trailing entry (the next step); only that entry is stripped before calling diffrax, so diffrax 0.7.0 (two-entry state) and 0.7.2 (three) both work.

Right-hand-side evaluations are counted per particle lane (inactive lanes of a vmapped loop included). Times are for a cached call on one device, float64.

Coils: 64 alphas (3.5 MeV) in the Landreman-Paul QA coils scaled to the reactor-size wout (16 coils, 75 segments), adaptive Dopri8 at 1e-7, 1e-4 s, SurfaceClassifier boundary.

| births | lost | RHS evaluations, lockstep / k=128 | laptop, 1 thread, CPU-s | office, 8 threads, wall |
|---|---|---|---|---|
| s = 0.9 | 48 / 64 | 431,872 / 180,368 (2.4x) | 24.4 and 23.5 / 12.7 | 19.6 s / 27.1 s |
| s = 0.5 | 8 / 64 | 431,040 / 346,542 (1.24x) | 22.3 and 24.8 / 20.5 and 22.6 | |

VMEC field: alphas in the same QA wout, adaptive Dopri8 at 1e-7, 1e-4 s, stop at the LCFS.

| case | lost | RHS evaluations, lockstep / k=128 | laptop, 2 threads, warm | office, 8 threads, warm wall |
|---|---|---|---|---|
| 8 particles, s = 0.5 | 0 | 32,456 / 26,439 (1.23x) | 1.0 / 2.6 s | 9.9 / 26.1 s |
| 64 particles, s = 0.9 | 38 | 276,288 / 165,528 (1.67x) | 3.2 / 5.2 CPU-s | 10.6 / 30.8 s |
| 256 particles, s = 0.9 | 166 | | 19.9 / 12.3 CPU-s | |

The evaluations saved turn into time only when the cost of a right-hand side grows with the number of lanes. On the office CPU one vmapped VMEC right-hand side costs 0.74 ms for 8 particles and 1.6 ms for 64 (mostly a fixed cost per call), and Biot-Savart 4.8 ms for 64 particles; with 8 threads the per-lane cost is small. Each round also adds a fixed cost (about 0.25 s on the laptop for the VMEC path). So step_budget pays for large, lossy batches on few threads (1.9x on coils, 64 particles, one thread; 1.6x on VMEC, 256 particles) and loses on small batches or many threads. It stays off by default.

Results: on the office CPU the VMEC runs give the same status for every orbit and the same LCFS crossing times; trajectories differ by up to 1.5e-5 in (s, theta, phi) because a paused orbit restarts from a save. The coil runs give the same lost set. In one laptop coil run (s = 0.9) one edge orbit came out lost in one run and not the other (47 against 48), as already happens between particle_batch_size values.

Tests: tests/test_dynamics.py::test_step_budget_rounds_match_one_solve (fixed and adaptive field lines, rounds of 2 steps, stopping events) and ::test_vmec_step_budget_matches_one_solve (LCFS crossings, and wall strikes with an exterior coil field, rounds of 16 steps). Locally the 31 VMEC, wall, LCFS, batch and step_budget tests of test_dynamics pass with jax 0.12 and diffrax 0.7.2.

GPU, RTX A4000, float64, jax 0.12, one card, cold / warm wall:

| case | lockstep | k=128 | peak GPU memory |
|---|---|---|---|
| coils, 64 particles, s = 0.9 | 20.8 / 11.1 s | 44.0 / 40.8 s | 443 MB both |
| VMEC, 8 particles, s = 0.5 | 15.0 / 10.0 s | 31.0 / 24.9 s | 129 / 145 MB |
| VMEC, 64 particles, s = 0.9 | 12.6 / 7.7 s | 34.2 / 25.9 s | 161 MB both |

On the GPU the rounds are 2.5-3.7x slower: the lanes cost almost nothing there and each round adds its fixed cost. step_budget is therefore ignored on non-CPU devices (one line in trace). Against the office CPU runs, the GPU gives the same VMEC status for every orbit (trajectories within 2.6e-3 in s, theta, phi for 64 particles), and the coil runs agree to below 1e-6 m for 48 of 64 orbits and below 1e-3 m for all; one edge orbit is lost on the GPU and not on the CPU (48 against 47).

## SOLVAX 205

[Time stepping in solvax.ode: IMEX, Lawson, SSP, step control, chunked driver](https://github.com/uwplasma/SOLVAX/pull/205) · [Revision 485f6e41](https://github.com/uwplasma/SOLVAX/tree/485f6e41d5cd0cad132ff178e58d14dcdc71a3a2)

GKX, DRBX, LMhdX and MHX each carry their own IMEX, Lawson or RK4 stepper, and several lack step control or a non-finite stop. This adds the missing pieces to `solvax.ode`, next to the existing embedded pairs and PI controller, so the four codes can share one implementation.

New in `solvax.ode`:

- `imex_step(f_exp, f_imp, solve, t, y, h, tableau)`: additive Runge-Kutta. The stiff part enters through `solve(t, r, gamma_h)`, which returns `z` with `z - gamma_h f_imp(t, z) = r`. Tableaux: `IMEX_EULER`, `IMEX_SSP2` (the DRBX production scheme), `ARS_343` and `ARK3_KC` (the two GKX chain schemes, the second with its embedded pair), and `SMR_RK3_CN` (the LMhdX RK3 with Crank-Nicolson substeps, written as a stiffly accurate 4-stage tableau and checked against the substep form).
- `lawson_step(f, propagate, t, y, h, pair)`: any `ERKPair` as a Lawson method for `y' = L y + f`, given `propagate(x, tau) = exp(tau L) x`. It does one propagation per distinct node gap, which reproduces the LMhdX Q2D integrating-factor RK4 to rounding. The GKX drift factor fits as `propagate`.
- `ssp_step` with two-register `SSPRK3`, `SSPRK43` and `SSPRK104`.
- `cfl_dt`, and `controlled`, which wraps a one-step map for fixed, CFL-capped or PI-controlled stepping.
- `integrate(step, y0, t0, dt0, n_steps, ...)`: a `lax.scan` over chunks of `lax.scan`, each chunk under `jax.checkpoint`. It prints one flushed line per chunk from the compiled program (`progress=True`), rejects a non-finite state and retries at half the step, stops after `max_retries` consecutive rejections with `ok = False` and the last finite state, stops at `t1`, and records `observe(t, y)` once per chunk. It differentiates in reverse mode, jits and vmaps.

Why not diffrax: its IMEX solvers (KenCarp, Sil3) solve each implicit stage with their own Newton iteration and a lineax solve of the Jacobian, and do not take a user solve of `I - gamma h L`. The plasma codes need exactly that callback, for Fourier diagonals, fast-diagonal and Thomas solves, and preconditioned GMRES. diffrax also has no Lawson or low-storage SSP schemes and no chunked progress or non-finite stop. exponax has ETDRK schemes, but for its own Fourier domain and a fixed step. ETDRK is left out here; none of the four codes uses it in production.

Tests (tests/test_ode.py: 39 passed in 18 s on one thread at load average about 70 from other jobs; ruff and mypy clean): observed convergence order for every IMEX tableau, every Lawson pair (complex linear part) and every SSP scheme; exactness of Lawson when `f = 0`; L-stable behaviour at `h |lambda| = 1e4`; SSPRK104 stays TVD at 6 times the Euler limit; the driver against a Python loop for several chunk sizes, `t1` clipping, PI control with rejections, CFL capping, non-finite recovery, gradients with and without checkpointing against the analytic value, `jit`, `vmap` and the progress lines.

The module grows from 247 to about 730 lines. Adoption in the four codes comes in their own PRs, deleting each local copy once parity is shown.

## SOLVAX 209

[integrate: diagnose and retune hooks](https://github.com/uwplasma/SOLVAX/pull/209) · [Revision b16a501b](https://github.com/uwplasma/SOLVAX/tree/b16a501b569df8513f0ba4fc0d3cabd214f6d4fc)

Stacked on #205 (base `stepping`). Retarget to `main` after #205 merges.

GKX, DRBX, MHX and LMhdX each keep a hand-written chunked loop because `integrate` had no place for two things they do inside it: accumulate diagnostics over the steps of a window, and change the step size (and refactor an implicit operator for it) between windows. This adds both as optional hooks.

- `diagnose(acc, t, y_old, y_new, h) -> acc` runs inside the scan after every accepted step. `acc` starts each chunk at `diag0`, and its value at the end of each chunk is stacked in the new `Trajectory.diagnostics`. Rejected attempts never reach it.
- `retune(t, y, dt, aux) -> (dt, aux)` runs before each chunk. It can return a CFL step from the current state, or an implicit factor rebuilt for a new step and kept in `aux`.

Without the hooks nothing changes. `Trajectory` gains one field with a default of `None`.

Measured against the loop it replaces: 2D vorticity, pseudo-spectral with `rfft2`, RK4, chunks of 20 steps, a CFL step recomputed before each chunk, and the time integral of the energy per chunk. The hand-written version is a `lax.scan` over checkpointed chunks with an inner scan. Office CPU, 2 threads, x64, 200 steps, best of 5 interleaved runs, load average 31-40 from other jobs:

| grid | forward, hand / `integrate` | gradient, hand / `integrate` |
|---|---|---|
| 128x128, 3 runs | 1.07-1.18x | 1.16-1.31x |
| 256x256 | 3.26 / 3.59 s (1.10x) | 9.52 / 9.96 s (1.05x) |

States, times, energies and gradients agree bitwise, or to 4e-16 relative. The extra cost is the per-step finite check, the rejection bookkeeping and the conditional that stops finished lanes. I tried masking finished steps instead of the conditional; across three interleaved repeats it was within the spread, so I kept the conditional.

GPU, RTX A4000, x64, same case, best of 5 interleaved runs. The card was shared with another job (9.2 GB, 100 % utilization) for these runs, so read the ratios, not the times:

| grid | forward, hand / `integrate` | gradient, hand / `integrate` |
|---|---|---|
| 256x256 | 0.46 / 0.69 s (1.50x) | 1.43 / 2.43 s (1.70x) |
| 512x512 | 1.31 / 1.55 s (1.18x) | 4.23 / 5.02 s (1.19x) |

On GPU the per-step bookkeeping costs more at small grids, where each step is a few kernel launches. Codes that move onto `integrate` should measure their own case at small sizes.

Tested: `tests/test_ode.py` (41 passed). New tests check the per-chunk accumulator against a Python loop, that rejected PI steps do not reach it, and a backward-Euler step whose stored factor `retune` rebuilds for a new step each chunk, against a Python loop.
