import type { Game } from '../../core/Game';
import { Random } from '../../core/Random';
import { formatCash } from '../format';

export interface FeedPost {
  handle: string;
  text: string;
  /** In-game clock when posted, e.g. "14:32". */
  time: string;
  likes: number;
}

const HANDLES = [
  '@viceb1tch',
  '@leonida_eyes',
  '@gatorwatch',
  '@portgellhorn_pd_scanner',
  '@habana_hot_takes',
  '@swampthing305',
  '@keysdrifter',
  '@downtownDoomer',
  '@chopchopdocks',
  '@weazel_news_intern',
];

const CRIME_LINES: Record<string, string[]> = {
  rob_store: ['у меня на районе только что обнесли магазин?? продавец ЖИВ, касса нет', 'ограбление магазина. снова. этот город'],
  rob_ped: ['меня обчистили под дулом, бумажник ушёл, достоинство тоже', 'в даунтауне грабят людей, берегите карманы'],
  shot_fired: ['возле меня стреляли. не четвёртое июля', 'кто-нибудь ещё слышал?? вроде дробовик'],
  carjack: ['братан просто угнал машину вместе с хозяином на ключах', 'угон прямо у «Вафельной хижины». У ВАФЕЛЬНОЙ ХИЖИНЫ.'],
  hit_ped: ['видел, как машина проехала по переходу. водитель даже не остановился', 'пешеходы: 0. седан: 1.'],
  kill_ped: ['на тротуаре лежит тело, а поток просто объезжает', 'RIP тому, кто был на Оушен-Драйв'],
  kill_cop: ['застрелили копа. все сирены Леониды включены', 'НЕ езжайте в даунтаун сейчас. копы в бешенстве'],
  explosion: ['машина только что ВЗОРВАЛАСЬ у марины))', 'огонь на шоссе, моё такси отменили'],
};

const DEFAULT_LINES = ['в Леониде что-то происходит', 'сирены. очень много сирен.'];

/**
 * Parody social feed built from game events. Kept in memory only (not saved),
 * capped to the most recent posts.
 */
export class Feed {
  readonly posts: FeedPost[] = [];
  private readonly rng = Random.unseeded();
  private readonly offs: Array<() => void> = [];
  private lastCrimeAt = -Infinity;
  onChange: (() => void) | null = null;

  constructor(
    private readonly game: Game,
    private readonly max = 20,
  ) {
    const ev = game.events;
    this.offs.push(
      ev.on('crime:committed', ({ type, actor }) => {
        if (actor !== 'player') return;
        // Gunfights spam shot_fired; one post per few seconds keeps the feed readable.
        const now = game.time.elapsed;
        if (type === 'shot_fired' && now - this.lastCrimeAt < 8) return;
        this.lastCrimeAt = now;
        this.post(this.rng.pick(CRIME_LINES[type] ?? DEFAULT_LINES));
      }),
      ev.on('casino:won', ({ game: table, amount }) => {
        if (amount >= 500) this.post(`кто-то только что снял ${formatCash(amount)} за столом «${table}». казино НЕ довольно`);
      }),
      ev.on('economy:cashChanged', ({ delta, reason }) => {
        if (Math.abs(delta) < 2000) return;
        if (delta > 0) this.post(reason === 'chopshop' ? `в доках сегодня жарко. на ${formatCash(delta)} жарко` : `у кого-то завелось ${formatCash(delta)}?? просто спрашиваю`);
        else this.post(`видел, как кто-то спустил ${formatCash(-delta)} без единой эмоции. богатые странные`);
      }),
      ev.on('robbery:completed', ({ amount }) => this.post(`магазин на углу только что опустел примерно на ${formatCash(amount)}. руки продавца всё ещё вверх`)),
      ev.on('chopshop:sold', ({ archetypeId }) => this.post(`если у вас в Леониде была ${archetypeId}... уже нет`)),
      ev.on('mission:passed', () => this.post('слышал, кто-то только что провернул большое дело. без деталей. уважение')),
    );
    this.post('добро пожаловать в Леониду. не пейте воду из канала.');
  }

  post(text: string, handle = this.rng.pick(HANDLES)): void {
    const h = Math.floor(this.game.time.hour);
    const m = Math.floor((this.game.time.hour - h) * 60);
    this.posts.unshift({
      handle,
      text,
      time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      likes: this.rng.int(3, 4200),
    });
    if (this.posts.length > this.max) this.posts.length = this.max;
    this.onChange?.();
  }

  dispose(): void {
    for (const off of this.offs) off();
    this.offs.length = 0;
  }
}
