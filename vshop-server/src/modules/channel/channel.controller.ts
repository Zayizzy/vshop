import { Controller, Post, Body } from '@nestjs/common';
import { Public } from '../../common/guards/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelReportDto } from '../../common/dto';

// 渠道上报在用户登录前发生（扫码进入），需公开访问
@Public()
@Controller('channel')
export class ChannelController {
  constructor(private prisma: PrismaService) {}

  @Post('report')
  async report(@Body() body: ChannelReportDto) {
    await this.prisma.channelReport.create({
      data: {
        source: body.source,
        kocId: body.kocId,
        batchId: body.batchId,
      },
    });

    return { code: 0, message: 'success', data: { reported: true } };
  }
}
