// Boot: pick the saved organization, load its state, draw the shell and the current page.
ORG = SEEDS[store.get("fisko-org")] ? store.get("fisko-org") : "sample";
load();
bindShell();
renderShell();
route();
