import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { SocketService } from '../services/socket.service';
import {
  LogisticsItem,
  CreateLogisticsDto,
  UpdateLogisticsDto,
  BulkSaveLogisticsDto,
  LogisticsCategory
} from '../models';

interface LogisticsState {
  items: LogisticsItem[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class LogisticsStore implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly _state$ = new BehaviorSubject<LogisticsState>({
    items: [],
    isLoading: false,
    isSaving: false,
    hasUnsavedChanges: false,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly items$ = this._state$.pipe(map(s => s.items));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));
  readonly isSaving$ = this._state$.pipe(map(s => s.isSaving));
  readonly hasUnsavedChanges$ = this._state$.pipe(map(s => s.hasUnsavedChanges));
  readonly error$ = this._state$.pipe(map(s => s.error));

  constructor(
    private api: ApiService,
    private socket: SocketService
  ) {
    this.subscribeToSocketEvents();
  }

  private subscribeToSocketEvents(): void {
    // Item updates
    this.socket.logisticsUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        const current = this._state$.value.items;

        switch (event.action) {
          case 'created':
            if (!current.find(i => i.id === event.item.id)) {
              this.updateState({ items: [...current, event.item] });
            }
            break;

          case 'updated':
            this.updateState({
              items: current.map(i => i.id === event.item.id ? event.item : i)
            });
            break;

          case 'deleted':
            this.updateState({
              items: current.filter(i => i.id !== event.item.id)
            });
            break;
        }
      });

    // Bulk sync
    this.socket.logisticsSynced$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        this.updateState({
          items: event.items,
          hasUnsavedChanges: false
        });
      });
  }

  loadItems(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<LogisticsItem[]>('/api/logistics')
      .pipe(
        tap(items => {
          this.updateState({
            items,
            isLoading: false,
            hasUnsavedChanges: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load logistics items'
          });
          return of([]);
        })
      )
      .subscribe();
  }

  getItemsByDay(dayOfWeek: number): Observable<LogisticsItem[]> {
    return this.items$.pipe(
      map(items => items.filter(i => i.dayOfWeek === dayOfWeek))
    );
  }

  getItemsByCategory(category: LogisticsCategory): Observable<LogisticsItem[]> {
    return this.items$.pipe(
      map(items => items.filter(i => i.category === category))
    );
  }

  getItemsByDayAndCategory(dayOfWeek: number, category: LogisticsCategory): Observable<LogisticsItem[]> {
    return this.items$.pipe(
      map(items => items.filter(i => i.dayOfWeek === dayOfWeek && i.category === category))
    );
  }

  createItem(dto: CreateLogisticsDto): Observable<LogisticsItem> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<LogisticsItem>('/api/logistics', dto).pipe(
      tap(item => {
        const current = this._state$.value.items;
        if (!current.find(i => i.id === item.id)) {
          this.updateState({
            items: [...current, item],
            isLoading: false
          });
        } else {
          this.updateState({ isLoading: false });
        }
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to create item'
        });
        throw error;
      })
    );
  }

  updateItem(itemId: string, dto: UpdateLogisticsDto): Observable<LogisticsItem> {
    return this.api.patch<LogisticsItem>(`/api/logistics/${itemId}`, dto).pipe(
      tap(item => {
        const current = this._state$.value.items;
        this.updateState({
          items: current.map(i => i.id === item.id ? item : i)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to update item'
        });
        throw error;
      })
    );
  }

  assignItem(itemId: string, assignedToId: string | null): Observable<LogisticsItem> {
    return this.api.patch<LogisticsItem>(`/api/logistics/${itemId}/assign`, { assignedToId }).pipe(
      tap(item => {
        const current = this._state$.value.items;
        this.updateState({
          items: current.map(i => i.id === item.id ? item : i)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to assign item'
        });
        throw error;
      })
    );
  }

  deleteItem(itemId: string): Observable<void> {
    return this.api.delete<void>(`/api/logistics/${itemId}`).pipe(
      tap(() => {
        const current = this._state$.value.items;
        this.updateState({
          items: current.filter(i => i.id !== itemId)
        });
      }),
      catchError(error => {
        this.updateState({
          error: error.message || 'Failed to delete item'
        });
        throw error;
      })
    );
  }

  bulkSave(dto: BulkSaveLogisticsDto): Observable<LogisticsItem[]> {
    this.updateState({ isSaving: true, error: null });

    return this.api.post<LogisticsItem[]>('/api/logistics/bulk', dto).pipe(
      tap(items => {
        this.updateState({
          items,
          isSaving: false,
          hasUnsavedChanges: false
        });
      }),
      catchError(error => {
        this.updateState({
          isSaving: false,
          error: error.message || 'Failed to save items'
        });
        throw error;
      })
    );
  }

  // Local state modifications (for drag-and-drop before saving)
  updateLocalItem(itemId: string, updates: Partial<LogisticsItem>): void {
    const current = this._state$.value.items;
    this.updateState({
      items: current.map(i => i.id === itemId ? { ...i, ...updates } : i),
      hasUnsavedChanges: true
    });
  }

  addLocalItem(item: Omit<LogisticsItem, 'id' | 'createdAt'>): void {
    const tempId = `temp_${Date.now()}`;
    const newItem: LogisticsItem = {
      ...item,
      id: tempId,
      createdAt: new Date().toISOString()
    } as LogisticsItem;

    const current = this._state$.value.items;
    this.updateState({
      items: [...current, newItem],
      hasUnsavedChanges: true
    });
  }

  removeLocalItem(itemId: string): void {
    const current = this._state$.value.items;
    this.updateState({
      items: current.filter(i => i.id !== itemId),
      hasUnsavedChanges: true
    });
  }

  clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(partial: Partial<LogisticsState>): void {
    this._state$.next({
      ...this._state$.value,
      ...partial
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
