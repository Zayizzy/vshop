import { Module } from '@nestjs/common';
import { DianjiaClient } from './dianjia.client';
import { DianjiaService } from './dianjia.service';
import { DianjiaController } from './dianjia.controller';

@Module({
  controllers: [DianjiaController],
  providers: [DianjiaClient, DianjiaService],
  // 导出供 AdminService / PaymentService 复用
  exports: [DianjiaClient, DianjiaService],
})
export class DianjiaModule {}
