-- Seed 25 Canadian university investment funds (data-driven multi-tenant).
-- Colors are best-known approximations from public brand guides / the unicol
-- project (https://hneth.github.io/unicol/) — VERIFY each against the school's
-- official brand guide before launch. VERIFY each email domain against the
-- school's actual STUDENT email format before launch — subdomains vary.
-- Idempotent: ON CONFLICT (slug) DO UPDATE. email_domain (legacy single) is set
-- to the first domain for backward compatibility.

INSERT INTO public.organizations
  (id, slug, name, university_name, fund_display_name, email_domain, email_domains, primary_color, secondary_color, accent_color, province, is_active)
VALUES
  ('7e510000-0000-4000-8000-000000000001','sfu','Simon Fraser University','Simon Fraser University','BEAM Fund','sfu.ca','{sfu.ca}','#CC0633','#A6192E','#A6192E','BC',true),
  ('7e510000-0000-4000-8000-000000000002','waterloo','University of Waterloo','University of Waterloo','Student Investment Fund','uwaterloo.ca','{uwaterloo.ca,edu.uwaterloo.ca}','#FDD54F','#000000','#000000','ON',true),
  ('7e510000-0000-4000-8000-000000000003','utoronto','University of Toronto','University of Toronto','Toronto Student Investment Counsel','utoronto.ca','{utoronto.ca,mail.utoronto.ca}','#002A5C','#FFFFFF','#002A5C','ON',true),
  ('7e510000-0000-4000-8000-000000000004','memorial','Memorial University','Memorial University','Student Investment Team','mun.ca','{mun.ca,mymun.ca}','#9D1535','#00558C','#00558C','NL',true),
  ('7e510000-0000-4000-8000-000000000005','carleton','Carleton University','Carleton University','Sprott Student Investment Fund','carleton.ca','{carleton.ca,cmail.carleton.ca}','#C8102E','#000000','#000000','ON',true),
  ('7e510000-0000-4000-8000-000000000006','windsor','University of Windsor','University of Windsor','John Simpson Odette Student Investment Fund','uwindsor.ca','{uwindsor.ca}','#005596','#FFC72C','#FFC72C','ON',true),
  ('7e510000-0000-4000-8000-000000000007','unb','University of New Brunswick','University of New Brunswick','Student Investment Fund','unb.ca','{unb.ca}','#E31837','#4F2D00','#4F2D00','NB',true),
  ('7e510000-0000-4000-8000-000000000008','mtroyal','Mount Royal University','Mount Royal University','Student Investment Fund','mtroyal.ca','{mtroyal.ca,mymru.ca}','#0067B1','#003C71','#003C71','AB',true),
  ('7e510000-0000-4000-8000-000000000009','uregina','University of Regina','University of Regina','UR Investing','uregina.ca','{uregina.ca}','#006A4D','#FFB81C','#FFB81C','SK',true),
  ('7e510000-0000-4000-8000-000000000010','smu','Saint Mary''s University','Saint Mary''s University','IMPACT Investment Fund','smu.ca','{smu.ca}','#8A2432','#A89968','#A89968','NS',true),
  ('7e510000-0000-4000-8000-000000000011','guelph','University of Guelph','University of Guelph','Student Investment Council','uoguelph.ca','{uoguelph.ca,mail.uoguelph.ca}','#C20430','#FFC72C','#FFC72C','ON',true),
  ('7e510000-0000-4000-8000-000000000012','queens','Queen''s University','Queen''s University','Queen''s University Investment Counsel','queensu.ca','{queensu.ca}','#11335D','#B90E31','#FFC72C','ON',true),
  ('7e510000-0000-4000-8000-000000000013','mcgill','McGill University','McGill University','McGill SMIF','mcgill.ca','{mcgill.ca,mail.mcgill.ca}','#ED1B2F','#000000','#000000','QC',true),
  ('7e510000-0000-4000-8000-000000000014','western','Western University','Western University','Western SMIF','uwo.ca','{uwo.ca}','#4F2683','#807F83','#807F83','ON',true),
  ('7e510000-0000-4000-8000-000000000015','dalhousie','Dalhousie University','Dalhousie University','Dalhousie SMIF','dal.ca','{dal.ca}','#000000','#FFB511','#FFB511','NS',true),
  ('7e510000-0000-4000-8000-000000000016','ucalgary','University of Calgary','University of Calgary','Calgary SMIF','ucalgary.ca','{ucalgary.ca}','#D6001C','#FFB81C','#FFB81C','AB',true),
  ('7e510000-0000-4000-8000-000000000017','uottawa','University of Ottawa','University of Ottawa','Ottawa SMIF','uottawa.ca','{uottawa.ca}','#8A1538','#757575','#757575','ON',true),
  ('7e510000-0000-4000-8000-000000000018','mcmaster','McMaster University','McMaster University','McMaster SMIF','mcmaster.ca','{mcmaster.ca}','#7A003C','#FDBF57','#FDBF57','ON',true),
  ('7e510000-0000-4000-8000-000000000019','ubc','University of British Columbia','University of British Columbia','UBC SMIF','ubc.ca','{ubc.ca,student.ubc.ca}','#002145','#0055B7','#0055B7','BC',true),
  ('7e510000-0000-4000-8000-000000000020','york','York University','York University','York SMIF','yorku.ca','{yorku.ca,my.yorku.ca}','#E31837','#2D2A26','#2D2A26','ON',true),
  ('7e510000-0000-4000-8000-000000000021','tmu','Toronto Metropolitan University','Toronto Metropolitan University','TMU SMIF','torontomu.ca','{torontomu.ca,ryerson.ca}','#004C9D','#FFC72C','#FFC72C','ON',true),
  ('7e510000-0000-4000-8000-000000000022','usask','University of Saskatchewan','University of Saskatchewan','Saskatchewan SMIF','usask.ca','{usask.ca,mail.usask.ca}','#00843D','#ABCAE9','#ABCAE9','SK',true),
  ('7e510000-0000-4000-8000-000000000023','concordia','Concordia University','Concordia University','Concordia SMIF','concordia.ca','{concordia.ca,mail.concordia.ca}','#912338','#FFB81C','#FFB81C','QC',true),
  ('7e510000-0000-4000-8000-000000000024','uvic','University of Victoria','University of Victoria','Victoria SMIF','uvic.ca','{uvic.ca,uvcs.uvic.ca}','#005493','#F5AA00','#F5AA00','BC',true),
  ('7e510000-0000-4000-8000-000000000025','umanitoba','University of Manitoba','University of Manitoba','Manitoba SMIF','myumanitoba.ca','{myumanitoba.ca,umanitoba.ca}','#654321','#FFD400','#FFD400','MB',true)
ON CONFLICT (slug) DO UPDATE SET
  university_name = EXCLUDED.university_name,
  fund_display_name = EXCLUDED.fund_display_name,
  email_domain = EXCLUDED.email_domain,
  email_domains = EXCLUDED.email_domains,
  primary_color = EXCLUDED.primary_color,
  secondary_color = EXCLUDED.secondary_color,
  accent_color = EXCLUDED.accent_color,
  province = EXCLUDED.province,
  is_active = true;

NOTIFY pgrst, 'reload schema';
