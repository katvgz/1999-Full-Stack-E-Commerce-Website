// Load Authentication only when an admin route needs it.
export async function loadAdminAuth() {
  const [sdk, { getFirebaseApp }] = await Promise.all([
    import("firebase/auth"),
    import("./firebase"),
  ]);
  const app = getFirebaseApp();
  if (app.options.projectId !== "clothing-98be8" ||
      app.options.authDomain !== "clothing-98be8.firebaseapp.com") {
    const error = new Error("Admin authentication is configured for an unexpected Firebase project.");
    error.code = "auth/project-mismatch";
    throw error;
  }
  // getAuth reuses the Auth instance belonging to this exact Firebase app.
  const auth = sdk.getAuth(app);
  return {
    auth,
    signInWithEmailAndPassword: sdk.signInWithEmailAndPassword,
    onAuthStateChanged: sdk.onAuthStateChanged,
    signOut: sdk.signOut,
  };
}

export function loginErrorMessage(error) {
  switch (error.code) {
    case "auth/project-mismatch":
      return "Sign-in configuration does not match the store. Please contact the site administrator.";
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "Unable to sign in. Check your email and password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Check your connection and try again.";
    default:
      return "Sign-in is temporarily unavailable. Please try again later.";
  }
}
