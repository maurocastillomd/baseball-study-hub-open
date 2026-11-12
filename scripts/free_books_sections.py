"""Teaching sections that fold the free textbooks into existing hub material.

Imported by build-free-books.py. Everything here is original teaching written
for the hub. Books are cited by chapter; no text, figure or table is copied.
All numbers in worked examples are synthetic and come from the hub's own
practice-lab datasets unless the example says otherwise. The arithmetic was
checked with Python on 2026-11-09.

Keys: 'unit:<id>', 'lesson:<id>'. Each section has:
  heading, text (list of paragraphs), optional example (title + lines),
  optional code (Python, shown as text), refs (source id + locator).
"""

BMB = 'free-bmbstats'
LAK = 'free-lakens-inferences'
WIF = 'free-whatif'
ISL = 'free-isl'
PDA = 'free-mckinney-pda'
ABD = 'free-abdwr3e'

SECTIONS = {
    'lesson:science-testing-reliability': [dict(
        heading='Compare the noise with the smallest change that matters',
        text=[
            'Two numbers decide whether one retest can answer your question. The first is the noise: the smallest detectable change, built from the typical error. The second is the smallest change you would actually act on. Jovanović calls it the smallest effect size of interest, or SESOI. Choose it from the decision before you look at the data.',
            'If the smallest detectable change is smaller than the SESOI, one retest can show a change that matters. If it is larger, one retest cannot separate a meaningful change from noise. Then you need more comparable tests, a tighter protocol, or a decision that does not rest on that test alone.',
        ],
        example=dict(title='Worked example · synthetic data from the reliability lab', lines=[
            'Typical error (TE) = 0.88 cm.',
            'Smallest detectable change = 1.96 × √2 × 0.88 = 2.45 cm.',
            'The staff would change a plan for a 2.0 cm drop, so SESOI = 2.0 cm.',
            '2.45 cm is larger than 2.0 cm, so one retest cannot reliably detect a 2 cm change.',
            'To be about 95% sure a change goes beyond the SESOI, the observed change must reach SESOI + detectable change = 2.0 + 2.45 = 4.45 cm.',
            'Jovanović uses the t critical value instead of 1.96. With 24 athletes (t ≈ 2.07) the detectable change is about 2.59 cm.',
        ]),
        refs=[(BMB, 'Chapter 10, Measurement Error: sections 10.2 Smallest Detectable Change and 10.3 Interpreting individual changes using SESOI and SDC.')],
    )],

    'unit:m07-u5': [dict(
        heading='Report how precise your typical error is',
        text=[
            'A typical error from a small reliability study is itself an estimate. With few athletes, the true value could be quite a bit smaller or larger. Lakens lists six ways to justify a sample size. Team studies almost always fall under resource constraints: you test the players you have. His advice for that case is to report what the design can tell you, such as how wide the uncertainty is, instead of presenting the estimate as exact.',
            'The confidence interval for a standard deviation comes from the chi-square distribution with n − 1 degrees of freedom. You do not need to memorize the formula. Learn the pattern: the interval narrows slowly as you add athletes.',
            'Write it like this: "Typical error 0.88 cm (95% CI 0.69 to 1.24 cm; 24 athletes; sessions one week apart)." A reader can now see whether the upper end would change the decision.',
        ],
        example=dict(title='Worked example · synthetic data from the reliability lab', lines=[
            '24 athletes give 23 degrees of freedom. The 95% multipliers for an SD are 0.78 and 1.40.',
            'TE = 0.88 cm, so the plausible range is 0.88 × 0.78 to 0.88 × 1.40 ≈ 0.69 to 1.24 cm.',
            'The 95% detectable change then ranges from about 1.91 to 3.44 cm, not just the single value of 2.45 cm.',
            'With only 10 athletes (9 degrees of freedom) the multipliers are 0.69 and 1.83, so the same 0.88 cm could plausibly be 0.61 to 1.61 cm.',
        ]),
        refs=[(LAK, 'Chapter 8, Sample Size Justification: resource constraints and reporting precision.'),
              (BMB, 'Chapter 10, Measurement Error: estimating TE from two trials.')],
    )],

    'unit:m07-u6': [dict(
        heading='Choose the smallest worthwhile change on purpose',
        text=[
            'Many sport-science reports set the smallest worthwhile change at 0.2 × the between-athlete standard deviation. That number describes how spread out the roster is. It says nothing about which change would alter a training or availability decision.',
            'Lakens lists better routes to a smallest effect size of interest: an anchor (the change people notice or care about), a cost-benefit judgment, or theory. Jovanović also sets it from prior knowledge, with examples such as ±1 kg for body mass and ±5 kg for a bench-press 1RM.',
            'The roster rule also moves when the roster moves. Add a few very weak and very strong jumpers and the "worthwhile" change for the same athlete grows, even though nothing about that athlete changed. Whichever value you use, write down where it came from.',
        ],
        example=dict(title='Worked example · synthetic data from the reliability lab', lines=[
            'Between-athlete SD at session 1 = 5.34 cm, so 0.2 × SD = 1.07 cm.',
            'The staff only changes a plan for a drop of 2 cm or more, so the decision-based SESOI is 2.0 cm.',
            'The two values differ by almost a factor of two. Report the one tied to the decision, and say why.',
        ]),
        refs=[(LAK, 'Chapter 9, Equivalence Testing and Interval Hypotheses: setting the smallest effect size of interest.'),
              (BMB, 'Chapter 10, Measurement Error: SESOI set from prior knowledge.')],
    )],

    'unit:m07-u7': [
        dict(
            heading='Test for "no meaningful change," not just "no change"',
            text=[
                'A non-significant result does not show that nothing changed. It may only mean the data were too noisy. Lakens\' equivalence test asks a more useful question: can we rule out changes as large as the smallest one that matters? With a 5% error rate on each side, you check whether the 90% confidence interval sits fully inside ±SESOI.',
                'Combining the usual test with an equivalence test gives four outcomes. Different from zero and too small to matter. Different from zero and possibly large enough to matter. Not different from zero and too small to matter. Neither test decisive, which means you need more data.',
            ],
            example=dict(title='Worked example · synthetic data from the reliability lab', lines=[
                'Mean change between sessions = +0.40 cm; SD of changes = 1.25 cm; 24 athletes.',
                '95% CI: −0.13 to +0.93 cm. The usual test cannot rule out zero.',
                '90% CI: −0.04 to +0.84 cm. With SESOI = ±1.5 cm, the whole interval is inside the bounds.',
                'Conclusion: the group shift between sessions is smaller than any change the staff would act on. That is stronger and more useful than "not significant."',
            ]),
            refs=[(LAK, 'Chapter 9, Equivalence Testing and Interval Hypotheses: TOST, the 90% interval and the four outcomes.'),
                  (LAK, 'Chapter 7, Confidence Intervals.')],
        ),
        dict(
            heading='Report the size in centimeters before any standardized number',
            text=[
                'Lakens recommends unstandardized effect sizes when the scale is familiar. Coaches know what 2 cm of jump height means. A standardized value such as Cohen\'s d depends on which standard deviation you divide by, and repeated-measures data have several versions. d_z divides by the SD of the change scores. d_av divides by the average SD of the two sessions.',
                'He also advises against calling effects "small," "medium" or "large" from generic benchmarks. Compare the effect with your SESOI instead.',
            ],
            example=dict(title='Worked example · same synthetic data', lines=[
                'd_z = 0.40 / 1.25 = 0.32.',
                'd_av = 0.40 / ((5.34 + 5.89) / 2) = 0.07.',
                'One change, two "effect sizes" more than four times apart.',
                'Report "+0.40 cm (95% CI −0.13 to +0.93 cm)" first. If you add a d, name the version.',
            ]),
            refs=[(LAK, 'Chapter 6, Effect Sizes: unstandardized versus standardized effects, d_z and d_av, and the warning about benchmark labels.')],
        ),
    ],

    'unit:m07-u8': [dict(
        heading='Make the analysis rerun from the raw file',
        text=[
            'Lakens\' chapter on computational reproducibility gives a practical checklist. Keep the analysis in a script, not in clicks and copied numbers. Generate the report\'s numbers from that script. Use relative file paths so it runs on another computer. Record the package versions. Use version control, such as git, so earlier versions can be recovered. Rerun everything from the raw file before the final report, because files drift out of sync during revisions.',
            'McKinney\'s pandas chapters cover the checks that should run before any calculation: count the rows, look for duplicates and missing values, and confirm one protocol and one device. Make the script stop when a check fails, so a mixed file cannot quietly produce a number.',
        ],
        code=dict(label='Python · pre-analysis checks for the reliability lab file', text='''import sys
import pandas as pd

print("Python", sys.version.split()[0], "| pandas", pd.__version__)  # keep with the report

raw = pd.read_csv("paired-cmj-reliability.csv")  # raw export: read it, never edit it

checks = {
    "rows": len(raw),
    "duplicate athletes": int(raw["athlete_id"].duplicated().sum()),
    "missing values": int(raw[["test1_cm", "test2_cm"]].isna().sum().sum()),
    "protocols": raw["protocol"].nunique(),
    "devices": raw["device"].nunique(),
}
print(checks)
assert checks["protocols"] == 1 and checks["devices"] == 1, "Mixed methods: stop and review."''',
            output="Python 3.x.x | pandas 2.x or newer\n{'rows': 24, 'duplicate athletes': 0, 'missing values': 0, 'protocols': 1, 'devices': 1}"),
        refs=[(LAK, 'Chapter 14, Computational Reproducibility.'),
              (PDA, 'Chapter 6, Data Loading, and Chapter 7, Data Cleaning and Preparation.')],
    )],

    'unit:m07-u1': [dict(
        heading='Name the question type before you pick the test',
        text=[
            'Jovanović sorts analysis questions into three kinds. Description asks what is true now. Prediction asks what will happen next. Causal inference asks what would happen if you did one thing instead of another. Each kind needs different evidence.',
            'Hernán and Robins define a causal effect as the difference between what happens under one action and what would have happened under another, for the same person over the same period. You only ever see one of those. That is why a good description or a good prediction still does not tell you what to change.',
        ],
        example=dict(title='Worked example · one synthetic outfielder', lines=[
            'Describe: "His CMJ is 38 cm, 2 cm under his August mean."',
            'Predict: "From his testing history, his 30-yard sprint next month will probably fall between 4.05 and 4.15 s."',
            'Explain: "Would a jump block raise his CMJ more than his current plan?"',
            'Only the third question needs a comparison condition, and his own before-and-after cannot supply one.',
        ]),
        refs=[(BMB, 'Chapters 2 to 4: Description, Prediction and Causal inference.'),
              (WIF, 'Part I: the definition of a causal effect.')],
    )],

    'unit:m06-u7': [dict(
        heading='Draw the causal picture before you change the dose',
        text=[
            'When a jump drops after travel, it is tempting to blame the training. Hernán and Robins call a factor that affects both the exposure and the outcome a confounder. If late games and travel cut sleep, and short sleep lowers jump height and raises effort ratings, the training dose can look harmful when sleep did the work.',
            'Sketch it with arrows before you act: travel → sleep → jump height, and travel → schedule change → training dose. When one factor points into both the dose and the response, changing the dose alone may not fix anything. Note which arrows you can check with data you already collect.',
        ],
        example=dict(title='Worked example · synthetic data from the monitoring lab', lines=[
            'Days 25 to 28: CMJ 37.9 to 38.2 cm against a 40.0 cm baseline.',
            'Same days: sleep 5.2 to 6.4 hours, against 7.2 to 8.1 hours in the baseline days. Day 26 included 6 hours of travel.',
            'Before cutting lifting volume, check whether the drop follows the sleep and travel days.',
            'If it does, sleep and schedule are the first levers to look at. This is a pattern worth checking, not proof of the cause.',
        ]),
        refs=[(WIF, 'Part I: the chapter on confounding and causal diagrams.')],
    )],

    'unit:m06-u8': [
        dict(
            heading='Ask who is missing from the season review',
            text=[
                'Hernán and Robins describe selection bias: the people left in an analysis were selected in a way that is linked to both the exposure and the outcome. In a season review, players leave through injury, release or promotion. If you judge the program only on players who finished it, you may be studying the ones it suited.',
            ],
            example=dict(title='Worked example · synthetic block', lines=[
                '30 players start the block. 5 are injured and 3 are promoted before the retest.',
                'The 22 who finish improved their 30-yard sprint by 0.05 s on average.',
                'That number describes finishers only. The injured players may have responded worst and the promoted players best.',
                'Report the denominator: "22 of 30 retested," with the reasons for the other 8.',
            ]),
            refs=[(WIF, 'Part I: the chapter on selection bias.')],
        ),
        dict(
            heading='Individual response needs a comparison',
            text=[
                'Players\' changes always differ. Part of that spread is measurement noise and ordinary biological variation, which would show up even with no program at all. Jovanović uses a control group\'s change scores as the yardstick for that noise. The extra spread in the trained group, √(SD trained² − SD control²), estimates a random treatment effect.',
                'He warns that this estimate is unstable in small samples and can land near zero, and he suggests avoiding simple change scores in more complex designs. Treat it as a rough signal, not a list of responders and non-responders.',
            ],
            example=dict(title='Worked example · synthetic numbers', lines=[
                'SD of CMJ change: 3.0 cm in players who did the block, 2.0 cm in players who did not.',
                '√(3.0² − 2.0²) = √5 ≈ 2.24 cm of extra spread.',
                'Without a comparison group you cannot tell how much of any player\'s change came from the program.',
            ]),
            refs=[(BMB, 'Chapter 16, RCT analysis and prediction in bmbstats: control-group change as the noise yardstick and the random treatment effect.')],
        ),
    ],

    'lesson:science-workload-limits': [
        dict(
            heading='A risk flag needs a base rate',
            text=[
                'James and colleagues explain a classifier\'s results with a confusion matrix: who was flagged, who was not, and who actually had the outcome. Sensitivity is the share of true cases that were flagged. Specificity is the share of non-cases that were not flagged.',
                'When the outcome is rare, even a flag with good sensitivity and specificity mostly flags players who will be fine. A flag is a reason to look closer, never a forecast for one player.',
            ],
            example=dict(title='Worked example · synthetic roster', lines=[
                '100 pitchers; 5 are injured this month.',
                'A flag with 80% sensitivity catches 4 of the 5.',
                'With 80% specificity it also flags 19 of the 95 healthy pitchers (20%).',
                'Of the 23 flagged pitchers, 4 are injured: about 17%. Of the 77 not flagged, 1 is injured.',
            ]),
            refs=[(ISL, 'Chapter on Classification: confusion matrix, sensitivity and specificity.')],
        ),
        dict(
            heading='Know what game pitch data actually records',
            text=[
                'Albert, Baumer and Marchi\'s Statcast reference lists the pitch-level fields, such as game_date, pitcher, pitch_type, release_speed and release_spin_rate. One row is one tracked pitch in a game. Bullpens, warm-ups and catch play are not in that table, so game data alone undercounts throwing.',
                'Read field definitions before you count. pitch_number is the number of the pitch within the plate appearance, not the pitcher\'s running total. To get a game pitch count, count one pitcher\'s rows in one game.',
            ],
            code=dict(label='Python · game pitch counts from a Statcast export', text='''import pandas as pd

pitches = pd.read_csv("statcast_pitches.csv", parse_dates=["game_date"])

# One row = one game pitch. Count rows; do not read pitch_number as a total.
counts = pitches.groupby(["pitcher", "game_date"]).size().rename("game_pitches")
print(counts.head())

# A doubleheader puts two games on one date. Group by a game ID if your export has one.''', output=None),
            refs=[(ABD, 'Appendix C, Statcast Data Reference: game situation and pitch fields, including pitch_number.')],
        ),
    ],

    'lesson:science-interpret-communicate': [
        dict(
            heading='Split by player, not by row, when you test a model',
            text=[
                'James and colleagues show why a model must be judged on data it did not learn from, and how k-fold cross-validation does that: split the data into k parts, fit on k − 1, test on the part left out, and repeat.',
                'Athlete data adds a trap that most textbook examples do not have: many rows per player. If rows from the same player land in both the training and test parts, the model can learn to recognize the player instead of the pattern, and the test score looks better than it will be on a new player. Split by player instead, so all of a player\'s rows go to the same fold. In Python, scikit-learn\'s GroupKFold does this. That extension is the hub\'s, not the book\'s.',
            ],
            example=dict(title='Worked example · synthetic monitoring set', lines=[
                '40 players × 30 days = 1,200 rows.',
                'A random 5-fold split trains on about 24 of each player\'s 30 days and tests on the other 6.',
                'A split by player trains on 32 players and tests on 8 the model has never seen.',
                'Only the second answers the real question: how will this work on next season\'s new players?',
            ]),
            refs=[(ISL, 'Chapter on Resampling Methods: the validation set approach and k-fold cross-validation.')],
        ),
        dict(
            heading='Lead with the raw size and its range',
            text=[
                'Lakens recommends reporting effects in the original units whenever the scale is familiar, and pairing each estimate with its confidence interval. Skip the "small, medium, large" labels; compare the change with what matters for the decision.',
            ],
            example=dict(title='Worked example · synthetic report line', lines=[
                'Weak: "Moderate decrease in jump performance (d = −0.6)."',
                'Better: "CMJ 38 cm today versus a 40 cm baseline: −2 cm (−5%). This protocol\'s detectable change is about 2.5 cm, so one test cannot confirm a real drop. Retest Thursday under the same protocol."',
            ]),
            refs=[(LAK, 'Chapter 6, Effect Sizes, and Chapter 7, Confidence Intervals.')],
        ),
    ],
}

RUN_ON_MAC = [
    'Open Terminal (press Command + Space, type Terminal, press Return).',
    'Install pandas once: python3 -m pip install pandas',
    'Download this lab\'s CSV and save it in a folder, for example Documents/hub-labs.',
    'Save the code in the same folder as lab.py, using a plain-text editor.',
    'In Terminal: cd ~/Documents/hub-labs, then python3 lab.py',
    'Check your output against the "What you should see" block. If a number differs, look for an edited CSV or a typo before you trust the result.',
]

LAB_CODE = {
    'lab:analysis-reliability': dict(
        title='Do the reliability math in Python',
        intro='The same four numbers you calculated by hand, from the lab CSV. Check the file first, then compute.',
        refs=[(PDA, 'Chapter 5, Getting Started with pandas, and Chapter 7, Data Cleaning and Preparation.')],
        code='''import pandas as pd

df = pd.read_csv("paired-cmj-reliability.csv")

# 1. Check the file before any math
print(df.shape)                                   # rows, columns
print(df["athlete_id"].duplicated().sum())        # repeated athletes?
print(df[["test1_cm", "test2_cm"]].isna().sum())  # missing values?
print(df[["protocol", "device"]].nunique())       # one protocol, one device?

# 2. Paired differences
d = df["test2_cm"] - df["test1_cm"]
bias = d.mean()
sd_diff = d.std()            # pandas divides by n - 1 by default
te = sd_diff / 2 ** 0.5
mdc95 = 1.96 * 2 ** 0.5 * te

print(f"bias {bias:.2f} cm, SD of differences {sd_diff:.2f} cm")
print(f"typical error {te:.2f} cm, MDC95 {mdc95:.2f} cm")''',
        output='''(24, 6)
0
test1_cm    0
test2_cm    0
dtype: int64
protocol    1
device      1
dtype: int64
bias 0.40 cm, SD of differences 1.25 cm
typical error 0.88 cm, MDC95 2.45 cm'''),
    'lab:analysis-exposure-audit': dict(
        title='Do the exposure audit in Python',
        intro='Rows are not events, and blank is not zero. The code drops only the repeats the audit verified, stops if any repeat is left, and totals each category separately.',
        refs=[(PDA, 'Chapter 7, Data Cleaning; Chapter 8, Data Wrangling; Chapter 10, Data Aggregation and Group Operations.')],
        code='''import pandas as pd

raw = pd.read_csv("throwing-exposure-audit.csv", parse_dates=["date"])

# 1. Rows are not events. Drop only the repeats the audit verified.
print(len(raw), "raw rows")
events = raw[raw["status"] != "verified_duplicate"]
assert events["event_id"].is_unique   # stop if any repeat is left
print(len(events), "unique events")

# 2. Keep "not recorded" separate from zero
print(events["status"].value_counts())
recorded = events[events["status"] == "recorded"]

# 3. Totals by category, never one blended number
print(recorded.groupby("category")["count"].sum())

# 4. Which days have every category recorded?
wide = events.pivot_table(index="date", columns="category",
                          values="status", aggfunc="first")
complete = wide.eq("recorded").all(axis=1)
print(complete.sum(), "complete days of", len(wide))''',
        output='''30 raw rows
28 unique events
status
recorded      26
unresolved     2
Name: count, dtype: int64
category
between_innings    18.0
bullpen            90.0
flat_ground        80.0
game               57.0
Name: count, dtype: float64
5 complete days of 7'''),
    'lab:analysis-monitoring-handoff': dict(
        title='Do the monitoring handoff in Python',
        intro='Fix the baseline first, then compare each valid monitoring day with it. The rolling mean smooths single-day noise but also delays the signal by a day or two.',
        refs=[(PDA, 'Chapter 5, Getting Started with pandas, and Chapter 11, Time Series.')],
        code='''import pandas as pd

df = pd.read_csv("cmj-monitoring-handoff.csv", parse_dates=["date"])

# 1. Fix the baseline before looking at the monitoring days
base = df[(df["phase"] == "baseline") & df["protocol_ok"] & df["cmj_cm"].notna()]
mean, sd = base["cmj_cm"].mean(), base["cmj_cm"].std()
print(len(base), round(mean, 2), round(sd, 2))

# 2. Compare each valid monitoring day with that fixed baseline
mon = df[(df["phase"] != "baseline") & df["protocol_ok"]].copy()
mon["pct_diff"] = (mon["cmj_cm"] - mean) / mean * 100
mon["z"] = (mon["cmj_cm"] - mean) / sd

# 3. A 3-day rolling mean (rows skipped for protocol problems are not counted)
mon["mean_3d"] = mon["cmj_cm"].rolling(3).mean()
print(mon[["day", "cmj_cm", "pct_diff", "z", "mean_3d", "sleep_hours"]].tail(3).round(2))''',
        output='''12 40.0 0.85
    day  cmj_cm  pct_diff     z  mean_3d  sleep_hours
25   26    38.2     -4.50 -2.11    38.33          5.2
26   27    38.1     -4.75 -2.23    38.10          5.6
27   28    37.9     -5.25 -2.46    38.07          6.1'''),
}
