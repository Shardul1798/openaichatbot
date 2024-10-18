import { Module } from '@nestjs/common';
import { DirectBService } from './direct-b.service';
import { DirectBController } from './direct-b.controller';

@Module({
  controllers: [DirectBController],
  providers: [DirectBService],
})
export class DirectBModule {}
