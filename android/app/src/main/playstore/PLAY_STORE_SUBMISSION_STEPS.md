# Play Store Submission Steps

Use this checklist when submitting `DairyFlow` to Google Play.

## 1. Create the app in Play Console

- Open Play Console
- Create a new app
- Set app name to `DairyFlow`
- Choose `App`
- Choose `Free`
- Add your support email

## 2. Prepare store listing

Use these prepared files:

- App bundle: `release-builds/DairyFlow-release.aab`
- App icon: `android/app/src/main/playstore/play-store-icon-512.png`
- Feature graphic: `android/app/src/main/playstore/feature-graphic-1024x500.png`
- Screenshots folder: `android/app/src/main/playstore/screenshots`
- Store copy: `android/app/src/main/playstore/PLAY_STORE_LISTING.md`

## 3. Upload screenshots

Recommended phone screenshots prepared:

- `01-dashboard-overview.png`
- `02-customers-management.png`
- `03-billing-and-payments.png`
- `04-deliveries-tracking.png`
- `05-workers-and-attendance.png`
- `06-reports-and-profit.png`

Alt text notes:

- `android/app/src/main/playstore/screenshots/ALT_TEXT.md`

## 4. Add privacy policy

- Host `public/privacy-policy.html`
- Use the public URL in Play Console
- Recommended route if deployed on Vercel: `/privacy-policy`

## 5. Complete App content declarations

Review and complete:

- Privacy Policy
- Ads declaration
- App access
- Target audience and content
- Content rating
- Data safety
- Any permissions declarations if prompted

## 6. App access instructions

Because DairyFlow requires login, provide reviewer access instructions in Play Console.

Include:

- test email
- test password
- any OTP or payment notes if applicable
- note that paid upgrades use Razorpay and that reviewers can inspect the app using the provided test account

## 7. Upload the release

- Go to testing or production release
- Upload `release-builds/DairyFlow-release.aab`
- Add release notes
- Save

## 8. Review warnings

Check for:

- policy alerts
- missing declarations
- store listing asset warnings
- target API or compatibility warnings

## 9. Send for review

- Open `Publishing overview`
- Review all pending changes
- Send for review

## 10. After submission

- Watch Play Console inbox for review feedback
- Keep the upload keystore backed up
- Keep the same package name: `com.dairyflow.app`

