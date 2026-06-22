import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // Seed mock user for development
    await this.user.upsert({
      where: { id: 'mock-user' },
      update: {},
      create: { id: 'mock-user', openid: 'wx-mock-user', nickname: '开发用户' },
    });
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
