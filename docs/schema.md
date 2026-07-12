# Schema

## master.csv

```csv
passport,destination,status,days,source_url,last_verified,confidence
KE,SG,vf,30,,,unverified
KE,US,vr,,https://travel.state.gov/,2026-07-12,verified
```

### Fields

| Field         | Type                             | Notes                                  |
| ------------- | -------------------------------- | --------------------------------------- |
| passport      | ISO 3166-1 alpha-2                |                                          |
| destination   | ISO 3166-1 alpha-2                |                                          |
| status        | Status code                       |                                          |
| days          | Integer                           | empty if not applicable                |
| source_url    | URL                                | empty if not yet sourced               |
| last_verified | Date (YYYY-MM-DD)                 | empty if never verified                |
| confidence    | `unverified` \| `verified` \| `disputed` | defaults to `unverified`         |

## passport_matrix.json

Unchanged — still `[status, days?]` per route, for backward compatibility with existing consumers.

```json
{
  "KE": {
    "SG": ["vf", 30],
    "US": ["vr"]
  }
}
```

## generated/route-metadata.json

New. Keyed by `PASSPORT:DESTINATION`, carries the provenance fields from master.csv.

```json
{
  "KE:SG": { "source_url": "", "last_verified": "", "confidence": "unverified" },
  "KE:US": { "source_url": "https://travel.state.gov/", "last_verified": "2026-07-12", "confidence": "verified" }
}
```

The `/lookup` API endpoint merges this into its response automatically.
