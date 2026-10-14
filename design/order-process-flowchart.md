# AgriVerse order process flowchart

This maps the order behavior currently represented in the backend and database migrations, and labels the steps still needed to complete refunds. **Order status** and **payment status** are separate: an order can be `cancelled` while a payment still needs attention.

## 1. Place and fulfill an order

```mermaid
flowchart TD
    A([Buyer checks out]) --> B{Items, stock, address, and choices valid?}
    B -- No --> B1[Show error; buyer corrects checkout] --> A
    B -- Yes --> C[Create order: pending; reserve inventory]
    C --> P{Payment method}
    P -- GCash --> G[Start PayMongo payment; payment pending]
    G --> G1{Payment result}
    G1 -- Failed --> G2[Payment failed; buyer may retry] --> G
    G1 -- Paid --> Q[Payment paid]
    G1 -- Still pending --> G3[Wait or check payment status] --> G1
    P -- Cash --> K[Payment unpaid until delivery handoff]
    P -- Bank --> L[Payment pending; manual payment handling needs definition]
    Q --> S[Seller reviews pending order]
    K --> S
    L --> S
    G2 -. Order remains open .-> S
    G3 -. Order remains open .-> S
    S --> X{Cancel before preparing?}
    X -- Yes --> CXL[Go to cancellation flow]
    X -- No --> F[Seller confirms, then starts preparing]
    F --> M{Delivery method}
    M -- Pickup --> U[Seller marks ready for pickup]
    U --> U1[Buyer arrives; seller verifies order and marks picked up]
    U1 --> DONE([Order completed])
    M -- Delivery --> D[Seller marks ready for delivery]
    D --> D1[Admin assigns driver and schedule]
    D1 --> D2[Driver accepts and collects order]
    D2 --> D3[Driver starts delivery]
    D3 --> D4[Driver hands over order and uploads proof]
    D4 --> D5[Order delivered; cash payment marked paid]
    D5 --> R{Buyer response}
    R -- Confirms receipt --> DONE
    R -- Reports a problem --> DIS[Go to dispute and refund flow]
    R -- No response for 3 days --> AUTO[Auto-complete when buyer next opens order] --> DONE
    DONE -. Problem reported later .-> DIS
```

## 2. Cancellation from either side

```mermaid
flowchart TD
    A([Buyer or seller requests cancellation]) --> B{Order pending or confirmed?}
    B -- No --> N[Cancellation rejected; if handed over, use dispute flow]
    B -- Yes --> C{Who cancels?}
    C -- Buyer --> D[Buyer selects reason; system checks ownership]
    C -- Seller --> E[Seller records reason]
    D --> F[Set order cancelled; return allocated stock; save history]
    E --> F
    F --> G{Was money collected?}
    G -- No: cash unpaid or payment failed --> H[No refund due]
    G -- GCash pending --> V[TODO: reconcile payment; refund if it later settles]
    G -- Yes: paid GCash, buyer cancellation --> I[System records full refund amount and marks payment refunded]
    G -- Yes: paid GCash, seller cancellation --> J[No automatic refund handling in seller cancellation]
    G -- Bank or other payment state --> K[Payment and refund need manual review]
    I --> L[TODO: send refund and verify settlement]
    J --> L
    K --> L
    H --> Z([Cancellation closed])
    V --> L
    L --> Z
```

**Current limitation:** The buyer cancellation function marks paid GCash as `refunded` and sets `refunded_at`, but makes no PayMongo refund call. Seller cancellation restores inventory but has no equivalent refund step. The `refunded` label therefore does not prove the buyer received money.

Seller confirmation is not currently blocked by a pending or failed payment. A GCash payment can also settle after cancellation, so the pending-payment branch needs explicit reconciliation.

## 3. Problem after delivery or pickup

```mermaid
flowchart TD
    A([Buyer reports damaged, spoiled, wrong, missing, or short item]) --> B{Order delivered or completed, with no existing dispute?}
    B -- No --> X[Reject duplicate or ineligible report]
    B -- Yes --> C[Buyer selects item and quantity; adds reason and photo]
    C --> D{Delivery method}
    D -- Pickup --> E[Route to seller]
    D -- Delivery --> F[Route to seller or driver by problem category]
    E --> G[Responsible party responds]
    F --> G
    G --> H[Admin reviews evidence and response]
    H --> I{Admin decision}
    I -- Dismiss --> J[Record reason; resolve dispute]
    I -- Refund --> K[Choose partial or full amount, up to order total]
    K --> L{Payment method}
    L -- GCash --> M[Record refund approval; actual PayMongo refund not automated]
    L -- Cash or bank --> N[Enter reference for manual cash or bank refund]
    M --> O[Mark payment refunded; resolve dispute]
    N --> O
    J --> P([Order completed; buyer notified])
    O --> P
```

**Decision points to define before implementing a complete refund workflow:** who executes and verifies GCash refunds, how bank payments are confirmed, whether pickup cash is marked paid at handoff, what happens if payment succeeds after cancellation, and when `payment_status = refunded` should be set. A safer target is `refund requested → approved → sent → confirmed`, with a transaction reference and failure/retry handling before showing the buyer that a refund is complete.

## Source of current behavior

- [Buyer orders](../backend/routes/buyer-orders.js) — checkout, buyer cancellation, delivery confirmation, disputes, and 3-day auto-completion.
- [Seller orders](../backend/routes/seller-orders.js) and [pickup migration](../supabase/migrations/031_pickup_order_flow.sql) — seller status changes and pickup branch.
- [Driver orders](../backend/routes/driver-orders.js) — delivery handoff, proof, and cash payment status.
- [Admin deliveries](../backend/routes/admin-deliveries.js) — dispute resolution and refund recording.
- [Buyer cancellation migration](../supabase/migrations/027_buyer_order_cancellation.sql) — buyer cancellation and inventory restoration.
- [PayMongo webhook](../backend/routes/paymongo-webhook.js) — GCash payment success and failure updates.
