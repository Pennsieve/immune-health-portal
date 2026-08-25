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
--   pi, study_lead, affiliation, affiliation_org, irb,
--   cohort_subjects, services, services_detail, estimate,
--   budget_code, funding_name, ba_name, ba_email,
--   contracting_contact, additional_notes, lead_details, intake_sent_date,
--   intake_details, sample_schedule, collection_visits, key_personnel,
--   notes, feasibility

insert into inquiries (id, study_name, abbreviation, status, submitted_date, submitted_relative, pi, study_lead, affiliation, affiliation_org, irb, cohort_subjects, services, services_detail, estimate, budget_code, funding_name, ba_name, ba_email, contracting_contact, additional_notes, lead_details, intake_sent_date, intake_details, sample_schedule, collection_visits, key_personnel, notes, feasibility) values

-- ── Lead: fresh, awaiting introductory contact (checklist untouched) ──
(
  'glia-penn', null, null, 'Lead', 'July 16, 2026', '1 day ago',
  '{"name":"Dr. Priya Nguyen","email":"nguyen@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', null,
  null, '', '[]'::jsonb, null,
  null, null, null, null, null, null,
  '{"role":"Principal Investigator","referralSource":"colleague","callPurpose":"New study inquiry — microglia immune profiling","researchSummary":"Exploring peripheral immune correlates of neuroinflammation in early Parkinson disease, and whether CyTOF profiling could support a pilot cohort."}',
  null, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[]',
  '[{"label":"Schedule introductory meeting","checked":false},{"label":"Introductory meeting complete","checked":false}]'
),

-- ── Lead: intro meeting complete, ready to send the full intake ──
(
  'atlas-jax', null, null, 'Lead', 'July 15, 2026', '2 days ago',
  '{"name":"Dr. Samuel Okonkwo","email":"okonkwo@jax.org"}',
  null,
  'External', 'The Jackson Laboratory', null,
  null, '', '[]'::jsonb, null,
  null, null, null, null, null, null,
  '{"role":"Associate Professor","referralSource":"conference","callPurpose":"Learning about your CyTOF services and pricing","researchSummary":"Comparative immune atlas across autoimmune translational cohorts; interested in whether the core can handle cross-site sample logistics."}',
  null, '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[{"author":"Lori Guercio","date":"Jul 15 · 2:20 PM","text":"Met Dr. Okonkwo at CYTO — strong fit for cross-site work. Intro meeting done, ready to send the full intake form."}]',
  '[{"label":"Schedule introductory meeting","checked":true},{"label":"Introductory meeting complete","checked":true}]'
),

-- ── Intake Sent: full-intake link emailed, awaiting the detailed form ──
(
  'lumen-genoptix', null, null, 'Intake Sent', 'July 10, 2026', '1 week ago',
  '{"name":"Dr. Maria Reyes","email":"mreyes@genoptix.com"}',
  null,
  'Industry', 'Genoptix', null,
  null, '', '[]'::jsonb, null,
  null, null, null, null, null, null,
  '{"role":"Director of Translational Science","referralSource":"web-search","callPurpose":"Discuss a biomarker study and turnaround times","researchSummary":"Phase I immuno-oncology candidate; need standardized immune monitoring with a defined turnaround and data delivery on Pennsieve."}',
  'Jul 14, 2026', '{}'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
  '[{"author":"Lori Guercio","date":"Jul 14 · 10:05 AM","text":"Intro call done. Sent the full study intake form — awaiting submission."}]',
  '[{"label":"Schedule introductory meeting","checked":true},{"label":"Introductory meeting complete","checked":true}]'
),

-- ── New: full intake received, awaiting feasibility review (industry) ──
(
  'apex-merck', 'APEX-Merck', 'APEX', 'New', 'May 12, 2026', '2 months ago',
  '{"name":"Dr. James Wilson","email":"wilson@merck.com"}',
  '{"name":"Rachel Thompson","email":"rthompson@merck.com"}',
  'Industry', 'Merck Research Laboratories', 'Pending — Merck IRB',
  60, 'PBMC processing, CyTOF, Tier 1 analysis',
  '[{"name":"PBMC processing","qty":120,"rate":"$450"},{"name":"CyTOF MDIPA","qty":120,"rate":"no quote — contact"},{"name":"Tier 1 analysis","qty":120,"rate":"$50"}]',
  58250,
  null, null, null, null, 'researchcontracts@merck.com',
  'Please loop in Rachel Thompson on all scheduling emails — she coordinates sample logistics on our end.',
  null, null,
  '{"collectionSites":["Remote / off-site"],"collectionSiteOther":"Merck multi-center trial sites","irbStatus":"pending","irbTimeline":"Merck IRB approval expected Q3 2026","bloodVolumePerVisit":"24 mL","bloodVolumeConfirmed":"yes","enrollmentPeriod":12,"firstSampleDate":"2026-08","sampleArrivalCadence":"estimated 5 subjects per week for 12 weeks","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":2,"tubeCountEdta3ml":1}',
  '[{"name":"Responders","subjects":30,"samples":{"base":1,"w24":1,"w52":0,"w104":0}},{"name":"Non-responders","subjects":30,"samples":{"base":1,"w24":1,"w52":0,"w104":0}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Rachel Thompson","role":"CRC / Project Coordinator","email":"rthompson@merck.com"},{"name":"Dr. Amara Singh","role":"Co-Investigator","email":"singh@merck.com"}]'::jsonb,
  '[{"author":"Lori Guercio","date":"May 12 · 11:08 AM","text":"CyTOF capacity check w/ Hannah — can absorb in early Q3 batch. Need MSA before agreement package goes out. Routing to legal."}]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":false},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":false},{"label":"iLabs service request ID# received","checked":false},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":false},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":false},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":false},{"label":"Investigator team member added to crc-ihpu slack channel","checked":false},{"label":"Investigator team member has REDcap access","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"User agreement signed","checked":false}]'
),

-- ── New: full intake received, awaiting review (internal) ──
(
  'cardia-penn', 'CARDIA-Penn', 'CARDIA', 'New', 'May 11, 2026', '2 months ago',
  '{"name":"Dr. Adamski","email":"adamski@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', '852041',
  24, 'PBMC processing, CyTOF, banking',
  '[{"name":"PBMC processing","qty":72,"rate":"$300"},{"name":"CyTOF MDIPA","qty":72,"rate":"$325"},{"name":"Sample banking","qty":72,"rate":"$50"}]',
  47880,
  '400-4720-1-608811-xxxx-2461-0000', 'Cardiology Immunometabolism Pilot Award', 'Denise Okafor', 'dokafor@pennmedicine.upenn.edu', null,
  'Flexible on start date — happy to align with core batch scheduling.',
  null, null,
  '{"collectionSites":["HUP"],"irbStatus":"approved","bloodVolumePerVisit":"16 mL","bloodVolumeConfirmed":"yes","enrollmentPeriod":18,"firstSampleDate":"2026-07","sampleArrivalCadence":"estimated 2 subjects per week, ongoing","tubeTypes":["Sodium heparin"],"tubeCountHeparin10ml":1,"ilabsId":"IL-224417"}',
  '[{"name":"CARDIA","subjects":24,"samples":{"base":1,"w24":1,"w52":1,"w104":0}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Priya Anand","role":"CRC","email":"panand@pennmedicine.upenn.edu"}]'::jsonb,
  '[]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":true},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":false},{"label":"iLabs service request ID# received","checked":false},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":false},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":false},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":false},{"label":"Investigator team member added to crc-ihpu slack channel","checked":false},{"label":"Investigator team member has REDcap access","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"User agreement signed","checked":false}]'
),

-- ── Approved: intake approved (full onboarding checklist complete) ──
(
  'resolve-ibd', 'RESOLVE-IBD', 'RESOLVE', 'Approved', 'May 09, 2026', '2 months ago',
  '{"name":"Dr. Lakshmi","email":"lakshmi@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Division of Gastroenterology', '849912',
  40, 'PBMC, CyTOF, Tier 1 + Tier 2',
  '[{"name":"PBMC processing","qty":160,"rate":"$300"},{"name":"CyTOF MDIPA","qty":160,"rate":"$325"},{"name":"Tier 1 analysis","qty":160,"rate":"$50"},{"name":"Tier 2 analysis","qty":80,"rate":"$120"}]',
  117600,
  '400-4655-1-609233-xxxx-2463-0000', 'IBD Program R01 (NIDDK)', 'Marcus Webb', 'mwebb@pennmedicine.upenn.edu', null,
  'Two subjects have single-timepoint archival samples only — flagged in cohort matrix as Active disease baseline draws.',
  null, null,
  '{"collectionSites":["HUP","PAH"],"irbStatus":"approved","enrollmentPeriod":24,"firstSampleDate":"2026-06","sampleArrivalCadence":"batched monthly shipments of 8-10 cryovials from referring GI sites","ilabsId":"IL-231180"}',
  '[{"name":"Remission","subjects":20,"samples":{"base":1,"w24":1,"w52":1,"w104":1}},{"name":"Active disease","subjects":20,"samples":{"base":1,"w24":1,"w52":1,"w104":1}}]',
  '[{"id":"base","label":"Base","description":"Day 0"},{"id":"w24","label":"Week 24","description":"Week 24"},{"id":"w52","label":"Week 52","description":"Week 52"},{"id":"w104","label":"Week 104","description":"Week 104"}]'::jsonb,
  '[{"name":"Grace Liu","role":"CRC","email":"gliu@pennmedicine.upenn.edu"},{"name":"Dr. Owen Farrell","role":"Co-Investigator","email":"farrell@pennmedicine.upenn.edu"}]'::jsonb,
  '[{"author":"Lori Guercio","date":"May 14 · 9:40 AM","text":"Feasibility cleared. Approved and agreement package sent to Dr. Lakshmi."}]',
  '[{"label":"Completed intake form received","checked":true},{"label":"IRB is approved and IRB# has been provided (if applicable)","checked":true},{"label":"Contract or active budget account number is executed in CAMS; IH core approved to spend","checked":true},{"label":"iLabs service request ID# received","checked":true},{"label":"Investigator team member responsible for entering visits and delivering samples has account access and completed training","checked":true},{"label":"Sample chain-of-custody plan from blood draw to lab drop off established and approved by Immune Health and investigator’s team","checked":true},{"label":"Sample drop off SOP & 1 pager sent to investigator’s team","checked":true},{"label":"Investigator team member added to crc-ihpu slack channel","checked":true},{"label":"Investigator team member has REDcap access","checked":true},{"label":"Metadata collection plan obtained","checked":true},{"label":"User agreement signed","checked":true}]'
),

-- ── Declined: full intake reviewed and declined ──
(
  'vector-chop', 'VECTOR-CHOP', 'VECTOR', 'Declined', 'May 06, 2026', '2 months ago',
  '{"name":"Dr. Bhattacharya","email":"bhatt@email.chop.edu"}',
  null,
  'External', 'Children''s Hospital of Philadelphia', '21-018774',
  18, 'PBMC, CyTOF',
  '[{"name":"PBMC processing","qty":90,"rate":"$375"},{"name":"CyTOF MDIPA","qty":90,"rate":"$350"}]',
  65250,
  null, null, null, null, 'researchcontracts@email.chop.edu',
  'Willing to revisit with a reduced panel if volume constraints can be worked around.',
  null, null,
  '{"collectionSites":["CHOP"],"irbStatus":"pending","irbTimeline":"CHOP IRB submission planned Q4 2026","bloodVolumePerVisit":"6 mL","bloodVolumeConfirmed":"no","enrollmentPeriod":6,"firstSampleDate":"2026-09","sampleArrivalCadence":"single batch of 18 subjects over a 2-week vaccine visit window","tubeTypes":["Sodium heparin"],"tubeCountHeparin6ml":1}',
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
--   additional_notes, key_personnel,
--   intake_details, lifecycle, updated_relative, updated_at, activity

insert into studies (id, name, abbreviation, pi, study_lead, affiliation, affiliation_org, irb, stage, is_locked, cohort, budget, integrations, started_date, department, additional_notes, key_personnel, intake_details, lifecycle, updated_relative, updated_at, activity) values
(
  'bhb-colcan', 'BHB ColCan', 'BHB',
  '{"name":"Dr. Katona","email":"katona@pennmedicine.upenn.edu"}',
  '{"name":"John Smith","email":"jsmith@pennmedicine.upenn.edu"}',
  'Internal', 'Gastroenterology, Perelman School of Medicine', '850567',
  'Processing', false,
  '{"subjects":20,"totalSamples":40,"processedSamples":0,"groups":[{"name":"BHB supplementation","subjects":20,"samples":{"base":1,"w12":1}}],"visits":[{"id":"base","label":"Baseline","description":"Day 0, pre-supplementation"},{"id":"w12","label":"Week 12","description":"End of supplementation period"}]}',
  '{"accountCode":"400-4661-1-605016-xxxx-2459-0000","fundingName":"GI Chemoprevention Program (K Award)","baName":"Karen Liu","baEmail":"kliu@pennmedicine.upenn.edu","billingContact":"khas@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1},{"service":"Blood processing (PBMC)","rate":300,"planned":40},{"service":"CyTOF MDIPA","rate":325,"planned":40},{"service":"Tier 1 analysis","rate":50,"planned":40}]}',
  '{"redcap":"23-bhb-pcc","labvantage":"STU-2026-014","pennsieve":"N:dataset:7a44…0c18"}',
  'Jan 15, 2026', 'Division of Gastroenterology · Perelman School of Medicine',
  'Dr. Katona prefers batch processing on Tuesdays/Thursdays to align with clinic draw days.',
  '[{"name":"Hannah Diaz","role":"CRC","email":"diazh@pennmedicine.upenn.edu"}]'::jsonb,
  '{"collectionSites":["HUP"],"irbStatus":"approved","bloodVolumePerVisit":"20 mL","bloodVolumeConfirmed":"yes","enrollmentPeriod":14,"firstSampleDate":"2026-01","sampleArrivalCadence":"estimated 3 subjects per week for 7 weeks","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":1,"tubeCountEdta3ml":1,"ilabsId":"IL-219004"}'::jsonb,
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
  '{"subjects":45,"totalSamples":135,"processedSamples":135,"groups":[{"name":"PRINCE checkpoint cohort","subjects":45,"samples":{"base":1,"c3":1,"c6":1}}],"visits":[{"id":"base","label":"Baseline","description":"Prior to first checkpoint inhibitor dose"},{"id":"c3","label":"Cycle 3","description":"After 3 treatment cycles"},{"id":"c6","label":"Cycle 6","description":"After 6 treatment cycles"}]}',
  '{"accountCode":"400-4610-1-602284-xxxx-2455-0000","fundingName":"Abramson Cancer Center Immunotherapy Core","baName":"Frank Delgado","baEmail":"delgadof@pennmedicine.upenn.edu","billingContact":"billing@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1},{"service":"Blood processing (PBMC)","rate":300,"planned":135},{"service":"CyTOF MDIPA","rate":325,"planned":135},{"service":"Tier 1 analysis","rate":50,"planned":135}]}',
  '{"redcap":"22-prince-val","labvantage":"STU-2025-007","pennsieve":"N:dataset:3f12…aa42"}',
  'Feb 15, 2025', 'Abramson Cancer Center',
  'Study closed to enrollment; all data delivered on Pennsieve as of Jan 2026.',
  '[{"name":"Tom Reilly","role":"Study Coordinator","email":"reillyt@pennmedicine.upenn.edu"}]'::jsonb,
  '{"collectionSites":["HUP","Presby"],"irbStatus":"approved","enrollmentPeriod":10,"firstSampleDate":"2025-02","sampleArrivalCadence":"monthly cryopreserved PBMC shipments from referring oncology sites","ilabsId":"IL-205621"}'::jsonb,
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
  '{"subjects":30,"totalSamples":60,"processedSamples":0,"groups":[{"name":"Surgical response cohort","subjects":30,"samples":{"preop":1,"postop":1}}],"visits":[{"id":"preop","label":"Pre-operative","description":"Within 7 days prior to resection"},{"id":"postop","label":"Post-operative","description":"Tissue and blood collected at time of resection"}]}',
  '{"accountCode":"400-4702-1-607745-xxxx-2460-0000","fundingName":"Division of Oncology Surgical Immunology Fund","baName":"Renee Castillo","baEmail":"castillor@pennmedicine.upenn.edu","billingContact":"billing@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1},{"service":"Blood processing (PBMC)","rate":300,"planned":60},{"service":"CyTOF MDIPA","rate":325,"planned":60},{"service":"Tier 1 analysis","rate":50,"planned":60}]}',
  '{"redcap":"26-surge"}',
  'Mar 28, 2026', 'Division of Oncology',
  'Coordinate tissue pickup directly with OR front desk — do not route through main sample drop-off.',
  '[{"name":"Nadia Farouk","role":"CRC","email":"farouk@pennmedicine.upenn.edu"},{"name":"Dr. Ben Ostrander","role":"Co-Investigator","email":"ostrander@pennmedicine.upenn.edu"}]'::jsonb,
  '{"collectionSites":["HUP"],"irbStatus":"approved","enrollmentPeriod":12,"firstSampleDate":"2026-04","sampleArrivalCadence":"tissue collected at time of resection, batched weekly with OR schedule"}'::jsonb,
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
  '{"subjects":50,"totalSamples":200,"processedSamples":124,"groups":[{"name":"SLE","subjects":18,"samples":{"base":1,"m3":1,"m6":1,"m12":1}},{"name":"RA","subjects":16,"samples":{"base":1,"m3":1,"m6":1,"m12":1}},{"name":"MS","subjects":16,"samples":{"base":1,"m3":1,"m6":1,"m12":1}}],"visits":[{"id":"base","label":"Baseline","description":"Day 0"},{"id":"m3","label":"Month 3","description":"3-month follow-up"},{"id":"m6","label":"Month 6","description":"6-month follow-up"},{"id":"m12","label":"Month 12","description":"12-month follow-up"}]}',
  '{"contractingContact":"osp@harvard.edu","billingContact":"grants@harvard.edu","lines":[{"service":"Consultation","rate":350,"planned":1},{"service":"Blood processing (PBMC)","rate":375,"planned":200},{"service":"CyTOF MDIPA","rate":350,"planned":200},{"service":"Tier 1 analysis","rate":60,"planned":200}]}',
  '{"redcap":"22-titan-hms","labvantage":"STU-2025-022","pennsieve":"N:dataset:0a83…cc11"}',
  'Nov 15, 2025', 'Department of Medicine, HMS',
  'All shipments go through the HMS core courier — do not use standard FedEx account.',
  '[{"name":"Sophie Lindqvist","role":"CRC","email":"lindqvist@hms.harvard.edu"}]'::jsonb,
  '{"collectionSites":["Remote / off-site"],"collectionSiteOther":"HMS-affiliated clinical sites, shipped overnight","irbStatus":"approved","bloodVolumePerVisit":"24 mL","bloodVolumeConfirmed":"yes","enrollmentPeriod":20,"firstSampleDate":"2025-11","sampleArrivalCadence":"estimated 6 subjects per week, overnight shipped in batches of 3 sites","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":2,"tubeCountEdta3ml":1}'::jsonb,
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
  '{"subjects":35,"totalSamples":105,"processedSamples":105,"groups":[{"name":"SLE longitudinal cohort","subjects":35,"samples":{"dx":1,"m6":1,"m12":1}}],"visits":[{"id":"dx","label":"Diagnosis","description":"At time of SLE diagnosis"},{"id":"m6","label":"6 Months","description":"6 months post-treatment"},{"id":"m12","label":"12 Months","description":"12 months post-treatment"}]}',
  '{"contractingContact":"sponsoredprojects@stanford.edu","billingContact":"grants@stanford.edu","lines":[{"service":"Consultation","rate":350,"planned":1},{"service":"Blood processing (PBMC)","rate":375,"planned":105},{"service":"CyTOF MDIPA","rate":350,"planned":105},{"service":"Tier 1 analysis","rate":60,"planned":105}]}',
  '{"redcap":"25-immune-su","labvantage":"STU-2025-011","pennsieve":"N:dataset:8c41…dd90"}',
  'Mar 20, 2025', 'Department of Medicine, Stanford',
  'Study complete — all samples processed and delivered on Pennsieve as of Jan 2026.',
  '[{"name":"Julia Marsh","role":"Study Coordinator","email":"jmarsh@stanford.edu"}]'::jsonb,
  '{"collectionSites":["Remote / off-site"],"collectionSiteOther":"Stanford collection sites","irbStatus":"approved","enrollmentPeriod":12,"firstSampleDate":"2025-03","sampleArrivalCadence":"paired serum + PBMC shipments at each of 3 visits per subject"}'::jsonb,
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
  '{"subjects":50,"totalSamples":150,"processedSamples":50,"groups":[{"name":"Treatment","subjects":25,"samples":{"base":1,"m3":1,"m6":1}},{"name":"Placebo","subjects":25,"samples":{"base":1,"m3":1,"m6":1}}],"visits":[{"id":"base","label":"Baseline","description":"Prior to first dose"},{"id":"m3","label":"Month 3","description":"3-month follow-up"},{"id":"m6","label":"Month 6","description":"6-month follow-up"}]}',
  '{"contractingContact":"contracts@biogen.com","billingContact":"researchops@biogen.com","lines":[{"service":"Consultation","rate":500,"planned":1},{"service":"Blood processing (PBMC)","rate":450,"planned":150},{"service":"CyTOF MDIPA","rate":425,"planned":150},{"service":"Tier 1 analysis","rate":60,"planned":150}]}',
  '{"redcap":"24-nova-bg","labvantage":"STU-2026-008","pennsieve":"N:dataset:1b72…ef33"}',
  'Jan 20, 2026', 'Biogen Research',
  'Biogen requires a signed CDA on file before any interim data summaries are shared externally.',
  '[{"name":"Marcus Chen","role":"Clinical Trial Manager","email":"mchen@biogen.com"}]'::jsonb,
  '{"collectionSites":["Remote / off-site"],"collectionSiteOther":"Biogen clinical trial sites, shipped overnight","irbStatus":"approved","bloodVolumePerVisit":"20 mL","bloodVolumeConfirmed":"yes","enrollmentPeriod":9,"firstSampleDate":"2026-01","sampleArrivalCadence":"estimated 8 subjects per week across all trial sites","tubeTypes":["Sodium heparin","EDTA"],"tubeCountHeparin10ml":2,"tubeCountEdta3ml":1}'::jsonb,
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
