# Builder

Primoria Builder (Flutter Web) with OAuth login:

- Native in Supabase: Google

## Local OAuth Setup

1. Copy `/Users/zhangjunqiu/Documents/Primoria/Builder/tools/oauth.env.example` to `/Users/zhangjunqiu/Documents/Primoria/.env` and fill:
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`

   Current project values:

   ```bash
   SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=420803065649-duifjpjhnkguuqg8h010ndguto1vnq58.apps.googleusercontent.com
   SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=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
   ```

2. Start Supabase local stack from repo root:

```bash
./supabase/run_with_env.sh start
```

3. Run Builder on fixed port `3000` (matches auth redirect allow-list):

```bash
cd Builder
./tools/run_web_oauth.sh
```

The run script auto-loads `/Users/zhangjunqiu/Documents/Primoria/.env` when present.

## Notes

- Callback path is `/auth/callback`.
- Supabase redirect allow-list is configured in `/Users/zhangjunqiu/Documents/Primoria/supabase/config.toml`.
