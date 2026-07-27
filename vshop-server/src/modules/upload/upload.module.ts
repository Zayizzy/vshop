import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { CosService } from './cos.service';

@Module({
  controllers: [UploadController],
  providers: [CosService],
})
export class UploadModule {}
