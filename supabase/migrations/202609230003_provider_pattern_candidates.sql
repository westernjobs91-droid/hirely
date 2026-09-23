begin;

alter table public.company_pattern_evidence
  drop constraint if exists company_pattern_evidence_source_type_check;

alter table public.company_pattern_evidence
  add constraint company_pattern_evidence_source_type_check
  check(source_type in ('official_website','licensed_data','provider_candidate'));

commit;
