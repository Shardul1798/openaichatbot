import { Body, Controller, Post } from '@nestjs/common';
import { DirectService } from './direct.service';
import { AgentChatDto } from 'src/langchain-chat/dto/basic-message.dto';
import { CONSULTANCY, DIRECT_CHATBOT_MESSAGES } from './constants/messages';
import { DirectChatMessageDto } from './dto/direct-chat.dto';

@Controller('direct')
export class DirectController {
  constructor(private readonly directService: DirectService) {}

  @Post('ping')
  async directPing(@Body() body: any) {
    try {
      const { currentStage, selected } = body;
      return this.directService.patientChatEligibilityCheck(
        currentStage,
        selected,
      );
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  @Post('chat')
  async agentChat(@Body() payload: DirectChatMessageDto) {
    try {
      return await this.directService.initialiseDirectParsedChat(
        payload.user_query,
        payload.sessionId,
        payload.userId,
      );
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  // @Post('parsed-chat')
  // async parsedChat(@Body() payload: DirectChatMessageDto) {
  //   try {
  //     return await this.directService.parsedChat(
  //       payload.user_query,
  //       payload.sessionId,
  //       payload.userId,
  //     );
  //   } catch (error) {
  //     console.error(error);
  //     return error;
  //   }
  // }
}
