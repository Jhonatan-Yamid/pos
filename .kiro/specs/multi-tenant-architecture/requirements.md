# Requirements Document

## Introduction

Esta funcionalidad transforma la aplicación POS (Point of Sale) de una arquitectura single-tenant basada en variables de entorno por deployment, a una arquitectura multi-tenant donde un único deployment en Vercel sirve a múltiples clientes (tenants). Cada tenant se identifica por un slug en la URL (`/[slug]/...`), tiene su propia base de datos MySQL aislada y su propia configuración (Cloudinary, nombre de negocio, logos, etc.). Una base de datos maestra centraliza la información de todos los tenants. Un panel de administración permite gestionar tenants sin modificar código fuente.

## Glossary

- **Tenant**: Cliente individual del sistema POS (ej: `hierbamala`, `raicescampesinas`). Tiene datos y configuración completamente aislados de otros tenants.
- **Slug**: Identificador único de un tenant en la URL, en formato kebab-case (ej: `hierbamala`). Es el primer segmento de ruta después del dominio.
- **Master_DB**: Base de datos MySQL centralizada (`u199394756_master_pos`) que almacena la configuración de todos los tenants.
- **Tenant_DB**: Base de datos MySQL individual de cada tenant, que contiene sus datos operativos (ventas, productos, ingredientes, etc.).
- **Tenant_Config**: Conjunto de valores de configuración de un tenant almacenados en Master_DB, incluyendo `DATABASE_URL`, credenciales Cloudinary y variables públicas.
- **Router**: El middleware de Next.js que intercepta requests e identifica el tenant por el slug de la URL.
- **TenantContext**: Objeto en memoria que encapsula la conexión a Tenant_DB y la Tenant_Config activa para un request dado.
- **Cache**: Capa de memoria en proceso (in-memory) que almacena Tenant_Config para evitar consultas repetidas a Master_DB.
- **Admin_Panel**: Sección de la aplicación (`/admin`) accesible únicamente para usuarios con rol administrador del sistema (no de tenant), desde donde se crean, editan y eliminan tenants.
- **Super_Admin**: Usuario con rol de administrador del sistema que tiene acceso al Admin_Panel y gestiona todos los tenants.
- **System**: La aplicación POS Next.js en su conjunto.
- **Middleware**: El middleware de Next.js (`src/middleware.js`) que se ejecuta en el Edge antes de cada request.

---

## Requirements

### Requirement 1: Identificación del tenant por slug en la URL

**User Story:** As a tenant user, I want to access the POS application at `pos.app/[slug]`, so that I can use the system associated to my business without interference from other tenants.

#### Acceptance Criteria

1. WHEN a request arrives with a URL path whose first segment matches the slug format (lowercase letters, numbers, and hyphens, between 2 and 63 characters), THE Router SHALL extract that segment as the slug and resolve it against Master_DB to obtain the corresponding Tenant_Config.
2. IF the extracted slug does not match any record in Master_DB, THEN THE Router SHALL respond with an HTTP 302 redirect to a dedicated not-found error page, without returning any tenant data.
3. WHEN a request arrives at the root path `/`, THE Router SHALL display a landing page that contains no tenant-specific data.
4. THE System SHALL normalize the slug to lowercase before any lookup in Master_DB, so that slugs differing only in letter case resolve to the same tenant.
5. IF the first URL path segment contains characters outside the set of lowercase letters, numbers, and hyphens, or is fewer than 2 or more than 63 characters, THEN THE Router SHALL return an HTTP 400 response without querying Master_DB.
6. IF the first URL path segment matches a reserved application path (such as the root path `/` or the not-found error page path), THEN THE Router SHALL NOT treat that segment as a tenant slug and SHALL route the request to the corresponding application page.

---

### Requirement 2: Aislamiento de datos por base de datos individual

**User Story:** As a tenant owner, I want my business data stored in a dedicated database, so that my data is completely isolated from other tenants and cannot be accidentally exposed.

#### Acceptance Criteria

1. WHEN a tenant request is processed, THE TenantContext SHALL establish a Prisma client connection using only the `DATABASE_URL` stored in that tenant's Tenant_Config.
2. THE System SHALL NOT share a single Prisma client instance across different tenants within the same process for data operations.
3. IF two concurrent requests arrive for different slugs (e.g., one for `/hierbamala` and one for `/raicescampesinas`), THEN THE System SHALL resolve each request using only the Prisma client connected to that request's respective Tenant_DB, such that the response data for slug A contains no records from slug B's database.
4. IF a Tenant_DB connection fails or the DATABASE_URL is invalid, THEN THE System SHALL return an HTTP 503 response to the client and log the connection error with the tenant slug, without falling back to another tenant's database.
5. WHEN a request completes — whether successfully or with an error — THE TenantContext SHALL disconnect the Prisma client used for that request.
6. IF a Tenant_Config does not include a DATABASE_URL value, THEN THE System SHALL return an HTTP 503 response and log an error stating the tenant has no database URL configured, without attempting any database connection.

---

### Requirement 3: Base de datos maestra y configuración de tenants

**User Story:** As a Super_Admin, I want tenant configuration stored in a central master database, so that I can manage all tenants from one place without modifying source code or environment variables.

#### Acceptance Criteria

1. THE Master_DB SHALL store a `tenants` table with at minimum the following columns: `id`, `slug` (unique), `name`, `database_url`, `cloudinary_cloud_name`, `cloudinary_api_key`, `cloudinary_api_secret`, `app_name`, `app_short_name`, `email`, `phone`, `manifest_icon_192`, `manifest_icon_256`, `manifest_icon_512`, `white_logo_url`, `is_active` (default `true`), `created_at`, `updated_at`.
2. THE System SHALL connect to Master_DB using a dedicated Prisma client initialized with the `MASTER_DATABASE_URL` environment variable, separate from any Tenant_DB client.
3. THE System SHALL NOT hardcode any Tenant_Config value in source code; every value that constitutes a Tenant_Config SHALL be retrieved from Master_DB at runtime.
4. IF the `is_active` flag of a tenant is `false`, THEN THE Router SHALL treat that tenant as non-existent and redirect to the tenant-not-found error page.
5. IF the `MASTER_DATABASE_URL` environment variable is absent or the Master_DB connection cannot be established at application startup, THEN THE System SHALL fail to start and log a fatal error message identifying `MASTER_DATABASE_URL` as the cause, without serving any requests.

---

### Requirement 4: Caché de configuración de tenants

**User Story:** As a system operator, I want tenant configuration cached in memory, so that the Master_DB is not queried on every incoming HTTP request and the application remains performant under load.

#### Acceptance Criteria

1. WHEN a Tenant_Config is loaded from Master_DB for the first time, THE Cache SHALL store that Tenant_Config in memory, keyed by slug, with a TTL of 5 minutes.
2. IF a request arrives for a slug that is present in the Cache and its TTL has not expired, THEN THE System SHALL serve the Tenant_Config from the Cache without querying Master_DB.
3. WHEN the TTL of a cached Tenant_Config expires, THE Cache SHALL remove that entry so the next request for that slug triggers a fresh query to Master_DB.
4. WHEN a Super_Admin updates a tenant's configuration via Admin_Panel, THE Cache SHALL invalidate the cache entry for that tenant's slug before the update operation returns a success response, so that any subsequent request for that slug reads from Master_DB.
5. THE Cache SHALL operate per-process, MUST NOT require an external caching service as a dependency, and SHALL enforce a maximum capacity of no more than 500 tenant entries, evicting the least-recently-used entry when that limit is reached.
6. IF a slug is not found in Master_DB during a cache miss, THEN THE System SHALL not store any entry in the Cache for that slug and SHALL return an error response indicating the tenant does not exist.

---

### Requirement 5: Prefijo de slug en todas las rutas de la aplicación

**User Story:** As a tenant user, I want all application routes to be scoped under my tenant's slug prefix, so that I can open multiple tenants in different browser tabs without routing conflicts.

#### Acceptance Criteria

1. THE System SHALL mount all tenant-scoped page routes under the dynamic segment `[slug]`, making every tenant page accessible at `/[slug]/[page]` (e.g., `/hierbamala/dashboard`, `/hierbamala/ventas`).
2. THE System SHALL mount all tenant-scoped API routes under `/api/[slug]/[resource]` (e.g., `/api/hierbamala/sales`).
3. WHEN the System generates any internal link or issues a redirect for a tenant-scoped destination, THE System SHALL include the tenant's slug as the first path segment of the generated URL, such that no system-generated link omits the slug prefix.
4. WHEN a user is authenticated under `/hierbamala` and a request is made under `/raicescampesinas`, THE System SHALL require a separate session token whose slug claim matches `raicescampesinas`, rejecting any reuse of the `/hierbamala` session token with a 401 response.
5. IF a request targets a tenant-scoped route that lacks a slug prefix, THEN THE System SHALL return an HTTP 404 response without exposing tenant data, internal details, or stack traces.

---

### Requirement 6: Autenticación con contexto de tenant

**User Story:** As a tenant user, I want to log in with credentials validated against my tenant's own database, so that users from different tenants do not share accounts.

#### Acceptance Criteria

1. WHEN a user submits login credentials on `/[slug]/auth/login`, THE System SHALL authenticate the user against the User table in that slug's Tenant_DB, not against any other tenant's database.
2. WHEN authentication succeeds, THE System SHALL issue a session token (via NextAuth) that includes the tenant slug as a claim.
3. WHEN a session token is presented on a request for a given slug, THE System SHALL extract the slug claim from the token.
4. IF the slug claim in the session token does not match the slug in the request URL, THEN THE System SHALL reject the request with an HTTP 401 response.
5. WHEN a user accesses a protected route under `/[slug]/`, THE Middleware SHALL verify that the session token's cryptographic signature is valid, the token has not expired, and the slug claim matches the URL slug before allowing the request to proceed.
6. IF a user's session token is valid but the corresponding tenant's `is_active` flag is `false`, THEN THE System SHALL invalidate the session and redirect the user to a tenant-inactive error page.
7. IF the slug in the login URL does not correspond to any tenant in Master_DB, THEN THE System SHALL return an HTTP 404 response and SHALL NOT attempt to query any Tenant_DB.
8. IF the user's submitted credentials do not match any record in the Tenant_DB User table, THEN THE System SHALL return an HTTP 401 response indicating invalid credentials, without disclosing whether the username or password was incorrect.

---

### Requirement 7: Panel de administración de tenants

**User Story:** As a Super_Admin, I want a web interface to create, edit, and deactivate tenants, so that I can onboard new clients and manage existing ones without modifying code or environment variables.

#### Acceptance Criteria

1. THE Admin_Panel SHALL be accessible only at the route `/admin/tenants` and its sub-routes.
2. IF a user with a role other than Super_Admin attempts to access `/admin/tenants`, THEN THE System SHALL return an HTTP 403 response and redirect to the appropriate error page.
3. THE Admin_Panel SHALL display a list of all tenants stored in Master_DB, showing at minimum: `slug`, `app_name`, `email`, `is_active`, and `created_at`.
4. WHEN a Super_Admin submits a form to create a new tenant, THE Admin_Panel SHALL validate that: the `slug` is unique in Master_DB, the `slug` contains only lowercase letters, numbers, and hyphens and is between 2 and 63 characters, and the required fields `slug`, `app_name`, `email`, and `database_url` are all present and non-empty, before persisting the record to Master_DB.
5. IF any validation rule in criterion 4 fails, THEN THE Admin_Panel SHALL reject the submission without persisting any record to Master_DB and SHALL display a per-field error message identifying which rule was violated.
6. WHEN a Super_Admin updates an existing tenant's configuration, THE Admin_Panel SHALL save the changes to Master_DB and invalidate the Cache entry for that tenant's slug.
7. WHEN a Super_Admin deactivates a tenant (sets `is_active` to `false`), THE Admin_Panel SHALL update Master_DB and invalidate the Cache entry so subsequent requests for that slug return the tenant-not-found page.
8. THE Admin_Panel SHALL mask the fields `cloudinary_api_secret`, `database_url`, and any field whose name ends in `_secret` or `_password` when displaying tenant details, rendering the value as `********` followed by the last 4 characters of the stored value.

---

### Requirement 8: Migración de tenants existentes

**User Story:** As a system operator, I want existing tenants (`hierbamala` and `raicescampesinas`) migrated to the new multi-tenant structure, so that current clients continue operating without data loss or service interruption.

#### Acceptance Criteria

1. THE System SHALL provide a migration script that reads the existing single-tenant `.env` values for each known tenant (`hierbamala` and `raicescampesinas`) and inserts a corresponding record into the `tenants` table of Master_DB.
2. IF any required environment variable for a tenant is missing during script execution, THEN THE Script SHALL skip that tenant, log an error message identifying the tenant slug and the missing variable name, and continue processing the remaining tenants.
3. WHEN the migration script is executed, THE System SHALL NOT modify or delete data in any existing Tenant_DB; it SHALL only insert rows into Master_DB.
4. WHEN the migration script is executed for a slug that already exists in Master_DB, THE System SHALL skip that tenant and log a warning, preventing duplicate entries.
5. WHEN the migration script has inserted a tenant record, THE Script SHALL verify connectivity to that tenant's Tenant_DB by executing `SELECT 1`, and SHALL log the tenant slug and either "connection successful" or the connection error reason to the console.

---

### Requirement 9: Configuración pública del tenant en el frontend

**User Story:** As a tenant user, I want the application to display my business's name, logo, and branding, so that the POS feels tailored to my business rather than generic.

#### Acceptance Criteria

1. WHEN a page under `/[slug]/` is rendered, THE System SHALL load the tenant's public configuration (app name, short name, logo URLs, phone) from Tenant_Config and make it available to React components via server-side props or a server-side context, without requiring a client-side fetch.
2. THE System SHALL NOT include the fields `database_url`, `cloudinary_api_secret`, `cloudinary_api_key`, or any field ending in `_secret` or `_password` from Tenant_Config in the client-side JavaScript bundle or HTML response.
3. IF loading Tenant_Config fails for a page render, THEN THE System SHALL render the page using safe fallback values (empty strings for text, placeholder for logos) rather than throwing an unhandled error.
4. WHEN generating the web app manifest for a tenant, THE System SHALL use the tenant's `manifest_icon_*` and `app_name` values from Tenant_Config, resulting in a per-tenant manifest served at `/[slug]/manifest.json`.
5. IF a Tenant_Config does not include a logo URL for a given logo field, THEN THE System SHALL render a bundled placeholder image using an `<img>` element with valid `src` and `alt` attributes, with no broken image element and no runtime JavaScript error thrown.

---

### Requirement 10: Manejo de errores de tenant no encontrado

**User Story:** As a visitor, I want to see a clear error message when I navigate to a slug that does not exist, so that I understand the page is not available rather than seeing a generic 404.

#### Acceptance Criteria

1. WHEN a request is made to `/[slug]/` and the slug is not found in Master_DB or Cache, THE System SHALL render a dedicated "Tenant no encontrado" error page that contains a visible message stating the tenant does not exist, and SHALL respond with an HTTP 404 status code.
2. THE "Tenant no encontrado" page SHALL NOT include any database connection strings, internal file paths, stack traces, or system configuration values in the HTML response body.
3. WHEN a request is made for a slug whose `is_active` flag is `false`, THE System SHALL render the same "Tenant no encontrado" error page with HTTP 404, without revealing that the tenant exists but is inactive.
4. WHEN a request is made for a non-existent or inactive slug, THE System SHALL append an entry to the application server log containing the attempted slug and the current UTC timestamp.
