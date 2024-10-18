import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { TavilySearchResults } from '@langchain/community/tools/tavily_search';
import { RedisCache } from '@langchain/community/caches/ioredis';
import Redis from 'ioredis';

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { BufferMemory } from 'langchain/memory';
import { MESSAGES } from 'src/utils/constants/messages.constants';
import { openAI } from 'src/utils/constants/openAI.constants';
import { BasicMessageDto } from './dto/basic-message.dto';
import { TEMPLATES, TOOLS } from 'src/utils/constants/templates.constants';
import customMessage from 'src/utils/responses/customMessage.response';
import { Collection, MongoClient, ObjectId } from 'mongodb';
import { ConversationChain } from 'langchain/chains';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';
import { UserService } from 'src/user/user.service';

//Agents Import
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { z } from 'zod';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { Summary, SummaryDocument } from 'src/user/schemas/summary.schema';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

@Injectable()
export class LangchainChatService {
  private client: MongoClient;
  private redis: any;
  private collection: Collection;
  private userDetails: Collection;
  private summaries: Collection;
  constructor(
    private _user: UserService,
    @InjectModel(Summary.name) private summaryModel: Model<SummaryDocument>,
  ) {
    this.client = new MongoClient(process.env.MONGODB_ATLAS_URI || '', {
      driverInfo: { name: 'langchainjs' },
    });
    this.connectDb();
  }

  private async connectDb(): Promise<void> {
    try {
      this.redis = new Redis('redis://localhost:6379');
      await this.client.connect();
      this.collection = this.client.db('langchain').collection('memory');
      this.userDetails = this.client.db('langchain').collection('users');
      this.summaries = this.client.db('langchain').collection('summaries');
    } catch (e) {
      console.error('Failed to connect to the database:', e);
      throw e;
    }
  }

  // Buffer Memory and Chaining Model
  async chat(payload: BasicMessageDto) {
    try {
      if (!payload.sessionId) {
        payload.sessionId = new ObjectId().toString();
      }
      const memory = new BufferMemory({
        chatHistory: new MongoDBChatMessageHistory({
          collection: this.collection,
          sessionId: payload.sessionId,
        }),
        returnMessages: true,
        memoryKey: 'history',
      });

      const user: any = await this._user.findOne(payload.userId);
      const userDetails = `Name: ${user.personalInfo.firstName}${user.personalInfo.lastName}
      DOB: ${user.personalInfo.dateOfBirth}
      Gender: ${user.personalInfo.gender}
      Weight: ${user.weight.length > 0 ? user.weight[0].weight : ''}
      Medical Conditions: ${user.healthInfo.medicalConditions.length > 0 ? user.healthInfo.medicalConditions.join(', ') : 'None'}
      Medications: ${user.healthInfo.medications.length > 0 ? user.healthInfo.medications.map((med) => `${med.name} (${med.dosage}, ${med.schedule})`).join('; ') : 'None'},
      LifestyleInfo: ${user.lifestyleInfo.dietaryPreferences},${user.lifestyleInfo.bloodSugarLevels}
      Smoking: ${user.lifestyleInfo.smokingStatus},
      Alcohol Consumption: ${user.lifestyleInfo.alcoholConsumption}
      `;

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `${TEMPLATES.CONTEXT_AWARE_CHAT_TEMPLATE} \n userDetails: ${userDetails}`,
        ],
        new MessagesPlaceholder('history'),
        ['user', '{input}'],
      ]);
      const model = new ChatOpenAI({
        temperature: +openAI.BASIC_CHAT_OPENAI_TEMPERATURE,
        modelName: openAI.GPT_3_5_TURBO_1106.toString(),
      });
      // const outputParser = new HttpResponseOutputParser();
      const chain = new ConversationChain({
        memory: memory,
        llm: model,
        prompt,
        // outputParser: outputParser
      });
      const response = await chain.invoke({
        input: payload.user_query,
      });
      return this.successResponse(response);
    } catch (e: unknown) {
      this.exceptionHandling(e);
    }
  }

  // Agent & Tool Model
  async agentChat(user_query: string, sessionId: string, userId: string) {
    try {
      if (!sessionId) {
        sessionId = new ObjectId().toString();
      }
      const summary = await this.findOne(sessionId);

      console.log('Summary ===========>', summary);
      if (summary && summary.conversationClosed) {
        return this.successResponse('Conversation Closed Already!');
      }
      const user: any = await this._user.findOne(userId);
      const userDetails = `Name: ${user.personalInfo.firstName} ${user.personalInfo.lastName}
      DOB: ${user.personalInfo.dateOfBirth}
      Gender: ${user.personalInfo.gender}
      Weight: ${user.weight.length > 0 ? user.weight[0].weight : ''}
      Smoking: ${user.lifestyleInfo.smokingStatus}
      Alcohol Consumption: ${user.lifestyleInfo.alcoholConsumption}
      `;

      const submissionTool = new DynamicStructuredTool({
        name: TOOLS.SUMMARY_TOOL,
        description: `Call this tool after the chatbot has successfully expressed gratitude to the user. Also accept userId and the sessionId from the System Prompt for the function arguments.`,
        schema: z.object({
          summary: z.any(),
          userId: z.string(),
          sessionId: z.string(),
        }),
        func: async ({ summary, userId, sessionId }) => {
          const response = await this.summaryModel.create({
            sessionId,
            userId,
            summary,
          });
          console.log(
            'Summary Model Response on Save ===========>\n\n\n\n\n',
            response,
            summary,
            userId,
            sessionId,
          );
        },
        returnDirect: false,
      });

      const tools = [submissionTool];

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `${TEMPLATES.NEW_PROMPT} User Details:${userDetails} SessionId: ${sessionId}, User Id: ${userId}`,
        ],
        new MessagesPlaceholder('chat_history'),
        ['user', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]);

      const model = new ChatOpenAI({
        temperature: 0,
        modelName: openAI.GPT_3_5_TURBO_1106.toString(),
      });

      const agent = await createOpenAIToolsAgent({
        llm: model,
        tools,
        prompt,
      });

      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        // verbose: true,
        returnIntermediateSteps: true,
      });
      const conversationalAgentExecutor = new RunnableWithMessageHistory({
        runnable: agentExecutor,
        getMessageHistory: (_sessionId) =>
          new MongoDBChatMessageHistory({
            collection: this.collection,
            sessionId: sessionId,
          }),
        inputMessagesKey: 'input',
        outputMessagesKey: 'output',
        historyMessagesKey: 'chat_history',
      });

      const response = await conversationalAgentExecutor.invoke(
        { input: user_query },
        { configurable: { sessionId: sessionId } },
      );
      return this.successResponse(response.output);
    } catch (e: unknown) {
      this.exceptionHandling(e);
    }
  }

  //Caching Agent & tool Model
  async redisAgentChat(user_query: string, sessionId: string, userId: string) {
    try {
      // const cache = new RedisCache(this.redis, {
      //   ttl: 60,
      // });

      if (!sessionId) {
        sessionId = new ObjectId().toString();
      }
      const summary = await this.findOne(sessionId);
      if (summary && summary.conversationClosed) {
        return this.successResponse('Conversation Closed Already!');
      }
      const user: any = await this._user.findOne(userId);
      const userDetails = `Name: ${user.personalInfo.firstName} ${user.personalInfo.lastName}
      DOB: ${user.personalInfo.dateOfBirth}
      Gender: ${user.personalInfo.gender}
      Weight: ${user.weight.length > 0 ? user.weight[0].weight : ''}
      Smoking: ${user.lifestyleInfo.smokingStatus}
      Alcohol Consumption: ${user.lifestyleInfo.alcoholConsumption}
      `;

      const submissionTool = new DynamicStructuredTool({
        name: TOOLS.SUMMARY_TOOL,
        description: `Call this tool Ensuring that after generating the conversation summary with the following parameters:
          - Summary: The complete summary of the conversation.
          - Session ID: The unique session ID of the chat.
          - User ID: The current user ID.`,
        schema: z.object({
          summary: z.any(),
          userId: z.string(),
          sessionId: z.string(),
        }),
        func: async ({ summary, userId, sessionId }) => {
          console.log(sessionId, summary, userId);
          await this.summaryModel.create({
            sessionId,
            userId,
            summary,
          });
        },
        returnDirect: false,
      });

      const tools = [submissionTool];

      const prompt = ChatPromptTemplate.fromMessages([
        [
          'system',
          `${TEMPLATES.V2_PROMPT} User Details:${userDetails} SessionId: ${sessionId}, User Id: ${userId}`,
        ],
        new MessagesPlaceholder('chat_history'),
        ['user', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]);

      const model = new ChatOpenAI({
        temperature: 0,
        // model: openAI.GPT_3_5_TURBO_1106.toString(),
        model: openAI.GPT_4_O.toString(),
        // cache
      });

      const agent = await createOpenAIToolsAgent({
        llm: model,
        tools,
        prompt,
      });

      const agentExecutor = new AgentExecutor({
        agent,
        tools,
        // verbose: true,
        returnIntermediateSteps: true,
      });
      const conversationalAgentExecutor = new RunnableWithMessageHistory({
        runnable: agentExecutor,
        getMessageHistory: (_sessionId) =>
          new MongoDBChatMessageHistory({
            collection: this.collection,
            sessionId: sessionId,
          }),
        inputMessagesKey: 'input',
        outputMessagesKey: 'output',
        historyMessagesKey: 'chat_history',
      });

      const response = await conversationalAgentExecutor.invoke(
        { input: user_query },
        { configurable: { sessionId: sessionId } },
      );
      return this.successResponse({
        response: response.output,
        sessionId: sessionId,
      });
    } catch (e: unknown) {
      this.exceptionHandling(e);
    }
  }

  async findOne(id: string) {
    return await this.summaryModel.findOne({ sessionId: id });
  }

  private successResponse = (response: any) =>
    customMessage(HttpStatus.OK, MESSAGES.SUCCESS, response);

  private exceptionHandling = (e: unknown) => {
    Logger.error(e);
    throw new HttpException(
      customMessage(
        HttpStatus.INTERNAL_SERVER_ERROR,
        MESSAGES.EXTERNAL_SERVER_ERROR,
      ),
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  };
}
