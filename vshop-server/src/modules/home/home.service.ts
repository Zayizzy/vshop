import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HomeService {
  constructor(private prisma: PrismaService) {}

  async getHomeData() {
    const categories = await this.prisma.category.findMany({
      where: { status: 'active' },
      orderBy: { sort: 'asc' },
      include: {
        subCategories: {
          include: {
            _count: { select: { goods: true } },
          },
        },
      },
    });

    return {
      banners: [
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
    cutoff.setHours(20, 0, 0, 0);
    if (now > cutoff) cutoff.setDate(cutoff.getDate() + 1);
    const diff = Math.max(0, cutoff.getTime() - now.getTime());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h}小时${m}分${s}秒`;
  }

  private getNextDayLabel() {
    const now = new Date();
    if (now.getHours() >= 20) return '后天';
    return '次日';
  }
}
