# Database settings

Environment variables that control MongoDB connection behavior.

- MONGO_URI: MongoDB connection string (e.g. mongodb://localhost:27017/nextransfer)
- DB_REQUIRED: true|false — when true, the process exits on DB failure. Default: false
- DB_MAX_RETRIES: number of retry attempts when connecting. Default: 5
- DB_RETRY_DELAY_MS: initial delay between retries in ms. Exponential backoff applied. Default: 1000
- DB_SELECTION_TIMEOUT_MS: server selection timeout per attempt (ms). Default: 5000

## Index management (email and phone)

We enforce unique indexes on `User.email` and `User.phone` (sparse) to guarantee uniqueness at the database level.

- email: unique
- phone: unique + sparse (allows multiple docs without a phone field)

On startup, the server calls `User.syncIndexes()` to ensure indexes exist and match the schema. If you changed indexes or had duplicates from earlier development, follow these steps.

### Verify current indexes

In MongoDB shell (mongosh):

```
use nextransfer
db.users.getIndexes()
```

You should see entries like:

```
{ key: { email: 1 }, name: 'email_1', unique: true }
{ key: { phone: 1 }, name: 'phone_1', unique: true, sparse: true }
```

### Fix duplicates before creating unique indexes

If index creation fails due to duplicates, deduplicate first. Example: find duplicate emails

```
db.users.aggregate([
	{ $match: { email: { $ne: null } } },
	{ $group: { _id: "$email", ids: { $push: "$_id" }, count: { $sum: 1 } } },
	{ $match: { count: { $gt: 1 } } }
])
```

Resolve duplicates manually (delete/merge/update). Repeat similarly for `phone`.

### Drop and recreate indexes

If you need to drop stale/broken indexes:

```
db.users.dropIndex('email_1')
db.users.dropIndex('phone_1')
```

Then restart the server to let `syncIndexes()` recreate them, or run:

```
// in application code or a one-off script
await User.syncIndexes()
```

Notes:
- `sparse: true` means documents without `phone` won’t be included in the uniqueness check.
- Changing unique constraints on large collections can be slow; plan accordingly in production.
