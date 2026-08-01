// Mirrors the shape of Firebase's `auth.currentUser` (uid/email) so screens
// that only read `auth.currentUser` didn't need to change beyond their import.
export const auth = { currentUser: null };

export const setCurrentUser = (user) => {
  auth.currentUser = user;
};
