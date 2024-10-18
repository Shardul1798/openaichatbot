import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, CreateUserSchema } from './schemas/user.schema';
import { Summary, SummarySchema } from './schemas/summary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: CreateUserSchema }]),
    MongooseModule.forFeature([{ name: Summary.name, schema: SummarySchema }]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
