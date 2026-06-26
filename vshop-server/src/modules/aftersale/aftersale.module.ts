import { Module } from '@nestjs/common';
import { AftersaleController } from './aftersale.controller';
import { AftersaleService } from './aftersale.service';

@Module({
  controllers: [AftersaleController],
  providers: [AftersaleService],
})
export class AftersaleModule {}
