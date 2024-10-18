import { Module } from '@nestjs/common';
import { LangchainChatService } from './langchain-chat.service';
import { LangchainChatController } from './langchain-chat.controller';
import { UserModule } from 'src/user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { Summary, SummarySchema } from 'src/user/schemas/summary.schema';

@Module({
  imports: [
    UserModule,
    MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }]),
  ],
  controllers: [LangchainChatController],
  providers: [LangchainChatService],
})
export class LangchainChatModule {}
