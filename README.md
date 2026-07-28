# RSTW 2026

Regional Science, Technology & Innovation Week site. Laravel backend, React (Vite) frontend — the React app lives in `resources/js`, mounted into `resources/views/app.blade.php` and served through Laravel's own router.

## Stack

- **Backend**: Laravel, PHP 8.3+
- **Frontend**: React 19 + Vite, via `laravel-vite-plugin`
- **Styling**: Tailwind CSS v4 (`resources/css/app.css`)
- **Database**: MySQL (not yet configured — see below)

## Setup

```bash
composer install
npm install
cp .env.example .env   # if you don't already have one
php artisan key:generate
```

Fill in `DB_USERNAME` / `DB_PASSWORD` in `.env` for your local MySQL instance, then create the `rstw_2026` database (or change `DB_DATABASE`) and run:

```bash
php artisan migrate
```

### Running locally

If this project is inside a [Herd](https://herd.laravel.com) sites path, Herd serves the PHP side automatically. Otherwise:

```bash
php artisan serve
```

Either way, run Vite alongside it for the frontend (HMR):

```bash
npm run dev
```

### Building for production

```bash
npm run build
```

Outputs to `public/build`; Laravel's `@vite` directive in `resources/views/app.blade.php` picks it up automatically (no manifest checks needed in code).

## Project layout

- `resources/js/` — the React app (`App.jsx` is the root component, `main.jsx` is the entry point Vite/Blade load)
- `resources/css/app.css` — Tailwind + the site's theme tokens/animations
- `resources/views/app.blade.php` — the single Blade shell the SPA mounts into
- `routes/web.php` — currently just the one route that returns the shell view
- `public/images/`, `public/lottie/`, etc. — static brand assets, referenced by the React app via plain `/images/...` URLs (untouched by Vite's build — Laravel serves these directly, same as before the Laravel merge)
