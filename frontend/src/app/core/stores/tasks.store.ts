import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, of } from 'rxjs';
import { catchError, map, takeUntil, tap } from 'rxjs/operators';
import { ApiService } from '../services/api.service';
import { SocketService, TaskUpdateEvent } from '../services/socket.service';
import { Task, CreateTaskDto, UpdateTaskDto, TaskStatus } from '../models';

interface TasksState {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class TasksStore implements OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly _state$ = new BehaviorSubject<TasksState>({
    tasks: [],
    isLoading: false,
    error: null
  });

  // Public selectors
  readonly state$ = this._state$.asObservable();
  readonly tasks$ = this._state$.pipe(map(s => s.tasks));
  readonly isLoading$ = this._state$.pipe(map(s => s.isLoading));
  readonly error$ = this._state$.pipe(map(s => s.error));

  // Filtered task streams
  readonly mustDoTasks$ = this.tasks$.pipe(
    map(tasks => tasks.filter(t => t.isMustDo && t.status !== 'COMPLETED'))
  );

  readonly todayTasks$ = this.tasks$.pipe(
    map(tasks => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return tasks.filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due >= today && due < tomorrow && t.status !== 'COMPLETED';
      });
    })
  );

  readonly pendingTasks$ = this.tasks$.pipe(
    map(tasks => tasks.filter(t => t.status === 'PENDING'))
  );

  readonly inProgressTasks$ = this.tasks$.pipe(
    map(tasks => tasks.filter(t => t.status === 'IN_PROGRESS'))
  );

  readonly completedTasks$ = this.tasks$.pipe(
    map(tasks => tasks.filter(t => t.status === 'COMPLETED'))
  );

  readonly overdueTasks$ = this.tasks$.pipe(
    map(tasks => {
      const now = new Date();
      return tasks.filter(t => {
        if (!t.dueDate || t.status === 'COMPLETED') return false;
        return new Date(t.dueDate) < now;
      });
    })
  );

  constructor(
    private api: ApiService,
    private socket: SocketService
  ) {
    this.subscribeToSocketEvents();
  }

  /**
   * Subscribe to real-time task updates
   */
  private subscribeToSocketEvents(): void {
    this.socket.taskUpdate$
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => this.handleTaskUpdate(event));
  }

  /**
   * Handle incoming socket task events
   */
  private handleTaskUpdate(event: TaskUpdateEvent): void {
    const current = this._state$.value.tasks;

    switch (event.action) {
      case 'created':
        this.updateState({ tasks: [...current, event.task] });
        break;

      case 'updated':
      case 'completed':
        this.updateState({
          tasks: current.map(t => t.id === event.task.id ? event.task : t)
        });
        break;

      case 'deleted':
        this.updateState({
          tasks: current.filter(t => t.id !== event.task.id)
        });
        break;
    }
  }

  /**
   * Load all tasks for the household
   */
  loadTasks(): void {
    this.updateState({ isLoading: true, error: null });

    this.api.get<Task[]>('/api/tasks')
      .pipe(
        tap(tasks => {
          this.updateState({
            tasks,
            isLoading: false
          });
        }),
        catchError(error => {
          this.updateState({
            isLoading: false,
            error: error.message || 'Failed to load tasks'
          });
          return of([]);
        })
      )
      .subscribe();
  }

  /**
   * Get tasks for a specific user
   */
  getTasksForUser(userId: string): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(t =>
        t.assignedToId === userId || t.createdById === userId
      ))
    );
  }

  /**
   * Get tasks by category
   */
  getTasksByCategory(category: string): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(t => t.category === category))
    );
  }

  /**
   * Create a new task
   */
  createTask(dto: CreateTaskDto): Observable<Task> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<Task>('/api/tasks', dto).pipe(
      tap(task => {
        // Task will be added via socket event, but add optimistically
        const current = this._state$.value.tasks;
        if (!current.find(t => t.id === task.id)) {
          this.updateState({
            tasks: [...current, task],
            isLoading: false
          });
        } else {
          this.updateState({ isLoading: false });
        }
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to create task'
        });
        throw error;
      })
    );
  }

  /**
   * Update a task
   */
  updateTask(taskId: string, dto: UpdateTaskDto): Observable<Task> {
    this.updateState({ isLoading: true, error: null });

    return this.api.patch<Task>(`/api/tasks/${taskId}`, dto).pipe(
      tap(task => {
        const current = this._state$.value.tasks;
        this.updateState({
          tasks: current.map(t => t.id === task.id ? task : t),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to update task'
        });
        throw error;
      })
    );
  }

  /**
   * Complete a task (via WebSocket for real-time coin updates)
   */
  completeTask(taskId: string): Observable<{ success: boolean; coinsEarned: number }> {
    return this.socket.completeTask(taskId).pipe(
      tap(result => {
        if (result.success) {
          const current = this._state$.value.tasks;
          this.updateState({
            tasks: current.map(t =>
              t.id === taskId
                ? { ...t, status: 'COMPLETED' as TaskStatus, completedAt: new Date().toISOString() }
                : t
            )
          });
        }
      })
    );
  }

  /**
   * Approve task completion and award coins (adults only)
   */
  approveTaskCompletion(taskId: string, completedById: string): Observable<Task> {
    this.updateState({ isLoading: true, error: null });

    return this.api.post<Task>(`/api/tasks/${taskId}/approve-completion`, { completedById }).pipe(
      tap(task => {
        const current = this._state$.value.tasks;
        this.updateState({
          tasks: current.map(t => t.id === task.id ? task : t),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to approve task completion'
        });
        throw error;
      })
    );
  }

  /**
   * Delete a task
   */
  deleteTask(taskId: string): Observable<void> {
    this.updateState({ isLoading: true, error: null });

    return this.api.delete<void>(`/api/tasks/${taskId}`).pipe(
      tap(() => {
        const current = this._state$.value.tasks;
        this.updateState({
          tasks: current.filter(t => t.id !== taskId),
          isLoading: false
        });
      }),
      catchError(error => {
        this.updateState({
          isLoading: false,
          error: error.message || 'Failed to delete task'
        });
        throw error;
      })
    );
  }

  /**
   * Claim a task (assign to current user)
   */
  claimTask(taskId: string, userId: string): Observable<Task> {
    return this.updateTask(taskId, {
      assignedToId: userId,
      status: 'IN_PROGRESS'
    });
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.updateState({ error: null });
  }

  private updateState(partial: Partial<TasksState>): void {
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
