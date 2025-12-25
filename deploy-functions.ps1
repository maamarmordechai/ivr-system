# Deploy Edge Functions
Write-Host "Deploying Supabase Edge Functions..." -ForegroundColor Cyan

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g supabase
}

# Check if logged in
Write-Host "`nChecking Supabase authentication..." -ForegroundColor Cyan
$loginCheck = supabase projects list 2>&1

if ($loginCheck -like "*not logged in*" -or $LASTEXITCODE -ne 0) {
    Write-Host "❌ Not logged in to Supabase. Please login first:" -ForegroundColor Yellow
    Write-Host "   supabase login" -ForegroundColor White
    exit 1
}

# Link project if not already linked
Write-Host "`nLinking to Supabase project..." -ForegroundColor Cyan
$linkCheck = supabase link --project-ref wwopmopxgpdeqxuacagf 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked successfully" -ForegroundColor Green
} else {
    Write-Host "⚠️  Project already linked or error occurred" -ForegroundColor Yellow
}

# Deploy make-call function
Write-Host "`nDeploying make-call function..." -ForegroundColor Cyan
supabase functions deploy make-call

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ make-call function deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy make-call function" -ForegroundColor Red
    exit 1
}

# Deploy handle-call-response function
Write-Host "`nDeploying handle-call-response function..." -ForegroundColor Cyan
supabase functions deploy handle-call-response

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ handle-call-response function deployed successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy handle-call-response function" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ All Edge Functions deployed successfully!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Get Twilio credentials from https://www.twilio.com/try-twilio" -ForegroundColor White
Write-Host "2. Set Twilio secrets:" -ForegroundColor White
Write-Host "   supabase secrets set TWILIO_ACCOUNT_SID=your_sid" -ForegroundColor Gray
Write-Host "   supabase secrets set TWILIO_AUTH_TOKEN=your_token" -ForegroundColor Gray
Write-Host "   supabase secrets set TWILIO_PHONE_NUMBER=your_number" -ForegroundColor Gray
Write-Host "3. Add phone numbers to apartments in your database" -ForegroundColor White
Write-Host "4. Test the calling system in your app!" -ForegroundColor White
