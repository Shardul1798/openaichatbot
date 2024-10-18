import {
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class DirectChatMessageDto {
  @IsNotEmpty()
  @IsString()
  user_query: string;

  @IsOptional()
  @IsString()
  sessionId: string;

  @IsNotEmpty()
  @IsString()
  userId: string;
}