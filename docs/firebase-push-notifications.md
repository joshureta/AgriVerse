# Firebase push notification setup

The application code uses native Firebase Cloud Messaging (FCM) tokens on Android. Notifications are saved in Supabase first and then delivered through Firebase by the Express backend.

## 1. Create the Firebase Android application

1. Create or open a project in the Firebase Console.
2. Add an Android application with package name `com.natso0729.agriverse`.
3. Download `google-services.json` into `mobile/google-services.json`.
4. Do not rename the Android package after registering it in Firebase.

`google-services.json` contains public Firebase project identifiers. The Firebase service-account key described below is the secret credential and must never be placed in the mobile app.

## 2. Configure the backend credential

In Firebase Console, open **Project settings > Service accounts**, generate a private key, and keep the downloaded JSON outside the repository. For local Windows development, add its absolute path to `backend/.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\\secure\\agriverse-firebase-service-account.json
```

For a cloud host that accepts environment variables, encode the same JSON file as base64 and set it as `FIREBASE_SERVICE_ACCOUNT_BASE64`. `FIREBASE_SERVICE_ACCOUNT_JSON` also accepts the complete JSON document, but base64 is easier to preserve across environment-variable dashboards.

## 3. Apply the Supabase migration

Apply `supabase/migrations/049_push_devices.sql` to the connected Supabase project. It creates the per-user FCM device registration table.

## 4. Build a native Android app

Remote push notifications do not work in Expo Go on Android. Build a new development or preview binary after adding `google-services.json`:

```powershell
cd C:\Users\Natsu\Desktop\AgriVerse\mobile
npx eas-cli@27.2.0 build --platform android --profile preview
```

For emulator testing, use an Android Virtual Device image that includes Google Play services. Install the new APK, sign in, and accept notification permission.

## 5. Verify delivery

Keep the backend running with its Firebase credential configured. After the device registers, call the authenticated endpoint `POST /api/push/devices/test`, or trigger an existing order/delivery notification. Tapping a notification opens the relevant order screen for buyers and the appropriate notification/dashboard screen for workers and drivers.
