-- ============================================================
-- Seed data — run after setup.sql
-- Populates mock inquiries (across every lifecycle state), studies,
-- and agreements so the admin console can be demoed end to end.
--
-- Inquiry lifecycle covered:
--   Lead         → simple lead-form submission, awaiting introductory contact
--   Intake Sent  → full-intake link emailed, awaiting the detailed form
--   New          → full intake received, awaiting feasibility review
--   Approved     → intake approved (also spun up as a study below)
--   Declined     → intake declined
-- ============================================================

-- INQUIRIES
-- Column order:
--   id, study_name, abbreviation, status, submitted_date, submitted_relative,
--   objectives, pi, study_lead, affiliation, affiliation_org, irb,
--   cohort_subjects, services, services_detail, estimate, sample_type,
--   phlebotomy, metadata, budget_code, funding_name, ba_name, ba_email,
--   contracting_contact, additional_notes, lead_details, intake_sent_date,
--   intake_details, sample_schedule, collection_visits, key_personnel,
--   notes, feasibility

insert into inquiries (id, study_name, abbreviation, status, submitted_date, submitted_relative, objectives, pi, study_lead, affiliation, affiliation_org, irb, cohort_subjects, services, services_detail, estimate, sample_type, phlebotomy, metadata, budget_code, funding_name, ba_name, ba_email, contracting_contact, additional_notes, lead_details, intake_sent_date, intake_details, sample_schedule, collection_visits, key_personnel, notes, feasibility) values

-- ── Lead: fresh, awaiting introductory contact (checklist untouched) ──
(
  'glia-penn', null, null, 'Lead', 'July 16, 2026', '1 day ago',
  null,
  '{"name":"Dr. Priya Nguyen","email":"nguyen@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', null,
  null, '', '[]'::jsonb, null, null, null, null,
  null, null, null, null, null, null,
  '{"role":"Principal Investigator","referralSource":"colleague","callPurpose":"New study inquiry — microglia immune profiling","researchSummary":"Exploring peripheral immune correlates of neuroinflammation in early Parkinson disease, and whether CyTOF profiling could support a pilot cohort."}',
  null, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[]',
  '[{"label":"Schedule introductory meeting","checked":false},{"label":"Introductory meeting complete","checked":false}]'
),

-- ── Lead: intro meeting complete, ready to send the full intake ──
(
  'atlas-jax', null, null, 'Lead', 'July 15, 2026', '2 days ago',
  null,
  '{"name":"Dr. Samuel Okonkwo","email":"okonkwo@jax.org"}',
  null,
  'External', 'The Jackson Laboratory', null,
  null, '', '[]'::jsonb, null, null, null, null,
  null, null, null, null, null, null,
  '{"role":"Associate Professor","referralSource":"conference","callPurpose":"Learning about your CyTOF services and pricing","researchSummary":"Comparative immune atlas across autoimmune translational cohorts; interested in whether the core can handle cross-site sample logistics."}',
  null, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[{"author":"Lori Guercio","date":"Jul 15 · 2:20 PM","text":"Met Dr. Okonkwo at CYTO — strong fit for cross-site work. Intro meeting done, ready to send the full intake form."}]',
  '[{"label":"Schedule introductory meeting","checked":true},{"label":"Introductory meeting complete","checked":true}]'
),

-- ── Intake Sent: full-intake link emailed, awaiting the detailed form ──
(
  'lumen-genoptix', null, null, 'Intake Sent', 'July 10, 2026', '1 week ago',
  null,
  '{"name":"Dr. Maria Reyes","email":"mreyes@genoptix.com"}',
  null,
  'Industry', 'Genoptix', null,
  null, '', '[]'::jsonb, null, null, null, null,
  null, null, null, null, null, null,
  '{"role":"Director of Translational Science","referralSource":"web-search","callPurpose":"Discuss a biomarker study and turnaround times","researchSummary":"Phase I immuno-oncology candidate; need standardized immune monitoring with a defined turnaround and data delivery on Pennsieve."}',
  'Jul 14, 2026', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[{"author":"Lori Guercio","date":"Jul 14 · 10:05 AM","text":"Intro call done. Sent the full study intake form — awaiting submission."}]',
  '[{"label":"Schedule introductory meeting","checked":true},{"label":"Introductory meeting complete","checked":true}]'
),

-- ── New: full intake received, awaiting feasibility review (industry) ──
(
  'apex-merck', 'APEX-Merck', 'APEX', 'New', 'May 12, 2026', '2 months ago',
  'Discovery of immune correlates of response to PD-1 checkpoint inhibitor therapy in NSCLC. Primary endpoint: CD8+ T-cell exhaustion markers at week 24 versus baseline.',
  '{"name":"Dr. James Wilson","email":"wilson@merck.com"}',
  '{"name":"Rachel Thompson","email":"rthompson@merck.com"}',
  'Industry', 'Merck Research Laboratories', 'Pending — Merck IRB',
  60, 'PBMC processing, CyTOF, Tier 1 analysis',
  '[{"name":"PBMC processing","qty":120,"rate":"$450"},{"name":"CyTOF MDIPA","qty":120,"rate":"no quote — contact"},{"name":"Tier 1 analysis","qty":120,"rate":"$50"}]',
  58250, 'Fresh whole blood', 'Remote — collected at Merck sites, shipped overnight', 'REDCap (Merck-hosted instance)',
  null, null, null, null, 'researchcontracts@merck.com',
  'Please loop in Rachel Thompson on all scheduling emails — she coordinates sample logistics on our end.',
  null, null,
  '{"clinicalQuestion":"Does PD-1 blockade restore CD8 T-cell effector function in NSCLC responders versus non-responders?","collectionSites":["Remote / off-site"],"collectionSiteOther":"Merck multi-center trial sites","participantNaming":"APEX-001, APEX-002","cohortCount":"2","cohortNames":"Responders, Non-responders","irbStatus":"pending","irbTimeline":"Merck IRB approval expected Q3 2026","bloodVolumePerVisit":"24 mL","bloodVolumeConfirmed":"yes","pilotData":"yes","pilotDataDetail":"Pilot CyTOF on 8 subjects showed a measurable exhaustion signature","enrollmentPeriod":12,"firstSampleDate":"2026-08","sampleArrivalCadence":"estimated 5 subjects per week for 12 weeks","statisticalJustification":"Powered at 80% to detect a 1.5-fold difference in CD8 exhaustion frequency, alpha 0.05","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":2,"tubeCountEdta4ml":1,"specialHandling":["Time-sensitive processing window"],"specialHandlingNotes":"24-hour processing window from draw","customAssays":"Custom CyTOF panel — add PD-1, TIM-3, LAG-3","clinicalVariables":["Treatment arms","Clinical outcomes","Biomarkers"],"pennsieveStatus":"need-setup","dataSharing":"yes","dataSharingNotes":"12-month embargo per Merck data policy","sampleArrival":"rolling","hardDeadlines":"AACR 2027 abstract deadline Nov 2026"}',
  '[{"name":"Responders","subjects":30,"samples":{"base":1,"w24":1,"w52":0,"w104":0}},{"name":"Non-responders","subjects":30,"samples":{"base":1,"w24":1,"w52":0,"w104":0}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Rachel Thompson","role":"CRC / Project Coordinator","email":"rthompson@merck.com"},{"name":"Dr. Amara Singh","role":"Co-Investigator","email":"singh@merck.com"}]'::jsonb,
  '[{"author":"Lori Guercio","date":"May 12 · 11:08 AM","text":"CyTOF capacity check w/ Hannah — can absorb in early Q3 batch. Need MSA before agreement package goes out. Routing to legal."}]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":false},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":false},{"label":"iLabs service request ID# received","checked":false},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":false},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":false},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":false},{"label":"Investigator team member added to crc-ihpu slack channel","checked":false},{"label":"Investigator team member has REDcap access","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"User agreement signed","checked":false}]'
),

-- ── New: full intake received, awaiting review (internal) ──
(
  'cardia-penn', 'CARDIA-Penn', 'CARDIA', 'New', 'May 11, 2026', '2 months ago',
  'Characterization of immune cell dynamics in cardiac immunometabolism. Primary endpoint: NK cell activation state and macrophage polarization at baseline vs. post-intervention.',
  '{"name":"Dr. Adamski","email":"adamski@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', '852041',
  24, 'PBMC processing, CyTOF, banking',
  '[{"name":"PBMC processing","qty":72,"rate":"$300"},{"name":"CyTOF MDIPA","qty":72,"rate":"$325"},{"name":"Sample banking","qty":72,"rate":"$50"}]',
  47880, 'Fresh whole blood', 'IH phlebotomist on Penn campus', 'REDCap (Penn-hosted)',
  '400-4720-1-608811-xxxx-2461-0000', 'Cardiology Immunometabolism Pilot Award', 'Denise Okafor', 'dokafor@pennmedicine.upenn.edu', null,
  'Flexible on start date — happy to align with core batch scheduling.',
  null, null,
  '{"clinicalQuestion":"How do NK cell activation and macrophage polarization shift with cardiac immunometabolic intervention?","collectionSites":["HUP"],"participantNaming":"CARDIA-001","cohortCount":"1","cohortNames":"CARDIA","irbStatus":"approved","bloodVolumePerVisit":"16 mL","bloodVolumeConfirmed":"yes","pilotData":"no","enrollmentPeriod":18,"firstSampleDate":"2026-07","sampleArrivalCadence":"estimated 2 subjects per week, ongoing","statisticalJustification":"Effect size from prior cohort; 24 subjects gives 80% power for the primary endpoint","tubeTypes":["Sodium heparin"],"tubeCountHeparin10ml":1,"specialHandling":[],"clinicalVariables":["Demographics","Clinical outcomes"],"ilabsId":"IL-224417","pennsieveStatus":"has-account","dataSharing":"no","sampleArrival":"rolling"}',
  '[{"name":"CARDIA","subjects":24,"samples":{"base":1,"w24":1,"w52":1,"w104":0}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Priya Anand","role":"CRC","email":"panand@pennmedicine.upenn.edu"}]'::jsonb,
  '[]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":true},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":false},{"label":"iLabs service request ID# received","checked":false},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":false},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":false},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":false},{"label":"Investigator team member added to crc-ihpu slack channel","checked":false},{"label":"Investigator team member has REDcap access","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"User agreement signed","checked":false}]'
),

-- ── Approved: intake approved (full onboarding checklist complete) ──
(
  'resolve-ibd', 'RESOLVE-IBD', 'RESOLVE', 'Approved', 'May 09, 2026', '2 months ago',
  'Mapping of immune signatures associated with remission in inflammatory bowel disease. Primary endpoint: Treg and Th17 balance across 4 longitudinal timepoints.',
  '{"name":"Dr. Lakshmi","email":"lakshmi@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Division of Gastroenterology', '849912',
  40, 'PBMC, CyTOF, Tier 1 + Tier 2',
  '[{"name":"PBMC processing","qty":160,"rate":"$300"},{"name":"CyTOF MDIPA","qty":160,"rate":"$325"},{"name":"Tier 1 analysis","qty":160,"rate":"$50"},{"name":"Tier 2 analysis","qty":80,"rate":"$120"}]',
  117600, 'Stored PBMCs (cryopreserved)', 'IH phlebotomist on Penn campus', 'REDCap · Project ID 24-resolve-ibd',
  '400-4655-1-609233-xxxx-2463-0000', 'IBD Program R01 (NIDDK)', 'Marcus Webb', 'mwebb@pennmedicine.upenn.edu', null,
  'Two subjects have single-timepoint archival samples only — flagged in cohort matrix as Active disease baseline draws.',
  null, null,
  '{"clinicalQuestion":"What immune signatures distinguish sustained remission in IBD?","collectionSites":["HUP","PAH"],"participantNaming":"RESOLVE-001","cohortCount":"2","cohortNames":"Remission, Active disease","irbStatus":"approved","pilotData":"yes","pilotDataDetail":"Prior flow data showed Treg/Th17 imbalance in active disease","enrollmentPeriod":24,"firstSampleDate":"2026-06","sampleArrivalCadence":"batched monthly shipments of 8-10 cryovials from referring GI sites","statisticalJustification":"Powered to detect a 20% difference in Treg frequency at 80% power","specialHandling":["Rare or irreplaceable samples"],"specialHandlingNotes":"Some timepoints are single-draw and cannot be repeated","clinicalVariables":["Demographics","Treatment arms","Clinical outcomes","Medications"],"ilabsId":"IL-231180","pennsieveStatus":"has-account","dataSharing":"no","sampleArrival":"rolling","hardDeadlines":"R01 renewal reporting March 2027"}',
  '[{"name":"Remission","subjects":20,"samples":{"base":1,"w24":1,"w52":1,"w104":1}},{"name":"Active disease","subjects":20,"samples":{"base":1,"w24":1,"w52":1,"w104":1}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Grace Liu","role":"CRC","email":"gliu@pennmedicine.upenn.edu"},{"name":"Dr. Owen Farrell","role":"Co-Investigator","email":"farrell@pennmedicine.upenn.edu"}]'::jsonb,
  '[{"author":"Lori Guercio","date":"May 14 · 9:40 AM","text":"Feasibility cleared. Approved and agreement package sent to Dr. Lakshmi."}]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":true},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":true},{"label":"iLabs service request ID# received","checked":true},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":true},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":true},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":true},{"label":"Investigator team member added to crc-ihpu slack channel","checked":true},{"label":"Investigator team member has REDcap access","checked":true},{"label":"Metadata collection plan obtained","checked":true},{"label":"User agreement signed","checked":true}]'
),

-- ── Declined: full intake reviewed and declined ──
(
  'vector-chop', 'VECTOR-CHOP', 'VECTOR', 'Declined', 'May 06, 2026', '2 months ago',
  'Longitudinal characterization of B-cell and T-cell responses to pediatric vaccine series. Primary endpoint: germinal center B-cell expansion at days 7, 14, and 28.',
  '{"name":"Dr. Bhattacharya","email":"bhatt@email.chop.edu"}',
  null,
  'External', 'Children''s Hospital of Philadelphia', '21-018774',
  18, 'PBMC, CyTOF',
  '[{"name":"PBMC processing","qty":90,"rate":"$375"},{"name":"CyTOF MDIPA","qty":90,"rate":"$350"}]',
  65250, 'Fresh whole blood', 'Remote — collected at CHOP, shipped overnight', 'REDCap (CHOP-hosted)',
  null, null, null, null, 'researchcontracts@email.chop.edu',
  'Willing to revisit with a reduced panel if volume constraints can be worked around.',
  null, null,
  '{"clinicalQuestion":"How do germinal center B-cell responses evolve across a pediatric vaccine series?","collectionSites":["CHOP"],"participantNaming":"VECTOR-001","cohortCount":"1","cohortNames":"Vaccine series","irbStatus":"pending","irbTimeline":"CHOP IRB submission planned Q4 2026","bloodVolumePerVisit":"6 mL","bloodVolumeConfirmed":"no","pilotData":"no","enrollmentPeriod":6,"firstSampleDate":"2026-09","sampleArrivalCadence":"single batch of 18 subjects over a 2-week vaccine visit window","statisticalJustification":"Feasibility cohort; formal power analysis pending pilot","tubeTypes":["Sodium heparin"],"tubeCountHeparin6ml":1,"specialHandling":["Pediatric / low-volume draws"],"specialHandlingNotes":"Low-volume pediatric draws; minimize tube count","clinicalVariables":["Demographics","Biomarkers"],"pennsieveStatus":"unsure","dataSharing":"no","sampleArrival":"single-batch"}',
  '[{"name":"Vaccine series","subjects":18,"samples":{"base":2,"w24":1,"w52":1,"w104":1}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Dana Whitfield","role":"CRC","email":"whitfieldd@email.chop.edu"}]'::jsonb,
  '[{"author":"Lori Guercio","date":"May 10 · 1:15 PM","text":"Declined — pediatric low-volume draws below our minimum viable volume for the requested panel. Offered to revisit if protocol changes."}]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":false},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":false},{"label":"iLabs service request ID# received","checked":false},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":false},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":false},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":false},{"label":"Investigator team member added to crc-ihpu slack channel","checked":false},{"label":"Investigator team member has REDcap access","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"User agreement signed","checked":false}]'
);


-- STUDIES
-- Column order:
--   id, name, abbreviation, pi, study_lead, affiliation, affiliation_org, irb,
--   stage, is_locked, cohort, budget, integrations, started_date, department,
--   objectives, additional_notes, phlebotomy, metadata_desc, key_personnel,
--   intake_details, lifecycle, updated_relative, updated_at, activity

insert into studies (id, name, abbreviation, pi, study_lead, affiliation, affiliation_org, irb, stage, is_locked, cohort, budget, integrations, started_date, department, objectives, additional_notes, phlebotomy, metadata_desc, key_personnel, intake_details, lifecycle, updated_relative, updated_at, activity) values
(
  'bhb-colcan', 'BHB ColCan', 'BHB',
  '{"name":"Dr. Katona","email":"katona@pennmedicine.upenn.edu"}',
  '{"name":"John Smith","email":"jsmith@pennmedicine.upenn.edu"}',
  'Internal', 'Gastroenterology, Perelman School of Medicine', '850567',
  'Processing', false,
  '{"subjects":20,"totalSamples":40,"processedSamples":0,"sampleType":"Fresh whole blood"}',
  '{"committed":27250,"invoiced":16400,"remaining":10850,"pctInvoiced":60,"accountCode":"400-4661-1-605016-xxxx-2459-0000","billingContact":"khas@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1,"completed":1,"committed":250,"invoiced":250},{"service":"Blood processing (PBMC)","rate":300,"planned":40,"completed":32,"committed":12000,"invoiced":9600},{"service":"CyTOF MDIPA","rate":325,"planned":40,"completed":18,"committed":13000,"invoiced":5850},{"service":"Tier 1 analysis","rate":50,"planned":40,"completed":14,"committed":2000,"invoiced":700}]}',
  '{"redcap":"23-bhb-pcc","labvantage":"STU-2026-014","pennsieve":"N:dataset:7a44…0c18"}',
  'Jan 15, 2026', 'Division of Gastroenterology · Perelman School of Medicine',
  'Investigation of beta-hydroxybutyrate (BHB) supplementation as a chemopreventive intervention for colorectal cancer.',
  'Dr. Katona prefers batch processing on Tuesdays/Thursdays to align with clinic draw days.',
  'IH phlebotomist on Penn campus', 'REDCap · Project ID 23-bhb-pcc · synced via export',
  '[{"name":"Hannah Diaz","role":"CRC","email":"diazh@pennmedicine.upenn.edu"}]'::jsonb,
  '{"clinicalQuestion":"Does BHB supplementation shift peripheral myeloid and NK populations toward an anti-tumorigenic phenotype in high-risk CRC patients?","collectionSites":["HUP"],"participantNaming":"BHB-001, BHB-002","cohortCount":"1","cohortNames":"BHB supplementation","irbStatus":"approved","bloodVolumePerVisit":"20 mL","bloodVolumeConfirmed":"yes","pilotData":"yes","pilotDataDetail":"Preliminary metabolomics data showed elevated serum BHB correlates with reduced myeloid-derived suppressor cells","enrollmentPeriod":14,"firstSampleDate":"2026-01","sampleArrivalCadence":"estimated 3 subjects per week for 7 weeks","statisticalJustification":"Powered at 80% to detect a 25% shift in MDSC frequency, alpha 0.05","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":1,"tubeCountEdta4ml":1,"specialHandling":[],"customAssays":"Standard CyTOF myeloid panel","clinicalVariables":["Demographics","Treatment arms","Biomarkers"],"ilabsId":"IL-219004","pennsieveStatus":"has-account","dataSharing":"no","sampleArrival":"rolling","hardDeadlines":"K award progress report due June 2027"}'::jsonb,
  '[{"label":"Inquiry","date":"Jan 15","status":"done"},{"label":"Review","date":"Jan 18","status":"done"},{"label":"Approved","date":"Jan 22","status":"done"},{"label":"Agreements","date":"Jan 24","status":"done"},{"label":"Activated","date":"Jan 28","status":"done"},{"label":"Processing","date":"in progress","status":"active"},{"label":"Complete","date":"—","status":"pending"}]',
  '2h ago', (now() - interval '2 hours'),
  '[{"dotClass":"g","title":"14 processing events logged · CyTOF batch B-2026-018","date":"Apr 28, 2026 · logged by Hannah Pham (lab ops)"},{"dotClass":"g","title":"12 samples received at drop-off","date":"Feb 17, 2026 · logged by Sara Coleman (lab ops)"},{"dotClass":"g","title":"Study activated","date":"Jan 28, 2026 · LabVantage ID STU-2026-014"},{"dotClass":"g","title":"User Agreement countersigned — Dr. Katona","date":"Jan 24, 2026 · 2:48 PM"}]'
),
(
  'prince-val', 'PRINCE-Val Asthma', 'PRINCE',
  '{"name":"Dr. Vonderheide","email":"vonderheide@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Abramson Cancer Center', '842118',
  'Complete', false,
  '{"subjects":45,"totalSamples":135,"processedSamples":135,"sampleType":"Stored PBMCs (cryopreserved)"}',
  '{"committed":91800,"invoiced":91800,"remaining":0,"pctInvoiced":100,"billingContact":"billing@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1,"completed":1,"committed":250,"invoiced":250},{"service":"Blood processing (PBMC)","rate":300,"planned":135,"completed":135,"committed":40500,"invoiced":40500},{"service":"CyTOF MDIPA","rate":325,"planned":135,"completed":135,"committed":43875,"invoiced":43875},{"service":"Tier 1 analysis","rate":50,"planned":135,"completed":135,"committed":6750,"invoiced":6750}]}',
  '{"redcap":"22-prince-val","labvantage":"STU-2025-007","pennsieve":"N:dataset:3f12…aa42"}',
  'Feb 15, 2025', 'Abramson Cancer Center',
  'Longitudinal profiling of asthma-related immune phenotypes following PRINCE checkpoint inhibitor protocol.',
  'Study closed to enrollment; all data delivered on Pennsieve as of Jan 2026.',
  'IH phlebotomist on Penn campus', 'REDCap · Project ID 22-prince-val',
  '[{"name":"Tom Reilly","role":"Study Coordinator","email":"reillyt@pennmedicine.upenn.edu"}]'::jsonb,
  '{"clinicalQuestion":"How does checkpoint inhibitor therapy remodel airway-relevant immune subsets in asthma patients undergoing cancer treatment?","collectionSites":["HUP","Presby"],"participantNaming":"PRINCE-001","cohortCount":"1","cohortNames":"PRINCE checkpoint cohort","irbStatus":"approved","pilotData":"no","enrollmentPeriod":10,"firstSampleDate":"2025-02","sampleArrivalCadence":"monthly cryopreserved PBMC shipments from referring oncology sites","statisticalJustification":"Powered to detect a 30% shift in Th2 subset frequency at 80% power","specialHandling":[],"clinicalVariables":["Demographics","Treatment arms","Clinical outcomes"],"ilabsId":"IL-205621","pennsieveStatus":"has-account","dataSharing":"no","sampleArrival":"rolling"}'::jsonb,
  '[{"label":"Inquiry","date":"Feb 01","status":"done"},{"label":"Review","date":"Feb 05","status":"done"},{"label":"Approved","date":"Feb 10","status":"done"},{"label":"Agreements","date":"Feb 12","status":"done"},{"label":"Activated","date":"Feb 15","status":"done"},{"label":"Processing","date":"Dec 18","status":"done"},{"label":"Complete","date":"Jan 15","status":"done"}]',
  '3d ago', (now() - interval '3 days'),
  '[{"dotClass":"g","title":"All samples delivered on Pennsieve","date":"Jan 15, 2026 · N:dataset:3f12…aa42"},{"dotClass":"g","title":"135 CyTOF acquisitions complete","date":"Dec 18, 2025 · batch B-2025-041"}]'
),
(
  'surge-christie', 'SURGE-Christie', 'SURGE',
  '{"name":"Dr. Christie","email":"christie@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', '850991',
  'Awaiting Signature', true,
  '{"subjects":30,"totalSamples":60,"processedSamples":0,"sampleType":"Tissue"}',
  '{"committed":41000,"invoiced":0,"remaining":41000,"pctInvoiced":0,"billingContact":"billing@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1,"completed":0,"committed":250,"invoiced":0},{"service":"Blood processing (PBMC)","rate":300,"planned":60,"completed":0,"committed":18000,"invoiced":0},{"service":"CyTOF MDIPA","rate":325,"planned":60,"completed":0,"committed":19500,"invoiced":0},{"service":"Tier 1 analysis","rate":50,"planned":60,"completed":0,"committed":3000,"invoiced":0}]}',
  '{"redcap":"26-surge"}',
  'Mar 28, 2026', 'Division of Oncology',
  'Investigation of immune correlates of surgical response in solid tumor patients.',
  'Coordinate tissue pickup directly with OR front desk — do not route through main sample drop-off.',
  'IH phlebotomist on Penn campus', 'REDCap · Project ID 26-surge',
  '[{"name":"Nadia Farouk","role":"CRC","email":"farouk@pennmedicine.upenn.edu"},{"name":"Dr. Ben Ostrander","role":"Co-Investigator","email":"ostrander@pennmedicine.upenn.edu"}]'::jsonb,
  '{"clinicalQuestion":"Do intratumoral and peripheral immune signatures predict pathologic response to neoadjuvant therapy in solid tumor surgical candidates?","collectionSites":["HUP"],"participantNaming":"SURGE-001","cohortCount":"1","cohortNames":"Surgical response cohort","irbStatus":"approved","pilotData":"no","enrollmentPeriod":12,"firstSampleDate":"2026-04","sampleArrivalCadence":"tissue collected at time of resection, batched weekly with OR schedule","statisticalJustification":"Exploratory cohort; formal power analysis to follow interim pilot","specialHandling":["Time-sensitive processing window"],"specialHandlingNotes":"Tissue must be processed within 2 hours of resection","customAssays":"Tissue dissociation + CyTOF on tumor-infiltrating leukocytes","clinicalVariables":["Demographics","Treatment arms","Clinical outcomes"],"pennsieveStatus":"need-setup","dataSharing":"no","sampleArrival":"rolling"}'::jsonb,
  '[{"label":"Inquiry","date":"Mar 22","status":"done"},{"label":"Review","date":"Mar 25","status":"done"},{"label":"Approved","date":"Mar 28","status":"done"},{"label":"Agreements","date":"in progress","status":"active"},{"label":"Activated","date":"—","status":"pending"},{"label":"Processing","date":"—","status":"pending"},{"label":"Complete","date":"—","status":"pending"}]',
  'today', (now() - interval '30 minutes'),
  '[{"dotClass":"","title":"Agreement package sent to PI","date":"Apr 01, 2026 · 10:00 AM · MailerSend"},{"dotClass":"","title":"Intake approved","date":"Mar 28, 2026"},{"dotClass":"","title":"Intake submitted","date":"Mar 22, 2026 · via study intake form"}]'
),
(
  'titan-harvard', 'TITAN-Harvard', 'TITAN',
  '{"name":"Dr. Chen","email":"chen@harvard.edu"}',
  null,
  'External', 'Harvard Medical School', '22-100482',
  'Processing', false,
  '{"subjects":50,"totalSamples":200,"processedSamples":124,"sampleType":"Fresh whole blood"}',
  '{"committed":124000,"invoiced":78000,"remaining":46000,"pctInvoiced":63,"billingContact":"grants@harvard.edu","lines":[{"service":"Consultation","rate":350,"planned":1,"completed":1,"committed":350,"invoiced":350},{"service":"Blood processing (PBMC)","rate":375,"planned":200,"completed":124,"committed":75000,"invoiced":46500},{"service":"CyTOF MDIPA","rate":350,"planned":200,"completed":124,"committed":70000,"invoiced":43400},{"service":"Tier 1 analysis","rate":60,"planned":200,"completed":80,"committed":12000,"invoiced":4800}]}',
  '{"redcap":"22-titan-hms","labvantage":"STU-2025-022","pennsieve":"N:dataset:0a83…cc11"}',
  'Nov 15, 2025', 'Department of Medicine, HMS',
  'Longitudinal characterization of T-cell diversity and exhaustion markers in autoimmune disease cohort.',
  'All shipments go through the HMS core courier — do not use standard FedEx account.',
  'Remote — collected at HMS sites, shipped overnight', 'REDCap (HMS-hosted) · Project ID 22-titan-hms',
  '[{"name":"Sophie Lindqvist","role":"CRC","email":"lindqvist@hms.harvard.edu"}]'::jsonb,
  '{"clinicalQuestion":"How does T-cell exhaustion marker expression evolve longitudinally across autoimmune disease subtypes?","collectionSites":["Remote / off-site"],"collectionSiteOther":"HMS-affiliated clinical sites, shipped overnight","participantNaming":"TITAN-001","cohortCount":"3","cohortNames":"SLE, RA, MS","irbStatus":"approved","bloodVolumePerVisit":"24 mL","bloodVolumeConfirmed":"yes","pilotData":"yes","pilotDataDetail":"Cross-sectional flow data from a prior HMS cohort showed diverging exhaustion trajectories by subtype","enrollmentPeriod":20,"firstSampleDate":"2025-11","sampleArrivalCadence":"estimated 6 subjects per week, overnight shipped in batches of 3 sites","statisticalJustification":"Powered at 80% to detect subtype-level differences in PD-1+TIM-3+ CD8 frequency","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":2,"tubeCountEdta4ml":1,"specialHandling":["Time-sensitive processing window"],"specialHandlingNotes":"Must be processed within 30 hours of draw given overnight shipping","clinicalVariables":["Demographics","Treatment arms","Clinical outcomes","Medications"],"pennsieveStatus":"has-account","dataSharing":"yes","dataSharingNotes":"Data sharing governed by inter-institutional DUA between Penn and HMS","sampleArrival":"rolling","hardDeadlines":"ACR 2026 abstract deadline Aug 2026"}'::jsonb,
  '[{"label":"Inquiry","date":"Oct 28","status":"done"},{"label":"Review","date":"Oct 31","status":"done"},{"label":"Approved","date":"Nov 02","status":"done"},{"label":"Agreements","date":"Nov 06","status":"done"},{"label":"Activated","date":"Nov 15","status":"done"},{"label":"Processing","date":"in progress","status":"active"},{"label":"Complete","date":"—","status":"pending"}]',
  '5h ago', (now() - interval '5 hours'),
  '[{"dotClass":"g","title":"14 processing events logged · CyTOF batch B-2026-018","date":"May 11, 2026 · logged by Hannah Pham"},{"dotClass":"g","title":"Pennsieve dataset linked","date":"May 08, 2026 · N:dataset:0a83…cc11"},{"dotClass":"","title":"18 samples received at drop-off","date":"May 01, 2026 · logged by Sara Coleman"}]'
),
(
  'immune-stanford', 'IMMUNE-Stanford', 'IMST',
  '{"name":"Dr. Patel","email":"patel@stanford.edu"}',
  null,
  'External', 'Stanford University School of Medicine', '53294',
  'Complete', false,
  '{"subjects":35,"totalSamples":105,"processedSamples":105,"sampleType":"Other"}',
  '{"committed":68400,"invoiced":68400,"remaining":0,"pctInvoiced":100,"billingContact":"grants@stanford.edu","lines":[{"service":"Consultation","rate":350,"planned":1,"completed":1,"committed":350,"invoiced":350},{"service":"Blood processing (PBMC)","rate":375,"planned":105,"completed":105,"committed":39375,"invoiced":39375},{"service":"CyTOF MDIPA","rate":350,"planned":105,"completed":105,"committed":36750,"invoiced":36750},{"service":"Tier 1 analysis","rate":60,"planned":105,"completed":105,"committed":6300,"invoiced":6300}]}',
  '{"redcap":"25-immune-su","labvantage":"STU-2025-011","pennsieve":"N:dataset:8c41…dd90"}',
  'Mar 20, 2025', 'Department of Medicine, Stanford',
  'Comprehensive immune profiling of SLE patients at diagnosis, 6 months, and 12 months post-treatment.',
  'Study complete — all samples processed and delivered on Pennsieve as of Jan 2026.',
  'Remote — Stanford collection sites', 'REDCap (Stanford-hosted)',
  '[{"name":"Julia Marsh","role":"Study Coordinator","email":"jmarsh@stanford.edu"}]'::jsonb,
  '{"clinicalQuestion":"What combined serum and cellular immune signatures track with SLE disease activity across the first year of treatment?","collectionSites":["Remote / off-site"],"collectionSiteOther":"Stanford collection sites","participantNaming":"IMST-001","cohortCount":"1","cohortNames":"SLE longitudinal cohort","irbStatus":"approved","pilotData":"no","enrollmentPeriod":12,"firstSampleDate":"2025-03","sampleArrivalCadence":"paired serum + PBMC shipments at each of 3 visits per subject","statisticalJustification":"Powered to detect a 20% change in SLEDAI-correlated biomarker panel at 80% power","specialHandling":[],"customAssays":"Paired serum proteomics + CyTOF immunophenotyping","clinicalVariables":["Demographics","Clinical outcomes","Biomarkers","Medications"],"pennsieveStatus":"has-account","dataSharing":"no","sampleArrival":"rolling"}'::jsonb,
  '[{"label":"Inquiry","date":"Mar 10","status":"done"},{"label":"Review","date":"Mar 13","status":"done"},{"label":"Approved","date":"Mar 15","status":"done"},{"label":"Agreements","date":"Mar 15","status":"done"},{"label":"Activated","date":"Mar 20","status":"done"},{"label":"Processing","date":"Jan 10","status":"done"},{"label":"Complete","date":"Jan 28","status":"done"}]',
  '8d ago', (now() - interval '8 days'),
  '[{"dotClass":"g","title":"All data delivered on Pennsieve","date":"Jan 28, 2026"},{"dotClass":"g","title":"105 CyTOF acquisitions complete","date":"Jan 10, 2026"}]'
),
(
  'nova-biogen', 'NOVA-BioGen', 'NOVA',
  '{"name":"Dr. Martinez","email":"martinez@biogen.com"}',
  null,
  'Industry', 'Biogen', '24-CT-008',
  'Processing', false,
  '{"subjects":50,"totalSamples":150,"processedSamples":50,"sampleType":"Fresh whole blood"}',
  '{"committed":135000,"invoiced":42500,"remaining":92500,"pctInvoiced":31,"billingContact":"researchops@biogen.com","lines":[{"service":"Consultation","rate":500,"planned":1,"completed":1,"committed":500,"invoiced":500},{"service":"Blood processing (PBMC)","rate":450,"planned":150,"completed":50,"committed":67500,"invoiced":22500},{"service":"CyTOF MDIPA","rate":425,"planned":150,"completed":50,"committed":63750,"invoiced":21250},{"service":"Tier 1 analysis","rate":60,"planned":150,"completed":50,"committed":9000,"invoiced":3000}]}',
  '{"redcap":"24-nova-bg","labvantage":"STU-2026-008","pennsieve":"N:dataset:1b72…ef33"}',
  'Jan 20, 2026', 'Biogen Research',
  'Phase II biomarker study for novel MS therapeutic. Immune profiling at baseline, 3 months, and 6 months.',
  'Biogen requires a signed CDA on file before any interim data summaries are shared externally.',
  'Remote — Biogen clinical sites, shipped overnight', 'REDCap (Biogen-hosted)',
  '[{"name":"Marcus Chen","role":"Clinical Trial Manager","email":"mchen@biogen.com"}]'::jsonb,
  '{"clinicalQuestion":"Does the novel MS therapeutic normalize peripheral Th17/Treg balance over the first 6 months of treatment?","collectionSites":["Remote / off-site"],"collectionSiteOther":"Biogen clinical trial sites, shipped overnight","participantNaming":"NOVA-001","cohortCount":"2","cohortNames":"Treatment, Placebo","irbStatus":"approved","bloodVolumePerVisit":"20 mL","bloodVolumeConfirmed":"yes","pilotData":"yes","pilotDataDetail":"Phase I data showed a trend toward Treg expansion in treated subjects","enrollmentPeriod":9,"firstSampleDate":"2026-01","sampleArrivalCadence":"estimated 8 subjects per week across all trial sites","statisticalJustification":"Powered at 80% to detect a 15% shift in Th17/Treg ratio, alpha 0.05","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":2,"tubeCountEdta4ml":1,"specialHandling":["Time-sensitive processing window"],"specialHandlingNotes":"36-hour processing window for overnight-shipped samples","customAssays":"Custom Th17/Treg-focused CyTOF panel","clinicalVariables":["Treatment arms","Clinical outcomes","Biomarkers"],"pennsieveStatus":"need-setup","dataSharing":"yes","dataSharingNotes":"18-month embargo per sponsor data policy","sampleArrival":"rolling","hardDeadlines":"Interim analysis due Q3 2026"}'::jsonb,
  '[{"label":"Inquiry","date":"Dec 12","status":"done"},{"label":"Review","date":"Dec 18","status":"done"},{"label":"Approved","date":"Jan 02","status":"done"},{"label":"Agreements","date":"Jan 07","status":"done"},{"label":"Activated","date":"Jan 20","status":"done"},{"label":"Processing","date":"in progress","status":"active"},{"label":"Complete","date":"—","status":"pending"}]',
  'yesterday', (now() - interval '1 day'),
  '[{"dotClass":"g","title":"50 samples processed — first batch complete","date":"Apr 28, 2026 · CyTOF batch B-2026-016"},{"dotClass":"","title":"50 samples received at drop-off","date":"Apr 14, 2026"}]'
);


-- AGREEMENTS (one row per agreement per study)

insert into agreements (study_id, id, name, description, status, signed_by, signed_date, signed_email, sent_date, reminder_date) values
-- BHB ColCan (signed)
('bhb-colcan','ua','User Agreement','Master scope of work between PI and I3H','Signed','Robert Katona','Jan 24, 2026 at 2:48 PM','katona@pennmedicine.upenn.edu',null,null),
-- PRINCE-Val (signed)
('prince-val','ua','User Agreement','Master scope of work','Signed','Robert Vonderheide','Feb 10, 2025 at 9:12 AM','vonderheide@pennmedicine.upenn.edu',null,null),
-- SURGE-Christie (pending — awaiting PI signature)
('surge-christie','ua','User Agreement','Master scope of work','Pending',null,null,null,'Apr 01','Apr 08'),
-- TITAN-Harvard (signed)
('titan-harvard','ua','User Agreement','Master scope of work','Signed','Wei Chen','Nov 04, 2025','chen@harvard.edu',null,null),
-- IMMUNE-Stanford (signed)
('immune-stanford','ua','User Agreement','Master scope of work','Signed','Anjali Patel','Mar 14, 2025','patel@stanford.edu',null,null),
-- NOVA-BioGen (signed)
('nova-biogen','ua','User Agreement','Master scope of work','Signed','Elena Martinez','Jan 05, 2026','martinez@biogen.com',null,null);
