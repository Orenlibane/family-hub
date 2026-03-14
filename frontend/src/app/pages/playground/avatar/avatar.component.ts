import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services';
import { BehaviorSubject } from 'rxjs';

interface AvatarItem {
  id: string;
  name: string;
  emoji: string;
  category: 'skin' | 'hair' | 'eyes' | 'mouth' | 'accessory' | 'outfit';
  cost: number;
  owned: boolean;
}

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-gradient-to-br from-kid-primary via-kid-accent to-kid-secondary p-4 pb-24" dir="rtl">
      <!-- Header -->
      <header class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-3xl font-bold text-white">האווטאר שלי</h1>
          <p class="text-white/80">עצב את הדמות שלך! ✨</p>
        </div>
        <div class="bg-white/20 backdrop-blur-md rounded-2xl px-4 py-2 flex items-center gap-2">
          <span class="text-2xl">🪙</span>
          <span class="text-2xl font-bold text-white">{{ (user$ | async)?.famCoins || 0 }}</span>
        </div>
      </header>

      <!-- Avatar Preview -->
      <div class="bg-white rounded-3xl p-6 mb-6 shadow-xl">
        <div class="relative w-48 h-48 mx-auto">
          <!-- Avatar Display -->
          <div class="w-full h-full rounded-full bg-gradient-to-br from-kid-surface to-white flex items-center justify-center shadow-inner relative overflow-hidden">
            <!-- Base/Skin -->
            <div class="absolute inset-0 flex items-center justify-center text-[120px]">
              {{ selectedItems.skin }}
            </div>
            <!-- Hair -->
            <div class="absolute top-0 left-1/2 -translate-x-1/2 text-5xl">
              {{ selectedItems.hair }}
            </div>
            <!-- Eyes -->
            <div class="absolute top-[35%] left-1/2 -translate-x-1/2 text-3xl">
              {{ selectedItems.eyes }}
            </div>
            <!-- Mouth -->
            <div class="absolute top-[55%] left-1/2 -translate-x-1/2 text-2xl">
              {{ selectedItems.mouth }}
            </div>
            <!-- Accessory -->
            @if (selectedItems.accessory) {
              <div class="absolute top-2 right-2 text-3xl animate-bounce" style="animation-duration: 2s">
                {{ selectedItems.accessory }}
              </div>
            }
          </div>

          <!-- Edit Badge -->
          <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-kid-primary text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
            {{ (user$ | async)?.name || 'השם שלי' }}
          </div>
        </div>

        <!-- Randomize Button -->
        <button
          (click)="randomize()"
          class="mt-6 mx-auto block px-6 py-2 bg-gradient-to-r from-kid-primary to-kid-accent text-white rounded-full font-bold hover:scale-105 transition-transform"
        >
          🎲 הגרל אווטאר אקראי
        </button>
      </div>

      <!-- Category Tabs -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
        @for (cat of categories; track cat.value) {
          <button
            (click)="selectCategory(cat.value)"
            class="px-4 py-2 rounded-full font-semibold whitespace-nowrap transition-all"
            [class.bg-white]="selectedCategory === cat.value"
            [class.text-kid-primary]="selectedCategory === cat.value"
            [class.shadow-lg]="selectedCategory === cat.value"
            [class.bg-white/20]="selectedCategory !== cat.value"
            [class.text-white]="selectedCategory !== cat.value"
          >
            {{ cat.icon }} {{ cat.label }}
          </button>
        }
      </div>

      <!-- Items Grid -->
      <div class="bg-white rounded-3xl p-4 shadow-lg">
        <div class="grid grid-cols-4 gap-3">
          @for (item of currentItems$ | async; track item.id) {
            <button
              (click)="selectItem(item)"
              class="aspect-square rounded-2xl flex flex-col items-center justify-center text-4xl transition-all relative"
              [class.bg-kid-primary/20]="isSelected(item)"
              [class.border-2]="isSelected(item)"
              [class.border-kid-primary]="isSelected(item)"
              [class.bg-gray-100]="!isSelected(item) && item.owned"
              [class.bg-gray-50]="!isSelected(item) && !item.owned"
              [class.opacity-50]="!item.owned"
            >
              <span>{{ item.emoji }}</span>
              @if (!item.owned) {
                <div class="absolute bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-0.5 text-xs bg-fam-coin/20 text-fam-coin px-1.5 py-0.5 rounded-full font-bold">
                  <span>🪙</span>{{ item.cost }}
                </div>
              }
              @if (isSelected(item)) {
                <div class="absolute -top-1 -right-1 w-5 h-5 bg-kid-primary rounded-full flex items-center justify-center text-white text-xs">
                  ✓
                </div>
              }
            </button>
          }
        </div>
      </div>

      <!-- Purchase Modal -->
      @if (purchaseItem) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" (click)="purchaseItem = null">
          <div class="bg-white rounded-3xl p-6 w-full max-w-sm text-center" (click)="$event.stopPropagation()">
            <div class="text-8xl mb-4">{{ purchaseItem.emoji }}</div>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">{{ purchaseItem.name }}</h3>
            <div class="flex items-center justify-center gap-2 text-2xl text-fam-coin font-bold mb-6">
              <span>🪙</span>
              <span>{{ purchaseItem.cost }}</span>
            </div>

            @if ((user$ | async)?.famCoins! >= purchaseItem.cost) {
              <button
                (click)="buyItem(purchaseItem)"
                class="w-full py-4 bg-gradient-to-r from-kid-primary to-kid-secondary text-white rounded-2xl font-bold text-lg hover:scale-105 transition-transform"
              >
                🛒 קנה עכשיו!
              </button>
            } @else {
              <div class="py-4 bg-gray-100 text-gray-500 rounded-2xl font-medium">
                😢 אין מספיק מטבעות
                <p class="text-sm mt-1">חסר לך {{ purchaseItem.cost - ((user$ | async)?.famCoins || 0) }} מטבעות</p>
              </div>
            }

            <button
              (click)="purchaseItem = null"
              class="mt-3 text-gray-500 font-medium"
            >
              ביטול
            </button>
          </div>
        </div>
      }

      <!-- Success Animation -->
      @if (showSuccess) {
        <div class="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div class="text-center animate-bounce">
            <p class="text-8xl mb-4">🎉</p>
            <p class="text-3xl font-bold text-white drop-shadow-lg">פריט חדש!</p>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AvatarComponent {
  private readonly authService = inject(AuthService);

  user$ = this.authService.user$;

  categories = [
    { value: 'skin' as const, label: 'עור', icon: '👤' },
    { value: 'hair' as const, label: 'שיער', icon: '💇' },
    { value: 'eyes' as const, label: 'עיניים', icon: '👀' },
    { value: 'mouth' as const, label: 'פה', icon: '👄' },
    { value: 'accessory' as const, label: 'אביזרים', icon: '✨' },
    { value: 'outfit' as const, label: 'בגדים', icon: '👕' }
  ];

  selectedCategory: 'skin' | 'hair' | 'eyes' | 'mouth' | 'accessory' | 'outfit' = 'skin';

  selectedItems = {
    skin: '😊',
    hair: '💇',
    eyes: '👀',
    mouth: '😃',
    accessory: '👑',
    outfit: '👕'
  };

  allItems: AvatarItem[] = [
    // Skins
    { id: 'skin1', name: 'רגיל', emoji: '😊', category: 'skin', cost: 0, owned: true },
    { id: 'skin2', name: 'שמח', emoji: '😄', category: 'skin', cost: 0, owned: true },
    { id: 'skin3', name: 'מגניב', emoji: '😎', category: 'skin', cost: 10, owned: false },
    { id: 'skin4', name: 'קורץ', emoji: '😉', category: 'skin', cost: 15, owned: false },
    { id: 'skin5', name: 'חייכן', emoji: '🥰', category: 'skin', cost: 20, owned: false },
    { id: 'skin6', name: 'כוכב', emoji: '🤩', category: 'skin', cost: 25, owned: false },
    { id: 'skin7', name: 'נרדם', emoji: '😴', category: 'skin', cost: 15, owned: false },
    { id: 'skin8', name: 'חושב', emoji: '🤔', category: 'skin', cost: 10, owned: false },

    // Hair
    { id: 'hair1', name: 'רגיל', emoji: '💇', category: 'hair', cost: 0, owned: true },
    { id: 'hair2', name: 'בלונדיני', emoji: '👱', category: 'hair', cost: 0, owned: true },
    { id: 'hair3', name: 'ג׳ינג׳י', emoji: '👨‍🦰', category: 'hair', cost: 15, owned: false },
    { id: 'hair4', name: 'מתולתל', emoji: '👨‍🦱', category: 'hair', cost: 15, owned: false },
    { id: 'hair5', name: 'קירח', emoji: '👨‍🦲', category: 'hair', cost: 10, owned: false },
    { id: 'hair6', name: 'לבן', emoji: '👨‍🦳', category: 'hair', cost: 20, owned: false },
    { id: 'hair7', name: 'נסיכה', emoji: '👸', category: 'hair', cost: 30, owned: false },
    { id: 'hair8', name: 'נסיך', emoji: '🤴', category: 'hair', cost: 30, owned: false },

    // Eyes
    { id: 'eyes1', name: 'רגיל', emoji: '👀', category: 'eyes', cost: 0, owned: true },
    { id: 'eyes2', name: 'לבבות', emoji: '😍', category: 'eyes', cost: 20, owned: false },
    { id: 'eyes3', name: 'כוכבים', emoji: '🤩', category: 'eyes', cost: 25, owned: false },
    { id: 'eyes4', name: 'משקפיים', emoji: '🤓', category: 'eyes', cost: 15, owned: false },
    { id: 'eyes5', name: 'משקפי שמש', emoji: '😎', category: 'eyes', cost: 20, owned: false },
    { id: 'eyes6', name: 'קורץ', emoji: '😜', category: 'eyes', cost: 15, owned: false },
    { id: 'eyes7', name: 'עיניים גדולות', emoji: '🥺', category: 'eyes', cost: 20, owned: false },
    { id: 'eyes8', name: 'מונוקל', emoji: '🧐', category: 'eyes', cost: 30, owned: false },

    // Mouth
    { id: 'mouth1', name: 'חיוך', emoji: '😃', category: 'mouth', cost: 0, owned: true },
    { id: 'mouth2', name: 'לשון', emoji: '😛', category: 'mouth', cost: 10, owned: false },
    { id: 'mouth3', name: 'נשיקה', emoji: '😘', category: 'mouth', cost: 15, owned: false },
    { id: 'mouth4', name: 'צועק', emoji: '😱', category: 'mouth', cost: 15, owned: false },
    { id: 'mouth5', name: 'שורק', emoji: '😗', category: 'mouth', cost: 10, owned: false },
    { id: 'mouth6', name: 'שפם', emoji: '🥸', category: 'mouth', cost: 25, owned: false },
    { id: 'mouth7', name: 'מסכה', emoji: '😷', category: 'mouth', cost: 15, owned: false },
    { id: 'mouth8', name: 'ליצן', emoji: '🤡', category: 'mouth', cost: 30, owned: false },

    // Accessories
    { id: 'acc1', name: 'כתר', emoji: '👑', category: 'accessory', cost: 0, owned: true },
    { id: 'acc2', name: 'כובע', emoji: '🎩', category: 'accessory', cost: 20, owned: false },
    { id: 'acc3', name: 'כובע מסיבה', emoji: '🥳', category: 'accessory', cost: 25, owned: false },
    { id: 'acc4', name: 'קרניים', emoji: '😈', category: 'accessory', cost: 30, owned: false },
    { id: 'acc5', name: 'הילה', emoji: '😇', category: 'accessory', cost: 30, owned: false },
    { id: 'acc6', name: 'אוזניות', emoji: '🎧', category: 'accessory', cost: 25, owned: false },
    { id: 'acc7', name: 'קסדה', emoji: '⛑️', category: 'accessory', cost: 20, owned: false },
    { id: 'acc8', name: 'כתר פרחים', emoji: '💐', category: 'accessory', cost: 25, owned: false },

    // Outfits
    { id: 'outfit1', name: 'חולצה', emoji: '👕', category: 'outfit', cost: 0, owned: true },
    { id: 'outfit2', name: 'חליפה', emoji: '🤵', category: 'outfit', cost: 35, owned: false },
    { id: 'outfit3', name: 'שמלה', emoji: '👗', category: 'outfit', cost: 35, owned: false },
    { id: 'outfit4', name: 'גיבור על', emoji: '🦸', category: 'outfit', cost: 50, owned: false },
    { id: 'outfit5', name: 'נינג׳ה', emoji: '🥷', category: 'outfit', cost: 45, owned: false },
    { id: 'outfit6', name: 'אסטרונאוט', emoji: '🧑‍🚀', category: 'outfit', cost: 50, owned: false },
    { id: 'outfit7', name: 'פיראט', emoji: '🏴‍☠️', category: 'outfit', cost: 40, owned: false },
    { id: 'outfit8', name: 'קוסם', emoji: '🧙', category: 'outfit', cost: 45, owned: false }
  ];

  private readonly items$ = new BehaviorSubject<AvatarItem[]>(this.allItems);

  currentItems$ = this.items$.pipe();

  purchaseItem: AvatarItem | null = null;
  showSuccess = false;

  constructor() {
    this.filterItems();
  }

  selectCategory(category: typeof this.selectedCategory): void {
    this.selectedCategory = category;
    this.filterItems();
  }

  private filterItems(): void {
    const filtered = this.allItems.filter(item => item.category === this.selectedCategory);
    this.items$.next(filtered);
  }

  isSelected(item: AvatarItem): boolean {
    return this.selectedItems[item.category] === item.emoji;
  }

  selectItem(item: AvatarItem): void {
    if (item.owned) {
      this.selectedItems[item.category] = item.emoji;
    } else {
      this.purchaseItem = item;
    }
  }

  buyItem(item: AvatarItem): void {
    // TODO: Call API to purchase item
    const itemIndex = this.allItems.findIndex(i => i.id === item.id);
    if (itemIndex >= 0) {
      this.allItems[itemIndex].owned = true;
      this.selectedItems[item.category] = item.emoji;
      this.filterItems();
    }

    this.purchaseItem = null;
    this.showSuccess = true;
    setTimeout(() => this.showSuccess = false, 1500);
  }

  randomize(): void {
    const getRandomOwned = (category: AvatarItem['category']) => {
      const owned = this.allItems.filter(i => i.category === category && i.owned);
      return owned[Math.floor(Math.random() * owned.length)]?.emoji || this.selectedItems[category];
    };

    this.selectedItems = {
      skin: getRandomOwned('skin'),
      hair: getRandomOwned('hair'),
      eyes: getRandomOwned('eyes'),
      mouth: getRandomOwned('mouth'),
      accessory: getRandomOwned('accessory'),
      outfit: getRandomOwned('outfit')
    };
  }
}
