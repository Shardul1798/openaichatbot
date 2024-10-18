import { Body, Controller, Post } from '@nestjs/common';
import { DirectBService } from './direct-b.service';
import { DirectChatMessageDto } from 'src/direct/dto/direct-chat.dto';

@Controller('direct-b')
export class DirectBController {
  constructor(private readonly directBService: DirectBService) {}

  @Post('chat')
  async physicianChat(@Body() payload: DirectChatMessageDto) {
    try {
      // return await this.directBService.initialiseDirectChat(
      //   payload.user_query,
      //   payload.sessionId,
      //   payload.userId,
      // );
    } catch (error) {
      console.error(error);
      return error;
    }
  }
}
