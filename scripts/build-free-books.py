"""Build app/data/free-books.json: the free textbook shelf.

Edit this script, not the JSON. Run from the repo root:
    python3 scripts/build-free-books.py

Every book here is free to read online. None of them may be copied into the
hub: the hub links out and writes its own teaching. Chapter pointers were
checked against each book's online table of contents on 2026-11-09.
"""
from pathlib import Path
import json
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from free_books_sections import SECTIONS, LAB_CODE, RUN_ON_MAC  # noqa: E402

R = Path(__file__).resolve().parents[1]
REVIEWED = '2026-11-09'

BOOKS = [
    dict(
        id='openstax-ap2e', track='anatomy', language='No code',
        title='Anatomy and Physiology 2e',
        authors='J. Gordon Betts and colleagues; OpenStax (Rice University)',
        edition='2nd edition', year=2022,
        url='https://openstax.org/details/books/anatomy-and-physiology-2e',
        access='Free online and as a PDF from OpenStax.',
        license='CC BY-NC-SA 4.0. The reuse notice also bars use with large language models or generative AI without written permission from OpenStax. The hub links to it and does not copy, summarize by machine or reproduce its text or figures.',
        why='A current, free checklist of joints, ligaments and muscles by body region. Use it to see which structures the Anatomy Lab still leaves out.',
        caution='Intro level. It names structures and basic actions, not what they do during a pitch or a sprint. Use Neumann for function once you own it.',
        start='Chapter 9, Joints, then Chapter 11, The Muscular System (the upper-limb and lower-limb sections).',
        task='Pick the shoulder. List every ligament and muscle the book names for it. Mark the ones the Anatomy Lab shows now, and keep the list as your gap check.',
        feeds=[('#anatomy', 'Anatomy Lab: 3D atlas'), ('#joints', 'Joints and range of motion'),
               ('#lesson/rehab-shoulder-01', 'The throwing shoulder'), ('#lesson/rehab-elbow-01', 'The medial elbow'),
               ('#lesson/rehab-hamstring-01', 'Hamstring anatomy')],
        source=dict(
            type='Free textbook · open online',
            population='General human anatomy and physiology for introductory college courses; not sport or baseball specific.',
            findings='Organizes joints by structure and function and lists the skeletal muscles by body region with their basic actions.',
            limitations='Introductory depth. No sport-specific function, loading or tissue-capacity content. Reuse limits mean the hub can only link to it.',
            locations=['Chapter 9, Joints', 'Chapter 11, The Muscular System']),
    ),
    dict(
        id='bmbstats', track='measurement', language='R (ideas apply in any language)',
        title='bmbstats: bootstrap magnitude-based statistics for sports scientists',
        authors='Mladen Jovanović', edition='Online book', year=2020,
        url='https://mladenjovanovic.github.io/bmbstats-book',
        access='Free online.',
        license='CC BY-NC-SA 4.0; the code is MIT licensed. The hub links to it and writes its own teaching.',
        why='A sports scientist writing about the calls you make every day: typical error, smallest worthwhile change, reliability, individual response, and the difference between describing, predicting and explaining.',
        caution='Magnitude-based inference has been strongly criticized (Sainani 2018, Medicine & Science in Sports & Exercise). Learn the ideas about error and practical size here, and use Lakens for how to test them.',
        start='Chapter 10, Measurement Error, then Chapter 15, Validity and Reliability.',
        task='Take one jump metric you use. Write its typical error and your smallest worthwhile change, then say which of the two decides whether a change is real.',
        feeds=[('#unit/m07-u5', 'Design a reliability study'), ('#unit/m07-u6', 'ICC, typical error, SEM and detectable change'),
               ('#lesson/science-testing-reliability', 'Is the change larger than the noise?'), ('#lab/analysis-reliability', 'Lab: can this jump test detect the change?')],
        source=dict(
            type='Free textbook · open online',
            population='Sport science examples; general statistical methods.',
            findings='Frames analyses as description, prediction or causal inference, and treats measurement error, smallest worthwhile change, validity, reliability and individual response with worked R examples.',
            limitations='Promotes a magnitude-based approach that many statisticians reject as a decision rule. Use for concepts about error and practical size, not as the final inferential method.',
            locations=['Chapters 2 to 4, Description, Prediction, Causal inference', 'Chapter 10, Measurement Error', 'Chapter 15, Validity and Reliability', 'Chapter 16, RCT analysis and prediction']),
    ),
    dict(
        id='lakens-inferences', track='measurement', language='R (ideas apply in any language)',
        title='Improving Your Statistical Inferences',
        authors='Daniël Lakens', edition='Online book', year=2022,
        url='https://lakens.github.io/statistical_inferences',
        access='Free online and as a PDF.',
        license='CC BY-NC-SA 4.0. The hub links to it and writes its own teaching.',
        why='The mainstream counterweight to bmbstats. Clear chapters on effect sizes, confidence intervals, equivalence tests and sample size, which are the tools for judging a paper or your own testing data.',
        caution='Most examples come from psychology, not sport. The logic transfers; the typical effect sizes do not.',
        start='Chapter 6, Effect Sizes; Chapter 7, Confidence Intervals; Chapter 9, Equivalence Testing and Interval Hypotheses.',
        task='Take one "significant improvement" claim from a training study. Rewrite it as an effect size with a confidence interval, and say whether the whole interval clears your smallest worthwhile change.',
        feeds=[('#unit/m07-u7', 'Decide what matters without hiding uncertainty'), ('#lesson/science-interpret-communicate', 'Turn a number into a useful conversation'),
               ('#unit/m07-u5', 'Design a reliability study')],
        source=dict(
            type='Free textbook · open online',
            population='General research methods; examples mostly from psychology.',
            findings='Explains error control, effect sizes, confidence intervals, equivalence testing, sample size justification and computational reproducibility.',
            limitations='Not sport specific. Effect-size benchmarks from psychology should not be carried over to performance data.',
            locations=['Chapter 6, Effect Sizes', 'Chapter 7, Confidence Intervals', 'Chapter 8, Sample Size Justification', 'Chapter 9, Equivalence Testing and Interval Hypotheses', 'Chapter 14, Computational Reproducibility']),
    ),
    dict(
        id='whatif', track='cause', language='No code needed (R, Python and Stata code online)',
        title='Causal Inference: What If',
        authors='Miguel A. Hernán and James M. Robins', edition='Online edition, updated 2026', year=2020,
        url='https://miguelhernan.org/whatifbook',
        access='Free PDF from the authors. Print edition from Chapman & Hall/CRC.',
        license='Copyright the authors. Free to download and read; the hub links to it only.',
        why='Most weak injury and workload claims mix up prediction and cause. Part I teaches you to spot confounding and selection bias without any math beyond arithmetic.',
        caution='Dense epidemiology. Read Part I first and stop there until a real question needs Parts II and III.',
        start='Part I, Causal inference without models: the opening chapters on what a causal effect is, then the chapters on confounding and selection bias.',
        task='Take a claim like "a high acute:chronic workload ratio causes injury." Name one confounder and one selection problem that could create that link with no causal effect at all.',
        feeds=[('#lesson/science-workload-limits', 'Count exposure. Preserve uncertainty.'), ('#unit/m06-u7', 'Dose revision using uncertain feedback'),
               ('#unit/m06-u8', 'Evaluate adaptation and defend the season'), ('#unit/m07-u1', 'Choose a test that answers the question')],
        source=dict(
            type='Free textbook · open online',
            population='Epidemiology and health research; general causal methods.',
            findings='Defines causal effects, compares randomized and observational designs, and explains confounding, selection bias and measurement bias.',
            limitations='Not sport specific and mathematically demanding beyond Part I. It teaches how to question a causal claim, not which training works.',
            locations=['Part I, Causal inference without models']),
    ),
    dict(
        id='isl', track='cause', language='Python edition (also an R edition)',
        title='An Introduction to Statistical Learning, with Applications in Python',
        authors='Gareth James, Daniela Witten, Trevor Hastie, Robert Tibshirani and Jonathan Taylor', edition='Python edition', year=2023,
        url='https://www.statlearning.com/',
        access='Free PDF from the authors, in Python and R editions. Print edition from Springer.',
        license='Copyright the authors. Free to download and read; the hub links to it only.',
        why='The clearest free start in machine learning. It keeps the hub\'s applied AI lane grounded in real statistics: what a model learns, how to test it on new data, and why it fails.',
        caution='Prediction is not cause. A model that flags "high risk" players does not tell you what to change. Pair it with What If.',
        start='The chapters on Statistical Learning and on Resampling Methods (cross-validation).',
        task='In three sentences, explain why a model that predicted injuries well on last season\'s roster may fail on this season\'s roster.',
        feeds=[('#lesson/science-workload-limits', 'Count exposure. Preserve uncertainty.'), ('#lab/analysis-monitoring-handoff', 'Lab: turn a jump trend into a staff conversation')],
        source=dict(
            type='Free textbook · open online',
            population='General statistical learning; examples from many fields.',
            findings='Introduces regression, classification, resampling, regularization, tree methods, deep learning and unsupervised learning with Python labs.',
            limitations='Not sport specific. Small athlete samples and repeated measures break many of the textbook examples\' assumptions.',
            locations=['Chapter on Statistical Learning', 'Chapter on Resampling Methods']),
    ),
    dict(
        id='mckinney-pda', track='coding', language='Python',
        title='Python for Data Analysis, 3rd edition',
        authors='Wes McKinney', edition='3rd edition', year=2022,
        url='https://wesmckinney.com/book/',
        access='Free open-access online edition. Print and ebook from O\'Reilly.',
        license='Content may not be copied or reproduced; the code examples are MIT licensed. The hub links to it only.',
        why='Written by the creator of pandas. It is the most direct way to learn to load, clean, join and summarize testing and throwing files in Python.',
        caution='A tools book, not a statistics book. For Statcast data in Python, use the pybaseball package, which is separate from this book.',
        start='Chapter 5, Getting Started with pandas; Chapter 7, Data Cleaning and Preparation; Chapter 8, Data Wrangling: Join, Combine, and Reshape.',
        task='Load one of the Practice Lab CSV files into pandas. Count missing values and duplicate rows before you plot anything.',
        feeds=[('#lab/analysis-exposure-audit', 'Lab: the pitch dashboard and throwing log disagree'), ('#lab/analysis-reliability', 'Lab: can this jump test detect the change?'),
               ('#unit/m07-u8', 'Collect, audit and defend a testing SOP')],
        source=dict(
            type='Free textbook · open online',
            population='General data analysis in Python.',
            findings='Teaches pandas and NumPy for loading, cleaning, joining, reshaping, grouping and plotting data, including time series.',
            limitations='No statistical inference or sport content. Methods for judging change come from the measurement books.',
            locations=['Chapter 5, Getting Started with pandas', 'Chapter 7, Data Cleaning and Preparation', 'Chapter 8, Data Wrangling', 'Chapter 11, Time Series']),
    ),
    dict(
        id='abdwr3e', track='coding', language='R (read for the baseball questions)',
        title='Analyzing Baseball Data with R, 3rd edition',
        authors='Jim Albert, Benjamin S. Baumer and Max Marchi', edition='3rd edition', year=2024,
        url='https://beanumber.github.io/abdwr3e/',
        access='Free online edition from the authors. Print from Routledge.',
        license='Copyright the authors and publisher. Free to read online; the hub links to it only.',
        why='The only full textbook built on Statcast, Retrosheet and real baseball questions. Its Statcast appendix is a field-by-field guide to the data your organization already has.',
        caution='It studies game performance, not training. The code is R; if you study in Python, read it for the questions and the data definitions and skip running the code.',
        start='Chapter 1, The Baseball Datasets, then Appendix C, Statcast Data Reference.',
        task='Read Appendix C. Pick five Statcast fields you would join to your own testing or throwing data, and write what each one can and cannot tell you.',
        feeds=[('#lab/analysis-exposure-audit', 'Lab: the pitch dashboard and throwing log disagree'), ('#lesson/science-interpret-communicate', 'Turn a number into a useful conversation'),
               ('#demands', 'Player demands')],
        source=dict(
            type='Free textbook · open online',
            population='Major League Baseball game data (Lahman, Retrosheet, Statcast).',
            findings='Teaches baseball data sources, run expectancy, count effects, catcher framing, career trajectories, large-data and SQL workflows, and Quarto and Shiny reporting.',
            limitations='Game-performance analytics. It does not address training, workload or injury, and its code is in R.',
            locations=['Chapter 1, The Baseball Datasets', 'Chapter 12, Working with Large Data', 'Chapter 14, Making a Scientific Presentation using Quarto', 'Appendix C, Statcast Data Reference']),
    ),
    dict(
        id='r4ds', track='coding', language='R', optional=True,
        title='R for Data Science, 2nd edition',
        authors='Hadley Wickham, Mine Çetinkaya-Rundel and Garrett Grolemund', edition='2nd edition', year=2023,
        url='https://r4ds.hadley.nz/',
        access='Free online.',
        license='CC BY-NC-ND 3.0. The hub links to it only.',
        why='The standard way to learn data wrangling in R. Keep it as a reference for reading R code in sport-science papers.',
        caution='Optional while you study in Python. Open it when a paper\'s R code needs decoding.',
        start='Chapter 18, Missing values, and Chapter 19, Joins.',
        task='Find one sport-science paper that shares R code. Use these two chapters to explain, in plain words, what its data-cleaning steps do.',
        feeds=[('#lab/analysis-exposure-audit', 'Lab: the pitch dashboard and throwing log disagree')],
        source=dict(
            type='Free textbook · open online',
            population='General data science in R.',
            findings='Teaches importing, tidying, transforming, joining, visualizing and reporting data with the tidyverse and Quarto.',
            limitations='No statistical inference or sport content. Optional while the hub\'s coding track uses Python.',
            locations=['Chapter 18, Missing values', 'Chapter 19, Joins', 'Chapter 28, Quarto']),
    ),
]

TRACKS = [
    dict(id='anatomy', title='Anatomy', lede='Names and locations first. Function comes later from Neumann.'),
    dict(id='measurement', title='Measurement and statistics', lede='Is the change real, and is it big enough to matter?'),
    dict(id='cause', title='Cause versus prediction', lede='What a number can and cannot tell you about why something happened.'),
    dict(id='coding', title='Coding and baseball data', lede='Python plus SQL for your own work. The R books stay for their baseball questions.'),
]

# Where each book shows up inside the hub. Keys are 'unit:<id>' or 'lesson:<id>'.
LINKS = {
    'unit:m07-u1': [('whatif', 'Part I, the opening chapters', 'Decide whether your test answers a description, prediction or cause question before you pick it.'),
                    ('bmbstats', 'Chapters 2 to 4', 'The same three question types, with sport examples.')],
    'unit:m07-u5': [('bmbstats', 'Chapter 15, Validity and Reliability', 'Match the reliability design to how you actually test.'),
                    ('lakens-inferences', 'Chapter 8, Sample Size Justification', 'Say why your number of athletes and trials is enough, or admit it is not.')],
    'unit:m07-u6': [('bmbstats', 'Chapter 10, Measurement Error', 'Typical error and smallest worthwhile change, worked through in code.'),
                    ('bmbstats', 'Chapter 15, Validity and Reliability', 'How the reliability statistics connect to a decision.')],
    'unit:m07-u7': [('lakens-inferences', 'Chapters 6, 7 and 9', 'Effect sizes, confidence intervals and equivalence tests: how to say "this matters" honestly.'),
                    ('bmbstats', 'Chapters 5 to 9', 'Read for the idea of practical size, and keep the criticism of magnitude-based inference in mind.')],
    'unit:m07-u8': [('mckinney-pda', 'Chapter 7, Data Cleaning and Preparation', 'Audit missing, duplicate and mislabeled rows before analysis.'),
                    ('lakens-inferences', 'Chapter 14, Computational Reproducibility', 'Make the analysis something another staff member can rerun.')],
    'unit:m06-u7': [('whatif', 'Part I, the chapters on confounding and selection bias', 'Before you change a dose because of a trend, ask what else could explain it.')],
    'unit:m06-u8': [('bmbstats', 'Chapter 16, RCT analysis and prediction', 'Separate the group response from any one player\'s response.'),
                    ('whatif', 'Part I', 'Why "he got better after the block" is not proof the block worked.')],
    'lesson:science-testing-reliability': [('bmbstats', 'Chapters 10 and 15', 'Measurement error and reliability with sport examples.'),
                                           ('lakens-inferences', 'Chapter 7, Confidence Intervals', 'Show the uncertainty around a change.')],
    'lesson:science-workload-limits': [('whatif', 'Part I', 'Confounding and selection bias in workload and injury claims.'),
                                       ('isl', 'Resampling Methods chapter', 'Why a model has to be tested on data it has not seen.')],
    'lesson:science-interpret-communicate': [('lakens-inferences', 'Chapters 6 and 7', 'Report a size and a range, not just "significant".'),
                                             ('abdwr3e', 'Chapter 14, Making a Scientific Presentation using Quarto', 'A worked example of turning baseball data into a clear report.')],
    'lesson:rehab-shoulder-01': [('openstax-ap2e', 'Chapter 9, Joints, and Chapter 11, upper-limb sections', 'A free checklist of shoulder joints, ligaments and muscles. Link only.')],
    'lesson:rehab-elbow-01': [('openstax-ap2e', 'Chapter 9, Joints, and Chapter 11, upper-limb sections', 'A free checklist of elbow structures. Link only.')],
    'lesson:rehab-hamstring-01': [('openstax-ap2e', 'Chapter 11, lower-limb sections', 'A free checklist of the posterior thigh muscles and attachments. Link only.')],
}

# What was actually read for the teaching sections (2026-11-09).
READ_NOTES = {
    'bmbstats': 'Chapters 10 and 16 were read online for the hub teaching sections.',
    'lakens-inferences': 'Chapters 6, 8, 9 and 14 were read online for the hub teaching sections.',
    'abdwr3e': 'Appendix C was read online for the hub teaching sections.',
    'mckinney-pda': 'Table of contents checked; the hub code examples were written and run by the hub against its own synthetic files.',
    'whatif': 'Teaching sections cite Part I concepts (causal effect, confounding, selection bias) from familiarity with the book; those chapters were not re-read in this session.',
    'isl': 'Teaching sections cite the Classification and Resampling Methods chapters from familiarity with the book; those chapters were not re-read in this session.',
    'openstax-ap2e': 'Not read: the publisher bars use of this book with AI tools. Link only.',
    'r4ds': 'Table of contents checked only.',
}

book_ids = {b['id'] for b in BOOKS}
source_ids = {'free-' + b['id'] for b in BOOKS}
for key, items in SECTIONS.items():
    for item in items:
        for sid, _ in item['refs']:
            assert sid in source_ids, (key, sid)
for key, item in LAB_CODE.items():
    for sid, _ in item['refs']:
        assert sid in source_ids, (key, sid)
for key, refs in LINKS.items():
    for bid, _, _ in refs:
        assert bid in book_ids, (key, bid)

sources = []
books = []
for b in BOOKS:
    sid = 'free-' + b['id']
    s = b['source']
    sources.append(dict(
        id=sid, title=b['title'], authors=b['authors'], year=b['year'], url=b['url'],
        type=s['type'], population=s['population'],
        access=b['access'] + ' Link and table of contents verified November 9, 2026. ' + READ_NOTES[b['id']],
        findings=s['findings'], limitations=s['limitations'], locations=s['locations'],
        license=b['license'], reviewed=REVIEWED))
    books.append(dict(
        id=b['id'], sourceId=sid, track=b['track'], title=b['title'], authors=b['authors'],
        edition=b['edition'], year=b['year'], url=b['url'], access=b['access'], license=b['license'],
        language=b['language'], optional=b.get('optional', False), why=b['why'], caution=b['caution'],
        start=b['start'], task=b['task'], feeds=[dict(route=r, label=l) for r, l in b['feeds']]))

data = dict(
    title='Free textbooks that feed the hub.',
    reviewed=REVIEWED,
    summary='Eight books you can read today at no cost, each tied to the parts of the hub it strengthens.',
    policy='Free to read is not free to copy. Each book keeps its own license, so the hub links to the original and writes its own teaching. No chapter text, figure or table is reproduced here.',
    language='Coding language: Python plus SQL (recommended November 9, 2026). The R books stay on the shelf for their ideas and baseball questions.',
    tracks=TRACKS,
    books=books,
    links={k: [dict(bookId=b, chapters=c, why=w) for b, c, w in v] for k, v in LINKS.items()},
    sections={k: [dict(heading=i['heading'], text=i['text'], example=i.get('example'), code=i.get('code'),
                       refs=[dict(id=sid, locator=loc) for sid, loc in i['refs']]) for i in v]
              for k, v in SECTIONS.items()},
    labCode={k: dict(title=v['title'], intro=v['intro'], code=v['code'], output=v['output'], runOnMac=RUN_ON_MAC,
                     refs=[dict(id=sid, locator=loc) for sid, loc in v['refs']]) for k, v in LAB_CODE.items()},
    sources=sources,
)

out = R / 'app' / 'data' / 'free-books.json'
out.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
n_sections = sum(len(v) for v in SECTIONS.values())
print(f'Wrote {len(books)} free books, {len(sources)} source records, {n_sections} teaching sections in {len(SECTIONS)} units/lessons, '
      f'{len(LAB_CODE)} Python lab panels and {len(LINKS)} reading links to {out.relative_to(R)}.')
