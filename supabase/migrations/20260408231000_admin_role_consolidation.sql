-- Keep the legacy enum value in place for safety, but migrate all real users to ADMIN.
update "User"
set
  "role" = 'ADMIN',
  "updatedAt" = now()
where "role" = 'SUPER_ADMIN';
