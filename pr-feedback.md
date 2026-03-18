## PR Review — `feat: add bulk invoice export to CSV`
Nice work - the code is clear and straightforward. 
Before merge, inspite the implementation direction is correct I saw a few critical issues we should fix.
In the future you can take this as an example for any new API you will develop.

### ✅ Blocking issues (must fix before merge)
1. **Missing auth middleware**
    - Current api is opened for anyone that calls it. This allows anyone to get data, which is a security issue. Even if not encrypted, this data is still **sensitive business data** and must be access-controlled and minimally exposed.
    - **Requested change:** Add auth middleware (see examplkes in other APIs we implemented previously).

2. **Missing user scoping in query (data leak risk)**
    - Current query exports all invoices (`SELECT * FROM invoices`) with no filter by authenticated user/client. 
    This allows one user to download other users’ invoice data, which is a privacy issue.
    - **Requested change:** Scope query by the caller’s identity (for example `WHERE client_id = ?`).

3. **CSV output is not safely escaped/encoded**
   - Fields like `description` can include commas, quotes, or line breaks, which can corrupt CSV format.
   - Values starting with `=`, `+`, `-`, `@` can trigger spreadsheet formula injection when opened in Excel/Sheets.
   - **Why blocking:** malformed output + potential security risk to users opening exported files.
   - **Requested fix:** Use a proper CSV serializer (library preferred) or implement strict escaping/quoting for all fields; add protection against formula injection.

4. **Building the full CSV in memory does not scale**
   - Concatenating all rows into one string can cause high memory usage for large datasets.
   - **Why blocking:** can degrade performance or crash the process under larger accounts.
   - **Requested fix:** stream rows/chunks to the response (or paginate internally while writing output).

5. **Implement filtering (smaller payload)**
   - Export currently selects every column; this is brittle if new columns are added later.
   - **Why blocking:** future schema changes can accidentally expose internal or sensitive columns.
   - **Requested fix:** Consider selecting only needed columns instead of `SELECT *` - implement filtering, e.g. `id, client_id, amount, description, created_at`.

### 💡 Non-blocking suggestions

1. **Set download headers for better UX**
   - Add `Content-Disposition: attachment; filename="invoices.csv"`.
   - Improves consistent browser download behavior.

2. **Add focused tests for export behavior**
   - Suggested cases:
     - user can only export their own invoices,
     - CSV escaping for commas/quotes/newlines,
     - formula-injection-safe output,
     - large dataset behavior (basic regression).

3. **Prefer deterministic ordering**
   - Add explicit `ORDER BY created_at DESC`.
   - Makes exports predictable and easier to debug.

Please don't hasitate to ask me for help in implementing these changes.
