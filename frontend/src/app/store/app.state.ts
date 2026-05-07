import type { WsState } from './ws/ws.reducer';
import type { TableState } from './table/table.reducer';
import type { RangeState } from './range/range.reducer';
import type { ChartState } from './chart/chart.reducer';
import type { UiState } from './ui/ui.reducer';

export interface AppState {
  ws: WsState;
  table: TableState;
  range: RangeState;
  chart: ChartState;
  ui: UiState;
}
