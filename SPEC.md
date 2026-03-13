# 📜 Family Planner App: "MishpachaHub" (פמילי-האב)

## 1. Project Overview

A gamified, collaborative family organization tool built for Hebrew-speaking families. It features a dual-interface system: a **"Command Center"** for adults/admins and a **"Playground"** for kids.

### Core Pillars

* **Organization:** Calendar, school/kindergarten sync, and renovation/trip planning.
* **Gamification:** FamCoins, reward shop, and "Yes Day" vouchers.
* **Communication:** Mood meters, voice-to-task AI, and "Are we there yet?" tracking.
* **Localization:** Full RTL (Right-to-Left) support for Hebrew.

---

## 2. Tech Stack

### Frontend
* **Framework:** Angular 17+ (Standalone Components)
* **State Management:** RxJS (BehaviorSubjects, ReplaySubjects, custom stores)
* **Change Detection:** `OnPush` strategy throughout (immutable data patterns)
* **Styling:** Tailwind CSS + SCSS for complex animations
* **RTL:** Angular CDK Bidi module
* **i18n:** ngx-translate with Hebrew as primary
* **Real-time:** Socket.io-client for WebSocket connections
* **Push Notifications:** Web Push API + Service Workers

### Backend
* **Runtime:** Node.js 20+ (Express.js)
* **Real-time:** Socket.io server
* **Push:** web-push library (VAPID keys)
* **Database:** PostgreSQL via Prisma ORM
* **Validation:** Zod schemas
* **Auth:** Google OAuth 2.0 + JWT (HttpOnly cookies)
* **Hosting:** Railway.app

### Infrastructure
* **Storage:** Google Cloud Storage (Signed URLs)
* **AI:** Anthropic Claude API
* **Cron Jobs:** node-cron for daily memo

---

## 3. Architecture Decisions (Senior Level)

### 3.1 Change Detection Strategy
```typescript
// ALL components use OnPush
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})

// Data flows via Observables - NO manual change detection
// Use async pipe in templates exclusively
```

### 3.2 RxJS State Management Pattern
```typescript
// Store pattern - NOT signals, NOT NgRx (overkill for this)
@Injectable({ providedIn: 'root' })
export class TasksStore {
  private readonly _tasks$ = new BehaviorSubject<Task[]>([]);
  private readonly _loading$ = new BehaviorSubject<boolean>(false);
  private readonly _error$ = new BehaviorSubject<string | null>(null);

  // Public selectors (readonly)
  readonly tasks$ = this._tasks$.asObservable();
  readonly loading$ = this._loading$.asObservable();
  readonly mustDoTasks$ = this._tasks$.pipe(
    map(tasks => tasks.filter(t => t.isMustDo)),
    distinctUntilChanged()
  );

  // Derived state
  readonly viewModel$ = combineLatest([
    this.tasks$,
    this.loading$,
    this.error$
  ]).pipe(
    map(([tasks, loading, error]) => ({ tasks, loading, error }))
  );

  // Actions
  loadTasks(): void { /* ... */ }
  completeTask(id: string): void { /* ... */ }
}
```

### 3.3 WebSocket Architecture
```typescript
// Centralized socket service with reconnection logic
@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;
  private readonly _connected$ = new BehaviorSubject<boolean>(false);

  // Typed event streams
  readonly taskUpdated$ = new Subject<TaskUpdateEvent>();
  readonly coinEarned$ = new Subject<CoinEvent>();
  readonly familyMoodChanged$ = new Subject<MoodEvent>();

  connect(token: string): void {
    this.socket = io(environment.wsUrl, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.socket.on('task:updated', (data) => this.taskUpdated$.next(data));
    this.socket.on('coins:earned', (data) => this.coinEarned$.next(data));
  }

  // Emit with acknowledgment
  emit<T>(event: string, data: any): Observable<T> {
    return new Observable(observer => {
      this.socket.emit(event, data, (response: T) => {
        observer.next(response);
        observer.complete();
      });
    });
  }
}
```

### 3.4 Push Notifications
```typescript
// Service Worker registration + VAPID subscription
@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  async init(): Promise<void> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      this.swRegistration = await navigator.serviceWorker.register('/ngsw-worker.js');
    }
  }

  async subscribe(): Promise<PushSubscription> {
    const subscription = await this.swRegistration!.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: this.urlBase64ToUint8Array(environment.vapidPublicKey)
    });

    // Send subscription to backend
    await this.http.post('/api/push/subscribe', subscription).toPromise();
    return subscription;
  }
}
```

### 3.5 Smart vs Dumb Components
```
├── containers/          # Smart components (inject services, handle state)
│   └── task-list.container.ts
├── components/          # Dumb/Presentational (inputs/outputs only)
│   ├── task-card.component.ts
│   └── task-form.component.ts
```

---

## 4. Security Implementation

### 4.1 Authentication Flow
```
1. User clicks "Login with Google"
2. Frontend redirects to Google OAuth
3. Google redirects to /auth/google/callback with code
4. Backend exchanges code for tokens
5. Backend creates session + sets HttpOnly JWT cookie
6. Frontend receives user data (no token exposure)
```

### 4.2 Multi-Tenant Data Isolation
```typescript
// Middleware extracts household_id from JWT
export const householdGuard = (req, res, next) => {
  const householdId = req.user.householdId;
  req.householdScope = { where: { householdId } };
  next();
};

// All queries automatically scoped
const tasks = await prisma.task.findMany({
  ...req.householdScope,
  // other filters
});
```

---

## 5. Database Schema (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Household {
  id           String   @id @default(uuid())
  familyNameHe String   @map("family_name_he")
  createdAt    DateTime @default(now()) @map("created_at")

  users        User[]
  tasks        Task[]
  rewards      Reward[]
  events       CalendarEvent[]

  @@map("households")
}

model User {
  id            String   @id @default(uuid())
  householdId   String   @map("household_id")
  email         String   @unique
  googleId      String   @unique @map("google_id")
  role          Role     @default(KID)
  displayNameHe String   @map("display_name_he")
  avatarUrl     String?  @map("avatar_url")
  avatarState   Json     @default("{\"level\": 1, \"type\": \"monster\"}") @map("avatar_state")
  famCoins      Int      @default(0) @map("fam_coins")
  isActive      Boolean  @default(true) @map("is_active")
  pushSubscription Json? @map("push_subscription")

  household     Household @relation(fields: [householdId], references: [id])
  createdTasks  Task[]    @relation("TaskCreator")
  assignedTasks Task[]    @relation("TaskAssignee")
  moodLogs      MoodLog[]

  @@map("users")
}

model Task {
  id           String     @id @default(uuid())
  householdId  String     @map("household_id")
  creatorId    String     @map("creator_id")
  assignedToId String?    @map("assigned_to_id")
  titleHe      String     @map("title_he")
  descriptionHe String?   @map("description_he")
  category     TaskCategory @default(HOME)
  isMustDo     Boolean    @default(false) @map("is_must_do")
  pointsReward Int        @default(10) @map("points_reward")
  status       TaskStatus @default(TODO)
  dueDate      DateTime?  @map("due_date")
  createdAt    DateTime   @default(now()) @map("created_at")
  completedAt  DateTime?  @map("completed_at")

  household    Household  @relation(fields: [householdId], references: [id])
  creator      User       @relation("TaskCreator", fields: [creatorId], references: [id])
  assignedTo   User?      @relation("TaskAssignee", fields: [assignedToId], references: [id])

  @@map("tasks")
}

model Reward {
  id                String   @id @default(uuid())
  householdId       String   @map("household_id")
  itemNameHe        String   @map("item_name_he")
  description       String?
  costCoins         Int      @map("cost_coins")
  quantityAvailable Int      @default(-1) @map("quantity_available")
  iconEmoji         String   @default("🎁") @map("icon_emoji")
  isActive          Boolean  @default(true) @map("is_active")

  household         Household @relation(fields: [householdId], references: [id])

  @@map("rewards")
}

model MoodLog {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  mood      Mood
  note      String?
  loggedAt  DateTime @default(now()) @map("logged_at")

  user      User     @relation(fields: [userId], references: [id])

  @@map("mood_logs")
}

model CalendarEvent {
  id           String   @id @default(uuid())
  householdId  String   @map("household_id")
  titleHe      String   @map("title_he")
  description  String?
  startTime    DateTime @map("start_time")
  endTime      DateTime @map("end_time")
  category     EventCategory @default(FAMILY)
  isRecurring  Boolean  @default(false) @map("is_recurring")
  recurrenceRule String? @map("recurrence_rule")

  household    Household @relation(fields: [householdId], references: [id])

  @@map("calendar_events")
}

enum Role {
  ADMIN
  ADULT
  KID
}

enum TaskStatus {
  TODO
  PENDING_APPROVAL
  DONE
}

enum TaskCategory {
  SCHOOL
  HOME
  TRIP
  RENOVATION
}

enum Mood {
  GREAT
  GOOD
  OKAY
  SAD
  ANGRY
}

enum EventCategory {
  SCHOOL
  WORK
  FAMILY
  MEDICAL
  ACTIVITY
}
```

---

## 6. API Endpoints

### Auth
```
POST   /auth/google/callback     # OAuth code exchange
POST   /auth/logout              # Clear session
GET    /auth/me                  # Current user + household
```

### Tasks
```
GET    /api/tasks                # List (filtered by household + role)
POST   /api/tasks                # Create task
PATCH  /api/tasks/:id            # Update task
PATCH  /api/tasks/:id/complete   # Mark complete (triggers coins)
DELETE /api/tasks/:id            # Soft delete
```

### Users & Family
```
GET    /api/household            # Family overview + members
PATCH  /api/users/:id/mood       # Log mood
GET    /api/users/:id/coins      # Coin history
POST   /api/users/:id/coins      # Admin: adjust coins
```

### Rewards
```
GET    /api/rewards              # List available rewards
POST   /api/rewards              # Admin: create reward
POST   /api/rewards/:id/redeem   # Kid redeems (deduct coins)
```

### Calendar
```
GET    /api/calendar             # Events (with date range)
POST   /api/calendar             # Create event
PATCH  /api/calendar/:id         # Update event
```

### AI & Push
```
POST   /api/ai/voice-to-task     # Audio blob → Task JSON
POST   /api/push/subscribe       # Register push subscription
POST   /api/push/test            # Send test notification
```

---

## 7. WebSocket Events

### Client → Server
```typescript
'task:complete'      { taskId: string }
'mood:update'        { mood: Mood, note?: string }
'presence:heartbeat' { }
```

### Server → Client
```typescript
'task:created'       { task: Task }
'task:updated'       { task: Task }
'task:completed'     { task: Task, coinsEarned: number }
'coins:changed'      { userId: string, newBalance: number }
'mood:family'        { aggregatedMood: Mood, breakdown: MoodBreakdown }
'notification'       { type: string, message: string, data?: any }
```

---

## 8. UI/UX Requirements

### Typography
* **Primary:** `Assistant` (Hebrew-optimized)
* **Secondary:** `Varela Round` (Soft, kid-friendly)

### Color Palette
```scss
// Adult Mode (Command Center)
$adult-primary: #1E3A5F;    // Navy
$adult-secondary: #0D9488;  // Teal
$adult-surface: #F1F5F9;    // Slate-100

// Kid Mode (Playground)
$kid-primary: #F59E0B;      // Amber
$kid-secondary: #10B981;    // Mint
$kid-accent: #F472B6;       // Coral/Pink
$kid-surface: #FEF3C7;      // Warm cream
```

### Animations
* Task completion: Lottie confetti burst
* Coin earned: Bouncing coin animation
* Avatar level-up: Particle effects + sound
* Must-do tasks: Subtle pulse/glow animation

### RTL Considerations
* All Flexbox/Grid use `gap` (RTL-safe)
* Icons that imply direction are flipped
* Text alignment via `text-start` / `text-end`

---

## 9. Project Structure

```
family-hub/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/
│   │   │   │   │   ├── auth.guard.ts
│   │   │   │   │   └── role.guard.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── auth.interceptor.ts
│   │   │   │   │   └── error.interceptor.ts
│   │   │   │   ├── services/
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── socket.service.ts
│   │   │   │   │   ├── push.service.ts
│   │   │   │   │   └── api.service.ts
│   │   │   │   └── stores/
│   │   │   │       ├── tasks.store.ts
│   │   │   │       ├── user.store.ts
│   │   │   │       └── household.store.ts
│   │   │   │
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   │   ├── avatar/
│   │   │   │   │   ├── coin-display/
│   │   │   │   │   └── mood-picker/
│   │   │   │   ├── pipes/
│   │   │   │   │   └── hebrew-date.pipe.ts
│   │   │   │   └── directives/
│   │   │   │       └── must-do-glow.directive.ts
│   │   │   │
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   │   └── login.component.ts
│   │   │   │   ├── command-center/      # Adult mode
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   ├── weekly-planner/
│   │   │   │   │   ├── renovation-hub/
│   │   │   │   │   ├── trip-organizer/
│   │   │   │   │   └── admin-panel/
│   │   │   │   └── playground/          # Kid mode
│   │   │   │       ├── home/
│   │   │   │       ├── chore-board/
│   │   │   │       ├── reward-shop/
│   │   │   │       ├── snack-inventory/
│   │   │   │       └── avatar/
│   │   │   │
│   │   │   └── app.routes.ts
│   │   │
│   │   ├── assets/
│   │   │   ├── i18n/
│   │   │   │   └── he.json
│   │   │   ├── animations/              # Lottie JSON files
│   │   │   └── sounds/
│   │   │
│   │   └── environments/
│   │
│   ├── tailwind.config.js
│   └── angular.json
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── tasks.routes.ts
│   │   │   ├── users.routes.ts
│   │   │   ├── rewards.routes.ts
│   │   │   ├── calendar.routes.ts
│   │   │   └── ai.routes.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── household.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── services/
│   │   │   ├── socket.service.ts
│   │   │   ├── push.service.ts
│   │   │   ├── claude.service.ts
│   │   │   └── cron.service.ts
│   │   ├── schemas/                     # Zod validation
│   │   │   └── task.schema.ts
│   │   └── index.ts
│   │
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   │
│   └── package.json
│
├── docker-compose.yml
├── SPEC.md
└── README.md
```

---

## 10. Implementation Phases

### Phase 1: Foundation (MVP)
- [ ] Project scaffolding (Angular + Express)
- [ ] Database schema + Prisma setup
- [ ] Google OAuth authentication
- [ ] Basic task CRUD with WebSocket sync
- [ ] Role-based routing (Adult vs Kid modes)

### Phase 2: Gamification
- [ ] FamCoins system
- [ ] Reward shop
- [ ] Avatar system (basic)
- [ ] Task completion animations

### Phase 3: Real-time & Notifications
- [ ] Full WebSocket implementation
- [ ] Push notifications (Service Worker)
- [ ] Mood meter with family aggregation
- [ ] Daily memo cron job

### Phase 4: Advanced Features
- [ ] Voice-to-task AI
- [ ] Calendar & event sync
- [ ] Renovation hub
- [ ] Trip organizer

### Phase 5: Polish
- [ ] Full Hebrew i18n
- [ ] RTL refinements
- [ ] Performance optimization
- [ ] PWA enhancements
