# Ukulima Bora — Backend Guide: App Store, Farm Records and Shop POS

| | |
|---|---|
| **UI owner** | Stephen Kingori — UI/UX |
| **Backend owners** | Wilson — API, models, migrations, scheduler · Brian — wallet charges and M-Pesa |
| **Branch** | `feat/ui-ux-farm-records` |
| **Last updated** | 6 October 2026 |
| **Read with** | `docs/ui_ux_plan.md` · UI code in `apps/web/src/features/modules`, `features/records`, `features/pos` |

## In short

- The screens for the **App store**, **Farm records** and **Shop POS** are built. Today they save to the browser, so they can be used and tested before the backend exists.
- Each feature already has an HTTP adapter written against the contract in this guide. When the endpoints ship, one environment flag per feature switches the UI over. No UI change is needed.
- Backend work: three groups of endpoints, about seven models, a wallet-charge helper, one daily job and a permission class that checks an app is installed.
- The web app still shows the AgriScan name; this guide uses Ukulima Bora. Code identifiers (`agriscan_*` storage keys, `AgriProject`) are unchanged.

## 1. How the web app connects

| Feature | UI code (adapter) | Saved today in | Flag that switches to the API | API base |
|---|---|---|---|---|
| App store (modules) | `features/modules/repository.ts` | `localStorage`: `agriscan_modules_settings`, `agriscan_modules_installed_<userId>` | `NEXT_PUBLIC_MODULES_API=on` | `/api/v1/modules/`, `/api/v1/admin/modules/` |
| Farm records | `features/records/repository.ts` | `localStorage`: `agriscan_farm_records_<userId>` | `NEXT_PUBLIC_FARM_RECORDS_API=on` | `/api/v1/farm-records/` |
| Shop POS | `features/pos/repository.ts` | `localStorage`: `agriscan_pos_sales_<userId>`; the open sale in `sessionStorage` | `NEXT_PUBLIC_POS_API=on` | `/api/v1/pos/` |

`NEXT_PUBLIC_*` values are baked in when `apps/web` is built, so turning a flag on means rebuilding and redeploying the web app.

**Conventions (same as the rest of `/api/v1`)**

- JWT bearer auth. JSON in and out.
- Money and decimal quantities come back as strings (`"1500.00"`, DRF's default). The UI sends plain JSON numbers and accepts either.
- Dates are `YYYY-MM-DD`. Timestamps are ISO 8601 with an offset.
- Errors are `{"detail": "..."}`. **The UI shows `detail` to the user as is**, so write it as a plain sentence, e.g. "Sales on credit need the customer's name and phone number."
- `402 Payment Required` means the wallet balance is too low. The UI checks for this status and offers a top-up.

**What stays in the frontend and what the backend owns**

- Frontend (`features/modules/registry.ts`): each app's name, description, icon, routes and sidebar entries, including the dropdown sub-pages (e.g. Farm records → By field, Farm work, Sales, Fields).
- Backend: which apps exist for which role, whether each is switched on, its price, who installed it, and every charge.
- The two sides are joined by the module **key**: `farm-records`, `crop-advisor`, `agrovet-pos`. With the API on, the UI shows only the modules the API returns, and ignores keys it does not know.

## 2. App store (modules)

### 2.1 Models — new Django app `modules`

```python
class Module(models.Model):
    PRICING = [("free", "Free"), ("one_time", "Paid once"), ("monthly", "Paid monthly")]

    key = models.SlugField(max_length=50, unique=True)        # matches registry.ts
    roles = models.JSONField(default=list)                     # ["farmer"] or ["agency"]
    enabled = models.BooleanField(default=True)                # admin on/off switch
    pricing_model = models.CharField(max_length=10, choices=PRICING, default="free")
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    installed_by_default = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)


class ModuleInstall(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="module_installs")
    module = models.ForeignKey(Module, on_delete=models.CASCADE, related_name="installs")
    active = models.BooleanField(default=True)
    purchased = models.BooleanField(default=False)            # paid-once apps: reinstall without paying again
    paid_until = models.DateField(null=True, blank=True)      # monthly apps
    installed_at = models.DateTimeField(auto_now_add=True)
    removed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["user", "module"], name="one_install_per_user_module")]


class ModuleCharge(models.Model):                              # audit trail and revenue
    user = models.ForeignKey(User, on_delete=models.PROTECT)
    module = models.ForeignKey(Module, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    kind = models.CharField(max_length=10, choices=[("one_time", "One time"), ("monthly", "Monthly")])
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

A data migration seeds the three modules:

| key | roles | pricing | installed_by_default |
|---|---|---|---|
| `farm-records` | `["farmer"]` | free | no |
| `crop-advisor` | `["farmer"]` | free | yes |
| `agrovet-pos` | `["agency"]` | free | no |

**Default installs.** The first time a user loads the catalog, create an active `ModuleInstall` for every `installed_by_default` module they have no row for. Removing the app sets `active=False`, so it does not come back on its own.

### 2.2 Endpoints for users

**`GET /api/v1/modules/`** — any signed-in user. Returns the modules whose `roles` include the user's role, including switched-off ones (`enabled: false`). The UI hides those in the App store and shows "not available" on their pages.

```json
{
  "modules": [
    { "key": "farm-records", "enabled": true, "pricing_model": "monthly", "price": "100.00", "installed": true, "renews_on": "2026-11-06" },
    { "key": "crop-advisor", "enabled": true, "pricing_model": "free", "price": "0.00", "installed": true, "renews_on": null }
  ]
}
```

`installed` is true when the user has an active install. `renews_on` is `paid_until` for monthly apps, otherwise `null`.

**`POST /api/v1/modules/{key}/install/`** — no body. Returns `200`:

```json
{ "key": "farm-records", "installed": true, "renews_on": "2026-11-06", "charged": "100.00", "balance": "240.00" }
```

| Case | Result |
|---|---|
| Key unknown, or the app is not for this role | `404` |
| App switched off by an admin | `403` · "This app is not available right now." |
| Already installed | `200`, no charge |
| Free app | install, no charge |
| Paid once, bought before | reactivate, no charge |
| Paid once, first time | charge `price`, set `purchased=True` |
| Monthly, still inside `paid_until` | reactivate, no charge |
| Monthly, otherwise | charge `price`, set `paid_until` to one month from today |
| Wallet too low | `402` · `{"detail": "Not enough money in your wallet.", "code": "insufficient_funds", "required": "100.00", "balance": "40.00"}`. Nothing changes. |

**`POST /api/v1/modules/{key}/uninstall/`** — no body. Sets `active=False` and `removed_at`. Returns `200` `{"key": "farm-records", "installed": false}`. Saved data is kept. No refunds. Monthly charges stop because the renewal job only renews active installs.

### 2.3 Endpoints for admins (`IsStaffUser`)

**`GET /api/v1/admin/modules/`** — every module with its numbers. `installs` is the count of active installs. `revenue` is the total of `ModuleCharge.amount` for that module.

```json
{
  "modules": [
    { "key": "farm-records", "enabled": true, "pricing_model": "monthly", "price": "100.00", "installs": 42, "revenue": "4200.00" },
    { "key": "agrovet-pos", "enabled": true, "pricing_model": "free", "price": "0.00", "installs": 7, "revenue": "0.00" }
  ]
}
```

**`PATCH /api/v1/admin/modules/{key}/`** — body as the admin App store page sends it:

```json
{ "enabled": true, "pricing_model": "monthly", "price": "100" }
```

Rules: `price >= 0`. For `free`, store `0`. For a paid model, require `price > 0`. A new price applies from the next charge; it never changes a period that is already paid. Returns the same row shape as the list.

### 2.4 Charging the wallet (Brian)

- Use one helper, `charge_wallet(user, amount, module, kind, period)`. Inside `transaction.atomic()`, lock the wallet with `Wallet.objects.select_for_update().get(user=user)`. If the balance is below `amount`, raise an error that the view turns into the `402` above. Otherwise subtract, save, and create a `ModuleCharge`.
- The wallet model is `main_app.models.Wallet`. A post-save signal creates one for every user, agrovets included.
- **Agrovet apps.** M-Pesa top-up (`MpesaTopupView`) is limited to farmers (`IsFarmer`), and the agency portal shows no wallet. Before an admin sets an agrovet app to paid, allow agency top-ups and add a wallet screen to the agency portal (UI). Until then, keep agrovet apps free. If a `402` does come back, the UI tells agrovets to contact Ukulima Bora support.

### 2.5 Daily renewal job

There is no scheduler today: `infra/docker-compose.yml` runs Celery workers for the `scan` and `rag` queues only. Add a management command, `renew_module_subscriptions`, and run it once a day, either from cron or from a new `celery beat` service (Wilson's choice).

For each active monthly install with `paid_until <= today`:

- module switched off: leave it, do not charge;
- module now free: clear `paid_until`, do not charge;
- otherwise, call `charge_wallet`. On success, move `paid_until` on one month. If the balance is too low, set `active=False` and `removed_at=now`. The app leaves the menu and the data stays; the user can install it again after a top-up.

An SMS reminder before renewal can come later; Africa's Talking is already in use for USSD.

### 2.6 Checking installs on data endpoints

Add a permission class, `HasModule(key)`. It passes when the module is enabled and the user has an active install. Otherwise it returns `403` `{"detail": "Install Farm records from the App store to use it.", "code": "module_not_installed"}`. Apply it to every Farm records and Shop POS endpoint. The UI's install gate is a convenience, not a security check.

The crop-advisor endpoints under `/api/v1/recommend/` stay public. The public website uses them; the module only controls the portal pages.

## 3. Farm records

### 3.1 Models — new Django app `records`

`docs/SYSTEM_DOCUMENTATION.md` §3.2 plans a `FarmPlot` entity for IoT and crop recommendation. `FarmField` below is that entity; name the Django model `FarmPlot` if you prefer. The API keeps the word "fields" because that is what farmers see in the UI.

| Model | Fields |
|---|---|
| `FarmField` | `id` UUID (primary key), `owner` FK User, `name` (120), `size_acres` Decimal(8,2) null, `crop` (80, blank), `planted_on` date null, `status` one of `growing` / `fallow` / `harvested`, `notes` text, timestamps |
| `FarmActivity` | `id` UUID, `owner`, `field` FK `FarmField` **SET_NULL** null, `date`, `activity_type` one of `planting` / `fertiliser` / `spraying` / `weeding` / `irrigation` / `harvest` / `labour` / `other`, `description` (255, blank), `cost` Decimal(10,2) default 0, `quantity` Decimal(10,3) null, `unit` (20, blank), timestamps |
| `FarmSale` | `id` UUID, `owner`, `field` FK **SET_NULL** null, `date`, `crop` (80), `quantity` Decimal(10,3), `unit` (20), `price_per_unit` Decimal(10,2), `buyer` (120, blank), timestamps |

Use UUID ids: the UI keeps ids as strings. Index `(owner, date)` on activities and sales. Deleting a field keeps its farm work and sales, with `field` set to null. The UI tells the farmer this before they confirm.

### 3.2 Endpoints

Permissions: `IsAuthenticated`, `IsFarmer`, `HasModule("farm-records")`. Every query is filtered by `owner=request.user`; another farmer's id returns `404`. Suggested throttle scope: `records`.

| Method and path | Purpose |
|---|---|
| `GET /api/v1/farm-records/` | Everything for the signed-in farmer (the UI filters by season itself) |
| `POST /api/v1/farm-records/fields/` · `PATCH`/`DELETE .../fields/{id}/` | Fields |
| `POST /api/v1/farm-records/activities/` · `PATCH`/`DELETE .../activities/{id}/` | Farm work |
| `POST /api/v1/farm-records/sales/` · `PATCH`/`DELETE .../sales/{id}/` | Sales |

`GET /api/v1/farm-records/`:

```json
{
  "fields": [
    { "id": "6b0f…", "name": "Lower plot", "size_acres": "1.50", "crop": "Maize", "planted_on": "2026-03-20", "status": "growing", "notes": "" }
  ],
  "activities": [
    { "id": "1c9e…", "date": "2026-04-15", "field": "6b0f…", "activity_type": "fertiliser", "description": "Top dressed with CAN", "cost": "3500.00", "quantity": "50.000", "unit": "kg" }
  ],
  "sales": [
    { "id": "a71d…", "date": "2026-10-06", "field": "6b0f…", "crop": "Beans", "quantity": "6.000", "unit": "bags", "price_per_unit": "7800.00", "buyer": "Mama Wanjiru, Kongowea" }
  ]
}
```

POST and PATCH bodies are the same objects without `id`. For example, a new sale:

```json
{ "date": "2026-10-06", "field": "6b0f…", "crop": "Beans", "quantity": 6, "unit": "bags", "price_per_unit": 7800, "buyer": "Mama Wanjiru, Kongowea" }
```

Each returns the saved object with its server `id`: `201` for POST, `200` for PATCH. DELETE returns `204`.

Validation: `field`, if given, must belong to the same owner. `cost >= 0`. A sale needs `quantity > 0` and `price_per_unit >= 0`. The UI offers the units `kg`, `bags`, `crates`, `tonnes`, `pieces` and `litres`; accept any text up to 20 characters.

### 3.3 Records already saved on phones

In preview mode, records live in each browser. Before turning the flag on, choose one:

- ask pilot farmers to use **Export CSV** first; or
- add `POST /api/v1/farm-records/import/`, which takes the stored JSON (`{fields, activities, sales}` in the UI's camelCase shape) and maps the old ids to new ones. The UI then adds a one-time "Move my records to my account" button.

Choose the import endpoint if pilot farmers have used the preview.

## 4. Shop POS (agrovets)

The till sells from the agrovet's own catalogue (`AgencyProduct`, fetched from `/api/v1/inputs/my-products/`) plus one-off "other items". It takes cash (with change), M-Pesa (code typed in) or credit (customer name and phone required). It prints receipts or sends them on WhatsApp. Sales history shows takings, payment split and best sellers, and voids sales with a reason.

### 4.1 Models — new Django app `pos`

| Model | Fields |
|---|---|
| `PosSale` | `agency` FK `AgencyProfile`, `client_ref` UUID, `receipt_no` (20), `created_at`, `subtotal` / `discount` / `total` Decimal(12,2), `payment_method` one of `cash` / `mpesa` / `credit`, `amount_received` Decimal null, `change` Decimal null, `mpesa_code` (12, blank), `customer_name` (120, blank), `customer_phone` (20, blank), `served_by` (150) plus optional `served_by_user` FK, `status` `completed` / `voided`, `void_reason` (200, blank), `voided_at` null, `voided_by` FK null |
| `PosSaleLine` | `sale` FK CASCADE, `product` FK `AgencyProduct` **SET_NULL** null, `name` (150) and `unit` (40) copied from the product at the time of sale, `unit_price` Decimal(10,2), `quantity` Decimal(10,3), `line_total` Decimal(12,2) |

Constraints: unique `(agency, client_ref)` and unique `(agency, receipt_no)`.

### 4.2 Endpoints

Permissions: `IsAuthenticated`, `IsAgency`, `HasModule("agrovet-pos")`. Every query is limited to `request.user.agency_profile`. Suggested throttle scope: `pos`.

**Time zone.** `settings.TIME_ZONE` is `UTC`, but the shop works in Kenya time. Read `from` / `to` and number receipts by day in `Africa/Nairobi`. A sale at 23:30 EAT belongs to that day.

**`GET /api/v1/pos/sales/?from=2026-09-30&to=2026-10-06`** — both dates inclusive, newest first, at most 92 days (otherwise `400`).

```json
{
  "sales": [
    {
      "id": 412,
      "receipt_no": "20261006-001",
      "created_at": "2026-10-06T09:14:03+03:00",
      "lines": [
        { "product_id": 18, "name": "DAP fertiliser", "unit": "50 kg bag", "unit_price": "3600.00", "quantity": "2.000", "line_total": "7200.00" },
        { "product_id": null, "name": "Gunny bags (used)", "unit": "", "unit_price": "50.00", "quantity": "10.000", "line_total": "500.00" }
      ],
      "subtotal": "7700.00",
      "discount": "100.00",
      "total": "7600.00",
      "payment_method": "cash",
      "amount_received": "8000.00",
      "change": "400.00",
      "mpesa_code": "",
      "customer_name": "",
      "customer_phone": "",
      "served_by": "Rift Agrovet Supplies",
      "status": "completed",
      "void_reason": ""
    }
  ]
}
```

**`POST /api/v1/pos/sales/`** — body as the till sends it:

```json
{
  "client_ref": "3f2b7c1e-9a51-4c1b-8f3e-2d6c0b9e7a11",
  "lines": [
    { "product_id": 18, "name": "DAP fertiliser", "unit": "50 kg bag", "unit_price": "3600.00", "quantity": 2 },
    { "product_id": null, "name": "Gunny bags (used)", "unit": "", "unit_price": "50.00", "quantity": 10 }
  ],
  "discount": "100.00",
  "payment_method": "cash",
  "amount_received": "8000.00",
  "mpesa_code": "",
  "customer_name": "",
  "customer_phone": ""
}
```

Returns `201` with the sale in the list shape. The server:

1. **Same `client_ref` again:** returns the existing sale with `200` and creates nothing. The till generates a new reference for every sale, so a retried request never records a sale twice.
2. Accepts 1–100 lines, each with `quantity > 0` and `unit_price > 0`. A `product_id` must be one of this agency's products (else `400`). The price may differ from the catalogue price; agrovets agree prices at the counter.
3. **Computes `subtotal`, `discount` (between 0 and subtotal), `total` and `change` itself.** It never trusts totals from the client.
4. Cash: if `amount_received` is given, it must be at least `total`. M-Pesa: stores `mpesa_code` in upper case. Credit: requires `customer_name` and `customer_phone`.
5. Sets `receipt_no` to `YYYYMMDD-NNN` per agency per Nairobi day. Make it safe when two cashiers sell at once: a counter row locked with `select_for_update`, or the unique constraint plus a retry.
6. Sets `served_by` to the agency name until shops have staff accounts.

The UI runs the same checks before sending (`validateSale` in `features/pos/repository.ts`). Use the same messages in `detail`.

**`POST /api/v1/pos/sales/{id}/void/`** — body `{"reason": "Rang up twice by mistake"}`. The reason is required, up to 200 characters. Only `completed` sales can be voided; otherwise `400`. Sets `status`, `void_reason`, `voided_at` and `voided_by`, and returns the sale. Voided sales stay in the list and are left out of takings.

### 4.3 Later (the current UI does not need these)

- Stock counts on `AgencyProduct`: subtract on sale, add back on void, warn at low stock.
- Confirm M-Pesa payments automatically (Daraja C2B / Buy Goods callback) instead of typing the code.
- Several cashiers per shop (staff accounts, `served_by_user`).
- A credit book: who owes what, and repayments.
- An end-of-day report, and SMS receipts.

## 5. Admin

- The admin **App store** page (`/admin/modules`) lists every module with an audience filter (farmers / agrovets), an on/off switch, the pricing model and the price. It uses §2.3. The installs and revenue columns show "—" until the API is on.
- Optional: add module revenue (`ModuleCharge`) to `/api/v1/admin/overview/` so it shows on the admin dashboard and revenue page.

## 6. Tests

**Modules**

- The catalog is filtered by role; switched-off modules come back with `enabled: false`.
- Install a free app; install a paid app with enough balance (wallet goes down, a `ModuleCharge` is created).
- Install with too little balance: `402`, and nothing changes.
- Installing twice charges once. Uninstall keeps data. Reinstalling a paid-once app does not charge.
- Monthly renewal: success moves `paid_until` on; failure deactivates the install.
- Admin PATCH validation. Non-staff users get `403` on admin endpoints. An agrovet gets `404` for a farmer app.

**Farm records**

- Create, update and delete each type.
- Owners are isolated: another farmer's id returns `404`.
- Deleting a field sets `field` to null on its farm work and sales.
- Without the module installed: `403`.

**Shop POS**

- Totals are computed on the server; a repeated `client_ref` returns the same sale.
- A product from another agency, a credit sale without a customer, or cash below the total: `400`.
- Receipt numbers run in sequence per agency per Nairobi day, including under concurrent requests.
- A void removes the sale from takings; voiding twice returns `400`.
- A range over 92 days returns `400`.

## 7. Rollout

1. Add the apps, models, migrations and the seed migration; write the tests above.
2. Deploy the API.
3. Turn on `NEXT_PUBLIC_MODULES_API` first, because Farm records and POS check installs, then rebuild and deploy `apps/web`.
4. Turn on `NEXT_PUBLIC_FARM_RECORDS_API` and `NEXT_PUBLIC_POS_API` (after deciding §3.3). Rebuild and deploy again.
5. Smoke-test with one pilot farmer and one pilot agrovet: install, record, sell, void, remove and reinstall.

## 8. Open questions

1. Paid agrovet apps: allow agency wallet top-ups? (Brian)
2. Renewal scheduler: cron or a `celery beat` service? (Wilson)
3. Import preview records (§3.3), or export only? (Wilson, Stephen)
4. How long data is kept after an app is removed, and the consent rules for sharing farm records with lenders. (Brian, Job)
