import { Module } from '@nestjs/common';
import { KocController } from './koc.controller';
import { KocService } from './koc.service';

@Module({
  controllers: [KocController],
  providers: [KocService],
})
export class KocModule {}
