-- Backfill house_disclosure_filings.is_electronic to the corrected DocID rule.
--
-- The ingest's isElectronicDocId() looked for a 9-digit DocID beginning 100 or
-- 300. No such id exists anywhere in the Clerk's data — every DocID across
-- 2008-2026 is 4, 7 or 8 digits — so the rule matched nothing and every row it
-- wrote was flagged non-electronic. parse-house-ptrs selects
--   is_ptr AND is_electronic AND NOT trades_parsed AND NOT needs_ocr
-- so it found no work and reported filings_parsed: 0 with no errors.
--
-- The corrected rule, verified against all 48,895 indexed filings:
--
--   8 digits, leading 2   electronic PTR             5,651   2015-2026
--   7 digits, leading 2   electronic PTR (legacy)    3,131   2012-2013
--   8 digits, leading 1   electronic annual report  14,680   2015-2026
--   7 digits, leading 8/9 scanned paper            19,592   2008-2026
--   8 digits leading 3/4/5, and 4-digit ids        other scanned/older forms
--
-- The legacy 7-digit case is why this is not just '^[12][0-9]{7}$'. Every PTR
-- in 2012 and 2013 is a 7-digit id beginning 2, with no 8- or 9-prefixed id in
-- either year: the same counter as the later 8-digit series, one digit shorter,
-- not a different kind of document.
--
-- Erring towards electronic is the cheap direction — the PTR parser's own
-- text-length check marks anything unreadable as needs_ocr, so a wrong guess
-- costs one fetch and never yields bad trades.

update public.house_disclosure_filings
   set is_electronic = (doc_id ~ '^(2[0-9]{6}|[12][0-9]{7})$')
 where is_electronic is distinct from (doc_id ~ '^(2[0-9]{6}|[12][0-9]{7})$');

-- Expected: ~4,322 rows change — the 3,131 legacy 2012-2013 PTRs, plus the
-- 1,191 rows written by the ingest after the earlier partial backfill. No row
-- currently flagged electronic loses the flag.
