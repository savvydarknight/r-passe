# Schema

## master.csv

```csv
passport,destination,status,days
KE,SG,vf,30
KE,US,vr,
```

### Fields

| Field       | Type               |
| ----------- | ------------------ |
| passport    | ISO 3166-1 alpha-2 |
| destination | ISO 3166-1 alpha-2 |
| status      | Status code        |
| days        | Integer            |

## passport_matrix.json

```json
{
  "KE": {
    "SG": ["vf", 30],
    "US": ["vr"]
  }
}
```
