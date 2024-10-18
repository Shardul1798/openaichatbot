/**
 * Controller for Langchain Chat operations.
 *
 * This controller handles HTTP requests related to basic chat interactions in the
 * Langchain application. It primarily deals with receiving and processing user
 * messages through the LangchainChatService. The controller ensures that the
 * incoming request data is properly structured and validated.
 *
 * @class LangchainChatController
 * @decorator Controller - Defines the base route ('/langchain-chat') for all endpoints in this controller.
 *
 * @method chat - Endpoint for initiating a basic chat. It accepts a POST request with a
 *                BasicMessageDto object, representing the user's message, and uses
 *                LangchainChatService for processing the chat interaction.
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LangchainChatService } from './langchain-chat.service';
import { AgentChatDto, BasicMessageDto } from './dto/basic-message.dto';

@Controller('langchain-chat')
export class LangchainChatController {
  constructor(private readonly langchainChatService: LangchainChatService) {}

  @Post('analyse')
  async chat(@Body() messagesDto: BasicMessageDto) {
    return await this.langchainChatService.chat(messagesDto);
  }

  @Post('agent-chat')
  async agentChat(@Body() payload: AgentChatDto) {
    try {
      return await this.langchainChatService.agentChat(
        payload.user_query,
        payload.sessionId,
        payload.userId
      );
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  @Post('cache-chat')
  async cachingAgentChat(@Body() payload: AgentChatDto) {
    try {
      return await this.langchainChatService.redisAgentChat(
        payload.user_query,
        payload.sessionId,
        payload.userId
      );
    } catch (error) {
      console.error(error);
      return error;
    }
  }
}
