drop policy if exists "Tenant memberships visible inside tenant" on public.tenant_memberships;
create policy "Tenant memberships visible to owner and tenant staff"
on public.tenant_memberships for select
using (
  user_id = auth.uid()
  or tenant_id = public.current_tenant_id()
);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
on public.profiles for update
using (
  id = auth.uid()
  or (public.is_admin() and default_tenant_id = public.current_tenant_id())
)
with check (
  (
    id = auth.uid()
    and public.is_tenant_member(default_tenant_id)
  )
  or (
    public.is_admin()
    and default_tenant_id = public.current_tenant_id()
  )
);
