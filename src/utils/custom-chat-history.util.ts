import { BaseListChatMessageHistory } from '@langchain/core/chat_history';
import {
  BaseMessage,
  mapChatMessagesToStoredMessages,
  mapStoredMessagesToChatMessages,
} from '@langchain/core/messages';
import { Collection } from 'mongoose';

export interface CustomChatMessageHistoryInput {
  roomId: string;
  userId: string;
}
export const TAG = 'DIRECT_CHAT';
export const TTL = 30000;
export class CustomChatHistoryClass extends BaseListChatMessageHistory {
  lc_namespace = ['langchain', 'stores', 'message'];
  roomId: string;
  userId: string;
  chatMemoryCollection: Collection;
  constructor(
    fields: CustomChatMessageHistoryInput,
    // private _cache: CacheService,
  ) {
    super(fields);
    this.roomId = fields.roomId;
    this.userId = fields.userId;
  }

  async getMessages(): Promise<BaseMessage[]> {
    return []
    // const result = await this._cache.retrieveChatMessages(
    //   TAG,
    //   this.userId,
    //   this.roomId,
    // );
    // if (!result) {
    // }
    // return mapStoredMessagesToChatMessages(JSON.parse(result));
  }

  async addMessage(message: BaseMessage): Promise<void> {
    
  }

  async addMessages(messages: BaseMessage[]): Promise<void> {
    const serializedMessage = mapChatMessagesToStoredMessages(messages);
    // const currentHistory = await this._cache.retrieveChatMessages(
    //   TAG,
    //   this.userId,
    //   this.roomId,
    // );
    // const updatedHistory = currentHistory ? JSON.parse(currentHistory) : [];
    // updatedHistory.push(...serializedMessage);
    // return updatedHistory
  }
}
