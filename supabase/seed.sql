-- ============================================================
-- Seed data — run after 001_create_schema.sql
-- Populates mock studies, agreements, and inquiries
-- ============================================================

-- INQUIRIES

insert into inquiries (id, study_name, abbreviation, status, submitted_date, submitted_relative, is_stale, objectives, pi, study_lead, affiliation, affiliation_org, irb, cohort_subjects, cohort_timepoints, services, services_detail, estimate, sample_type, phlebotomy, metadata, notes, feasibility) values
(
  'apex-merck', 'APEX-Merck', 'APEX', 'New', 'May 12, 2026', '4 hours ago', false,
  'Discovery of immune correlates of response to PD-1 checkpoint inhibitor therapy in NSCLC. Primary endpoint: CD8+ T-cell exhaustion markers at week 6 versus baseline.',
  '{"name":"Dr. James Wilson","email":"wilson@merck.com"}',
  '{"name":"Rachel Thompson","email":"rthompson@merck.com"}',
  'Industry', 'Merck Research Laboratories', 'Pending — Merck IRB',
  60, 2, 'CyTOF, Tier 1 analysis',
  '[{"name":"PBMC processing","qty":120,"rate":"$450"},{"name":"CyTOF MDIPA","qty":120,"rate":"no quote — contact"},{"name":"Tier 1 analysis","qty":120,"rate":"$50"}]',
  58250, 'Fresh whole blood', 'Remote — collected at Merck sites, shipped overnight', 'REDCap (Merck-hosted instance)',
  '[{"author":"Lori Guercio","date":"May 12 · 11:08 AM","text":"CyTOF capacity check w/ Hannah — can absorb in early Q3 batch. Need MSA before agreement package goes out. Routing to legal."}]',
  '[{"label":"Intake form received","checked":true},{"label":"IRB approval verified (if applicable)","checked":false},{"label":"Executed contract or active CAMS budget account confirmed","checked":false},{"label":"PI registered in iLab; service request created","checked":false},{"label":"CRC has LabVantage, PMACS & iLab accounts set up","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"Pennsieve access authorization form signed","checked":false},{"label":"User agreement signed","checked":false},{"label":"Sample drop-off SOP sent to CRC; added to crc-ihpu Slack; REDCap access confirmed","checked":false},{"label":"CyTOF and other reports delivered within prescribed timeframe","checked":false}]'
),
(
  'cardia-penn', 'CARDIA-Penn', 'CARDIA', 'New', 'May 11, 2026', '1 day ago', false,
  'Characterization of immune cell dynamics in cardiac immunometabolism. Primary endpoint: NK cell activation state and macrophage polarization at baseline vs. post-intervention.',
  '{"name":"Dr. Adamski","email":"adamski@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', '852041',
  24, 3, 'PBMC processing, CyTOF, banking',
  '[{"name":"PBMC processing","qty":72,"rate":"$300"},{"name":"CyTOF MDIPA","qty":72,"rate":"$325"},{"name":"Sample banking","qty":72,"rate":"$50"}]',
  47880, 'Fresh whole blood', 'IH phlebotomist on Penn campus', 'REDCap (Penn-hosted)',
  '[]',
  '[{"label":"Intake form received","checked":true},{"label":"IRB approval verified (if applicable)","checked":true},{"label":"Executed contract or active CAMS budget account confirmed","checked":false},{"label":"PI registered in iLab; service request created","checked":false},{"label":"CRC has LabVantage, PMACS & iLab accounts set up","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"Pennsieve access authorization form signed","checked":false},{"label":"User agreement signed","checked":false},{"label":"Sample drop-off SOP sent to CRC; added to crc-ihpu Slack; REDCap access confirmed","checked":false},{"label":"CyTOF and other reports delivered within prescribed timeframe","checked":false}]'
),
(
  'resolve-ibd', 'RESOLVE-IBD', 'RESOLVE', 'New', 'May 09, 2026', '3 days ago', false,
  'Mapping of immune signatures associated with remission in inflammatory bowel disease. Primary endpoint: Treg and Th17 balance across 4 longitudinal timepoints.',
  '{"name":"Dr. Lakshmi","email":"lakshmi@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Division of Gastroenterology', '849912',
  40, 4, 'PBMC, CyTOF, Tier 1 + Tier 2',
  '[{"name":"PBMC processing","qty":160,"rate":"$300"},{"name":"CyTOF MDIPA","qty":160,"rate":"$325"},{"name":"Tier 1 analysis","qty":160,"rate":"$50"},{"name":"Tier 2 analysis","qty":80,"rate":"$120"}]',
  117600, 'Fresh whole blood', 'IH phlebotomist on Penn campus', 'REDCap · Project ID 24-resolve-ibd',
  '[]',
  '[{"label":"Intake form received","checked":true},{"label":"IRB approval verified (if applicable)","checked":true},{"label":"Executed contract or active CAMS budget account confirmed","checked":false},{"label":"PI registered in iLab; service request created","checked":false},{"label":"CRC has LabVantage, PMACS & iLab accounts set up","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"Pennsieve access authorization form signed","checked":false},{"label":"User agreement signed","checked":false},{"label":"Sample drop-off SOP sent to CRC; added to crc-ihpu Slack; REDCap access confirmed","checked":false},{"label":"CyTOF and other reports delivered within prescribed timeframe","checked":false}]'
),
(
  'vector-chop', 'VECTOR-CHOP', 'VECTOR', 'Stale', 'May 06, 2026', '6 days ago', true,
  'Longitudinal characterization of B-cell and T-cell responses to pediatric vaccine series. Primary endpoint: germinal center B-cell expansion at days 7, 14, and 28.',
  '{"name":"Dr. Bhattacharya","email":"bhatt@email.chop.edu"}',
  null,
  'External', 'Children''s Hospital of Philadelphia', '21-018774',
  18, 5, 'PBMC, CyTOF',
  '[{"name":"PBMC processing","qty":90,"rate":"$375"},{"name":"CyTOF MDIPA","qty":90,"rate":"$350"}]',
  65250, 'Fresh whole blood', 'Remote — collected at CHOP, shipped overnight', 'REDCap (CHOP-hosted)',
  '[]',
  '[{"label":"Intake form received","checked":true},{"label":"IRB approval verified (if applicable)","checked":false},{"label":"Executed contract or active CAMS budget account confirmed","checked":false},{"label":"PI registered in iLab; service request created","checked":false},{"label":"CRC has LabVantage, PMACS & iLab accounts set up","checked":false},{"label":"Metadata collection plan obtained","checked":false},{"label":"Pennsieve access authorization form signed","checked":false},{"label":"User agreement signed","checked":false},{"label":"Sample drop-off SOP sent to CRC; added to crc-ihpu Slack; REDCap access confirmed","checked":false},{"label":"CyTOF and other reports delivered within prescribed timeframe","checked":false}]'
);


-- STUDIES

insert into studies (id, name, abbreviation, pi, study_lead, affiliation, affiliation_org, irb, stage, is_locked, cohort, budget, integrations, started_date, department, objectives, phlebotomy, metadata_desc, lifecycle, updated_relative, updated_at, quick_stats, activity) values
(
  'bhb-colcan', 'BHB ColCan', 'BHB',
  '{"name":"Dr. Katona","email":"katona@pennmedicine.upenn.edu"}',
  '{"name":"John Smith","email":"jsmith@pennmedicine.upenn.edu"}',
  'Internal', 'Gastroenterology, Perelman School of Medicine', '850567',
  'Awaiting Signature', true,
  '{"subjects":20,"timepoints":2,"totalSamples":40,"processedSamples":0,"sampleType":"Fresh whole blood"}',
  '{"committed":27250,"invoiced":16400,"remaining":10850,"pctInvoiced":60,"accountCode":"400-4661-1-605016-xxxx-2459-0000","billingContact":"khas@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1,"completed":1,"committed":250,"invoiced":250},{"service":"Blood processing (PBMC)","rate":300,"planned":40,"completed":32,"committed":12000,"invoiced":9600},{"service":"CyTOF MDIPA","rate":325,"planned":40,"completed":18,"committed":13000,"invoiced":5850},{"service":"Tier 1 analysis","rate":50,"planned":40,"completed":14,"committed":2000,"invoiced":700}]}',
  '{"redcap":"23-bhb-pcc","labvantage":"STU-2026-014","pennsieve":"N:dataset:7a44…0c18"}',
  'Jan 15, 2026', 'Division of Gastroenterology · Perelman School of Medicine',
  'Investigation of beta-hydroxybutyrate (BHB) supplementation as a chemopreventive intervention for colorectal cancer.',
  'IH phlebotomist on Penn campus', 'REDCap · Project ID 23-bhb-pcc · synced via export',
  '[{"label":"Inquiry","date":"Jan 15","status":"done"},{"label":"Review","date":"Jan 18","status":"done"},{"label":"Approved","date":"Jan 22","status":"done"},{"label":"Agreements","date":"in progress","status":"active"},{"label":"Activated","date":"—","status":"pending"},{"label":"Processing","date":"—","status":"pending"},{"label":"Complete","date":"—","status":"pending"}]',
  '2h ago', (now() - interval '2 hours'),
  '{"samplesReceived":32,"samplesTotal":40,"cytofAcquired":18,"cytofTotal":40,"qcPassed":14,"qcTotal":18,"invoicedYtd":16400}',
  '[{"dotClass":"w","title":"Reminder sent — Pennsieve Data Sharing Agreement","date":"May 08, 2026 · 9:00 AM · automated"},{"dotClass":"m","title":"Lori Guercio","date":"May 04, 2026 · 3:12 PM · internal note","note":"Spoke with John (study lead) — Dr. Katona is out of country until 5/13. Pennsieve agreement signature delayed but confirmed coming."},{"dotClass":"","title":"Pennsieve Data Sharing Agreement sent to PI","date":"May 01, 2026 · 4:32 PM"},{"dotClass":"g","title":"14 processing events logged · CyTOF batch B-2026-018","date":"Apr 28, 2026 · logged by Hannah Pham (lab ops)"},{"dotClass":"g","title":"12 samples received at drop-off","date":"Feb 17, 2026 · logged by Sara Coleman (lab ops)"},{"dotClass":"","title":"Study activated","date":"Jan 28, 2026 · LabVantage ID STU-2026-014"}]'
),
(
  'prince-val', 'PRINCE-Val Asthma', 'PRINCE',
  '{"name":"Dr. Vonderheide","email":"vonderheide@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Abramson Cancer Center', '842118',
  'Complete', false,
  '{"subjects":45,"timepoints":3,"totalSamples":135,"processedSamples":135,"sampleType":"Fresh whole blood"}',
  '{"committed":91800,"invoiced":91800,"remaining":0,"pctInvoiced":100,"billingContact":"billing@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1,"completed":1,"committed":250,"invoiced":250},{"service":"Blood processing (PBMC)","rate":300,"planned":135,"completed":135,"committed":40500,"invoiced":40500},{"service":"CyTOF MDIPA","rate":325,"planned":135,"completed":135,"committed":43875,"invoiced":43875},{"service":"Tier 1 analysis","rate":50,"planned":135,"completed":135,"committed":6750,"invoiced":6750}]}',
  '{"redcap":"22-prince-val","labvantage":"STU-2025-007","pennsieve":"N:dataset:3f12…aa42"}',
  'Feb 15, 2025', 'Abramson Cancer Center',
  'Longitudinal profiling of asthma-related immune phenotypes following PRINCE checkpoint inhibitor protocol.',
  'IH phlebotomist on Penn campus', 'REDCap · Project ID 22-prince-val',
  '[{"label":"Inquiry","date":"Feb 01","status":"done"},{"label":"Review","date":"Feb 05","status":"done"},{"label":"Approved","date":"Feb 10","status":"done"},{"label":"Agreements","date":"Feb 12","status":"done"},{"label":"Activated","date":"Feb 15","status":"done"},{"label":"Processing","date":"Dec 18","status":"done"},{"label":"Complete","date":"Jan 15","status":"done"}]',
  '3d ago', (now() - interval '3 days'), null,
  '[{"dotClass":"g","title":"All samples delivered on Pennsieve","date":"Jan 15, 2026 · N:dataset:3f12…aa42"},{"dotClass":"g","title":"135 CyTOF acquisitions complete","date":"Dec 18, 2025 · batch B-2025-041"}]'
),
(
  'surge-christie', 'SURGE-Christie', 'SURGE',
  '{"name":"Dr. Christie","email":"christie@pennmedicine.upenn.edu"}',
  null,
  'Internal', 'Perelman School of Medicine', '850991',
  'Agreement', true,
  '{"subjects":30,"timepoints":2,"totalSamples":60,"processedSamples":0,"sampleType":"Fresh whole blood"}',
  '{"committed":41000,"invoiced":0,"remaining":41000,"pctInvoiced":0,"billingContact":"billing@pennmedicine.upenn.edu","lines":[{"service":"Consultation","rate":250,"planned":1,"completed":0,"committed":250,"invoiced":0},{"service":"Blood processing (PBMC)","rate":300,"planned":60,"completed":0,"committed":18000,"invoiced":0},{"service":"CyTOF MDIPA","rate":325,"planned":60,"completed":0,"committed":19500,"invoiced":0},{"service":"Tier 1 analysis","rate":50,"planned":60,"completed":0,"committed":3000,"invoiced":0}]}',
  '{"redcap":"26-surge"}',
  'Mar 28, 2026', 'Division of Oncology',
  'Investigation of immune correlates of surgical response in solid tumor patients.',
  'IH phlebotomist on Penn campus', 'REDCap · Project ID 26-surge',
  '[{"label":"Inquiry","date":"Mar 22","status":"done"},{"label":"Review","date":"Mar 25","status":"done"},{"label":"Approved","date":"Mar 28","status":"done"},{"label":"Agreements","date":"in progress","status":"active"},{"label":"Activated","date":"—","status":"pending"},{"label":"Processing","date":"—","status":"pending"},{"label":"Complete","date":"—","status":"pending"}]',
  'today', (now() - interval '30 minutes'), null,
  '[{"dotClass":"g","title":"User Agreement countersigned — Dr. Christie","date":"Apr 02, 2026 · 2:15 PM"},{"dotClass":"","title":"Agreement package sent to PI","date":"Apr 01, 2026 · 10:00 AM · MailerSend"},{"dotClass":"","title":"Intake approved","date":"Mar 28, 2026"},{"dotClass":"","title":"Intake submitted","date":"Mar 22, 2026 · via public intake form"}]'
),
(
  'titan-harvard', 'TITAN-Harvard', 'TITAN',
  '{"name":"Dr. Chen","email":"chen@harvard.edu"}',
  null,
  'External', 'Harvard Medical School', '22-100482',
  'Processing', false,
  '{"subjects":50,"timepoints":4,"totalSamples":200,"processedSamples":124,"sampleType":"Fresh whole blood"}',
  '{"committed":124000,"invoiced":78000,"remaining":46000,"pctInvoiced":63,"billingContact":"grants@harvard.edu","lines":[{"service":"Consultation","rate":350,"planned":1,"completed":1,"committed":350,"invoiced":350},{"service":"Blood processing (PBMC)","rate":375,"planned":200,"completed":124,"committed":75000,"invoiced":46500},{"service":"CyTOF MDIPA","rate":350,"planned":200,"completed":124,"committed":70000,"invoiced":43400},{"service":"Tier 1 analysis","rate":60,"planned":200,"completed":80,"committed":12000,"invoiced":4800}]}',
  '{"redcap":"22-titan-hms","labvantage":"STU-2025-022","pennsieve":"N:dataset:0a83…cc11"}',
  'Nov 15, 2025', 'Department of Medicine, HMS',
  'Longitudinal characterization of T-cell diversity and exhaustion markers in autoimmune disease cohort.',
  'Remote — collected at HMS sites, shipped overnight', 'REDCap (HMS-hosted) · Project ID 22-titan-hms',
  '[{"label":"Inquiry","date":"Oct 28","status":"done"},{"label":"Review","date":"Oct 31","status":"done"},{"label":"Approved","date":"Nov 02","status":"done"},{"label":"Agreements","date":"Nov 06","status":"done"},{"label":"Activated","date":"Nov 15","status":"done"},{"label":"Processing","date":"in progress","status":"active"},{"label":"Complete","date":"—","status":"pending"}]',
  '5h ago', (now() - interval '5 hours'),
  '{"samplesReceived":124,"samplesTotal":200,"cytofAcquired":80,"cytofTotal":200,"qcPassed":74,"qcTotal":80,"invoicedYtd":78000}',
  '[{"dotClass":"g","title":"14 processing events logged · CyTOF batch B-2026-018","date":"May 11, 2026 · logged by Hannah Pham"},{"dotClass":"g","title":"Pennsieve dataset linked","date":"May 08, 2026 · N:dataset:0a83…cc11"},{"dotClass":"","title":"18 samples received at drop-off","date":"May 01, 2026 · logged by Sara Coleman"}]'
),
(
  'immune-stanford', 'IMMUNE-Stanford', 'IMST',
  '{"name":"Dr. Patel","email":"patel@stanford.edu"}',
  null,
  'External', 'Stanford University School of Medicine', '53294',
  'Complete', false,
  '{"subjects":35,"timepoints":3,"totalSamples":105,"processedSamples":105,"sampleType":"Fresh whole blood"}',
  '{"committed":68400,"invoiced":68400,"remaining":0,"pctInvoiced":100,"billingContact":"grants@stanford.edu","lines":[{"service":"Consultation","rate":350,"planned":1,"completed":1,"committed":350,"invoiced":350},{"service":"Blood processing (PBMC)","rate":375,"planned":105,"completed":105,"committed":39375,"invoiced":39375},{"service":"CyTOF MDIPA","rate":350,"planned":105,"completed":105,"committed":36750,"invoiced":36750},{"service":"Tier 1 analysis","rate":60,"planned":105,"completed":105,"committed":6300,"invoiced":6300}]}',
  '{"redcap":"25-immune-su","labvantage":"STU-2025-011","pennsieve":"N:dataset:8c41…dd90"}',
  'Mar 20, 2025', 'Department of Medicine, Stanford',
  'Comprehensive immune profiling of SLE patients at diagnosis, 6 months, and 12 months post-treatment.',
  'Remote — Stanford collection sites', 'REDCap (Stanford-hosted)',
  '[{"label":"Inquiry","date":"Mar 10","status":"done"},{"label":"Review","date":"Mar 13","status":"done"},{"label":"Approved","date":"Mar 15","status":"done"},{"label":"Agreements","date":"Mar 15","status":"done"},{"label":"Activated","date":"Mar 20","status":"done"},{"label":"Processing","date":"Jan 10","status":"done"},{"label":"Complete","date":"Jan 28","status":"done"}]',
  '8d ago', (now() - interval '8 days'), null,
  '[{"dotClass":"g","title":"All data delivered on Pennsieve","date":"Jan 28, 2026"},{"dotClass":"g","title":"105 CyTOF acquisitions complete","date":"Jan 10, 2026"}]'
),
(
  'nova-biogen', 'NOVA-BioGen', 'NOVA',
  '{"name":"Dr. Martinez","email":"martinez@biogen.com"}',
  null,
  'Industry', 'Biogen', '24-CT-008',
  'Processing', false,
  '{"subjects":50,"timepoints":3,"totalSamples":150,"processedSamples":50,"sampleType":"Fresh whole blood"}',
  '{"committed":135000,"invoiced":42500,"remaining":92500,"pctInvoiced":31,"billingContact":"researchops@biogen.com","lines":[{"service":"Consultation","rate":500,"planned":1,"completed":1,"committed":500,"invoiced":500},{"service":"Blood processing (PBMC)","rate":450,"planned":150,"completed":50,"committed":67500,"invoiced":22500},{"service":"CyTOF MDIPA","rate":425,"planned":150,"completed":50,"committed":63750,"invoiced":21250},{"service":"Tier 1 analysis","rate":60,"planned":150,"completed":50,"committed":9000,"invoiced":3000}]}',
  '{"redcap":"24-nova-bg","labvantage":"STU-2026-008","pennsieve":"N:dataset:1b72…ef33"}',
  'Jan 20, 2026', 'Biogen Research',
  'Phase II biomarker study for novel MS therapeutic. Immune profiling at baseline, 3 months, and 6 months.',
  'Remote — Biogen clinical sites, shipped overnight', 'REDCap (Biogen-hosted)',
  '[{"label":"Inquiry","date":"Dec 12","status":"done"},{"label":"Review","date":"Dec 18","status":"done"},{"label":"Approved","date":"Jan 02","status":"done"},{"label":"Agreements","date":"Jan 07","status":"done"},{"label":"Activated","date":"Jan 20","status":"done"},{"label":"Processing","date":"in progress","status":"active"},{"label":"Complete","date":"—","status":"pending"}]',
  'yesterday', (now() - interval '1 day'),
  '{"samplesReceived":50,"samplesTotal":150,"cytofAcquired":50,"cytofTotal":150,"qcPassed":47,"qcTotal":50,"invoicedYtd":42500}',
  '[{"dotClass":"g","title":"50 samples processed — first batch complete","date":"Apr 28, 2026 · CyTOF batch B-2026-016"},{"dotClass":"","title":"50 samples received at drop-off","date":"Apr 14, 2026"}]'
);


-- AGREEMENTS (one row per agreement per study)

insert into agreements (study_id, id, name, description, status, signed_by, signed_date, signed_email, sent_date, reminder_date) values
-- BHB ColCan (2 signed, 1 pending)
('bhb-colcan','ua','User Agreement','Master scope of work between PI and I3H','Signed','Robert Katona','Jan 24, 2026 at 2:48 PM','katona@pennmedicine.upenn.edu',null,null),
('bhb-colcan','lv','LabVantage Sample Intake Form','Sample ID assignment authorization','Signed','Robert Katona','Jan 28, 2026 at 11:14 AM','katona@pennmedicine.upenn.edu',null,null),
('bhb-colcan','psa','Pennsieve Data Sharing Agreement','Data hosting + access controls on Pennsieve workspace','Pending',null,null,null,'May 01','May 08'),
-- PRINCE-Val (all signed)
('prince-val','ua','User Agreement','Master scope of work','Signed','Robert Vonderheide','Feb 10, 2025 at 9:12 AM','vonderheide@pennmedicine.upenn.edu',null,null),
('prince-val','lv','LabVantage Sample Intake Form','Sample ID assignment','Signed','Robert Vonderheide','Feb 12, 2025','vonderheide@pennmedicine.upenn.edu',null,null),
('prince-val','psa','Pennsieve Data Sharing Agreement','Data hosting + access controls','Signed','Robert Vonderheide','Feb 12, 2025','vonderheide@pennmedicine.upenn.edu',null,null),
-- SURGE-Christie (1 signed, 2 pending)
('surge-christie','ua','User Agreement','Master scope of work','Signed','Michael Christie','Apr 02, 2026 at 10:32 AM','christie@pennmedicine.upenn.edu',null,null),
('surge-christie','lv','LabVantage Sample Intake Form','Sample ID assignment','Pending',null,null,null,'Apr 10','Apr 17'),
('surge-christie','psa','Pennsieve Data Sharing Agreement','Data hosting + access controls','Pending',null,null,null,'Apr 10',null),
-- TITAN-Harvard (all signed)
('titan-harvard','ua','User Agreement','Master scope of work','Signed','Wei Chen','Nov 04, 2025','chen@harvard.edu',null,null),
('titan-harvard','lv','LabVantage Sample Intake Form','Sample ID assignment','Signed','Wei Chen','Nov 06, 2025','chen@harvard.edu',null,null),
('titan-harvard','psa','Pennsieve Data Sharing Agreement','Data hosting + access controls','Signed','Wei Chen','Nov 06, 2025','chen@harvard.edu',null,null),
-- IMMUNE-Stanford (all signed)
('immune-stanford','ua','User Agreement','Master scope of work','Signed','Anjali Patel','Mar 14, 2025','patel@stanford.edu',null,null),
('immune-stanford','lv','LabVantage Sample Intake Form','Sample ID assignment','Signed','Anjali Patel','Mar 15, 2025','patel@stanford.edu',null,null),
('immune-stanford','psa','Pennsieve Data Sharing Agreement','Data hosting + access controls','Signed','Anjali Patel','Mar 15, 2025','patel@stanford.edu',null,null),
-- NOVA-BioGen (all signed)
('nova-biogen','ua','User Agreement','Master scope of work','Signed','Elena Martinez','Jan 05, 2026','martinez@biogen.com',null,null),
('nova-biogen','lv','LabVantage Sample Intake Form','Sample ID assignment','Signed','Elena Martinez','Jan 07, 2026','martinez@biogen.com',null,null),
('nova-biogen','psa','Pennsieve Data Sharing Agreement','Data hosting + access controls','Signed','Elena Martinez','Jan 07, 2026','martinez@biogen.com',null,null);
