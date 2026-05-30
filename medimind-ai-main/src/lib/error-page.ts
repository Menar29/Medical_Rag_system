export function renderErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Erreur serveur — MediRAG</title>
    <style>
      *{box-sizing:border-box;margin:0;padding:0}
      body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#e2e8f0;font-family:system-ui,sans-serif}
      .card{max-width:440px;width:100%;padding:2rem;border:1px solid #1e293b;border-radius:1rem;text-align:center;background:#0f172a}
      h1{font-size:1.25rem;font-weight:600;margin-bottom:.5rem}
      p{font-size:.875rem;color:#94a3b8;line-height:1.6}
      a{display:inline-block;margin-top:1.5rem;padding:.5rem 1.25rem;border-radius:.5rem;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;font-size:.875rem}
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Une erreur est survenue</h1>
      <p>Le serveur a rencontré un problème inattendu. Veuillez réessayer.</p>
      <a href="/">Retour à l'accueil</a>
    </div>
  </body>
</html>`;
}
