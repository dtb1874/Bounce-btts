from pathlib import Path

path = Path("app/LeagueApp.tsx")
text = path.read_text()
old = 'async function signOut(){ await createClient().auth.signOut(); window.location.href="/login"; }'
new = 'async function signOut(){ await createClient().auth.signOut(); window.location.href="/"; }'
if new not in text:
    if old not in text:
        raise SystemExit("Sign-out redirect anchor not found")
    text = text.replace(old, new, 1)
path.write_text(text)
print("Changed sign-out destination to public league view")
