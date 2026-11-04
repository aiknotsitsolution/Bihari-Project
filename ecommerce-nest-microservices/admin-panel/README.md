# Admin Panel API Integration

This document describes the existing HTTP API for the admin frontend. It is based on the current gateway routes and DTO validation; it does not describe planned or unimplemented endpoints.

## Base URL and authentication

Set the API base URL per environment:

```text
Local Docker: http://localhost:8080/api
Local gateway without Docker: http://localhost:8000/api
```

The gateway listens on port `8000` inside Docker; `GATEWAY_HOST_PORT` controls the host port (default `8080`).

### Admin sign-in

```http
POST /auth/signin
Content-Type: application/json
```

```json
{
  "email": "admin@example.com",
  "password": "your-admin-password"
}
```

Response (`200`):

```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<opaque-refresh-token>",
  "user": {
    "id": "<uuid>",
    "fullName": "Platform Admin",
    "email": "admin@example.com",
    "role": "ADMIN",
    "isActive": true
  }
}
```

Send the access token on every admin endpoint:

```http
Authorization: Bearer <accessToken>
```

The access token is short-lived (default 15 minutes). Refresh it with `POST /auth/refresh` and body `{"refreshToken":"..."}`; the response has the same token shape as sign-in. Admin accounts are seeded from `ADMIN_EMAIL` and `ADMIN_PASSWORD` when the auth service starts. Public signup does not grant the admin role.

## Common API behavior

- All paths below are relative to `/api`.
- JSON request bodies use `Content-Type: application/json`.
- IDs are UUIDs.
- List endpoints return `{ "items": [], "total": 0, "page": 1, "limit": 20, "totalPages": 0 }`.
- Pagination query parameters: `page` (1-based) and `limit` (1–100). Defaults are `page=1`, `limit=20`.
- Successful responses return the resource directly (or the paginated object); there is no universal `{data: ...}` wrapper.
- DTO-validated request bodies and query fields reject unknown properties. Send only fields listed for an endpoint.
- Errors use NestJS HTTP error responses, commonly `{ "statusCode": 400, "message": "...", "error": "Bad Request" }`. A missing/invalid token returns `401`; an authenticated non-admin gets `403`; invalid UUIDs/DTOs return `400`; missing records return `404`; duplicate values or invalid state transitions may return `409`/`400`.

## Endpoint index

| Admin function | Method and path | Result |
|---|---|---|
| Customer accounts | `GET /admin/users` | Paginated users |
| Seller applications | `GET /admin/sellers` | Paginated sellers; optional `status` filter |
| Approve/reject/suspend seller | `PATCH /admin/sellers/:id/verification` | Updated seller |
| Product moderation queue | `GET /admin/products` | Paginated products |
| Approve/reject product | `PATCH /admin/products/:id/moderation` | Updated product |
| Category tree | `GET /categories` | Nested category array |
| Create/update/delete category | `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` | Category or `{success:true}` |
| Active brands | `GET /brands` | Brand array |
| All brands including inactive | `GET /brands/admin/all` | Brand array |
| Create/update/delete brand | `POST /brands`, `PATCH /brands/:id`, `DELETE /brands/:id` | Brand or `{success:true}` |
| All orders | `GET /admin/orders` | Paginated orders |
| Change order status | `PATCH /orders/:id/status` | Updated order |
| Manage coupons | `GET /coupons/manage` | Paginated coupons |
| Create/update coupon | `POST /coupons`, `PATCH /coupons/:id` | Coupon |
| Refund history | `GET /admin/refunds` | Paginated refunds |
| Issue refund | `POST /admin/refunds` | Refund |
| Payment transactions | `GET /admin/transactions` | Paginated transactions |

All routes in this index require the admin bearer token except the two brand/category read routes (`GET /categories`, `GET /brands`), which are public. `GET /brands/admin/all` does require admin authentication.

## Customer accounts

### `GET /admin/users?page=1&limit=20`

Returns all user accounts, newest first. The response includes customers and admin accounts; there is no role filter in this endpoint.

```json
{
  "items": [
    {
      "id": "<uuid>",
      "createdAt": "2026-10-30T10:00:00.000Z",
      "updatedAt": "2026-10-30T10:00:00.000Z",
      "fullName": "A Customer",
      "email": "customer@example.com",
      "mobile": "9999999999",
      "role": "CUSTOMER",
      "profileImage": null,
      "birthDate": null,
      "referralCode": "AB12CD34",
      "referredBy": null,
      "isActive": true
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

`passwordHash` is never returned. User activation/deactivation, editing arbitrary users, and user-detail-by-ID admin endpoints are not currently implemented.

## Seller verification

### `GET /admin/sellers?page=1&limit=20&status=PENDING`

`status` filters `verificationStatus`; accepted values are `PENDING`, `APPROVED`, and `REJECTED`. Omit it to list all sellers.

```json
{
  "items": [
    {
      "id": "<uuid>",
      "createdAt": "2026-10-30T10:00:00.000Z",
      "updatedAt": "2026-10-30T10:00:00.000Z",
      "sellerName": "Acme Store",
      "email": "seller@example.com",
      "mobile": "9999999999",
      "avatar": null,
      "isEmailVerified": false,
      "accountStatus": "PENDING_VERIFICATION",
      "verificationStatus": "PENDING",
      "businessDetails": {
        "businessName": "Acme Store",
        "GSTIN": "22AAAAA0000A1Z5",
        "businessAddress": "Mumbai"
      },
      "bankDetails": {
        "accountHolderName": "Acme Store",
        "accountNumber": "****1234",
        "IFSC": "HDFC0001234"
      },
      "pickupAddress": {
        "streetAddress": "1 Main Street",
        "city": "Mumbai",
        "state": "Maharashtra",
        "pinCode": "400001",
        "mobile": "9999999999"
      },
      "verificationHistory": []
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

Seller passwords and full bank account numbers are intentionally excluded/masked.

### `PATCH /admin/sellers/:id/verification`

Request:

```json
{
  "action": "APPROVE",
  "reason": "Documents verified"
}
```

`action` is required and must be `APPROVE`, `REJECT`, or `SUSPEND`; `reason` is optional.

- `APPROVE` sets `verificationStatus=APPROVED` and `accountStatus=ACTIVE`.
- `REJECT` sets `verificationStatus=REJECTED` and `accountStatus=REJECTED`.
- `SUSPEND` is allowed only for an active seller; it sets `accountStatus=SUSPENDED`.

Returns the updated seller object (same shape as the list item) and appends an entry to `verificationHistory`.

## Product moderation

### `GET /admin/products`

Returns all non-deleted products, newest first. Optional query fields:

| Query | Type | Meaning |
|---|---|---|
| `page`, `limit` | integer | Pagination |
| `q` | string | Case-insensitive match against title, description, or brand |
| `categoryId`, `sellerId` | UUID | Filter by category or seller |
| `brand` | string | Case-insensitive exact brand |
| `approvalStatus` | `PENDING`, `APPROVED`, `REJECTED` | Moderation status |
| `minPrice`, `maxPrice` | number | Selling price bounds |
| `sort` | `newest`, `price_asc`, `price_desc`, `discount` | Sort order; default is newest |

Example:

```http
GET /admin/products?approvalStatus=PENDING&page=1&limit=20&sort=newest
```

Each list item is a product record with active `variants`:

```json
{
  "id": "<uuid>",
  "createdAt": "2026-10-30T10:00:00.000Z",
  "updatedAt": "2026-10-30T10:00:00.000Z",
  "title": "Cotton Shirt",
  "description": "Lightweight everyday shirt",
  "mrpPrice": 1499,
  "sellingPrice": 999,
  "discountPercent": 33,
  "quantity": 20,
  "reservedQuantity": 0,
  "color": "Blue",
  "sizes": "M,L,XL",
  "brand": "Acme",
  "images": [
    { "url": "https://cdn.example.com/shirt.jpg", "publicId": "shirt", "isPrimary": true }
  ],
  "categoryId": "<uuid>",
  "sellerId": "<uuid>",
  "approvalStatus": "PENDING",
  "publishStatus": "DRAFT",
  "isFeatured": false,
  "isDeleted": false,
  "deletedAt": null,
  "moderationHistory": [],
  "variants": []
}
```

Variant fields include `id`, `productId`, `sku`, `attributes`, `price`, `mrpPrice`, `discountPercent`, `quantity`, `reservedQuantity`, `images`, `weight`, and `isActive`.

### `PATCH /admin/products/:id/moderation`

Request:

```json
{ "action": "REJECT", "reason": "Image does not match product" }
```

`action` is required (`APPROVE` or `REJECT`); `reason` is optional. Rejecting also sets `publishStatus=UNPUBLISHED`. Returns the updated product and moderation history. An approved product is not automatically published; the seller must publish it.

Product creation is seller-only. Product update/delete and publish endpoints exist separately; this admin-specific API does not include a product-create endpoint.

## Categories

### `GET /categories`

Returns a nested array; every category has `id`, `createdAt`, `updatedAt`, `name`, `categoryId` (URL-friendly identifier), `parentId`, `level` (1–3), `supportedAttributes`, and `children`.

```json
[
  {
    "id": "<uuid>",
    "name": "Clothing",
    "categoryId": "clothing",
    "parentId": null,
    "level": 1,
    "supportedAttributes": [],
    "children": []
  }
]
```

### `POST /categories`

Create a root category or a child by sending its parent UUID:

```json
{
  "name": "Men",
  "categoryId": "men",
  "parentId": "<parent-category-uuid>",
  "supportedAttributes": [{ "name": "Size", "values": ["M", "L", "XL"] }]
}
```

Required: `name`, `categoryId`. Optional: `parentId` (UUID), `supportedAttributes` (array). The maximum hierarchy depth is 3; `categoryId` is normalized to lowercase and must be unique.

### `PATCH /categories/:id`

Partial update; accepted fields are `name`, `categoryId`, and `supportedAttributes`. Parent reassignment is not supported.

### `DELETE /categories/:id`

Returns `{ "success": true }`. Deletion fails if the category has child categories or non-deleted products.

## Brands

### `GET /brands` and `GET /brands/admin/all`

Both return a brand array. The public route lists only active, non-deleted brands; the admin route also includes inactive brands (deleted brands remain excluded).

A brand has `id`, `createdAt`, `updatedAt`, `name`, `slug`, `description`, `logo`, `isActive`, `isFeatured`, `isDeleted`, `displayOrder`, `categoryIds`, and `createdBy`.

### `POST /brands`

```json
{
  "name": "Acme",
  "slug": "acme",
  "description": "Acme products",
  "logo": "https://cdn.example.com/acme.png",
  "isFeatured": true,
  "displayOrder": 1,
  "categoryIds": ["<category-uuid>"]
}
```

Required: `name`, `slug`. Other fields are optional. `categoryIds` must contain UUIDs. Name and slug must be unique.

### `PATCH /brands/:id`

Partial update using the same fields as creation, plus `isActive` (boolean).

### `DELETE /brands/:id`

Soft-deletes and deactivates the brand; returns `{ "success": true }`.

## Orders

### `GET /admin/orders?page=1&limit=20&status=PENDING`

Returns paginated orders, newest first, with `items` included. Optional `status` values are `PENDING`, `CONFIRMED`, `SHIPPED`, `DELIVERED`, and `CANCELLED`.

An order includes `id`, timestamps, `orderNumber`, `userId`, `sellerId`, `shippingAddress`, `totalMrpPrice`, `totalSellingPrice`, `couponPrice`, `couponCode`, `couponOwnerType`, `platformContribution`, `sellerContribution`, `totalPayable`, `totalItem`, `orderStatus`, `paymentStatus`, `paymentMethod`, `paymentOrderId`, `shipmentStatus`, `orderDate`, `deliverDate`, `reservationExpiresAt`, `trackingNumber`, `carrier`, `shippedAt`, `deliveredAt`, and `items`.

Each item has `id`, `orderId`, `productId`, `variantId`, `title`, `image`, `size`, `quantity`, `unitMrpPrice`, and `unitSellingPrice`. All monetary values are JSON numbers.

### `PATCH /orders/:id/status`

Request:

```json
{
  "status": "SHIPPED",
  "note": "Handed to carrier",
  "trackingNumber": "TRACK123",
  "carrier": "Example Express"
}
```

`status` is required. `note`, `trackingNumber`, and `carrier` are optional. Valid transitions are:

```text
PENDING   -> CONFIRMED | CANCELLED
CONFIRMED -> SHIPPED   | CANCELLED
SHIPPED   -> DELIVERED
DELIVERED -> (none)
CANCELLED -> (none)
```

An invalid transition is rejected. Setting `CANCELLED` invokes the cancellation flow; status changes also update shipment/payment information as applicable and create order history. Returns the updated order.

## Coupons

### `GET /coupons/manage?page=1&limit=20`

Requires admin or seller auth; for an admin it lists all coupons. Returns a paginated array of coupon records with fields including `id`, timestamps, `code`, `name`, `description`, `discountType`, `discountPercentage`, `discountValue`, `maximumDiscount`, `validityStartDate`, `validityEndDate`, `minimumOrderValue`, `usageLimit`, `usageCount`, `ownerType`, `sellerId`, and `isActive`.

### `POST /coupons`

```json
{
  "code": "WELCOME10",
  "name": "Welcome offer",
  "description": "10% off",
  "discountType": "PERCENTAGE",
  "discountPercentage": 10,
  "maximumDiscount": 200,
  "validityStartDate": "2026-11-01T00:00:00.000Z",
  "validityEndDate": "2026-12-01T23:59:59.000Z",
  "minimumOrderValue": 500,
  "usageLimit": 100,
  "isActive": true
}
```

Required: `code`, `discountType`, `validityStartDate`, `validityEndDate`. `discountType` is `PERCENTAGE` or `FLAT`; percentage coupons require `discountPercentage` from 1 to 100, flat coupons require `discountValue` greater than 0. `maximumDiscount`, `minimumOrderValue`, `usageLimit`, and discount amounts must be non-negative. Dates must be ISO date strings and end after start. Code is normalized to uppercase and must be unique. For admin-created coupons, `ownerType` is `PLATFORM` and `sellerId` is null.

### `PATCH /coupons/:id`

Partial update with the create fields. `code` is accepted by DTO validation but the service intentionally ignores it; use a new coupon if the code must change.

## Refunds and transactions

### `GET /admin/refunds?page=1&limit=20`

Returns paginated refunds, newest first. Refund fields: `id`, timestamps, `paymentOrderId`, `orderId`, `amount`, `status`, `reason`, `providerRefundId`, `requestedBy`, and `processedAt`.

### `POST /admin/refunds`

```json
{
  "orderId": "<order-uuid>",
  "amount": 250,
  "reason": "Item returned"
}
```

Required: UUID `orderId` and numeric `amount` greater than 0. `reason` is optional. The payment must be completed and cumulative refunds cannot exceed the amount paid. The current development payment provider is mock; production refund processing requires a real provider integration.

### `GET /admin/transactions?page=1&limit=20`

Returns paginated transactions, newest first. Fields: `id`, timestamps, `paymentOrderId`, `userId`, `type` (`PAYMENT` or `REFUND`), `amount`, `status`, and `providerRef`.

## Not currently available

The backend does not currently expose admin dashboard statistics/reports, admin user activation/deactivation, admin user detail/edit endpoints, a refund-approval queue, or admin product creation. Build those screens only if they use existing endpoints above; additional backend work is needed for the missing capabilities.
