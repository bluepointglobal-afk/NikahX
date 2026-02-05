# RLS Audit & Security Analysis

**Status**: Implemented in `0002_rls.sql`
**Strategy**: Default Deny + Whitelist Access

## 1. Helper Functions Analysis

| Function | Purpose | Security Note |
| :--- | :--- | :--- |
| `is_self(uuid)` | Check if `auth.uid()` matches argument. | Critical for "own-row" policies. |
| `user_is_active()` | Check if user is not banned / requested deletion. | Used in `INSERT`/`UPDATE` to freeze bad actors immediately. |
| `is_match_participant(uuid)` | Verify `auth.uid()` is in `matches` table for given ID. | Prevents accessing arbitrary match data by guessing IDs. |

---

## 2. Table-by-Table Policy Audit

### `app_user`
| Operation | Policy | Rationale | Attack Surface / Mitigation |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Users can view own profile` | Strict privacy. Users only see themselves via direct DB access. | **Surface**: Profile scraping. <br>**Mitigation**: RLS limits to 1 row (self). Public viewing (swiping) must be handled via specific RPC or separate `public_profiles` view with different RLS if needed. |
| **UPDATE** | `Users can update own profile` | Self-management only. | **Surface**: IDOR. <br>**Mitigation**: `is_self(id)` check prevents modifying others. |

### `matches`
| Operation | Policy | Rationale | Attack Surface / Mitigation |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Participants can view matches` | Privacy. Only the two involved users know the match exists. | **Surface**: Enumerating matches. <br>**Mitigation**: Restricted to `auth.uid() IN (user_1, user_2)`. |

### `messages`
| Operation | Policy | Rationale | Attack Surface / Mitigation |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Participants and Walis can view messages` | Allow chat participants + authorized Guardians (Walis). | **Surface**: Wali abuse. <br>**Mitigation**: `wali_access` check includes `revoked_at IS NULL`. Revocation is instant. |
| **INSERT** | `Participants can insert messages if active` | Messaging requires being in the match AND having a valid account. | **Surface**: Banned users spamming. <br>**Mitigation**: `user_is_active()` check blocks banned/deleted users from sending. |

### `photos`
| Operation | Policy | Rationale | Attack Surface / Mitigation |
| :--- | :--- | :--- | :--- |
| **SELECT** | `Users can view own photos` | Strict privacy. No public SELECT allowed. | **Surface**: Leaking full-res / unblurred photos. <br>**Mitigation**: Direct SELECT denied for others. Access must be via secure RPC (e.g., `get_match_photo`) which applies blurring logic before returning URL/Data. |

### `likes` (Optional / Anticipated)
| Operation | Policy | Rationale | Attack Surface / Mitigation |
| :--- | :--- | :--- | :--- |
| **INSERT** | `Active users can create likes` | Prevent spam/abuse. | **Surface**: Like spamming. <br>**Mitigation**: `user_is_active()` check. |

---

## 3. General Attack Surface Notes

1.  **Logical Bugs in Helpers**: If `is_match_participant` has a flaw (e.g., OR vs AND), isolation breaks.
    -   *Verified*: Uses `(u1=auth OR u2=auth)` correctly.
2.  **Banned User Latency**: RLS `user_is_active()` checks `app_user` on every INSERT.
    -   *Impact*: Performance hit?
    -   *Benefit*: Instant ban enforcement (no need to wait for token expiry).
3.  **Wali/Guardian Scope**:
    -   Current policy relies on `wali_access` table. If this table is compromised or has loose RLS, a Wali could see too much.
    -   *Recommendation*: Ensure `wali_access` also has strict RLS (e.g., only Ward can insert, Wali can view self-rows).

## 4. Recommendations
-   **RPC for Photos**: Since direct SELECT is blocked for non-owners, `get_signed_url` must be wrapped in a Postgres Function or Edge Function that checks permissions (is matched?) and then returns the signed URL.
