# Skill: Multi-table selector (ETF / Portfolio Tickers)

## What we're building

Replace the single hardcoded `MultiQuoteTable` / `MultiQuoteAll` data source with two switchable datasets:

| ID | Table CSV | Chart CSV | Display label |
|---|---|---|---|
| `etf` | `EtfTable.csv` | `EtfTableAll.csv` | ETF |
| `portfolioTickers` | `PortfolioTickersTable.csv` | `PortfolioTickersTableAll.csv` | Tickers |

A selector chip lets the user switch the active dataset. Each dataset independently remembers its selected rows, Y1/Y2 keys, and sort state. The Chart tab always uses the active dataset's chart data.

---

## Data files

All CSVs live in `etf-buy-bot-angular/data/`. Same format as the old files (semicolon delimiter). `MultiQuoteTable.csv` and `MultiQuoteAll.csv` are no longer used.

---

## WS protocol changes

### APPLY_FILTER (frontend → backend)
Add `tableId` field:
```ts
{
  tableId: 'etf' | 'portfolioTickers';   // NEW
  symbols: string[];
  y1Key: string | null;
  y2Key: string | null;
  range?: { preset, anchorIso, leftSteps, rightSteps };
}
```

### INIT_TABLE (backend → frontend)
Add `tableId` field so the frontend knows which slot to store the data in:
```ts
{
  tableId: 'etf' | 'portfolioTickers';   // NEW
  columns: TableColumn[];
  rows: TableRow[];
}
```

`DATA_SNAPSHOT` is unchanged — backend just uses the right "All" CSV based on `tableId`.

---

## State shape (table slice)

Replace the flat `table` slice with:

```ts
export type TableId = 'etf' | 'portfolioTickers';

interface TableInstanceState {
  columns: TableColumn[];
  rows: TableRow[];
  selectedRowIds: string[];
  y1Key: string | null;
  y2Key: string | null;
  sortKey: string | null;
  sortDir: 'asc' | 'desc' | null;
}

interface TableState {
  activeTableId: TableId;
  tables: Record<TableId, TableInstanceState>;
}
```

Initial state:
```ts
const emptyInstance: TableInstanceState = {
  columns: [], rows: [], selectedRowIds: [],
  y1Key: null, y2Key: null, sortKey: null, sortDir: null,
};
const initialState: TableState = {
  activeTableId: 'etf',
  tables: { etf: emptyInstance, portfolioTickers: emptyInstance },
};
```

### Persist (localStorage)
```
activeTableId
tables.etf.selectedRowIds
tables.etf.y1Key
tables.etf.y2Key
tables.portfolioTickers.selectedRowIds
tables.portfolioTickers.y1Key
tables.portfolioTickers.y2Key
```
Do NOT persist `columns` or `rows` (always re-fetched from backend).

---

## Actions

```ts
export const TableActions = createActionGroup({
  source: 'Table',
  events: {
    'Set Active Table': props<{ tableId: TableId }>(),
    'Init Table': props<{ tableId: TableId; columns: TableColumn[]; rows: TableRow[] }>(),
    // All below operate on the ACTIVE table:
    'Toggle Row': props<{ id: string }>(),
    'Set Selected Row Ids': props<{ ids: string[] }>(),
    'Set Y1 Key': props<{ key: string | null }>(),
    'Set Y2 Key': props<{ key: string | null }>(),
    'Set Sort': props<{ key: string; dir: 'asc' | 'desc' | null }>(),
    'Clear All': emptyProps(),
  },
});
```

## Selectors

```ts
selectActiveTableId        → state.table.activeTableId
selectActiveInstance       → state.table.tables[activeTableId]
selectColumns              → activeInstance.columns
selectRows                 → activeInstance.rows
selectSelectedRowIds       → activeInstance.selectedRowIds
selectY1Key                → activeInstance.y1Key
selectY2Key                → activeInstance.y2Key
selectSortKey              → activeInstance.sortKey
selectSortDir              → activeInstance.sortDir
```

All selectors that previously pointed at the flat slice now point through `activeInstance`.

---

## Effects

### scheduleApply effect

Trigger on any of:
- `TableActions.setActiveTable` — table switch → new INIT_TABLE + new DATA_SNAPSHOT needed
- `TableActions.toggleRow`, `setSelectedRowIds`, `setY1Key`, `setY2Key`
- Range slice actions (same as before)
- `WsActions.statusChanged` (CONNECTED)

Debounce 200ms. Payload now includes `tableId`.

### INIT_TABLE dispatch (in AppComponent `connectWsToStore`)

```ts
if (msg.wsMsgType === 'INIT_TABLE' && msg.table) {
  this.store.dispatch(TableActions.initTable({
    tableId: msg.table.tableId,
    columns: msg.table.columns,
    rows: msg.table.rows,
  }));
}
```

---

## UI changes

### Table selector chip

A two-option chip row (similar to wallet header bar chips). Labels: **ETF** and **Tickers**.  
Dispatch `TableActions.setActiveTable({ tableId })` on click. Active chip is highlighted.

**Placed in two spots:**
1. `ChartHeaderBarComponent` — left side, before the row-count chip
2. `TableTabComponent` — top of tab, above the table

Since both bind to `selectActiveTableId` from the store, they stay in sync automatically.

### TableTabComponent

- Add the table selector chip row at the top.
- Everything else (table, checkboxes, sort, Y1/Y2 header checkboxes) stays the same — just driven by `selectActiveInstance` selectors instead of flat selectors.

### ChartHeaderBarComponent

- Add table selector chip row/inline before current content.
- Y1/Y2 buttons already read from the active instance via selectors — no logic change needed there.

### ChartTabComponent / Effects

- `scheduleApply` already watches Y1/Y2/rows/range — just add `tableId` to the outgoing APPLY_FILTER payload.

---

## Backend changes (middleware)

### DataRepo / DataSnapshotService

Load both CSV pairs at startup:
```ts
const repos = {
  etf: new DataRepo({ fileName: 'EtfTable.csv', allFileName: 'EtfTableAll.csv' }),
  portfolioTickers: new DataRepo({ fileName: 'PortfolioTickersTable.csv', allFileName: 'PortfolioTickersTableAll.csv' }),
};
```

### wsServer.ts — INIT_TABLE

On first connect (or on APPLY_FILTER), send INIT_TABLE for the requested `tableId`:
```ts
ws.send(JSON.stringify({
  type: 'INIT_TABLE',
  payload: {
    tableId,
    columns: repos[tableId].getColumns(),
    rows: repos[tableId].getRows(),
  },
}));
```

### wsServer.ts — APPLY_FILTER handler

Read `tableId` from the incoming payload, use `repos[tableId]` for both table data and snapshot service.

---

## ws.types.ts changes

```ts
export type TableId = 'etf' | 'portfolioTickers';

// InitTablePayload — add tableId field
export type InitTablePayload = {
  tableId: TableId;
  columns: TableColumn[];
  rows: TableRow[];
};

// ApplyFilterPayload — add tableId field
export type ApplyFilterPayload = {
  tableId: TableId;
  symbols: string[];
  y1Key: string | null;
  y2Key: string | null;
  range?: RangeFilter;
};
```

---

## Implementation order

1. **ws.types.ts** — add `TableId`, update `InitTablePayload` and `ApplyFilterPayload`
2. **Backend middleware** — load both repo pairs, thread `tableId` through INIT_TABLE and APPLY_FILTER handler
3. **table.actions.ts** — new action group with `setActiveTable`, `initTable` (with tableId), active-instance actions
4. **table.reducer.ts** — new nested state shape, all existing actions rewritten to target `tables[activeTableId]`
5. **table.selectors.ts** — rewrite all selectors to go through `activeInstance`
6. **store/index.ts** — update localStorage sync keys for nested paths
7. **app.ts** — update INIT_TABLE dispatch to include `tableId`
8. **ChartEffects / scheduleApply** — add `tableId` to APPLY_FILTER payload, watch `setActiveTable`
9. **Table selector chip component** (new small standalone component, reusable)
10. **ChartHeaderBarComponent** — add table selector chip
11. **TableTabComponent** — add table selector chip at top
12. **Compile check** — fix any selector references broken by the state shape change

---

## Commit scope

`feat(table): multi-table selector — ETF / Portfolio Tickers with isolated per-table state`
