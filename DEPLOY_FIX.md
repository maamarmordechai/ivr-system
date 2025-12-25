# 🚀 Deploy Updated Edge Functions (Without CLI)

## Issue Found
You have **2 apartments with the same phone number** (+18453762437):
- משפחת גרויס (c5514350...)
- Test Host (f01ba01d...)

The `.single()` query fails when multiple records match. I've fixed all 3 Edge Functions to use `.limit(1)` instead.

---

## Deploy Options

### Option 1: Supabase Dashboard (Manual - Easiest)

For each function, do this:

#### 1. handle-menu-selection
1. Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions/handle-menu-selection
2. Click "Edit Function"
3. Copy entire contents from: `supabase/functions/handle-menu-selection/index.ts`
4. Paste into editor
5. Click "Deploy"

#### 2. handle-beds-input
1. Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions/handle-beds-input
2. Click "Edit Function"
3. Copy from: `supabase/functions/handle-beds-input/index.ts`
4. Paste and Deploy

#### 3. handle-couple-response
1. Go to: https://supabase.com/dashboard/project/wwopmopxgpdeqxuacagf/functions/handle-couple-response
2. Click "Edit Function"
3. Copy from: `supabase/functions/handle-couple-response/index.ts`
4. Paste and Deploy

---

### Option 2: Install Supabase CLI (Better Long-term)

```powershell
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref wwopmopxgpdeqxuacagf

# Deploy all functions
supabase functions deploy handle-menu-selection
supabase functions deploy handle-beds-input
supabase functions deploy handle-couple-response
```

---

## After Deployment

### Test the Call
📞 Call: **+1 845 218 7236**
- Press 3
- Should now find your apartment
- Follow prompts

### Optional: Delete Duplicate Apartment
To avoid confusion, delete the "Test Host" apartment:

```sql
DELETE FROM apartments 
WHERE id = 'f01ba01d-0c88-421a-a657-413a4bfc99ff';
```

Run in Supabase SQL Editor.

---

## What Was Fixed

Changed from `.single()` to `.limit(1)` in all apartment queries:

**Before (fails with duplicates):**
```typescript
const { data: apartment } = await supabase
  .from('apartments')
  .select('*')
  .eq('phone_number', from)
  .single();  // ❌ Throws error if multiple rows
```

**After (works with duplicates):**
```typescript
const { data: apartments } = await supabase
  .from('apartments')
  .select('*')
  .eq('phone_number', from)
  .limit(1);  // ✅ Returns first match

const apartment = apartments?.[0];
```

---

**Use Option 1 (Dashboard) if you want to test quickly, or Option 2 (CLI) for proper deployment!**
