# Environment Variables

## Supabase Configuration
Required for local development and CI/CD.

| Variable | Description |
| :--- | :--- |
| `SUPABASE_URL` | The API URL of your Supabase project. |
| `SUPABASE_ANON_KEY` | Public anonymous key for client-side usage. |
| `SUPABASE_SERVICE_ROLE_KEY` | **SECRET**. Background key for Edge Functions to bypass RLS. |
| `SUPABASE_DB_PASSWORD` | Database password for direct migrations (if not using CLI token). |

## Feature Flags & Limits
| Variable | Default | Description |
| :--- | :--- | :--- |
| `MIN_AGE_REQUIREMENT` | `18` | strict age gate. |
| `DATA_RETENTION_DAYS` | `90` | Automatic deletion policy window. |

## External Services (Verification)
| Variable | Description |
| :--- | :--- |
| `VERIFICATION_PROVIDER_KEY` | API Key for 3rd party ID verification (e.g., Strike, Jumio, custom AI). |
| `SMTP_HOST` / `RESEND_API_KEY` | For sending guardian invites. |

## Application
| Variable | Description |
| :--- | :--- |
| `APP_PUBLIC_URL` | Base URL for invite links (e.g., `https://nikahx.com`). |
