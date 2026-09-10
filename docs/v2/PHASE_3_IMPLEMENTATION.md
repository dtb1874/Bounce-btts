# V2 Phase 3 — Implementation surfaces

The visual reset preview is owned by dedicated V2 components rather than styling the legacy page in place:

- `app/v2/V2EditorialDashboard.tsx`
- `app/v2/V2EditorialDashboard.module.css`
- `app/v2/V2StatCentre.tsx`
- `app/v2/V2StatCentre.module.css`
- `app/v2/V2AdminCentre.tsx`
- `app/v2/V2AdminCentre.module.css`
- `app/v2-preview/V2PreviewClient.tsx`
- `app/v2-preview/V2PreviewClient.module.css`

The preview continues to consume the existing Supabase-backed league data supplied by the V2 preview route. It does not create alternative scoring, fixture eligibility or scheduling rules.
