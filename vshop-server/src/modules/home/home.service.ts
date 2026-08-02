import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../prisma/prisma.service';
import { CUTOFF_HOUR } from '../../common/constants';

const HOME_CACHE_KEY = 'home:data';
const HOME_CACHE_TTL = 30 * 1000; // 首页数据 30 秒缓存

@Injectable()
export class HomeService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getHomeData() {
    const cached = await this.cacheManager.get<any>(HOME_CACHE_KEY);
    if (cached) return cached;

    const [categories, banners] = await Promise.all([
      this.prisma.category.findMany({
        where: { status: 'active' },
        orderBy: { sort: 'asc' },
        include: {
          subCategories: {
            include: {
              _count: { select: { goods: true } },
            },
          },
        },
      }),
      // 轮播图从数据库查（status=active，按 sort 升序）
      this.prisma.banner.findMany({
        where: { status: 'active' },
        orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
      }),
    ]);

    const result = {
      // 无数据库轮播图时 fallback 到默认文案（保证首页不空）
      banners: banners.length > 0
        ? banners.map((b) => ({
            id: b.id,
            title: b.title,
            imageUrl: b.imageUrl,
            link: b.link || '',
            // 无图时用绿色兜底，小程序 wxml 会判断有无 imageUrl 决定显示图片还是色块
            color: b.imageUrl ? '' : '#07C160',
          }))
        : [
            { title: '产地直采·新鲜果蔬每日直达', color: '#FF6B35' },
            { title: '每日20:00前下单·次日达', color: '#07C160' },
            { title: '满39元免配送费', color: '#2E7D32' },
          ],
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        emoji: this.getCategoryEmoji(c.name),
        bgColor: this.getCategoryColor(c.name),
        num: c.subCategories.reduce((sum, sc) => sum + sc._count.goods, 0),
      })),
      cutoffCountdown: this.getCutoffCountdown(),
      nextDay: this.getNextDayLabel(),
    };

    await this.cacheManager.set(HOME_CACHE_KEY, result, HOME_CACHE_TTL);
    return result;
  }

  private getCategoryEmoji(name: string) {
    const map: Record<string, string> = {
      '时令鲜果': '🍎',
      '热带水果': '🥭',
      '浆果类': '🫐',
      '叶菜类': '🥬',
      '根茎类': '🥕',
      '茄果类': '🍅',
    };
    return map[name] || '🍎';
  }

  private getCategoryColor(name: string) {
    const map: Record<string, string> = {
      '时令鲜果': '#FFEBEE',
      '热带水果': '#FFF3E0',
      '浆果类': '#E8EAF6',
      '叶菜类': '#E8F5E9',
      '根茎类': '#FFF8E1',
      '茄果类': '#FCE4EC',
    };
    return map[name] || '#E8F8EE';
  }

  private getCutoffCountdown() {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setHours(CUTOFF_HOUR, 0, 0, 0);
    if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
    const diff = Math.max(0, cutoff.getTime() - now.getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}小时${m}分${s}秒`;
  }

  private getNextDayLabel() {
    const now = new Date();
    if (now.getHours() >= CUTOFF_HOUR) return '后天';
    return '次日';
  }
}
