import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { MESSAGES } from 'src/utils/constants/messages.constants';
import customMessage from 'src/utils/responses/customMessage.response';
import { UserService } from 'src/user/user.service';
import { z } from 'zod';
import { TEMPLATES, TOOLS } from 'src/utils/constants/templates.constants';
import { openAI } from 'src/utils/constants/openAI.constants';

import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { DynamicTool, tool } from '@langchain/core/tools';
import { MongoClient, ObjectId } from 'mongodb';
import { MongoDBChatMessageHistory } from '@langchain/mongodb';

//Agents Import
import {
  AgentExecutor,
  AgentFinish,
  AgentStep,
  createOpenAIFunctionsAgent,
  createOpenAIToolsAgent,
} from 'langchain/agents';
import {
  RunnableSequence,
  RunnableWithMessageHistory,
} from '@langchain/core/runnables';
import { Collection } from 'mongodb';
import { DIRECT_CHATBOT_MESSAGES } from './constants/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import Redis from 'ioredis';
import { JsonOutputFunctionsParser } from 'langchain/output_parsers';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  AIMessage,
  BaseMessage,
  FunctionMessage,
} from '@langchain/core/messages';
import { FunctionsAgentAction } from 'langchain/dist/agents/openai_functions/output_parser';
import { JsonOutputParser } from '@langchain/core/output_parsers';
const crypto = require('crypto');

interface ChatResponse {
  answer: string;
  options: object;
}

@Injectable()
export class DirectService {
  private client: MongoClient;
  private chatMemory: Collection;
  private redisClient;
  private algorithm = 'aes-256-cbc';
  private key = 'symptom-checker-1234567890123456';

  constructor(private _user: UserService) {
    this.redisClient = new Redis('redis://localhost:6379');
    this.client = new MongoClient(process.env.MONGODB_ATLAS_URI || '', {
      driverInfo: { name: 'langchainjs' },
    });
    this.connectDb();
  }

  private async connectDb(): Promise<void> {
    try {
      await this.client.connect();
      this.chatMemory = this.client.db('langchain').collection('memory');
    } catch (e) {
      console.error('Failed to connect to the database:', e);
      throw e;
    }
  }

  async patientChatEligibilityCheck(currentStage: number, selected: string) {
    try {
      switch (currentStage) {
        case 1:
          return {
            nextStage: 2,
            message: DIRECT_CHATBOT_MESSAGES.WELCOME_PING,
            ask: 'Consultation For',
            options: ['SELF', 'OTHERS'],
          };

        case 2:
          if (selected === 'SELF') {
            return {
              nextStage: 3,
              ask: 'Age is more than 18',
              options: ['YES', 'NO'],
            };
          } else if (selected === 'OTHERS') {
            return { message: 'STOP' };
          }
          break;

        case 3:
          if (selected === 'YES') {
            // const session = new this.sessionModel();
            // await session.save();
            return { sessionId: new ObjectId().toString() };
          } else if (selected === 'NO') {
            return {
              nextStage: 4,
              ask: 'Legal Guardian Present',
              options: ['YES', 'NO'],
            };
          }
          break;

        case 4:
          if (selected === 'YES') {
            // const session = new this.sessionModel();
            // await session.save();
            return { sessionId: new ObjectId().toString() };
          } else if (selected === 'NO') {
            return { nextStage: 4, message: 'STOP' };
          }
          break;

        default:
          return { message: 'Invalid stage' };
      }
    } catch (e: unknown) {
      console.error('Unable to start chat', e);
      throw e;
    }
  }

  generateToolsForUser(userId: string, sessionId: string) {
    try {
      const responseWithOptionsTool = new DynamicStructuredTool({
        name: 'responseWithOptions',
        description: 'Provides an answer and related options to the user.',
        schema: z
          .object({
            input: z.string(),
            answer: z
              .string()
              .describe('The main response or answer to the question.'),
            options: z.array(
              z
                .string()
                .describe('Multiple choice options related to the answer.'),
            ),
          })
          .partial({ options: true }),
        func: async (input) => {
          let response = {
            answer: 'Please provide a valid input',
            options: [],
          };
          if (input) {
            response = JSON.parse(JSON.stringify(input));
          }
          console.log("Tool Called ======>",response)
          return response;
        },
        returnDirect: true
      });

      const saveConversationSummary = new DynamicStructuredTool({
        name: TOOLS.SUMMARY_TOOL,
        description: `Call this tool should after the patient has reviewed and confirmed the accuracy of their summarized information. The tool is used to submit the confirmed summary for physician review.`,
        schema: z.object({
          summary: z.any(),
          userId: z.string(),
          sessionId: z.string(),
        }),
        func: async ({ summary }) => {
          const resp = await this._user.saveSummary({
            sessionId,
            userId,
            summary: summary,
            conversationClosed: true,
          });
        },
        returnDirect: false,
      });

      return [responseWithOptionsTool, saveConversationSummary];
    } catch (error: unknown) {
      console.error('Error in generateToolsForUser:', error);
      this.exceptionHandling(error);
    }
  }

  async initialiseDirectChat(
    user_query: string,
    sessionId: string,
    userId: string,
  ) {
    let tokenUsage = 0;
    const responseSchema = z.object({
      answer: z.string().describe('The final answer to return to the user'),
      options: z
        .array(z.string())
        .describe(
          'List of options containing in the modal response. Only include an option if it contains relevant information',
        ),
    });
    const responseOpenAIFunction = {
      name: 'response',
      description: 'Return the response to the user',
      parameters: zodToJsonSchema(responseSchema),
    };
    const structuredOutputParser = (
      message: AIMessage,
    ): FunctionsAgentAction | AgentFinish => {
      console.log('message', message);
      if (message.content && typeof message.content !== 'string') {
        throw new Error('This agent cannot parse non-string model responses.');
      }
      if (message.additional_kwargs.function_call) {
        const { function_call } = message.additional_kwargs;
        try {
          const toolInput = function_call.arguments
            ? JSON.parse(function_call.arguments)
            : {};
          // If the function call name is `response` then we know it's used our final
          // response function and can return an instance of `AgentFinish`
          if (function_call.name === 'response') {
            return { returnValues: { ...toolInput }, log: 'message.content' };
          }
          return {
            tool: function_call.name,
            toolInput,
            log: `Invoking "${function_call.name}" with ${
              function_call.arguments ?? '{}'
            }\n${message.content}`,
            messageLog: [message],
          };
        } catch (error) {
          throw new Error(
            `Failed to parse function arguments from chat model response. Text: "${function_call.arguments}". ${error}`,
          );
        }
      } else {
        return {
          returnValues: { output: message.content },
          log: 'message.content',
        };
      }
    };
    const formatAgentSteps = (steps: AgentStep[]): BaseMessage[] =>
      steps.flatMap(({ action, observation }) => {
        if ('messageLog' in action && action.messageLog !== undefined) {
          const log = action.messageLog as BaseMessage[];
          return log.concat(new FunctionMessage(observation, action.tool));
        } else {
          return [new AIMessage(action.log)];
        }
      });
    try {
      if (!sessionId) {
        sessionId = new ObjectId().toString();
      }
      const summary = await this._user.findOneSummary(sessionId);

      if (summary) {
        if (summary[0]?.conversationClosed) {
          return this.successResponse('Conversation Closed Already!');
        }
      }

      const tools = this.generateToolsForUser(userId, sessionId);

      const userDetails = await this._user.findOne(userId);
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', `${TEMPLATES.V5_PROMPT_2_Sept}`],
        new MessagesPlaceholder('chat_history'),
        ['user', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]);

      // const tracer = new LangChainTracer();
      const model = new ChatOpenAI({
        temperature: 0,
        modelName: openAI.GPT_4_O.toString(),
      });
      // .withStructuredOutput(structuredOutputParser)

      const agent = await createOpenAIToolsAgent({
        llm: model,
        tools,
        prompt,
      });

      const agentExecutor = new AgentExecutor({
        agent,
        tools,
      });
      // .pipe(structuredOutputParser);
      const conversationalAgentExecutor = new RunnableWithMessageHistory({
        runnable: agentExecutor,
        getMessageHistory: (_sessionId) =>
          new MongoDBChatMessageHistory({
            collection: this.chatMemory,
            sessionId: sessionId,
          }),
        inputMessagesKey: 'input',
        outputMessagesKey: 'output',
        historyMessagesKey: 'chat_history',
      });

      const response = await conversationalAgentExecutor.invoke(
        {
          input: user_query,
          user_details: JSON.stringify(userDetails),
          tools: {
            saveConversationSummary: { userId: userId, sessionId: sessionId },
          },
        },
        {
          configurable: { sessionId: sessionId },
          callbacks: [
            {
              handleLLMEnd(output: any) {
                tokenUsage +=
                  output.generations[0][0].message.usage_metadata.total_tokens;
                console.log('00000000000000', tokenUsage);
              },
            },
          ],
        },
      );
      await this._user.increaseUtilisedToken(sessionId, tokenUsage);
      const ret = { sessionId: sessionId, output: response.output };
      return this.successResponse(ret);
    } catch (e: unknown) {
      console.error('ERROR!!!!!!!!!!!!!', e);
      this.exceptionHandling(e);
    }
  }

  // async initialiseDirectRedisChat(
  //   user_query: string,
  //   sessionId: string,
  //   userId: string,
  // ) {
  //   let tokenUsage = 0;
  //   try {
  //     if (!sessionId) {
  //       sessionId = new ObjectId().toString();
  //     }
  //     const summary = await this._user.findOneSummary(sessionId);

  //     if (summary) {
  //       if (summary.conversationClosed) {
  //         return this.successResponse('Conversation Closed Already!');
  //       }
  //     }

  //     const tools = this.generateToolsForUser(userId, sessionId);

  //     const userDetails = await this._user.findOne(userId);
  //     const prompt = ChatPromptTemplate.fromMessages([
  //       ['system', `${TEMPLATES.V5_PROMPT_2_Sept}`],
  //       new MessagesPlaceholder('chat_history'),
  //       ['user', '{input}'],
  //       new MessagesPlaceholder('agent_scratchpad'),
  //     ]);

  //     const chatMemory = new RedisChatMessageHistory({
  //       client: this.redisClient,
  //       sessionId: sessionId,
  //     });

  //     // const tracer = new LangChainTracer();
  //     const model = new ChatOpenAI({
  //       temperature: 0,
  //       modelName: openAI.GPT_4_O.toString(),
  //     });

  //     const agent = await createOpenAIToolsAgent({
  //       llm: model,
  //       tools: Object.values(tools),
  //       prompt,
  //     });

  //     const agentExecutor = new AgentExecutor({
  //       agent,
  //       tools: Object.values(tools),
  //     });

  //     const conversationalAgentExecutor = new RunnableWithMessageHistory({
  //       runnable: agentExecutor,
  //       getMessageHistory: (_sessionId) =>
  //         new CustomChatHistoryClass({
  //           roomId: sessionId,
  //           userId: userId,
  //         }),
  //       inputMessagesKey: 'input',
  //       outputMessagesKey: 'output',
  //       historyMessagesKey: 'chat_history',
  //     });

  //     const response = await conversationalAgentExecutor.invoke(
  //       {
  //         input: user_query,
  //         user_details: JSON.stringify(userDetails),
  //         tools: {
  //           saveConversationSummary: { userId: userId, sessionId: sessionId },
  //         },
  //       },
  //       {
  //         configurable: { sessionId: sessionId },
  //         callbacks: [
  //           {
  //             handleLLMEnd(output: any) {
  //               tokenUsage +=
  //                 output.generations[0][0].message.usage_metadata.total_tokens;
  //             },
  //           },
  //         ],
  //       },
  //     );
  //     await this._user.increaseUtilisedToken(sessionId, tokenUsage);
  //     const ret = { sessionId: sessionId, output: response.output };
  //     return this.successResponse(ret);
  //   } catch (e: unknown) {
  //     console.error('ERROR!!!!!!!!!!!!!', e);
  //     this.exceptionHandling(e);
  //   }
  // }

  //////////////////////////////////////////////////////////
  // const extractionFunctionSchema = {
  //   name: 'extractor',
  //   description: 'Extracts the answer and options from the input.',
  //   parameters: {
  //     type: 'object',
  //     properties: {
  //       answer: {
  //         type: 'string',
  //         description:
  //           'A plain string representing the main response or answer.',
  //       },
  //       options: {
  //         type: 'array',
  //         items: {
  //           type: 'string',
  //         },
  //         description:
  //           'An array of options extracted if the response contains multiple choice options.',
  //       },
  //     },
  //     required: ['answer', 'options'],
  //   },
  // };
  // Set up a parser + inject instructions into the prompt template.
  // const parser = new JsonOutputFunctionsParser();
  // .bind({
  //   functions: [extractionFunctionSchema],
  //   function_call: { name: 'extractor' },
  // });
  // const chain = partialedPrompt.pipe(model).pipe(parser);

  async initialiseDirectParsedChat(
    user_query: string,
    sessionId: string,
    userId: string,
  ) {
    let tokenUsage = 0;
    try {
      if (!sessionId) {
        sessionId = new ObjectId().toString();
      }
      const summary = await this._user.findOneSummary(sessionId);
      if (summary) {
        if (summary[0]?.conversationClosed) {
          return this.successResponse('Conversation Closed Already!');
        }
      }
      const tools = this.generateToolsForUser(userId, sessionId);
      const userDetails = await this._user.findOne(userId);
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', `${TEMPLATES.V5_PROMPT_2_Sept}`],
        new MessagesPlaceholder('chat_history'),
        ['user', '{input}'],
        new MessagesPlaceholder('agent_scratchpad'),
      ]);
      const model = new ChatOpenAI({
        modelName: openAI.GPT_4_O.toString(),
        temperature: 0,
      });
      const agent = await createOpenAIFunctionsAgent({
        llm: model,
        tools,
        prompt,
      });
      const agentExecutor = new AgentExecutor({
        agent,
        tools,
      });

      const conversationalAgentExecutor = new RunnableWithMessageHistory({
        runnable: agentExecutor,
        getMessageHistory: (_sessionId) =>
          new MongoDBChatMessageHistory({
            collection: this.chatMemory,
            sessionId: sessionId,
          }),
        inputMessagesKey: 'input',
        historyMessagesKey: 'chat_history',
      });

      const response = await conversationalAgentExecutor.invoke(
        {
          input: user_query,
          user_details: JSON.stringify(userDetails),
          tools: {
            responseWithOptionsTool: {},
            saveConversationSummary: { userId: userId, sessionId: sessionId }
          },
        },
        {
          configurable: { sessionId: sessionId },
        },
      );
      await this._user.increaseUtilisedToken(sessionId, tokenUsage);
      const ret = { sessionId: sessionId, output: response.output };
      return this.successResponse(ret);
    } catch (e: unknown) {
      console.error('ERROR!!!!!!!!!!!!!', e);
      this.exceptionHandling(e);
    }
  }

  // async parsedChat(user_query: string, sessionId: string, userId: string) {
  //   const extractionFunctionSchema = {
  //     name: 'extractor',
  //     description: 'Extracts the answer and options from the input.',
  //     parameters: {
  //       type: 'object',
  //       properties: {
  //         answer: {
  //           type: 'string',
  //           description:
  //             'A plain string representing the main response or answer.',
  //         },
  //         options: {
  //           type: 'array',
  //           items: {
  //             type: 'string',
  //           },
  //           description:
  //             'An array of options extracted if the response contains multiple choice options.',
  //         },
  //       },
  //       required: ['answer', 'options'],
  //     },
  //   };

  //   try {
  //     if (!sessionId) {
  //       sessionId = new ObjectId().toString();
  //     }
  //     const summary = await this._user.findOneSummary(sessionId);

  //     if (summary) {
  //       if (summary.conversationClosed) {
  //         return this.successResponse('Conversation Closed Already!');
  //       }
  //     }

  //     const tools = this.generateToolsForUser(userId, sessionId);

  //     const parser = new JsonOutputFunctionsParser();

  //     const model = new ChatOpenAI({
  //       temperature: 0,
  //       modelName: openAI.GPT_4_O.toString(),
  //       verbose: true,
  //     });

  //     const runnable = model
  //       .bind({
  //         functions: [extractionFunctionSchema],
  //         function_call: { name: 'extractor' },
  //       })
  //       .pipe(parser);

  //     const result = await runnable.invoke([
  //       new HumanMessage('Help me to diagnose disease. I have headache.'),
  //     ]);

  //     // console.log("Response of the modal ==========> ",{ result });
  //   } catch (e) {
  //     console.error('ERROR!!!!!!!!!!!!!', e);
  //     this.exceptionHandling(e);
  //   }
  // }

  // async outputParserChat() {
  //   try {
  //     const properties = {
  //       answer: {
  //         type: 'string',
  //         description: 'The main response or answer to the question.',
  //       },
  //       options: {
  //         type: 'array',
  //         items: {
  //           type: 'string',
  //           description: 'Multiple choice options related to the answer.',
  //         },
  //       },
  //     };

  //     const tool = {
  //       type: 'function' as const,
  //       function: {
  //         name: 'responseWithOptions',
  //         description: 'Provides an answer and related options to the user.',
  //         parameters: {
  //           $schema: 'http://json-schema.org/draft-07/schema#',
  //           title: 'Response with Options',
  //           type: 'object',
  //           properties,
  //           required: ['answer'],
  //         },
  //       },
  //     };

  //     const model = new ChatOpenAI({
  //       temperature: 0,
  //       modelName: openAI.GPT_4_O.toString(),
  //       verbose: true,
  //     });

  //     const llmWithTools = model.bind({
  //       tools: [tool],
  //       tool_choice: tool,
  //     });
  //     const prompt = ChatPromptTemplate.fromMessages([
  //       ['system', `${TEMPLATES.V5_PROMPT_2_Sept}`],
  //       // new MessagesPlaceholder('chat_history'),
  //       // ['user', '{input}'],
  //       // new MessagesPlaceholder('agent_scratchpad'),
  //       ['human', 'Topic: {topic}'],
  //     ]);

  //     const chain = prompt.pipe(llmWithTools);

  //     const result = await chain.invoke({ topic: 'Tell me about Depression' });
  //     console.log(
  //       'JSON Parser result =================>',
  //       result.tool_calls,
  //       JSON.stringify(result.tool_calls[0].args.options, null, 2),
  //     );
  //   } catch (error) {
  //     console.error('ERROR!!!!!!!!!!!!!', error);
  //     this.exceptionHandling(error);
  //   }
  // }

  //RESPONSES
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
