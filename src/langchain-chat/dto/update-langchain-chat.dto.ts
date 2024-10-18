import { PartialType } from '@nestjs/mapped-types';
import { CreateLangchainChatDto } from './create-langchain-chat.dto';

export class UpdateLangchainChatDto extends PartialType(CreateLangchainChatDto) {}
