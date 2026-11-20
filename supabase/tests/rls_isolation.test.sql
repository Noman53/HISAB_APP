begin;
select plan(4);

insert into auth.users (id,aud,role,email,encrypted_password,email_confirmed_at,created_at,updated_at)
values
  ('10000000-0000-4000-8000-000000000001','authenticated','authenticated','hisab-rls-one@example.test','',now(),now(),now()),
  ('20000000-0000-4000-8000-000000000002','authenticated','authenticated','hisab-rls-two@example.test','',now(),now(),now());

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);

insert into public.wallets (user_id,id,name,currency,opening_balance_minor)
values ('10000000-0000-4000-8000-000000000001','cash-test','Test cash','BDT',0);
select is((select count(*)::integer from public.wallets),1,'a user can read their own wallet');
select throws_ok(
  $$insert into public.wallets (user_id,id,name,currency,opening_balance_minor) values ('20000000-0000-4000-8000-000000000002','forged','Forged wallet','BDT',0)$$,
  '42501', null, 'a user cannot insert another user’s wallet'
);

select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claims','{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.wallets),0,'a second user cannot read the first user’s wallet');
insert into public.wallets (user_id,id,name,currency,opening_balance_minor)
values ('20000000-0000-4000-8000-000000000002','cash-test','Test cash','BDT',0);
select is((select count(*)::integer from public.wallets),1,'the second user can read their own wallet');

select * from finish();
rollback;
