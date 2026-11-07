// ==========================================
// SWAGGER HTML RENDERER
// ==========================================
export function renderSwaggerHtml(): string {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>API Dokumentasi OpenAPI Swagger - RuangTenang Kampus</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: sans-serif; }
    .top-bar-banner { background: #0f172a; color: #ffffff; padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
    .top-bar-banner h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .top-bar-banner span { font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="top-bar-banner">
    <h1>🌱 RuangTenang Kampus — Dokumentasi API v1 (OpenAPI 3.0)</h1>
    <span>Prefix Endpoint: /api/v1</span>
  </div>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: "/api/v1/openapi.json",
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
}
