# finance-me

> **Dashboard Financiero Personal** — Backend MVP construido con **Clean Architecture práctica**, Fastify, TypeScript, Prisma v7 y Supabase. Soporta importación de extractos bancarios en CSV, clasificación automática de transacciones por reglas, deduplicación mediante hashing y resumen financiero por categorías.

---

## Tabla de Contenidos

1. [Stack Tecnológico](#stack-tecnológico)
2. [Arquitectura](#arquitectura)
3. [Estructura de Carpetas](#estructura-de-carpetas)
4. [Esquema de Base de Datos](#esquema-de-base-de-datos)
5. [Pipeline de Procesamiento](#pipeline-de-procesamiento)
6. [Endpoints REST](#endpoints-rest)
7. [Configuración e Instalación](#configuración-e-instalación)
8. [Seeds Mínimos en Supabase](#seeds-mínimos-en-supabase)
9. [Probar la API](#probar-la-api)
10. [Scripts Disponibles](#scripts-disponibles)
11. [Agregar un Nuevo Banco](#agregar-un-nuevo-banco)
12. [Roadmap](#roadmap)

---

## Stack Tecnológico

| Capa | Tecnología | Rol |
|------|-----------|-----|
| HTTP Server | [Fastify v5](https://fastify.dev/) | Framework HTTP performante |
| Lenguaje | TypeScript (strict) | Tipado estático en todo el proyecto |
| ORM | [Prisma v7](https://www.prisma.io/) | Acceso a base de datos type-safe |
| Driver PG | `@prisma/adapter-pg` | Adapter PostgreSQL para Prisma v7 |
| Base de Datos | PostgreSQL vía [Supabase](https://supabase.com/) | Almacenamiento persistente en la nube |
| Archivos | [Supabase Storage](https://supabase.com/docs/guides/storage) | Bucket `imports` para CSVs cargados |
| CSV Parsing | [csv-parse](https://csv.js.org/parse/) | Parseo de archivos CSV de extractos |
| Entorno | dotenv | Variables de entorno |
| Dev Runner | tsx | Ejecución TypeScript en desarrollo sin compilar |
| Build | tsc + tsc-alias | Compilación a JavaScript para producción |

---

## Arquitectura

El proyecto implementa **Clean Architecture práctica** con 4 capas y **regla de dependencia estricta**: las dependencias apuntan únicamente hacia adentro. El dominio no conoce nada de infraestructura ni de HTTP.

```
┌─────────────────────────────────────────────┐
│         Interface Layer (HTTP/Fastify)       │  ← Rutas, schemas JSON, plugins
├─────────────────────────────────────────────┤
│         Application Layer (Use Cases)       │  ← Orquestación de negocio
├─────────────────────────────────────────────┤
│         Domain Layer (Core)                 │  ← Entidades, Ports, Servicios puros
├─────────────────────────────────────────────┤
│         Infrastructure Layer (Adapters)     │  ← Prisma, Supabase, Parsers CSV
└─────────────────────────────────────────────┘
```

### Regla de dependencia verificada

```
Interface  →  Application  →  Domain  ←  Infrastructure
```

- `domain/` **cero** importaciones de otras capas — verificable con grep
- `application/` solo importa de `domain/`
- `infrastructure/` implementa las interfaces (ports) definidas en `domain/`
- `container.ts` es el único archivo que conoce todas las capas (**Composition Root**)

### Inyección de Dependencias

Se usa **inyección manual** (sin framework DI). El `container.ts` instancia todos los repositorios, adaptadores y use cases, y los conecta. Las rutas reciben los use cases como opciones del plugin Fastify.

---

## Estructura de Carpetas

```
finance-me/
├── prisma/
│   └── schema.prisma                    # Modelos Prisma (mapeados a migration.sql)
├── src/
│   ├── domain/                          # CAPA 1 — Cero dependencias externas
│   │   ├── entities/
│   │   │   ├── transaction.entity.ts    # Entidad Transaction con validación
│   │   │   ├── import-record.entity.ts  # Entidad ImportRecord (máquina de estados)
│   │   │   └── rule.entity.ts           # Entidad Rule con método matches()
│   │   ├── value-objects/
│   │   │   ├── raw-transaction.ts       # Salida inmutable de los parsers
│   │   │   └── process-result.ts        # Resultado del pipeline de importación
│   │   ├── ports/
│   │   │   ├── repositories/            # Interfaces de persistencia
│   │   │   │   ├── transaction.repository.port.ts
│   │   │   │   ├── import.repository.port.ts
│   │   │   │   └── rule.repository.port.ts
│   │   │   └── services/                # Interfaces de servicios externos
│   │   │       ├── file-storage.port.ts
│   │   │       └── parser.port.ts
│   │   └── services/                    # Lógica pura de dominio (sin I/O)
│   │       ├── text-normalizer.service.ts
│   │       ├── merchant-extractor.service.ts
│   │       ├── transaction-hasher.service.ts
│   │       └── transaction-classifier.service.ts
│   │
│   ├── application/                     # CAPA 2 — Solo importa de domain/
│   │   └── use-cases/
│   │       ├── import-transactions.use-case.ts  # Pipeline completo de importación
│   │       ├── get-transactions.use-case.ts
│   │       ├── get-summary.use-case.ts
│   │       ├── create-rule.use-case.ts
│   │       └── get-rules.use-case.ts
│   │
│   ├── infrastructure/                  # CAPA 3 — Implementa ports de domain/
│   │   ├── persistence/prisma/
│   │   │   ├── prisma.client.ts         # Singleton PrismaClient con adapter PG
│   │   │   ├── transaction.repository.ts
│   │   │   ├── import.repository.ts
│   │   │   └── rule.repository.ts
│   │   ├── storage/
│   │   │   └── supabase-storage.adapter.ts
│   │   ├── parsers/
│   │   │   ├── bancolombia.parser.ts    # Parser CSV Bancolombia
│   │   │   └── nequi.parser.ts          # Parser CSV Nequi
│   │   └── config/
│   │       ├── env.ts                   # Validación de variables de entorno
│   │       └── supabase.ts              # Cliente Supabase Storage
│   │
│   ├── interface/http/                  # CAPA 4 — Adaptadores HTTP
│   │   ├── routes/
│   │   │   ├── import.routes.ts         # POST /imports
│   │   │   ├── transaction.routes.ts    # GET /transactions, GET /transactions/summary
│   │   │   └── rule.routes.ts           # GET /rules, POST /rules
│   │   └── schemas/
│   │       ├── transaction.schema.ts    # JSON Schema validación query params
│   │       └── rule.schema.ts           # JSON Schema validación body
│   │
│   ├── container.ts                     # Composition Root — wires all layers
│   ├── app.ts                           # Fastify: plugins + rutas
│   └── server.ts                        # Entry point: lee env, arranca servidor
│
├── test-data/
│   ├── bancolombia-sample.csv           # CSV de prueba formato Bancolombia
│   └── nequi-sample.csv                 # CSV de prueba formato Nequi
├── requests.http                        # Peticiones REST Client (VS Code)
├── migration.sql                        # Schema SQL original (referencia)
├── prisma.config.ts                     # Config Prisma v7 (DATABASE_URL)
├── tsconfig.json
├── .env                                 # Variables de entorno (no commitear)
└── .env.example                         # Plantilla de variables de entorno
```

---

## Esquema de Base de Datos

```
users ──< accounts ──< imports
  │           │           │
  └───< transactions >───┘
  │         │
  └───< categories
  │
  └───< rules ──> categories
```

| Tabla | Descripción |
|-------|-------------|
| `users` | Usuarios del sistema |
| `accounts` | Cuentas bancarias por usuario (`ahorro` / `crédito`) |
| `imports` | Registro de cada archivo cargado con estado (`pending` / `processed` / `error`) |
| `categories` | Categorías de gasto/ingreso definidas por el usuario |
| `transactions` | Transacciones importadas con hash único para deduplicación |
| `rules` | Reglas de clasificación automática por keyword y prioridad |

---

## Pipeline de Procesamiento

Flujo completo cuando se llama `POST /imports`:

```
1. Recepción multipart
   └─ Valida extensión .csv
   └─ Extrae account_id del form

2. Subida a Supabase Storage
   └─ SupabaseStorageAdapter.upload()
   └─ Ruta: {userId}/{timestamp}_{filename}

3. Creación de ImportRecord
   └─ Estado inicial: "pending"

4. Detección automática de banco
   └─ Lee headers de la primera línea del CSV
   └─ Itera parsers: BancolombiaParser → NequiParser
   └─ Usa el primer parser cuyo detect() retorna true
   └─ Error si ninguno coincide

5. Parseo CSV → RawTransaction[]
   └─ csv-parse/sync con columnas como objeto
   └─ Normaliza formato de fecha (DD/MM/YYYY → YYYY-MM-DD)
   └─ Normaliza formato de monto (1.234,56 → 1234.56)
   └─ Infiere type: debit / credit

6. Carga de reglas del usuario
   └─ IRuleRepository.findByUserId()

7. Procesamiento por transacción:
   a. normalizeDescription()     → limpia texto, lowercase
   b. extractMerchant()          → mapea regex known → merchant name
   c. hashTransaction()          → SHA-256(date|description|amount|type)
   d. classify(desc, rules[])    → aplica reglas por prioridad
   e. existsByHash()             → si ya existe: skip (duplicado)
   f. transactionRepo.save()     → persiste en BD

8. Actualización del ImportRecord
   └─ Estado: "processed" o "error"

9. Respuesta:
   { importId, result: { total, created, duplicates, errors } }
```

### Deduplicación por Hash

Cada transacción genera un hash SHA-256 determinista:

```
hash = SHA-256("2025-01-15|pago netflix suscripcion|49900|debit")
```

El campo `transactions.hash` tiene un índice `UNIQUE`. Al intentar insertar un duplicado, la query falla silenciosamente y se cuenta como `duplicate`. Subir el mismo extracto dos veces es seguro.

---

## Endpoints REST

### Base URL: `http://localhost:3000`

---

### `GET /`
Health check.

**Response** `200`
```json
{ "status": "ok" }
```

---

### `POST /imports`
Importa un extracto bancario en CSV. Detecta automáticamente el banco, procesa y clasifica las transacciones.

**Content-Type**: `multipart/form-data`

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `file` | File (.csv) | ✅ | Archivo CSV del extracto |
| `account_id` | number | ✅ | ID de la cuenta bancaria |

**Response** `201`
```json
{
  "importId": 1,
  "result": {
    "total": 7,
    "created": 6,
    "duplicates": 1,
    "errors": 0
  }
}
```

---

### `GET /transactions`
Lista transacciones con paginación y filtros opcionales.

| Query Param | Tipo | Default | Descripción |
|-------------|------|---------|-------------|
| `page` | number | `1` | Número de página |
| `limit` | number | `20` | Resultados por página |
| `account_id` | number | — | Filtrar por cuenta |
| `category_id` | number | — | Filtrar por categoría |
| `from` | `YYYY-MM-DD` | — | Fecha desde |
| `to` | `YYYY-MM-DD` | — | Fecha hasta |

**Response** `200`
```json
{
  "data": [
    {
      "id": 1,
      "date": "2025-01-15",
      "descriptionRaw": "PAGO NETFLIX SUSCRIPCION",
      "descriptionClean": "pago netflix suscripcion",
      "amount": 49900,
      "type": "debit",
      "merchant": "Netflix",
      "categoryId": 1
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### `GET /transactions/summary`
Resumen financiero: total de ingresos, gastos y desglose por categoría.

| Query Param | Tipo | Descripción |
|-------------|------|-------------|
| `account_id` | number | Filtrar por cuenta |
| `from` | `YYYY-MM-DD` | Fecha desde |
| `to` | `YYYY-MM-DD` | Fecha hasta |

**Response** `200`
```json
{
  "totalIncome": 3500000,
  "totalExpense": 493300,
  "byCategory": [
    { "categoryId": 1, "categoryName": "Suscripciones", "total": 69800 },
    { "categoryId": 2, "categoryName": "Alimentación", "total": 85000 },
    { "categoryId": null, "categoryName": null, "total": 338500 }
  ]
}
```

---

### `GET /rules`
Lista todas las reglas de clasificación del usuario.

**Response** `200`
```json
{
  "data": [
    { "id": 1, "keyword": "netflix", "categoryId": 1, "merchantName": "Netflix", "priority": 1 }
  ]
}
```

---

### `POST /rules`
Crea una nueva regla de clasificación automática.

**Body** `application/json`
```json
{
  "keyword": "netflix",
  "category_id": 1,
  "merchant_name": "Netflix",
  "priority": 1
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `keyword` | string | ✅ | Texto a buscar en la descripción (case-insensitive) |
| `category_id` | number | ✅ | ID de la categoría a asignar |
| `merchant_name` | string | — | Nombre del comercio a asignar |
| `priority` | number | ✅ | Orden de evaluación (menor = mayor prioridad) |

**Response** `201`
```json
{ "id": 1, "keyword": "netflix", "categoryId": 1, "merchantName": "Netflix", "priority": 1 }
```

---

## Configuración e Instalación

### Pre-requisitos

- Node.js ≥ 20
- Proyecto activo en [Supabase](https://supabase.com/) con el schema de `migration.sql` aplicado
- Bucket `imports` creado en Supabase Storage (Storage → New bucket → nombre: `imports`)

### 1. Clonar e instalar

```bash
git clone <repo>
cd finance-me
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:

```env
# Connection string de Supabase (Settings → Database → Connection string → URI)
# Para uso con pgbouncer (recomendado en Supabase):
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# URL del proyecto Supabase (Settings → API → Project URL)
SUPABASE_URL="https://[ref].supabase.co"

# Clave service_role (Settings → API → service_role) — NO la clave anon
SUPABASE_SERVICE_KEY="eyJ..."

PORT=3000
```

> ⚠️ Usa la clave **service_role** (no `anon`) para que el servidor pueda subir archivos a Storage.

### 3. Aplicar el schema a Supabase

El schema ya está en Supabase si corriste `migration.sql`. Si no:

```bash
# Opción A: correr migration.sql directamente en el SQL Editor de Supabase

# Opción B: introspección desde Prisma (si la BD ya tiene las tablas)
npm run db:pull
```

### 4. Generar el cliente Prisma

```bash
npm run db:generate
```

### 5. Arrancar en desarrollo

```bash
npm run dev
```

El servidor queda accesible en `http://localhost:3000`.

---

## Seeds Mínimos en Supabase

Antes de importar hay que tener al menos un usuario, una cuenta y algunas categorías. Ejecuta en el **SQL Editor de Supabase**:

```sql
-- Usuario de prueba
INSERT INTO users (email) VALUES ('test@test.com');

-- Cuenta bancaria
INSERT INTO accounts (user_id, bank_name, account_type, last_four_digits)
VALUES (1, 'Bancolombia', 'ahorro', '1234');

-- Categorías
INSERT INTO categories (user_id, name, type) VALUES
  (1, 'Suscripciones', 'gasto'),
  (1, 'Alimentación',  'gasto'),
  (1, 'Transporte',    'gasto'),
  (1, 'Salud',         'gasto'),
  (1, 'Ingresos',      'ingreso');
```

---

## Probar la API

### Opción A — REST Client (VS Code) — Recomendado

1. Instala la extensión **REST Client** (`humao.rest-client`)
2. Abre el archivo [`requests.http`](requests.http) en la raíz del proyecto
3. Presiona **"Send Request"** sobre cada bloque
4. CSVs de muestra disponibles en `test-data/`

### Opción B — curl

```bash
# Health check
curl http://localhost:3000/

# Subir CSV de Bancolombia
curl -X POST http://localhost:3000/imports \
  -F "file=@test-data/bancolombia-sample.csv" \
  -F "account_id=1"

# Listar transacciones
curl "http://localhost:3000/transactions?page=1&limit=10"

# Resumen del mes de enero
curl "http://localhost:3000/transactions/summary?from=2025-01-01&to=2025-01-31"

# Crear regla de clasificación
curl -X POST http://localhost:3000/rules \
  -H "Content-Type: application/json" \
  -d '{"keyword":"netflix","category_id":1,"merchant_name":"Netflix","priority":1}'
```

### Flujo de prueba sugerido

```
1. GET  /                              → verifica que el servidor responde
2. POST /rules  (keyword: "netflix")   → crea regla de clasificación
3. POST /rules  (keyword: "rappi")     → crea otra regla
4. POST /imports (bancolombia-sample)  → importa CSV → debe crear 7 transacciones
5. POST /imports (mismo CSV)           → reimporta → debe reportar 7 duplicates
6. GET  /transactions                  → verifica merchant y categoryId asignados
7. GET  /transactions/summary          → verifica totales por categoría
```

---

## Scripts Disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor en modo desarrollo con recarga automática (tsx watch) |
| `npm run build` | Compila TypeScript a JavaScript en `dist/` |
| `npm start` | Ejecuta el build compilado (`dist/server.js`) |
| `npm run db:generate` | Regenera el cliente Prisma desde `prisma/schema.prisma` |
| `npm run db:pull` | Introspeccta la BD existente y actualiza el schema de Prisma |
| `npm run db:push` | Aplica el schema de Prisma a la BD (sin migraciones) |

---

## Agregar un Nuevo Banco

La arquitectura hace trivial agregar soporte a un nuevo banco sin tocar ninguna capa existente:

1. Crea `src/infrastructure/parsers/mi-banco.parser.ts`:

```typescript
import { parse } from 'csv-parse/sync';
import { ITransactionParser } from '../../domain/ports/services/parser.port.js';
import { RawTransaction } from '../../domain/value-objects/raw-transaction.js';

export class MiBancoParser implements ITransactionParser {
  readonly bankName = 'MiBanco';

  detect(headers: string[]): boolean {
    const normalized = headers.map(h => h.toLowerCase());
    return ['fecha', 'concepto', 'importe'].every(h => normalized.includes(h));
  }

  parse(content: string): RawTransaction[] {
    const records = parse(content, { columns: true, trim: true, bom: true });
    return records.map((row: Record<string, string>) => ({
      date: row['Fecha']!,
      description: row['Concepto']!,
      amount: Math.abs(parseFloat(row['Importe']!)),
      type: parseFloat(row['Importe']!) < 0 ? 'debit' : 'credit',
    }));
  }
}
```

2. Regístralo en `src/container.ts`:

```typescript
import { MiBancoParser } from './infrastructure/parsers/mi-banco.parser.js';
// ...
const parsers = [new BancolombiaParser(), new NequiParser(), new MiBancoParser()];
```

Listo. El `ParserFactory` integrado en el use case lo detectará automáticamente.

---

## Roadmap

| Feature | Estado |
|---------|--------|
| Importación CSV Bancolombia | ✅ MVP |
| Importación CSV Nequi | ✅ MVP |
| Clasificación automática por reglas | ✅ MVP |
| Deduplicación por SHA-256 hash | ✅ MVP |
| Extracción de merchants conocidos | ✅ MVP |
| Resumen financiero por categoría | ✅ MVP |
| Subida de archivos a Supabase Storage | ✅ MVP |
| Autenticación (Supabase Auth / JWT) | 🔜 Próximo |
| CRUD de categorías vía API | 🔜 Próximo |
| CRUD de cuentas vía API | 🔜 Próximo |
| Importación de PDF (extractos escaneados) | 🔜 Futuro |
| Procesamiento asíncrono (BullMQ) | 🔜 Futuro |
| Tests unitarios (Domain + Application) | 🔜 Futuro |
| Dashboard frontend | 🔜 Futuro |

---

## Notas de Seguridad

- **`SUPABASE_SERVICE_KEY`** otorga acceso total a tu proyecto. Nunca la expongas en el frontend ni la commitees al repositorio.
- El archivo `.env` está en `.gitignore`.
- Usa `.env.example` para compartir la estructura sin valores reales.
- En producción, configura las variables de entorno directamente en tu plataforma de deploy (Railway, Render, etc.).
