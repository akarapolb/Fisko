// Boot: pick the saved organization, load its state, draw the shell and the current page.
// With no signed-in session, the sign-in screen opens on top.
ORG = SEEDS[store.get("fisko-org")] ? store.get("fisko-org") : "sample";
load();
if (SESSION) { const su = S.users.find(u => u.id === SESSION.user); if (su) ROLE = su.role; }
bindShell();
renderShell();
route();
if (!SESSION) showSignIn();
