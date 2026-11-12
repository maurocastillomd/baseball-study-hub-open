"""Builds app/data/anatomy.json (Anatomy Lab content, version 2).

Run from the repo root:  python3 tools/anatomy/build_anatomy_data.py
Then rebuild the region models: node tools/anatomy/extract-regions.mjs <path to Z-Anatomy glb folder>

Each structure lists the exact Z-Anatomy mesh names it uses ("meshes").
Cards summarise standard anatomy references (see SOURCES). They were drafted on
2026-11-09 and have NOT yet been checked line by line by a practitioner.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'app' / 'data' / 'anatomy.json'

SOURCES = {
    'cuff': ('StatPearls: Anatomy, Rotator Cuff', 'https://www.ncbi.nlm.nih.gov/books/NBK441844/', 'Anatomy reference'),
    'shoulder-muscles': ('StatPearls: Anatomy, Shoulder and Upper Limb, Shoulder Muscles', 'https://pubmed.ncbi.nlm.nih.gov/30521257/', 'Anatomy reference'),
    'pectoral': ('StatPearls: Anatomy, Shoulder and Upper Limb, Pectoral Muscles', 'https://pubmed.ncbi.nlm.nih.gov/31424825/', 'Anatomy reference'),
    'gh-joint': ('StatPearls: Anatomy, Shoulder and Upper Limb, Glenohumeral Joint', 'https://www.statpearls.com/point-of-care/32409', 'Anatomy reference'),
    'elbow-joint': ('StatPearls: Anatomy, Shoulder and Upper Limb, Elbow Joint', 'https://www.statpearls.com/point-of-care/32402', 'Anatomy reference'),
    'annular': ('StatPearls: Anatomy, Shoulder and Upper Limb, Elbow Annular Ligament', 'https://pubmed.ncbi.nlm.nih.gov/30860729/', 'Anatomy reference'),
    'forearm': ('StatPearls: Anatomy, Shoulder and Upper Limb, Forearm Compartments', 'https://www.ncbi.nlm.nih.gov/books/NBK539784/', 'Anatomy reference'),
    'fcu': ('StatPearls: Forearm Flexor Carpi Ulnaris Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK526051/', 'Anatomy reference'),
    'abdominal-wall': ('StatPearls: Anatomy, Abdomen and Pelvis, Abdominal Wall', 'https://www.statpearls.com/kb/viewarticle/32123', 'Anatomy reference'),
    'hip-joint': ('StatPearls: Anatomy, Bony Pelvis and Lower Limb, Hip Joint', 'https://www.statpearls.com/point-of-care/32237', 'Anatomy reference'),
    'glute-min': ('StatPearls: Anatomy, Bony Pelvis and Lower Limb, Gluteus Minimus Muscle', 'https://statpearls.com/point-of-care/22327', 'Anatomy reference'),
    'gemelli': ('StatPearls: Anatomy, Bony Pelvis and Lower Limb, Gemelli Muscles', 'https://pubmed.ncbi.nlm.nih.gov/32491352/', 'Anatomy reference'),
    'acl': ('StatPearls: Anatomy, Bony Pelvis and Lower Limb, Knee Anterior Cruciate Ligament', 'https://www.statpearls.com/point-of-care/58321', 'Anatomy reference'),
    'pcl': ('StatPearls: Anatomy, Bony Pelvis and Lower Limb, Knee Posterior Cruciate Ligament', 'https://pubmed.ncbi.nlm.nih.gov/30571037/', 'Anatomy reference'),
    'hamstrings': ('StatPearls: Anatomy, Bony Pelvis and Lower Limb, Hamstring Muscle', 'https://www.ncbi.nlm.nih.gov/books/NBK546688/', 'Anatomy reference'),
    'hamstring-dissection': ('Unique morphological architecture of the hamstring muscles and its functional relevance', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10335370/', 'Primary anatomical research'),
    'neumann': ("Neumann's Kinesiology of the Musculoskeletal System, 4th ed. (Elsevier)", 'https://shop.elsevier.com/books/neumann-s-kinesiology-of-the-musculoskeletal-system/neumann/978-0-323-71859-2', 'Textbook (purchase)'),
    'atlas': ('Z-Anatomy, the open source atlas of anatomy (models)', 'https://github.com/Z-Anatomy/Models-of-human-anatomy', 'Atlas'),
}

S = []  # structures


def ext(a, b, k):
    """Extend the segment a-b by k (metres) at both ends."""
    d = [b[i] - a[i] for i in range(3)]
    n = sum(x * x for x in d) ** 0.5
    u = [x / n for x in d]
    return [round(a[i] - u[i] * k, 4) for i in range(3)], [round(b[i] + u[i] * k, 4) for i in range(3)]


def add(kind, sid, name, meshes, sources, **fields):
    item = {'id': sid, 'name': name, 'type': kind, 'meshes': meshes, 'sourceIds': sources}
    item.update({k: v for k, v in fields.items() if v})
    S.append(item)


def bone(sid, name, meshes):
    add('bone', sid, name, meshes, ['atlas'], note='Shown for spatial context. Attachment footprints are described in the muscle and ligament cards, not marked on the mesh.')


def muscle(sid, name, meshes, origin, insertion, action, innervation, baseball='', note='', src=None):
    add('muscle', sid, name, meshes, src or ['neumann'], origin=origin, insertion=insertion, action=action,
        innervation=innervation, baseball=baseball, note=note)


def ligament(sid, name, meshes, attachments, function, baseball='', note='', src=None, kind='ligament', schematic=None):
    add(kind, sid, name, meshes, src or ['neumann'], attachments=attachments, function=function, baseball=baseball, note=note, schematic=schematic)


def joint(sid, name, meshes, classification, motion, closePacked, stabilizers, baseball='', rom='', note='', src=None, schematic=None):
    add('joint', sid, name, meshes, src or ['neumann'], classification=classification, motion=motion,
        closePacked=closePacked, stabilizers=stabilizers, baseball=baseball, rom=rom, note=note, schematic=schematic)


R = lambda n: n + '.r'

# ---------------------------------------------------------------- bones
bone('clavicle', 'Clavicle', [R('Clavicle')])
bone('scapula', 'Scapula', [R('Scapula')])
bone('humerus', 'Humerus', [R('Humerus')])
bone('radius', 'Radius', [R('Radius')])
bone('ulna', 'Ulna', [R('Ulna')])
bone('sternum', 'Sternum', ['Manubrium of sternum', 'Body of sternum', 'Xiphoid process'])
RIBS = ['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth', 'Ninth', 'Tenth', 'Eleventh', 'Twelfth']
bone('ribs', 'Ribs 1–12 (right)', [R(f'{n} rib') for n in RIBS] + [R(f'Costal cartilage of {n.lower()} rib') for n in RIBS[:10]])
bone('thoracic-spine', 'Thoracic vertebrae T1–T12', [f'Vertebra T{i}' for i in range(1, 13)] + ['Vertebra C7'])
bone('lumbar-spine', 'Lumbar vertebrae L1–L5', [f'Vertebra L{i}' for i in range(1, 6)])
bone('sacrum', 'Sacrum and coccyx', ['Sacrum', 'Coccyx'])
bone('hip', 'Hip bone (ilium, ischium, pubis)', [R('Hip bone')])
bone('femur', 'Femur', [R('Femur')])
bone('patella', 'Patella', [R('Patella')])
bone('tibia', 'Tibia', [R('Tibia')])
bone('fibula', 'Fibula', [R('Fibula')])

# ---------------------------------------------------------------- shoulder (glenohumeral)
joint('gh-joint', 'Glenohumeral joint', [R('Articular capsule of glenohumeral joint')],
      'Synovial ball-and-socket joint between the humeral head and the glenoid fossa.',
      'Three degrees of freedom: flexion–extension, abduction–adduction, internal–external rotation.',
      'Full abduction with external rotation.',
      'Static: glenoid labrum, capsule, glenohumeral and coracohumeral ligaments, negative joint pressure. Dynamic: rotator cuff, long head of biceps, deltoid and scapular position.',
      'Throwers usually show more external rotation and less internal rotation on the throwing side. The total arc and the side-to-side difference matter more than either number alone.',
      'shoulder', src=['gh-joint', 'neumann'], note='The mesh shown is the joint capsule.')
ligament('glenoid-labrum', 'Glenoid labrum', [R('Glenoid labrum')],
         'Fibrocartilage rim attached around the glenoid margin. Superiorly it blends with the long head of biceps tendon.',
         'Deepens and widens the socket, adds to concavity–compression and anchors the glenohumeral ligaments.',
         'Superior labral (SLAP) lesions are common in overhead throwers. The "peel-back" model links them to biceps tension in abduction with maximal external rotation (late cocking).',
         src=['gh-joint', 'neumann'])
ligament('sghl', 'Superior glenohumeral ligament', [R('Superior glenohumeral ligament')],
         'Anterosuperior glenoid and labrum, near the biceps origin, to the humerus just above the lesser tubercle.',
         'Limits inferior translation and external rotation with the arm at the side. Part of the rotator interval.',
         'Matters most with the arm adducted; contributes little in the 90° abducted throwing position.', src=['gh-joint', 'neumann'])
ligament('mghl', 'Middle glenohumeral ligament', [R('Middle glenohumeral ligament')],
         'Anterior glenoid and labrum to the anatomical neck, medial to the lesser tubercle.',
         'Limits anterior translation and external rotation in mid-range abduction (around 45°).',
         'Highly variable: it can be thin, cord-like or absent. Do not expect the same picture in every athlete.', src=['gh-joint', 'neumann'])
ligament('ighl', 'Inferior glenohumeral ligament complex', [R('Inferior glenohumeral ligament')],
         'Inferior glenoid and labrum to the anatomical neck. Anterior band, axillary pouch and posterior band act like a hammock under the head.',
         'Main static restraint at 90° abduction. The anterior band tightens in abduction with external rotation; the posterior band tightens in abduction with internal rotation.',
         'Late cocking (abduction plus maximal external rotation) loads the anterior band. A thick, tight posteroinferior capsule is one proposed driver of internal-rotation loss (GIRD); treat that as a model, not settled fact.',
         src=['gh-joint', 'neumann'], note='The mesh models the complex as one structure; the bands are not separated.')
ligament('chl', 'Coracohumeral ligament', [R('Coracohumeral ligament')],
         'Lateral base of the coracoid process to the greater and lesser tubercles, blending with the capsule and supraspinatus/subscapularis tendons.',
         'Limits inferior translation and external rotation with the arm at the side; roofs the rotator interval.',
         'A stiff rotator interval limits external rotation at the side, a different picture from the abducted-ER gain throwers show.', src=['gh-joint', 'neumann'])
ligament('thl', 'Transverse humeral ligament', [R('Transverse humeral ligament')],
         'Spans the intertubercular groove between the greater and lesser tubercles.',
         'Holds the long head of biceps tendon in the groove, with help from subscapularis and the coracohumeral ligament.',
         'Biceps instability in the groove usually involves the subscapularis and the pulley, not this band alone.', src=['gh-joint'])
ligament('subacromial-bursa', 'Subacromial–subdeltoid bursa', [R('Subacromial bursa'), R('Subdeltoid bursa')],
         'Between the acromion, coracoacromial arch and deltoid above, and the supraspinatus tendon and humeral head below.',
         'Lets the cuff glide under the arch.',
         'In throwers, posterosuperior (internal) impingement inside the joint is a separate mechanism from subacromial impingement under the arch.',
         src=['neumann'], kind='bursa', note='The coracoacromial ligament is not modeled in this atlas.')

muscle('supraspinatus', 'Supraspinatus', [R('Supraspinatus muscle')], 'Supraspinous fossa of the scapula.', 'Superior facet of the greater tubercle.',
       'Abduction (with deltoid) and compression of the humeral head into the glenoid.', 'Suprascapular nerve (C5–C6).',
       'Undersurface tears of the supraspinatus–infraspinatus junction are a classic finding with internal impingement in throwers.', src=['cuff', 'neumann'])
muscle('infraspinatus', 'Infraspinatus', [R('Infraspinatus muscle')], 'Infraspinous fossa of the scapula.', 'Middle facet of the greater tubercle.',
       'External rotation; posterior stability of the humeral head.', 'Suprascapular nerve (C5–C6).',
       'With teres minor, works eccentrically to slow internal rotation and horizontal adduction after ball release.', src=['cuff', 'neumann'])
muscle('teres-minor', 'Teres minor', [R('Teres minor muscle')], 'Upper two-thirds of the lateral border of the scapula.', 'Inferior facet of the greater tubercle.',
       'External rotation; posterior stability.', 'Axillary nerve (C5–C6).',
       'Part of the posterior "brake" in deceleration; often trained with infraspinatus.', src=['cuff', 'neumann'])
muscle('subscapularis', 'Subscapularis', [R('Subscapularis muscle')], 'Subscapular fossa on the anterior scapula.', 'Lesser tubercle of the humerus.',
       'Internal rotation; anterior stability, especially low in the range.', 'Upper and lower subscapular nerves (C5–C6).',
       'Active in acceleration as the arm whips into internal rotation.', src=['cuff', 'neumann'])
muscle('deltoid-anterior', 'Deltoid · anterior (clavicular) part', [R('Clavicular part of deltoid muscle')], 'Lateral third of the clavicle.', 'Deltoid tuberosity of the humerus.',
       'Flexion, internal rotation and horizontal adduction.', 'Axillary nerve (C5–C6).', src=['shoulder-muscles', 'neumann'])
muscle('deltoid-middle', 'Deltoid · middle (acromial) part', [R('Acromial part of deltoid muscle')], 'Lateral border of the acromion.', 'Deltoid tuberosity of the humerus.',
       'Abduction.', 'Axillary nerve (C5–C6).', 'Holds the arm at shoulder height through the delivery; needs the cuff to keep the head centered.', src=['shoulder-muscles', 'neumann'])
muscle('deltoid-posterior', 'Deltoid · posterior (spinal) part', [R('Scapular spinal part of deltoid muscle')], 'Spine of the scapula.', 'Deltoid tuberosity of the humerus.',
       'Extension, external rotation and horizontal abduction.', 'Axillary nerve (C5–C6).', 'Contributes to slowing the arm in follow-through.', src=['shoulder-muscles', 'neumann'])
muscle('pec-major-clavicular', 'Pectoralis major · clavicular head', [R('Clavicular head of pectoralis major muscle')], 'Medial half of the clavicle.', 'Lateral lip of the intertubercular groove.',
       'Flexion, horizontal adduction and internal rotation.', 'Lateral pectoral nerve (C5–C7).', src=['pectoral', 'neumann'])
muscle('pec-major-sternal', 'Pectoralis major · sternocostal head', [R('Sternocostal head of pectoralis major muscle')], 'Sternum, upper six costal cartilages and the external oblique aponeurosis.', 'Lateral lip of the intertubercular groove.',
       'Adduction, internal rotation, and extension from a flexed position.', 'Medial and lateral pectoral nerves (C6–T1).',
       'One of the main internal rotators that drives the arm forward in acceleration.', src=['pectoral', 'neumann'])
muscle('latissimus', 'Latissimus dorsi', [R('Latissimus dorsi muscle')], 'Spinous processes T7–T12, thoracolumbar fascia, iliac crest and lower 3–4 ribs.', 'Floor of the intertubercular groove.',
       'Extension, adduction and internal rotation; links the pelvis and trunk to the arm.', 'Thoracodorsal nerve (C6–C8).',
       'Highly active in acceleration. Latissimus and teres major strains are reported in professional pitchers.', src=['shoulder-muscles', 'neumann'])
muscle('teres-major', 'Teres major', [R('Teres major muscle')], 'Posterior surface near the inferior angle of the scapula.', 'Medial lip of the intertubercular groove.',
       'Extension, adduction and internal rotation.', 'Lower subscapular nerve (C5–C6).', 'Works with latissimus; often injured with it in pitchers.', src=['shoulder-muscles', 'neumann'])
muscle('biceps-lh', 'Biceps brachii · long head', [R('Long head of biceps brachii')], 'Supraglenoid tubercle and superior labrum.', 'Radial tuberosity and bicipital aponeurosis.',
       'Elbow flexion and supination; tendon helps depress and steady the humeral head.', 'Musculocutaneous nerve (C5–C6).',
       'Its anchor on the superior labrum is where the peel-back mechanism acts. Also slows elbow extension in follow-through.', src=['shoulder-muscles', 'neumann'])
muscle('biceps-sh', 'Biceps brachii · short head', [R('Short head of biceps brachii')], 'Tip of the coracoid process.', 'Radial tuberosity and bicipital aponeurosis.',
       'Elbow flexion and supination; weak shoulder flexion.', 'Musculocutaneous nerve (C5–C6).', src=['shoulder-muscles', 'neumann'])
muscle('coracobrachialis', 'Coracobrachialis', [R('Coracobrachialis muscle')], 'Tip of the coracoid process.', 'Medial shaft of the humerus near its midpoint.',
       'Flexion and adduction.', 'Musculocutaneous nerve (C5–C7).', src=['shoulder-muscles', 'neumann'])
muscle('triceps-long', 'Triceps brachii · long head', [R('Long head of triceps brachii')], 'Infraglenoid tubercle of the scapula.', 'Olecranon of the ulna.',
       'Elbow extension; shoulder extension and adduction.', 'Radial nerve (C6–C8).', 'Crosses both shoulder and elbow; tight long head limits overhead flexion with the elbow bent.', src=['neumann'])

# ---------------------------------------------------------------- scapula & clavicle
joint('scapulothoracic', 'Scapulothoracic articulation', [],
      'Functional (not true synovial) articulation: the scapula glides on the rib cage, guided by the AC and SC joints.',
      'Upward/downward rotation, posterior/anterior tilt, internal/external rotation, elevation/depression, protraction/retraction.',
      'Not applicable (no articular surfaces).', 'Serratus anterior and trapezius force couple, rhomboids, levator scapulae, pectoralis minor; the clavicle as a strut.',
      'Scapular upward rotation and posterior tilt keep the subacromial space and glenoid aligned under the humerus at arm cocking. Altered motion ("dyskinesis") is common and not always symptomatic.',
      'scapula', note='No mesh: this articulation has no capsule.')
joint('ac-joint', 'Acromioclavicular joint', [R('Articular capsule of acromioclavicular joint'), R('Articular disc of acromioclavicular joint')],
      'Synovial plane joint between the lateral clavicle and the acromion, often with an incomplete disc.', 'Small rotations and glides that let the scapula rotate and tilt on the clavicle.',
      'Around 90° abduction.', 'AC ligament (horizontal), coracoclavicular ligaments (vertical), deltotrapezial fascia.', 'Falls on the shoulder while diving or sliding are the usual mechanism of AC sprains in fielders.', 'scapula',
      note='The mesh shows the capsule and disc.')
joint('sc-joint', 'Sternoclavicular joint', [R('Articular capsule of sternoclavicular joint'), R('Articular disc of sternoclavicular joint')],
      'Synovial saddle joint with an articular disc between the medial clavicle, manubrium and first costal cartilage.', 'Elevation–depression, protraction–retraction and long-axis rotation of the clavicle.',
      'Full arm elevation (maximal posterior clavicular rotation).', 'Anterior and posterior SC ligaments, interclavicular and costoclavicular ligaments, articular disc.', 'The only bony link between the arm and the axial skeleton.', 'scapula')
ligament('ac-ligament', 'Acromioclavicular ligament', [R('Acromioclavicular ligament')], 'Lateral clavicle to the acromion over the AC joint capsule.', 'Main restraint to horizontal (anteroposterior) AC translation.', src=['neumann'])
ligament('conoid', 'Conoid ligament (coracoclavicular)', [R('Conoid ligament')], 'Base of the coracoid process to the conoid tubercle on the underside of the clavicle.', 'Limits superior displacement of the clavicle; couples clavicular rotation to scapular motion.', 'Torn in higher-grade AC separations.')
ligament('trapezoid', 'Trapezoid ligament (coracoclavicular)', [R('Trapezoid ligament')], 'Upper surface of the coracoid to the trapezoid line of the clavicle.', 'Limits superior and medial displacement of the clavicle on the acromion.', 'Torn in higher-grade AC separations.')
ligament('sc-ligaments', 'Sternoclavicular ligaments (anterior and posterior)', [R('Anterior sternoclavicular ligament'), R('Posterior sternoclavicular ligament')], 'Medial clavicle to the manubrium, in front of and behind the joint.', 'Limit anterior and posterior translation of the medial clavicle; the posterior ligament is the stronger restraint.')
# The official Z-Anatomy Startup.blend has the trapezius part names swapped: its 'Ascending part' mesh is the
# upper (neck) fibres and its 'Descending part' mesh runs down to T12. Checked by world bounds on 2026-11-12.
muscle('trap-upper', 'Trapezius · upper (descending) part', [R('Ascending part of trapezius muscle')], 'External occipital protuberance, nuchal ligament.', 'Lateral third of the clavicle.',
       'Scapular elevation and upward rotation (via the clavicle).', 'Accessory nerve (CN XI); C3–C4 sensory/proprioceptive fibers.', 'Part of the upward-rotation force couple with lower trapezius and serratus anterior.')
muscle('trap-middle', 'Trapezius · middle (transverse) part', [R('Transverse part of trapezius muscle')], 'Spinous processes C7–T3 (approximately).', 'Acromion and spine of the scapula.',
       'Retraction (and external rotation) of the scapula.', 'Accessory nerve (CN XI).', 'Holds the scapula back as the trunk rotates forward in the delivery.')
muscle('trap-lower', 'Trapezius · lower (ascending) part', [R('Descending part of trapezius muscle')], 'Spinous processes of the middle and lower thoracic vertebrae (about T4–T12).', 'Root (medial end) of the scapular spine.',
       'Depression, upward rotation and posterior tilt of the scapula.', 'Accessory nerve (CN XI).', 'Often a training target in throwers to support upward rotation and posterior tilt.')
muscle('rhomboid-major', 'Rhomboid major', [R('Rhomboid major muscle')], 'Spinous processes T2–T5.', 'Medial border of the scapula below the spine.',
       'Retraction and downward rotation; holds the scapula to the thorax.', 'Dorsal scapular nerve (C4–C5).', 'Works eccentrically to control scapular protraction in follow-through.')
muscle('rhomboid-minor', 'Rhomboid minor', [R('Rhomboid minor muscle')], 'Nuchal ligament and spinous processes C7–T1.', 'Medial border of the scapula at the root of the spine.',
       'Retraction and downward rotation.', 'Dorsal scapular nerve (C4–C5).')
muscle('levator-scapulae', 'Levator scapulae', [R('Levator scapulae')], 'Transverse processes C1–C4.', 'Medial border of the scapula from the superior angle to the spine.',
       'Elevation and downward rotation of the scapula.', 'Dorsal scapular nerve (C5) and C3–C4.')
muscle('serratus-anterior', 'Serratus anterior', [R('Serratus anterior muscle')], 'Outer surfaces of ribs 1–8 or 9.', 'Costal (anterior) surface of the medial border of the scapula.',
       'Protraction, upward rotation and posterior tilt; keeps the scapula on the thorax.', 'Long thoracic nerve (C5–C7).',
       'Key upward rotator through cocking and acceleration. Weakness shows as medial-border prominence.')
muscle('pec-minor', 'Pectoralis minor', [R('Pectoralis minor muscle')], 'Ribs 3–5 near their costal cartilages.', 'Medial border of the coracoid process.',
       'Anterior tilt, internal rotation and depression of the scapula.', 'Medial pectoral nerve (C8–T1).', 'A short pec minor is linked to reduced posterior tilt; length is hard to measure reliably.', src=['pectoral', 'neumann'])
muscle('subclavius', 'Subclavius', [R('Subclavius muscle')], 'First rib and its costal cartilage.', 'Underside of the middle third of the clavicle.',
       'Depresses and steadies the clavicle at the SC joint.', 'Nerve to subclavius (C5–C6).')

# ---------------------------------------------------------------- elbow & forearm
joint('elbow-joint', 'Elbow joint complex', [R('Articular capsule of elbow joint')],
      'Compound synovial joint: humeroulnar (hinge), humeroradial, and proximal radioulnar (pivot) in one capsule.',
      'Two degrees of freedom: flexion–extension and pronation–supination.',
      'Humeroulnar: full extension (with supination).',
      'Bony fit of the olecranon in its fossa (in extension), UCL anterior bundle (valgus), lateral collateral complex and annular ligament (varus and posterolateral), flexor–pronator mass (dynamic valgus support).',
      'Late cocking and early acceleration put a large valgus load on the elbow. Many pitchers lose a few degrees of extension on the throwing side.',
      'elbow', src=['elbow-joint', 'neumann'], note='The mesh shows the joint capsule.')
ligament('ucl', 'Ulnar (medial) collateral ligament', [R('Ulnar collateral ligament')],
         'Anterior bundle: anteroinferior medial epicondyle to the sublime tubercle of the ulna. Posterior and transverse bundles complete the complex.',
         'The anterior bundle is the primary restraint to valgus load from about 20° to 120° of flexion.',
         'Peak elbow varus torque in late cocking (Fleisig 1995) exceeds isolated cadaveric UCL failure loads, so the flexor–pronator muscles are thought to share the load. The UCL is the structure repaired or reconstructed in "Tommy John" surgery.',
         src=['elbow-joint', 'neumann'], note='Modeled as one structure; the anterior, posterior and transverse bundles are not separated.')
ligament('rcl', 'Radial (lateral) collateral ligament', [R('Radial collateral ligament')],
         'Lateral epicondyle to the annular ligament.', 'Resists varus load; part of the lateral collateral complex with the lateral ulnar collateral ligament.',
         'The lateral ulnar collateral band (main restraint to posterolateral rotatory instability) is not modeled separately.', src=['elbow-joint', 'neumann'])
ligament('annular', 'Annular ligament of radius', [R('Annular ligament of radius')], 'Anterior and posterior margins of the radial notch of the ulna, encircling the radial head.',
         'Holds the radial head against the ulna while it spins in pronation and supination.', src=['annular', 'neumann'])
ligament('forearm-iom', 'Interosseous membrane of forearm', [R('Interosseous membrane of forearm')], 'Interosseous borders of the radius and ulna. Central fibers run distal and medial from radius to ulna.',
         'Transfers compressive load from the radius to the ulna and separates the anterior and posterior compartments.', src=['neumann'])
muscle('pronator-teres', 'Pronator teres', [R('Superficial head of pronator teres'), R('Deep head of pronator teres')], 'Humeral head: medial epicondyle (common flexor origin). Ulnar head: coronoid process.',
       'Middle of the lateral radius.', 'Pronation; assists elbow flexion.', 'Median nerve (C6–C7).',
       'Part of the flexor–pronator mass over the medial elbow; pronation continues through ball release.', note='Both heads are selected together.', src=['forearm', 'neumann'])
muscle('fcu', 'Flexor carpi ulnaris', [R('Humeral head of flexor carpi ulnaris'), R('Ulnar head of flexor carpi ulnaris')], 'Humeral head: medial epicondyle. Ulnar head: olecranon and posterior border of the ulna.',
       'Pisiform, with ligamentous continuity to the hamate and fifth metacarpal.', 'Wrist flexion and ulnar deviation.', 'Ulnar nerve (C7–T1).',
       'Sits directly over the UCL anterior bundle. Cadaver work suggests it and FDS give the most dynamic valgus support. The ulnar nerve passes between its two heads.',
       note='Both heads are selected together.', src=['forearm', 'fcu', 'neumann'])
muscle('fds', 'Flexor digitorum superficialis', [R('Humero-ulnar head of flexor digitorum superficialis'), R('Radial head of flexor digitorum superficialis')],
       'Humeroulnar head: medial epicondyle and coronoid process. Radial head: anterior oblique line of the radius.', 'Sides of the middle phalanges of digits 2–5.',
       'Flexes the PIP and MCP joints and the wrist.', 'Median nerve (C8–T1).', 'With FCU, the main dynamic support over the UCL. Grip and finger flexion are trained partly for this reason.', src=['forearm', 'neumann'])
muscle('fcr', 'Flexor carpi radialis', [R('Flexor carpi radialis')], 'Medial epicondyle (common flexor origin).', 'Bases of the 2nd and 3rd metacarpals.',
       'Wrist flexion and radial deviation.', 'Median nerve (C6–C7).', src=['forearm', 'neumann'])
muscle('palmaris-longus', 'Palmaris longus', [R('Palmaris longus muscle')], 'Medial epicondyle (common flexor origin).', 'Flexor retinaculum and palmar aponeurosis.',
       'Weak wrist flexion; tenses the palmar fascia.', 'Median nerve (C7–C8).', 'Absent in a share of people. When present, its tendon is a common graft for UCL reconstruction.', src=['forearm', 'neumann'])
muscle('fdp', 'Flexor digitorum profundus', [R('Flexor digitorum profundus')], 'Anterior and medial ulna and the interosseous membrane.', 'Bases of the distal phalanges of digits 2–5.',
       'Flexes the DIP joints, then the other finger joints and the wrist.', 'Medial part: ulnar nerve. Lateral part: anterior interosseous branch of the median nerve (C8–T1).', src=['forearm', 'neumann'])
muscle('pronator-quadratus', 'Pronator quadratus', [R('Pronator quadratus')], 'Distal quarter of the anterior ulna.', 'Distal quarter of the anterior radius.', 'Primary pronator; holds the distal radioulnar joint together.',
       'Anterior interosseous nerve (C8–T1).', src=['forearm', 'neumann'])
muscle('biceps-brachii', 'Biceps brachii (both heads)', [R('Long head of biceps brachii'), R('Short head of biceps brachii')], 'Long head: supraglenoid tubercle. Short head: coracoid tip.', 'Radial tuberosity and bicipital aponeurosis.',
       'Elbow flexion and forearm supination (strongest with the elbow flexed).', 'Musculocutaneous nerve (C5–C6).', 'Works eccentrically to slow elbow extension after ball release.', note='Both heads are selected together. See the shoulder region for each head.')
muscle('brachialis', 'Brachialis', [R('Brachialis muscle')], 'Distal half of the anterior humerus.', 'Coronoid process and ulnar tuberosity.', 'Elbow flexion in every forearm position.',
       'Musculocutaneous nerve (C5–C6), small lateral part from the radial nerve.', 'The workhorse elbow flexor; also decelerates elbow extension.')
muscle('brachioradialis', 'Brachioradialis', [R('Brachioradialis muscle')], 'Lateral supracondylar ridge of the humerus.', 'Radial styloid process.', 'Elbow flexion, strongest in mid-pronation.', 'Radial nerve (C5–C6).')
muscle('triceps', 'Triceps brachii (three heads)', [R('Long head of triceps brachii'), R('Lateral head of triceps brachii'), R('Medial head of triceps brachii')],
       'Long head: infraglenoid tubercle. Lateral head: posterior humerus above the radial groove. Medial head: posterior humerus below the radial groove.', 'Olecranon of the ulna.',
       'Elbow extension; long head also extends and adducts the shoulder.', 'Radial nerve (C6–C8).',
       'Drives elbow extension in acceleration. Valgus extension overload loads the posteromedial olecranon at the same time.', note='All three heads are selected together.')
muscle('anconeus', 'Anconeus', [R('Anconeus muscle')], 'Posterior lateral epicondyle.', 'Lateral olecranon and upper posterior ulna.', 'Assists extension; steadies the ulna in pronation.', 'Radial nerve (C7–C8).')
muscle('supinator', 'Supinator', [R('Supinator')], 'Lateral epicondyle, radial collateral and annular ligaments, supinator crest of the ulna.', 'Lateral, posterior and anterior proximal third of the radius.',
       'Supination.', 'Deep branch of the radial nerve / posterior interosseous nerve (C6–C7).', 'The posterior interosseous nerve passes through it.')
muscle('ecrl', 'Extensor carpi radialis longus', [R('Extensor carpi radialis longus')], 'Lateral supracondylar ridge of the humerus.', 'Base of the 2nd metacarpal.', 'Wrist extension and radial deviation.', 'Radial nerve (C6–C7).')
muscle('ecrb', 'Extensor carpi radialis brevis', [R('Extensor carpi radialis brevis')], 'Lateral epicondyle (common extensor origin).', 'Base of the 3rd metacarpal.', 'Wrist extension.', 'Deep branch of the radial nerve (C7–C8).',
       'The usual site of lateral epicondylopathy; in baseball more common in hitters than throwers.')
muscle('extensor-digitorum', 'Extensor digitorum', [R('Extensor digitorum')], 'Lateral epicondyle (common extensor origin).', 'Extensor expansions of digits 2–5.', 'Extends the fingers and assists wrist extension.', 'Posterior interosseous nerve (C7–C8).')
muscle('ecu', 'Extensor carpi ulnaris', [R('Humeral head of extensor carpi ulnaris'), R('Ulnar head of extensor carpi ulnaris')], 'Lateral epicondyle and posterior border of the ulna.', 'Base of the 5th metacarpal.',
       'Wrist extension and ulnar deviation.', 'Posterior interosseous nerve (C7–C8).', 'ECU tendon subluxation at the wrist is reported in hitters, usually on the bottom (lead) hand.', note='Both heads are selected together.')

# ---------------------------------------------------------------- trunk & core
joint('lumbar-spine-joints', 'Lumbar spine (disc and facet joints)', [],
      'Each level combines an intervertebral disc (cartilaginous) and two facet joints (synovial plane).',
      'Mostly flexion–extension; facet orientation limits axial rotation to a few degrees per level.', 'Full extension (facets).',
      'Discs, facet capsules, anterior and posterior longitudinal ligaments, ligamentum flavum, interspinous ligaments, multifidus.',
      'Most trunk rotation in throwing and hitting must come from the hips and thoracic spine. Repeated extension with rotation is a proposed mechanism for pars stress injuries in young players.',
      'spine', note='Spinal ligaments are not modeled in this atlas.')
joint('thoracic-joints', 'Thoracic spine and rib joints', [],
      'Disc and facet joints plus costovertebral and costotransverse joints with the ribs.', 'Rotation and extension, more freely than the lumbar spine; ribs elevate and rotate in breathing.',
      'Full extension.', 'Rib cage, discs, facet capsules, costal ligaments.', 'Thoracic rotation and extension supply much of hip–shoulder separation and the layback of the arm.', 'thorax', note='No mesh.')
joint('si-joint', 'Sacroiliac joint', [R('Anterior sacro-iliac ligament'), R('Interosseous sacro-iliac ligament'), R('Posterior sacro-iliac ligament')],
      'Synovial (anterior) and fibrous (posterior) joint between the sacrum and ilium.', 'A few degrees of nutation and counternutation.', 'Nutation (sacral base tips forward).',
      'Interosseous, posterior and anterior SI ligaments, sacrotuberous and sacrospinous ligaments, thoracolumbar fascia.', 'Transfers force from the legs into the trunk on every stride.', src=['neumann'],
      note='The mesh shows the SI ligaments that wrap the joint.')
ligament('iliolumbar', 'Iliolumbar ligament', [R('Iliolumbar ligament')], 'Transverse process of L5 (sometimes L4) to the posterior iliac crest.', 'Limits motion of L5 on the sacrum, especially lateral flexion and rotation.')
ligament('sacrotuberous', 'Sacrotuberous ligament', [R('Sacrotuberous ligament')], 'Posterior ilium, sacrum and coccyx to the ischial tuberosity.', 'Resists nutation of the sacrum.',
         'Some biceps femoris long head fibers continue into it, a link between the hamstrings and the pelvis.', src=['neumann', 'hamstrings'])
ligament('tlf', 'Thoracolumbar fascia · posterior layer', [R('Posterior layer of thoracolumbar fascia')], 'Spinous processes and supraspinous ligaments to the iliac crest and sacrum.',
         'Encloses the erector spinae; connects latissimus dorsi to the opposite gluteus maximus.', 'A proposed path for force between the hip and the opposite arm.', kind='fascia')
muscle('external-oblique', 'External oblique', [R('External abdominal oblique muscle')], 'Outer surfaces of ribs 5–12.', 'Linea alba, pubic tubercle and anterior half of the iliac crest.',
       'Contralateral trunk rotation, trunk flexion, ipsilateral side bending.', 'Thoracoabdominal nerves T7–T11 and subcostal nerve T12.',
       'Oblique strains are common in baseball and occur mostly on the side opposite the throwing arm (lead side in hitters).', src=['abdominal-wall', 'neumann'],
       note='Rotation pairs the external oblique of one side with the internal oblique of the other. This atlas shows the right side only.')
muscle('internal-oblique', 'Internal oblique', [R('Internal abdominal oblique muscle')], 'Thoracolumbar fascia, anterior two-thirds of the iliac crest, lateral inguinal ligament.', 'Lower borders of ribs 10–12, linea alba, pubic crest.',
       'Ipsilateral trunk rotation, trunk flexion, side bending.', 'Thoracoabdominal nerves T7–T12, iliohypogastric and ilioinguinal nerves (L1).', src=['abdominal-wall', 'neumann'])
muscle('rectus-abdominis', 'Rectus abdominis', [R('Rectus abdominis muscle')], 'Pubic crest and symphysis.', 'Xiphoid process and costal cartilages 5–7.', 'Trunk flexion; resists trunk extension.', 'Thoracoabdominal nerves T7–T12.',
       'Strains of the rectus abdominis on the non-throwing side have been described in pitchers; it resists the arched trunk position before acceleration.', src=['abdominal-wall', 'neumann'])
muscle('transversus-abdominis', 'Transversus abdominis', [R('Transversus abdominis muscle')], 'Costal cartilages 7–12, thoracolumbar fascia, iliac crest, lateral inguinal ligament.', 'Linea alba and pubic crest.',
       'Compresses the abdomen; tensions the thoracolumbar fascia.', 'Thoracoabdominal nerves T7–T12 and L1.', src=['abdominal-wall', 'neumann'])
muscle('quadratus-lumborum', 'Quadratus lumborum', [R('Quadratus lumborum muscle')], 'Iliac crest and iliolumbar ligament.', '12th rib and transverse processes L1–L4.', 'Side bending; steadies the 12th rib; elevates the pelvis on one side.',
       'Anterior rami T12–L4.')
muscle('iliocostalis-lumborum', 'Iliocostalis lumborum (erector spinae)', [R('Iliocostalis lumborum muscle')], 'Common erector spinae tendon: iliac crest, sacrum, lumbar spinous processes.', 'Angles of the lower 6–8 ribs.',
       'Trunk extension and side bending.', 'Dorsal rami of spinal nerves.')
muscle('longissimus-thoracis', 'Longissimus thoracis (erector spinae)', [R('Longissimus thoracis muscle')], 'Common erector spinae tendon and lumbar transverse processes.', 'Thoracic transverse processes and adjacent ribs.',
       'Trunk extension and side bending.', 'Dorsal rami of spinal nerves.')
muscle('multifidus', 'Multifidus (lumbar)', [R('Multifidus lumborum muscle')], 'Sacrum, posterior superior iliac spine, mammillary processes of lumbar vertebrae.', 'Spinous processes two to four levels above.',
       'Segmental extension and control of rotation and shear.', 'Medial branches of the dorsal rami.')

# ---------------------------------------------------------------- hip & pelvis
joint('hip-joint', 'Hip joint', [R('Articular capsule of hip joint')], 'Synovial ball-and-socket joint between the femoral head and the acetabulum.',
      'Three degrees of freedom: flexion–extension, abduction–adduction, internal–external rotation.', 'Full extension with slight internal rotation and abduction.',
      'Deep acetabulum and labrum, iliofemoral, pubofemoral and ischiofemoral ligaments, deep hip rotators, gluteus medius and minimus.',
      'The lead hip must internally rotate as the pelvis turns over a planted leg; the back hip drives extension and rotation. Hip rotation deficits are commonly screened in pitchers.',
      'hip', src=['hip-joint', 'neumann'], note='The mesh shows the joint capsule.')
ligament('acetabular-labrum', 'Acetabular labrum', [R('Acetabular labrum')], 'Rim of the acetabulum, completed inferiorly by the transverse acetabular ligament.',
         'Deepens the socket and seals the joint fluid layer.', 'Labral tears and femoroacetabular impingement occur in baseball players; they reduce hip rotation used in rotation-dominant tasks.', src=['hip-joint', 'neumann'])
ligament('iliofemoral', 'Iliofemoral ligament ("Y ligament")', [R('Descending part of iliofemoral ligament'), R('Transverse part of iliofemoral ligament')], 'Anterior inferior iliac spine and acetabular rim to the intertrochanteric line.',
         'Strongest hip ligament. Limits extension; its lateral (transverse) band also limits external rotation.', 'Tight in the trail leg at full hip extension at foot strike.', src=['hip-joint', 'neumann'], note='Both bands are selected together.')
ligament('pubofemoral', 'Pubofemoral ligament', [R('Pubofemoral ligament')], 'Superior pubic ramus to the inferior capsule and femoral neck.', 'Limits abduction and extension; some external rotation.', src=['hip-joint', 'neumann'])
ligament('ischiofemoral', 'Ischiofemoral ligament', [R('Ischiofemoral ligament')], 'Posterior acetabular rim (ischium) spiraling to the femoral neck near the greater trochanter.', 'Limits internal rotation and extension; also adduction in flexion.',
         'Tightens as the lead hip internally rotates in late stride and acceleration.', src=['hip-joint', 'neumann'])
ligament('it-band', 'Iliotibial tract', [R('Iliotibial tract')], 'Iliac crest (via tensor fasciae latae and gluteus maximus) to the lateral tibial condyle (Gerdy tubercle).', 'Transmits TFL and gluteus maximus force down the lateral thigh; lateral knee stabilizer.', kind='fascia')
muscle('glute-max', 'Gluteus maximus', [R('Gluteus maximus muscle')], 'Posterior ilium, sacrum, coccyx, sacrotuberous ligament and thoracolumbar fascia.', 'Iliotibial tract and gluteal tuberosity of the femur.',
       'Hip extension and external rotation; upper fibers abduct.', 'Inferior gluteal nerve (L5–S2).', 'Drives the back-leg push and decelerates the lead leg as the body moves over it.')
muscle('glute-med', 'Gluteus medius', [R('Gluteus medius muscle')], 'Outer ilium between the anterior and posterior gluteal lines.', 'Lateral facet of the greater trochanter.',
       'Hip abduction; anterior fibers internally rotate, posterior fibers externally rotate; stabilizes the pelvis in single-leg stance.', 'Superior gluteal nerve (L4–S1).',
       'Controls the pelvis on the stance leg during leg lift and the stride.')
muscle('glute-min', 'Gluteus minimus', [R('Gluteus minimus muscle')], 'Outer ilium between the anterior and inferior gluteal lines.', 'Anterior facet of the greater trochanter.',
       'Hip abduction and internal rotation; steadies the femoral head.', 'Superior gluteal nerve (L4–S1).', src=['glute-min', 'neumann'])
muscle('tfl', 'Tensor fasciae latae', [R('Tensor fasciae latae')], 'Anterior superior iliac spine and anterior iliac crest.', 'Iliotibial tract.', 'Hip flexion, abduction and internal rotation; tensions the IT tract.', 'Superior gluteal nerve (L4–S1).')
muscle('piriformis', 'Piriformis', [R('Piriformis muscle')], 'Anterior surface of the sacrum.', 'Upper border of the greater trochanter.',
       'External rotation of the extended hip; abducts the flexed hip.', 'Nerve to piriformis (S1–S2).', 'The sciatic nerve usually exits just below it; anatomical variants exist.')
muscle('gemellus-superior', 'Superior gemellus', [R('Superior gemellus muscle')], 'Ischial spine.', 'Obturator internus tendon to the medial greater trochanter.', 'External rotation.', 'Nerve to obturator internus (L5–S2).', src=['gemelli', 'neumann'])
muscle('obturator-internus', 'Obturator internus', [R('Obturator internus')], 'Inner surface of the obturator membrane and surrounding bone.', 'Medial surface of the greater trochanter.', 'External rotation; steadies the femoral head.', 'Nerve to obturator internus (L5–S2).')
muscle('gemellus-inferior', 'Inferior gemellus', [R('Inferior gemellus muscle')], 'Ischial tuberosity.', 'Obturator internus tendon to the medial greater trochanter.', 'External rotation.', 'Nerve to quadratus femoris (L4–S1).', src=['gemelli', 'neumann'])
muscle('quadratus-femoris', 'Quadratus femoris', [R('Quadratus femoris muscle')], 'Lateral border of the ischial tuberosity.', 'Quadrate tubercle on the intertrochanteric crest.', 'External rotation.', 'Nerve to quadratus femoris (L4–S1).')
muscle('obturator-externus', 'Obturator externus', [R('Obturator externus')], 'Outer surface of the obturator membrane and surrounding bone.', 'Trochanteric fossa of the femur.', 'External rotation.', 'Obturator nerve (L3–L4).')
muscle('iliacus', 'Iliacus (iliopsoas)', [R('Iliacus muscle')], 'Iliac fossa.', 'Lesser trochanter (with psoas major).', 'Hip flexion.', 'Femoral nerve (L2–L3).', 'Pulls the lead leg through in the stride and the back leg through after release.')
muscle('psoas-major', 'Psoas major (iliopsoas)', [R('Psoas major')], 'Bodies and transverse processes T12–L5.', 'Lesser trochanter.', 'Hip flexion; contributes to lumbar stability.', 'Anterior rami L1–L3.')
muscle('adductor-longus', 'Adductor longus', [R('Adductor longus')], 'Body of the pubis below the pubic crest.', 'Middle third of the linea aspera.', 'Hip adduction; assists flexion.', 'Obturator nerve (L2–L4).',
       'Groin strains are frequent in baseball, often with lateral movement and base-running.')
muscle('adductor-brevis', 'Adductor brevis', [R('Adductor brevis')], 'Body and inferior ramus of the pubis.', 'Upper linea aspera and pectineal line.', 'Hip adduction.', 'Obturator nerve (L2–L4).')
muscle('adductor-magnus', 'Adductor magnus', [R('Adductor magnus')], 'Inferior pubic ramus, ischial ramus and ischial tuberosity.', 'Linea aspera and adductor tubercle.',
       'Adduction; the ischial ("hamstring") part extends the hip.', 'Obturator nerve (adductor part) and tibial division of the sciatic nerve (hamstring part), L2–L4.')
muscle('gracilis', 'Gracilis', [R('Gracilis muscle')], 'Body and inferior ramus of the pubis.', 'Medial proximal tibia (pes anserinus).', 'Hip adduction, knee flexion and internal rotation.', 'Obturator nerve (L2–L3).')
muscle('pectineus', 'Pectineus', [R('Pectineus muscle')], 'Pectineal line of the pubis.', 'Pectineal line of the femur.', 'Hip adduction and flexion.', 'Femoral nerve (L2–L3), sometimes the obturator nerve.')
muscle('sartorius', 'Sartorius', [R('Sartorius muscle')], 'Anterior superior iliac spine.', 'Medial proximal tibia (pes anserinus).', 'Hip flexion, abduction and external rotation; knee flexion.', 'Femoral nerve (L2–L3).')

# ---------------------------------------------------------------- thigh & knee
joint('knee-joint', 'Knee joint', [R('Articular capsule of knee joint')], 'Synovial modified hinge (tibiofemoral) plus the patellofemoral joint.',
      'Flexion–extension, with internal–external rotation when flexed.', 'Full extension with tibial external rotation ("screw-home").',
      'Cruciate and collateral ligaments, menisci, posterolateral corner, quadriceps and hamstrings.',
      'The lead knee braces as it extends after foot strike; a firmer lead leg is linked to more energy transfer up the chain. Catchers load the knee in deep flexion.',
      'knee', src=['acl', 'pcl', 'neumann'], note='The mesh shows the joint capsule.')
ligament('acl', 'Anterior cruciate ligament', [R('Anterior cruciate ligament')], 'Medial wall of the lateral femoral condyle to the anterior intercondylar area of the tibia.',
         'Limits anterior tibial translation and internal rotation; tight in extension.', 'Non-contact ACL injuries happen in fielders and base-runners with cutting, landing and sudden deceleration.', src=['acl', 'neumann'])
ligament('pcl', 'Posterior cruciate ligament', [R('Posterior cruciate ligament')], 'Lateral wall of the medial femoral condyle to the posterior intercondylar area of the tibia.', 'Limits posterior tibial translation, most in flexion.', src=['pcl', 'neumann'])
ligament('mcl', 'Tibial (medial) collateral ligament', [R('Superficial part of tibial collateral ligament'), R('Deep part of tibial collateral ligament')], 'Medial femoral epicondyle to the medial tibia; the deep part attaches to the medial meniscus.',
         'Primary restraint to valgus; also limits external rotation.', 'Valgus-stress injury on slides and collisions at the bag.', src=['neumann'], note='Superficial and deep parts are selected together.')
ligament('lcl', 'Fibular (lateral) collateral ligament', [R('Fibular collateral ligament')], 'Lateral femoral epicondyle to the fibular head.', 'Primary restraint to varus; part of the posterolateral corner.', src=['neumann'])
ligament('medial-meniscus', 'Medial meniscus', [R('Medial meniscus')], 'C-shaped fibrocartilage on the medial tibial plateau, firmly attached to the capsule and deep MCL.', 'Spreads load, deepens the plateau, helps stability.',
         'Less mobile than the lateral meniscus, so more often torn with twisting under load. Catchers spend long periods in deep flexion.', src=['neumann'], kind='cartilage')
ligament('lateral-meniscus', 'Lateral meniscus', [R('Lateral meniscus')], 'Nearly circular fibrocartilage on the lateral tibial plateau; loosely attached, separated from the LCL by the popliteus tendon.', 'Spreads load; more mobile than the medial meniscus.', src=['neumann'], kind='cartilage')
muscle('biceps-long', 'Biceps femoris · long head', [R('Long head of biceps femoris')], 'Ischial tuberosity.', 'Primarily the fibular head; distal attachments also reach the lateral tibia.',
       'Hip extension, knee flexion, and external rotation of the flexed knee.', 'Tibial division of the sciatic nerve.',
       'The most commonly strained hamstring, usually in sprinting (base-running), when it is long and absorbing force late in swing.', src=['hamstrings', 'neumann'])
muscle('biceps-short', 'Biceps femoris · short head', [R('Short head of biceps femoris')], 'Lateral linea aspera of the femur.', 'Distal biceps femoris attachment at the fibular head and lateral tibia.',
       'Knee flexion and external rotation; does not cross the hip.', 'Common fibular division of the sciatic nerve.', src=['hamstrings', 'neumann'])
muscle('semitendinosus', 'Semitendinosus', [R('Semitendinosus muscle')], 'Ischial tuberosity; proximal connection with the long-head biceps tendon.', 'Anteromedial proximal tibia at the pes anserinus.',
       'Hip extension, knee flexion, and internal rotation of the flexed knee.', 'Tibial division of the sciatic nerve.', src=['hamstrings', 'hamstring-dissection'])
muscle('semimembranosus', 'Semimembranosus', [R('Semimembranosus muscle')], 'Ischial tuberosity.', 'Medial tibial condyle.', 'Hip extension, knee flexion, and internal rotation of the flexed knee.', 'Tibial division of the sciatic nerve.', src=['hamstrings'])
muscle('rectus-femoris', 'Rectus femoris', [R('Rectus femoris muscle')], 'Anterior inferior iliac spine and the superior acetabular rim.', 'Patella and, via the patellar ligament, the tibial tuberosity.',
       'Knee extension and hip flexion.', 'Femoral nerve (L2–L4).', 'The only quadriceps muscle crossing the hip; strains occur with sprinting and kicking-type actions.')
muscle('vastus-lateralis', 'Vastus lateralis', [R('Vastus lateralis muscle')], 'Greater trochanter, intertrochanteric line and lateral linea aspera.', 'Lateral patella and quadriceps tendon.', 'Knee extension.', 'Femoral nerve (L2–L4).')
muscle('vastus-medialis', 'Vastus medialis', [R('Vastus medialis muscle')], 'Intertrochanteric line and medial linea aspera.', 'Medial patella and quadriceps tendon.', 'Knee extension; distal oblique fibers help track the patella.', 'Femoral nerve (L2–L4).')
muscle('vastus-intermedius', 'Vastus intermedius', [R('Vastus intermedius muscle')], 'Anterior and lateral femoral shaft.', 'Deep quadriceps tendon to the patella.', 'Knee extension.', 'Femoral nerve (L2–L4).')
muscle('gastrocnemius', 'Gastrocnemius (both heads)', [R('Medial head of gastrocnemius'), R('Lateral head of gastrocnemius')], 'Medial and lateral femoral condyles.', 'Calcaneus via the calcaneal (Achilles) tendon.',
       'Ankle plantarflexion; assists knee flexion.', 'Tibial nerve (S1–S2).', 'Medial head strains occur with explosive push-off.', note='Both heads are selected together.')
muscle('popliteus', 'Popliteus', [R('Popliteus muscle')], 'Lateral femoral condyle and lateral meniscus.', 'Posterior tibia above the soleal line.', 'Unlocks the extended knee (internal rotation of the tibia); limits external rotation.', 'Tibial nerve (L4–S1).')


# ---------------------------------------------------------------- ankle & foot
# The atlas has no meshes for the lateral ankle ligaments or the joint axes. They are drawn as simple
# tubes ("schematic") between points picked on the Z-Anatomy Fibula, Tibia, Talus and Calcaneus meshes
# (model coordinates in metres: x = right-left, y = up, z = forward).
SCHEMATIC_NOTE = 'The atlas has no mesh for this, so it is drawn as a simple band between its attachments.'
bone('talus', 'Talus', [R('Talus')])
bone('calcaneus', 'Calcaneus', [R('Calcaneus')])
bone('navicular', 'Navicular', [R('Navicular bone')])
bone('cuboid', 'Cuboid', [R('Cuboid bone')])
bone('cuneiforms', 'Cuneiforms (medial, intermediate, lateral)', [R('Medial cuneiform bone'), R('Intermediate cuneiform bone'), R('Lateral cuneiform bone')])
bone('metatarsals', 'Metatarsals 1–5', [R(f'{n} metatarsal bone') for n in ['First', 'Second', 'Third', 'Fourth', 'Fifth']])
TOES = ['first', 'second', 'third', 'fourth', 'fifth']
bone('toe-phalanges', 'Phalanges of the toes', [R(f'{p} phalanx of {t} finger of foot') for t in TOES for p in ['Proximal', 'Middle', 'Distal'] if not (t == 'first' and p == 'Middle')])

joint('talocrural', 'Talocrural (ankle) joint', [], 'Synovial hinge: the talus sits in the mortise formed by the tibia and fibula.',
      'Dorsiflexion–plantarflexion about an oblique axis, so dorsiflexion also turns the foot slightly out and plantarflexion slightly in.',
      'Full dorsiflexion (the wider front of the talus wedges into the mortise).', 'Bony mortise, lateral ligaments (ATFL, CFL, PTFL), deltoid ligament and the syndesmosis.',
      'Drive-leg dorsiflexion while loading at the rubber, lead-ankle stability at foot strike, and catcher squat depth all depend on this joint.',
      'ankle', note='Shown as its axis: a line through the tips of the two malleoli. The lateral malleolus sits lower and further back than the medial one, which is why the axis is tilted.',
      schematic=[[*ext([-0.1016, 0.0552, -0.0521], [-0.0541, 0.0752, -0.0318], 0.016), 0.0013]])
joint('subtalar', 'Subtalar joint', [], 'Synovial joint between the talus and calcaneus (posterior, middle and anterior facets).',
      'Inversion–eversion; with the midfoot this gives supination–pronation.', 'Full inversion (supination).',
      'Interosseous talocalcaneal and cervical ligaments, calcaneofibular ligament, tibiocalcaneal part of the deltoid ligament.',
      'Lets the foot adapt to the slope of the mound and uneven ground; the lead foot pronates as it takes load after foot strike.',
      'ankle', note='Shown as its axis, which rises from the back-outer heel to the top-inner talar neck: about 40° from horizontal and 17° toward the midline in this model, close to published averages.',
      schematic=[[*ext([-0.0837, 0.0158, -0.0773], [-0.0634, 0.0719, -0.0125], 0.012), 0.0013]])
joint('mtp-joints', 'Metatarsophalangeal (MTP) joints', [R('Articular capsules of metatarsophalangeal joints')], 'Synovial condyloid joints between the metatarsal heads and the proximal phalanges.',
      'Toe flexion–extension, with a little abduction–adduction.', 'Full extension (dorsiflexion).', 'Plantar plates, collateral ligaments, and the two sesamoids under the first MTP.',
      'Big-toe extension is the last lever of drive-leg push-off and sprinting; catchers sit on extended toes.', note='The mesh shows the joint capsules of all five MTP joints.')

ligament('atfl', 'Anterior talofibular ligament (ATFL)', [], 'Anterior border of the lateral malleolus to the lateral neck of the talus.',
         'Limits forward slide of the talus and inversion, most when the foot is pointed down (plantarflexed). The weakest lateral ligament.',
         'The most commonly sprained ligament in the body: rolling the foot in on a base, a bag edge or uneven ground while running.',
         note=SCHEMATIC_NOTE, schematic=[[[-0.1017, 0.0653, -0.0372], [-0.0847, 0.0633, -0.0187], 0.0024]])
ligament('cfl', 'Calcaneofibular ligament (CFL)', [], 'Tip of the lateral malleolus, down and back to the lateral calcaneus, deep to the fibular tendons.',
         'Limits inversion with the ankle neutral or dorsiflexed; it crosses both the ankle and the subtalar joint.', 'Usually torn after the ATFL in a more severe inversion sprain.',
         note=SCHEMATIC_NOTE, schematic=[[[-0.1014, 0.0567, -0.0518], [-0.0956, 0.0403, -0.0597], 0.0024]])
ligament('ptfl', 'Posterior talofibular ligament (PTFL)', [], 'Malleolar fossa on the inner back of the lateral malleolus to the lateral tubercle of the posterior talar process.',
         'Limits backward slide and external rotation of the talus. The strongest of the three lateral ligaments; rarely torn alone.',
         note=SCHEMATIC_NOTE, schematic=[[[-0.0988, 0.0641, -0.0608], [-0.0795, 0.0623, -0.0651], 0.0024]])
ligament('deltoid', 'Deltoid (medial collateral) ligament', [R('Tibiocalcaneal ligament'), R('Tibionavicular ligament'), R('Posterior tibiotalar ligament')],
         'Medial malleolus fanning out to the navicular, the talus and the sustentaculum tali of the calcaneus.',
         'Limits eversion and outward shift of the talus; much stronger than the lateral ligaments.', 'Injured with eversion and external-rotation twists, often together with the syndesmosis.',
         note='Tibionavicular, tibiocalcaneal and posterior tibiotalar parts are selected together; the deep anterior tibiotalar part is not in the atlas.')
ligament('syndesmosis', 'Distal tibiofibular syndesmosis', [R('Anterior tibiofibular ligament'), R('Posterior tibiofibular ligament'), R('Transverse tibiofibular ligament')],
         'Anterior and posterior tibiofibular ligaments, the transverse ligament and the interosseous ligament binding the distal tibia and fibula.',
         'Holds the ankle mortise together; it is stretched as the wider front of the talus enters the mortise in dorsiflexion.',
         'A "high ankle sprain": the foot is forced into external rotation, for example when a cleat catches on a slide or a cut. Return to play usually takes longer than for a lateral sprain.',
         note='Anterior, posterior and transverse ligaments are selected together.')
ligament('leg-iom', 'Interosseous membrane of the leg', [R('Interosseous membrane of leg')], 'Interosseous borders of the tibia and fibula.',
         'Attachment for the deep calf and anterior compartment muscles; ties the two leg bones together and continues into the syndesmosis.')
ligament('achilles', 'Calcaneal (Achilles) tendon', [R('Calcaneal tendon')], 'Joins gastrocnemius and soleus (often with plantaris) to the middle of the posterior calcaneal tuberosity.',
         'Transmits calf force to the heel and stores elastic energy in running and jumping.', 'Tendinopathy and rupture occur with explosive push-off and sprinting; load it progressively after time off.', kind='tendon')
ligament('plantar-fascia', 'Plantar aponeurosis (plantar fascia)', [R('Plantar aponeurosis')], 'Medial calcaneal tuberosity to the plantar plates and flexor sheaths of the toes.',
         'Supports the longitudinal arch; tightens when the toes extend (windlass mechanism) to stiffen the foot for push-off.', 'Plantar heel pain is common with high running volume and hard surfaces.', kind='fascia')
ligament('long-plantar', 'Long plantar ligament', [R('Long plantar ligament')], 'Plantar calcaneus to the cuboid ridge and bases of the 2nd–5th metatarsals.', 'Supports the lateral longitudinal arch and covers the fibularis longus tendon groove.')
ligament('mtp-plantar-plates', 'Plantar plates (MTP joints)', [R('Plantar metatarsophalangeal ligaments')], 'Thick fibrocartilage on the plantar side of each MTP joint, from the metatarsal neck to the base of the proximal phalanx.',
         'Limits toe hyperextension and supports the metatarsal heads.', '"Turf toe": a hyperextension sprain of the big-toe plantar plate, from push-off on firm turf or a forced toe-up position.',
         note='All five plantar plates are selected together.', kind='cartilage')

muscle('soleus', 'Soleus', [R('Soleus muscle')], 'Back of the fibular head and upper fibula, soleal line and medial border of the tibia.', 'Calcaneal tuberosity via the calcaneal (Achilles) tendon.',
       'Ankle plantarflexion at any knee angle; steadies the leg over the foot in stance.', 'Tibial nerve (S1–S2).',
       'The main plantarflexor for running and drive-leg push; train it with bent-knee calf raises as well as straight-knee work.')
muscle('plantaris', 'Plantaris', [R('Plantaris muscle')], 'Lateral supracondylar line of the femur, above the lateral gastrocnemius head.', 'Calcaneus, beside or with the calcaneal tendon.',
       'Weak plantarflexion and knee flexion.', 'Tibial nerve (S1–S2).', note='Absent in a minority of people.')
muscle('tibialis-anterior', 'Tibialis anterior', [R('Tibialis anterior muscle')], 'Lateral condyle and upper lateral tibia, interosseous membrane.', 'Medial cuneiform and base of the first metatarsal.',
       'Dorsiflexion and inversion; lowers the forefoot under control after heel contact.', 'Deep fibular nerve (L4–L5).', 'Pulls the toes up as the lead leg swings toward foot strike.')
muscle('tibialis-posterior', 'Tibialis posterior', [R('Tibialis posterior muscle')], 'Posterior tibia, interosseous membrane and posterior fibula.', 'Navicular tuberosity, cuneiforms, cuboid and bases of the 2nd–4th metatarsals.',
       'Inversion and plantarflexion; the main dynamic support of the medial arch.', 'Tibial nerve (L4–L5).', 'Controls lead-foot pronation as the foot takes load after foot strike.')
muscle('fibularis-longus', 'Fibularis (peroneus) longus', [R('Fibularis longus muscle')], 'Fibular head and upper lateral fibula.', 'Medial cuneiform and base of the first metatarsal, after crossing the sole.',
       'Eversion and plantarflexion; presses the first ray down and supports the transverse arch.', 'Superficial fibular nerve (L5–S1).', 'Its quick reaction resists the roll-in of an inversion sprain.')
muscle('fibularis-brevis', 'Fibularis (peroneus) brevis', [R('Fibularis brevis muscle')], 'Lower lateral fibula.', 'Tuberosity at the base of the fifth metatarsal.',
       'Eversion and plantarflexion.', 'Superficial fibular nerve (L5–S1).', 'An inversion sprain can pull its attachment off the fifth metatarsal base (avulsion fracture).')
muscle('fibularis-tertius', 'Fibularis (peroneus) tertius', [R('Fibularis tertius muscle')], 'Lower anterior fibula.', 'Dorsal base of the fifth metatarsal.', 'Dorsiflexion and eversion.', 'Deep fibular nerve (L5–S1).', note='Absent in some people.')
muscle('edl', 'Extensor digitorum longus', [R('Extensor digitorum longus')], 'Lateral tibial condyle, upper anterior fibula and interosseous membrane.', 'Middle and distal phalanges of toes 2–5 via the extensor expansions.',
       'Extends toes 2–5; dorsiflexion and eversion.', 'Deep fibular nerve (L5–S1).')
muscle('ehl', 'Extensor hallucis longus', [R('Extensor hallucis longus')], 'Middle anterior fibula and interosseous membrane.', 'Base of the distal phalanx of the big toe.', 'Extends the big toe; dorsiflexion.', 'Deep fibular nerve (L5–S1).')
muscle('fdl', 'Flexor digitorum longus', [R('Flexor digitorum longus')], 'Posterior tibia below the soleal line.', 'Bases of the distal phalanges of toes 2–5.', 'Flexes toes 2–5; plantarflexion and inversion; supports the arch.', 'Tibial nerve (S2–S3).')
muscle('fhl', 'Flexor hallucis longus', [R('Flexor hallucis longus')], 'Lower posterior fibula and interosseous membrane.', 'Base of the distal phalanx of the big toe.',
       'Flexes the big toe; plantarflexion; supports the medial arch.', 'Tibial nerve (S2–S3).', 'Drives the big toe into the ground at the end of push-off and sprint stance.')
muscle('abductor-hallucis', 'Abductor hallucis', [R('Abductor hallucis')], 'Medial process of the calcaneal tuberosity, flexor retinaculum and plantar aponeurosis.', 'Medial base of the proximal phalanx of the big toe.',
       'Abducts and flexes the big toe; supports the medial arch.', 'Medial plantar nerve (S1–S2).', 'Part of the foot "core" that holds the arch while the drive foot pushes.')
muscle('fdb', 'Flexor digitorum brevis', [R('Flexor digitorum brevis')], 'Medial process of the calcaneal tuberosity and plantar aponeurosis.', 'Middle phalanges of toes 2–5.', 'Flexes toes 2–5; supports the arch.', 'Medial plantar nerve (S1–S2).')

# ---------------------------------------------------------------- regions
REGIONS = [
    dict(id='shoulder', name='Shoulder', subtitle='Glenohumeral joint: cuff, prime movers, labrum and capsular ligaments',
         joints=['gh-joint'], bones=['clavicle', 'scapula', 'humerus'],
         ligaments=['glenoid-labrum', 'sghl', 'mghl', 'ighl', 'chl', 'thl', 'subacromial-bursa'],
         muscles=['supraspinatus', 'infraspinatus', 'teres-minor', 'subscapularis', 'deltoid-anterior', 'deltoid-middle', 'deltoid-posterior', 'pec-major-clavicular', 'pec-major-sternal',
                  'latissimus', 'teres-major', 'biceps-lh', 'biceps-sh', 'coracobrachialis', 'triceps-long'],
         default='supraspinatus', prompt='Hide the deltoid, then trace each cuff tendon to its tubercle. Switch to Ligaments and find the inferior glenohumeral ligament: which band tightens in the late-cocking position?',
         lesson='shoulder'),
    dict(id='scapula', name='Scapula & clavicle', subtitle='Scapulothoracic control, AC and SC joints',
         joints=['scapulothoracic', 'ac-joint', 'sc-joint'], bones=['clavicle', 'scapula', 'humerus', 'sternum', 'ribs', 'thoracic-spine'],
         ligaments=['ac-ligament', 'conoid', 'trapezoid', 'sc-ligaments'],
         muscles=['trap-upper', 'trap-middle', 'trap-lower', 'rhomboid-major', 'rhomboid-minor', 'levator-scapulae', 'serratus-anterior', 'pec-minor', 'subclavius'],
         default='serratus-anterior', prompt='Find the three muscles of the upward-rotation force couple. Which one pulls the inferior angle forward around the rib cage?', lesson='shoulder'),
    dict(id='elbow', name='Elbow & forearm', subtitle='UCL, collateral ligaments and the flexor–pronator mass',
         joints=['elbow-joint'], bones=['humerus', 'radius', 'ulna'],
         ligaments=['ucl', 'rcl', 'annular', 'forearm-iom'],
         muscles=['pronator-teres', 'fcu', 'fds', 'fcr', 'palmaris-longus', 'fdp', 'pronator-quadratus', 'biceps-brachii', 'brachialis', 'brachioradialis', 'triceps', 'anconeus', 'supinator', 'ecrl', 'ecrb', 'extensor-digitorum', 'ecu'],
         frame=['elbow-joint', 'ucl', 'rcl', 'annular', 'pronator-teres', 'fcu', 'brachialis', 'anconeus', 'supinator'],
         default='ucl', prompt='Select the UCL, then show the muscles. Which two muscles sit directly over its anterior bundle?', lesson='elbow'),
    dict(id='trunk', name='Trunk & core', subtitle='Rotation, anti-extension and the lumbopelvic link',
         joints=['thoracic-joints', 'lumbar-spine-joints', 'si-joint'], bones=['ribs', 'thoracic-spine', 'lumbar-spine', 'sacrum', 'hip'],
         ligaments=['iliolumbar', 'sacrotuberous', 'tlf'],
         muscles=['external-oblique', 'internal-oblique', 'rectus-abdominis', 'transversus-abdominis', 'quadratus-lumborum', 'iliocostalis-lumborum', 'longissimus-thoracis', 'multifidus', 'latissimus'],
         default='external-oblique', prompt='Follow the external oblique fibers down and forward. Which side’s internal oblique works with it to turn the trunk?', lesson=''),
    dict(id='hip', name='Hip & pelvis', subtitle='Hip capsule ligaments, glutes, deep rotators and adductors',
         joints=['hip-joint'], bones=['hip', 'sacrum', 'femur'],
         ligaments=['acetabular-labrum', 'iliofemoral', 'pubofemoral', 'ischiofemoral', 'it-band'],
         muscles=['glute-max', 'glute-med', 'glute-min', 'tfl', 'piriformis', 'gemellus-superior', 'obturator-internus', 'gemellus-inferior', 'quadratus-femoris', 'obturator-externus',
                  'iliacus', 'psoas-major', 'adductor-longus', 'adductor-brevis', 'adductor-magnus', 'gracilis', 'pectineus', 'sartorius'],
         default='glute-med', prompt='Lead-hip internal rotation: which capsular ligament tightens, and which muscles must lengthen to allow it?', lesson=''),
    dict(id='hamstring', name='Thigh & knee', subtitle='Hamstrings, quadriceps, cruciates, collaterals and menisci',
         joints=['knee-joint'], bones=['hip', 'femur', 'patella', 'tibia', 'fibula'],
         ligaments=['acl', 'pcl', 'mcl', 'lcl', 'medial-meniscus', 'lateral-meniscus'],
         muscles=['biceps-long', 'biceps-short', 'semitendinosus', 'semimembranosus', 'rectus-femoris', 'vastus-lateralis', 'vastus-medialis', 'vastus-intermedius', 'gastrocnemius', 'popliteus'],
         default='biceps-long', prompt='Compare the two biceps femoris heads: only one crosses the hip. Then find the ACL and say which tibial motion it limits.', lesson='hamstring'),
    dict(id='ankle', name='Ankle & foot', subtitle='Lateral and medial ankle ligaments, the syndesmosis, calf and foot muscles',
         joints=['talocrural', 'subtalar', 'mtp-joints'], bones=['tibia', 'fibula', 'talus', 'calcaneus', 'navicular', 'cuboid', 'cuneiforms', 'metatarsals', 'toe-phalanges'],
         ligaments=['atfl', 'cfl', 'ptfl', 'deltoid', 'syndesmosis', 'leg-iom', 'achilles', 'plantar-fascia', 'long-plantar', 'mtp-plantar-plates'],
         muscles=['gastrocnemius', 'soleus', 'plantaris', 'tibialis-anterior', 'tibialis-posterior', 'fibularis-longus', 'fibularis-brevis', 'fibularis-tertius', 'edl', 'ehl', 'fdl', 'fhl', 'abductor-hallucis', 'fdb'],
         frame=['talocrural', 'subtalar', 'atfl', 'deltoid', 'talus', 'calcaneus', 'achilles', 'metatarsals', 'toe-phalanges'],
         default='atfl', view='angle', prompt='Select the ATFL, CFL and PTFL in turn. Which one is tight when the foot is pointed down and turned in, the classic sprain position?', lesson=''),
]

ids = {s['id'] for s in S}
assert len(ids) == len(S), 'duplicate ids'
for r in REGIONS:
    for key in ('joints', 'bones', 'ligaments', 'muscles'):
        for sid in r[key]:
            assert sid in ids, (r['id'], sid)
    r['model'] = f"assets/anatomy/regions/{r['id']}.glb"
    r['quiz'] = [m for m in r['muscles']] + [l for l in r['ligaments']]
    r['defaultSelection'] = r.pop('default')

data = {
    'version': 2,
    'reviewed': '2026-11-09',
    'side': 'Right',
    'atlas': 'Z-Anatomy (BodyParts3D-based)',
    'attribution': 'Z-Anatomy, the open source atlas of anatomy (CC BY-SA 4.0), derived from BodyParts3D, © The Database Center for Life Science (CC BY-SA 2.1 Japan).',
    'licenseUrl': 'https://github.com/Z-Anatomy/Models-of-human-anatomy',
    'limits': 'Static, reduced-resolution meshes from one adult male model. Ligaments are modeled as whole structures (for example, UCL bundles are not separated). Not modeled: coracoacromial ligament, lateral ulnar collateral ligament, patellar ligament, spinal ligaments, nerves. The lateral ankle ligaments (ATFL, CFL, PTFL) and the ankle joint axes are not in the atlas, so they are drawn as simple bands. Cards summarise standard references; they are not a diagnosis tool and have not had independent expert review.',
    'sources': {k: {'title': t, 'url': u, 'type': ty} for k, (t, u, ty) in SOURCES.items()},
    'structures': S,
    'regions': REGIONS,
}
OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False) + '\n')
print(f'{len(S)} structures, {len(REGIONS)} regions -> {OUT}')
