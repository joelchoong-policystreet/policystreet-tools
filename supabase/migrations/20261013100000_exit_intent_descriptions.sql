-- Plain-English descriptions for the dashboard's info icons, and the reworked
-- "Incorrect data on quote" (D) sub-clusters agreed on 2026-10-13.
-- Already applied to the remote project; existing rows were re-tagged there directly.

alter table public.exit_intent_clusters add column if not exists description text;
alter table public.exit_intent_subclusters add column if not exists description text;

update public.exit_intent_subclusters as s
set name = v.new_name, sort_order = v.ord, description = v.descr, tagging_rule = v.rule
from (values
  ('Insurance type wanted, e.g. Third Party', 'Switching to TPFT is hard to find', 1,
   'Customers who want Third Party, Fire & Theft (TPFT) cover can''t easily see how to change the cover type on the quote.',
   'Wants Third Party / TPFT, or to compare comprehensive vs third party, but can''t find how to switch.'),
  ('Vehicle type wrong', 'Motorcycle quotes', 2,
   'Customers are trying to insure a motorcycle (or other non-car vehicle), but the journey only quotes cars.',
   'Motorcycle, motorbike or lorry insurance; "not a car".'),
  ('Postcode wrong', 'Postcode can''t be changed', 3,
   'Customers want to update their postcode or region, for example after moving to East Malaysia, and there''s no clear way to do it.',
   'Postcode, region or state wrong or needs changing (e.g. Labuan, Sabah/Sarawak).'),
  ('Effective date wrong', 'Effective date wrong or error', 4,
   'The policy start date doesn''t match the customer''s expiry date, keeps changing, or shows an invalid date.',
   'Effective / start date wrong, backdated, changing or invalid (e.g. 01 Jan 0001).'),
  ('NRIC / IC issue', 'IC wrong or name not in full', 5,
   'The owner''s IC isn''t recognised, or the name on the quote isn''t the full name on their ID.',
   'IC not detected or wrong; owner name doesn''t match ID or isn''t the full name.'),
  ('Marital status won’t update', 'Marital status can''t be updated', 6,
   'Customers can''t change their marital status, usually from single to married.',
   'Any marital status change request or complaint.'),
  ('NCD not applied / missing', 'NCD missing despite correct details', 7,
   'The quote shows 0% or no NCD, while the customer says they''re entitled to a discount (often 55%).',
   'NCD/NCB is 0%, empty, not applied or not shown.'),
  ('Car model / type / spec wrong', 'Car model or variant wrong, change option hard to find', 8,
   'The quote picks the wrong car model or variant, and customers can''t easily see where to correct it or find their model in the list.',
   'Wrong model, brand or variant (e.g. Alza H vs AV, EZ vs Advance), or can''t find/choose/search their model.'),
  ('Ownership transfer not reflected', 'Ownership change or new car not reflected', 10,
   'A recent JPJ name transfer, a newly bought used car, or a new car on an old number plate isn''t picked up, so the quote shows outdated details.',
   'Recent ownership transfer, second-hand purchase, new car on a carried-over plate, or a new number plate.'),
  ('Vehicle info wrong, unspecified', 'Other / vague vehicle details', 11,
   'Customers say the vehicle details are wrong but don''t say which, or raise a one-off issue such as a lapsed policy.',
   'Vehicle info wrong with no specifics, or a one-off case that fits nothing else.')
) as v(old_name, new_name, ord, descr, rule)
where s.cluster_code = 'D' and s.name = v.old_name;

insert into public.exit_intent_subclusters (cluster_code, name, sort_order, description, tagging_rule) values
  ('D', 'Transmission, year or engine size wrong', 9,
   'The quote shows the wrong transmission (e.g. manual instead of auto), manufacturing year or engine size, and customers have no way to edit it.',
   'Transmission (auto/manual/CVT), year of manufacture, engine cc, engine change/number, or "spec" mismatch.')
on conflict (cluster_code, name) do nothing;

update public.exit_intent_clusters c set description = v.d from (values
  ('I', 'The customer wants a specific insurer (or a takaful / Islamic product) that we didn''t quote, often the one they already renew with.'),
  ('A', 'The customer wants Agreed Value cover instead of Market Value, or says the agreed value offered is too low.'),
  ('P', 'The price is higher than expected: general sticker shock, a budget, a cheaper competitor, a disputed sum insured, or a price that changed between visits.'),
  ('B', 'The comparison never finishes: no quote at all, very slow, only some insurers return, or edits don''t go through.'),
  ('D', 'Something on the quote is wrong or can''t be changed by the customer: vehicle details, NCD, dates, personal details, or a cover type / vehicle type we don''t make easy to pick.'),
  ('Y', 'Checkout fails: payment not going through, vouchers or promo codes not working, or a payment method rejected.'),
  ('O', 'The customer wants a rider or coverage they can''t see or select, such as windscreen, towing, flood, e-hailing or road tax.'),
  ('G', 'The customer isn''t sure what to pick: what a plan includes, which rider they need, or how to pay by instalment.'),
  ('C', 'The customer is still shopping around, with no specific problem.'),
  ('S', 'A complaint about customer service or a request for a support contact.'),
  ('L', 'A question about how claims work.'),
  ('U', 'Nothing a team can act on: bare numbers, single words, garbled text or pure frustration.')
) as v(code, d)
where c.code = v.code;
