// Reports ONLY the hash-format classification of the credential column so the
// login code knows which verifier to use. No credential values are printed.
import pg from 'pg'

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

const { rows } = await client.query(`
  select case
           when pwd like '$2%'            then 'bcrypt'
           when pwd ~ '^[a-f0-9]{32}$'    then 'md5-hex'
           when pwd ~ '^[a-f0-9]{64}$'    then 'sha256-hex'
           when pwd like 'pbkdf2%'        then 'pbkdf2'
           when pwd like 'scrypt%'        then 'scrypt'
           else 'unrecognised (likely plaintext)'
         end as format,
         length(pwd) as len,
         count(*)    as employees
    from (select password as pwd from public.odg_employee where password is not null) s
   group by 1, 2
   order by 3 desc`)

console.log('Credential format in public.odg_employee:')
for (const r of rows) {
  console.log(`  ${r.format.padEnd(32)} length=${r.len}  employees=${r.employees}`)
}

// Algorithm parameters only (the segment before the salt) — no salt, no digest.
const params = await client.query(`
  select split_part(password, '$', 1) as algo_params, count(*) as employees
    from public.odg_employee
   where password like 'scrypt%'
   group by 1 order by 2 desc`)
console.log('\nscrypt parameters in use:')
for (const r of params.rows) console.log(`  ${r.algo_params}  employees=${r.employees}`)

// Which format do the 5 IT staff have?
const it = await client.query(`
  select e.employee_code, e.nickname,
         case when e.password like 'scrypt%' then 'scrypt'
              when e.password is null then 'no credential'
              else 'plaintext' end as format
    from public.odg_employee e
   where e.department_code = '801' and e.employment_status = 'ACTIVE'
   order by e.employee_code`)
console.log('\nIT department (801) staff:')
for (const r of it.rows) {
  console.log(`  ${r.employee_code}  ${(r.nickname ?? '').padEnd(6)} ${r.format}`)
}

await client.end()
