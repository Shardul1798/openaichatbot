import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LangchainChatModule } from './langchain-chat/langchain-chat.module';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { MongooseModule } from '@nestjs/mongoose';
import { DirectModule } from './direct/direct.module';
import { DirectBModule } from './direct-b/direct-b.module';
import { UserService } from './user/user.service';
import { CreateUserSchema, User } from './user/schemas/user.schema';
import { Summary, SummarySchema } from './user/schemas/summary.schema';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_ATLAS_URI),
    MongooseModule.forFeature([{ name: User.name, schema: CreateUserSchema }]),
    MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }]),
    LangchainChatModule,
    UserModule,
    DirectModule,
    DirectBModule
  ],
  controllers: [AppController],
  providers: [AppService, UserService],
})
export class AppModule {}
