import { Module } from '@nestjs/common';
import { DirectService } from './direct.service';
import { DirectController } from './direct.controller';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Summary, SummarySchema } from 'src/user/schemas/summary.schema';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }]),
  ],
  controllers: [DirectController],
  providers: [DirectService],
})
export class DirectModule {}
